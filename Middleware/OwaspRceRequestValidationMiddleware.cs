using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Linq;

namespace S365.Search.Admin.UI.Middleware
{
    /// <summary>
    /// Validates incoming requests for OWASP REQUEST-932-APPLICATION-ATTACK-RCE patterns
    /// (rules 932115 and 932150) so that the API stays compliant and WAF rules do not need to be skipped on App Gateway.
    /// </summary>
    public class OwaspRceRequestValidationMiddleware
    {
        private readonly RequestDelegate _next;

        // OWASP 932115/932150 style: block RCE-like patterns (pipe, semicolon, backtick, command substitution, chaining)
        private static readonly Regex RcePatternRegex = new Regex(
            // 1. Command separators & chaining
            @"(\|\||&&|\$\(|\$\[|\$\(\w+\))" +

            // 2. Powershell / IEX common payloads
            @"|\b(?:powershell|pwsh|iex|invoke-expression)\b.*?(?:new-object|downloadstring|downloadfile|-enc|-encodedcommand|-ep|-ExecutionPolicy)" +

            // 3. CMD / cmd.exe suspicious commands
            @"|\b(?:cmd\.exe|cmd|/c)\b.*?(?:whoami|net user|systeminfo|dir|type)" +

            // 4. Shell reverse shell / backdoor patterns
            @"|\b(?:bash|sh|ksh|zsh|fish)\b.*?(?: -i| -c|curl|wget|nc|telnet)" +

            // 5. Downloaders / reverse shells with protocol
            @"|\b(?:curl|wget|fetch|nc|telnet|socat)\b.*?(?:http|https|ftp|file|://)" +

            // 6. Dangerous file system commands chained with ;
            @"|;\s*(?:rm|chmod|chown|adduser|useradd)" +

            // 7. Variable/parameter expansion 
            @"|\$\{!|\$\{IFS\}|\$\{PATH:|\$\{@|\$\{!var\}|c\$\{[^}]*\}t|ca\$\{[^}]*\}t|\$\{[^}]*\}at|\$\{[^}]*\}sh" +

            // 8. Sensitive file paths
            @"|/etc/passwd|/proc/self/environ|(?<!\w)~[+-]?\d{0,2}(?!\w)",

            RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private static readonly HashSet<string> DangerousKeywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "&&", "||", "|", "$(", "$((", "$[", "<(", ">(", "!!",

            "bash -i", "nc -e", "nc -l", "socat", "python -c", "perl -e",
            "rm -rf", "chmod 777", "chown", "adduser", "useradd", "echo",

            "~+", "~-", "~0", "~1", "~2", "-enc", "iex",
            "{whoami", "{id", "{cat", "{curl", "{wget", "${PATH",
            "$IFS", "${IFS}", "$(IFS)", "ca''t", "ca\"t", "c$@t", "c${x}at", "-encodedcommand",
            "$@", "$!", "$?", "${!var}", "$(<file)", "`echo`", "\\`id\\`", "c${x:-a}t",
            "ca${empty}t", "$IFS$9", "${PATH:0:1}bin${PATH:0:1}sh",

            "bitsadmin", "certutil", "mshta", "rundll32", "regsvr32", "cscript", "wscript",
            "powershell -ep bypass", "powershell -enc", "cmd /c", "cmd.exe /c",
            "invoke-expression", "downloadfile", "downloadstring", "new-object net.webclient",

            "curl", "wget", "nc", "telnet", "socat", "ls", "pwd", "base64", "awk",
            "curl.exe", "iwr", "powershell -c", "powershell -WindowStyle Hidden",
            "certutil -urlcache", "whoami /priv", "net start", "net stop", "sc create",
            "cmd.exe", "powershell.exe", "powershell", "systeminfo", "netsh", "sc", "ip addr",
            "net user", "net localgroup", "whoami /all", "schtasks", "systemctl", "env", "ver",
            "whoami", "uname", "cat /etc/passwd", "cat/etc/passwd", "/etc/passwd", "/proc/self/environ",
            "gwmi", "get-wmiobject", "get-ciminstance", "win32_computersystem", "win32_operatingsystem",
            "win32_bios", "win32_processor", "select-object name,domain", "select name,domain",
            "fl *", "invoke-wmimethod", "invoke-cimmethod"
        };

        private static readonly HashSet<string> SensitiveFileTargets = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "passwd", "/etc/passwd", "shadow", "/etc/shadow", "group", "/etc/group", "sudoers", "/etc/sudoers",
            "environ", "/proc/self/environ", "hosts", "/etc/hosts"
        };

        private static readonly string[] FieldsToInspect = { "query", "search", "keyword", "q", "name", "title", "text", "description" };

        public OwaspRceRequestValidationMiddleware(RequestDelegate next)
        {
            _next = next ?? throw new ArgumentNullException(nameof(next));
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // 1. Check query string (decode first so %3B etc. are caught like WAF)
            var queryString = context.Request.QueryString.Value;
            if (!string.IsNullOrEmpty(queryString))
            {
                string toCheck = queryString;
                try
                {
                    toCheck = Uri.UnescapeDataString(queryString);
                }
                catch { /* fall back to raw */ }
                if (IsDangerous(toCheck))
                {
                    await ReturnBadRequestAsync(context, "Request contains characters not allowed by security policy (OWASP RCE).");
                    return;
                }
            }

            var dangerousHeaders = new[] { "User-Agent", "Referer", "X-Forwarded-For", "X-Real-IP", "Origin", "X-Requested-With"};

            foreach (var headerName in dangerousHeaders)
            {
                if (context.Request.Headers.TryGetValue(headerName, out var headerValues) && headerValues.Count > 0)
                {
                    foreach (var value in headerValues)
                    {
                        if (headerName.Equals("User-Agent", StringComparison.OrdinalIgnoreCase) &&
                            IsLikelyLegitimateUserAgent(value))
                        {
                            continue;
                        }
                        if (!string.IsNullOrEmpty(value) && IsDangerous(value))
                        {
                            await ReturnBadRequestAsync(context,
                                $"Request header '{headerName}' contains characters not allowed by security policy (OWASP RCE).");
                            return;
                        }
                    }
                }
            }

            // 2. For methods with body, check body
            if (context.Request.ContentLength.HasValue && context.Request.ContentLength.Value > 0 &&
                (context.Request.Method == "POST" || context.Request.Method == "PUT" || context.Request.Method == "PATCH"))
            {
                var contentType = context.Request.ContentType ?? "";
                if (contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) ||
                    contentType.StartsWith("application/", StringComparison.OrdinalIgnoreCase))
                {
                    if (!context.Request.Body.CanSeek)
                        context.Request.EnableBuffering();

                    if (context.Request.Body.CanSeek)
                    {
                        context.Request.Body.Position = 0;
                        string body;
                        using (var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true, detectEncodingFromByteOrderMarks: false))
                        {
                            body = await reader.ReadToEndAsync();
                        }
                        context.Request.Body.Position = 0;

                        if (!string.IsNullOrEmpty(body) && IsRceInJsonBody(body))
                        {
                            await ReturnBadRequestAsync(context, "Request body contains characters not allowed by security policy (OWASP RCE).");
                            return;
                        }
                    }
                }
            }

            if (CheckDangerousCookies(context))
                {
                    await ReturnBadRequestAsync(context, "Request cookie contains characters not allowed by security policy (OWASP RCE).");
                    return;
                }

            await _next(context);
        }

        private static bool IsDangerous(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return false;

            if (RcePatternRegex.IsMatch(input)) return true;
            if (MatchesSensitiveGlob(input)) return true;

            var normalized = NormalizeForKeywordCheck(input);
            foreach (var keyword in DangerousKeywords)
            {
                if (Regex.IsMatch(normalized, $@"(^|\s){Regex.Escape(NormalizeForKeywordCheck(keyword))}(\s|$)", RegexOptions.IgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private static bool IsRceInJsonBody(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.ValueKind != JsonValueKind.Object)
                    return false;

                foreach (var prop in root.EnumerateObject())
                {
                    if (prop.NameEquals("url") || prop.NameEquals("searchUrl"))
                        continue;

                    if (prop.Value.ValueKind == JsonValueKind.String)
                    {
                        var value = prop.Value.GetString();
                        if (!string.IsNullOrEmpty(value) && IsDangerous(value)){
                            return true;
                        }
                    }
                }

                return false;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        private static Task ReturnBadRequestAsync(HttpContext context, string message)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var json = new
            {
                error = message,
                code = "OWASP_932",
                details = "Request blocked due to potential Remote Command Execution pattern"
            };

            return context.Response.WriteAsJsonAsync(json);
        }

        private static bool IsLikelyLegitimateUserAgent(string ua)
        {
            if (string.IsNullOrWhiteSpace(ua)) return false;
            var legitimatePrefixes = new[]
            {
                "Mozilla/", "curl/", "Postman", "Chrome", "Safari", "Edge", "Firefox",
                "Googlebot", "Bingbot", "Slurp", "DuckDuckBot", "YandexBot", "Playwright"
            };

            foreach (var prefix in legitimatePrefixes)
            {
                if (ua.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        private static string NormalizeForKeywordCheck(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;

            var sb = new StringBuilder();
            input = input.Replace("'", "");
            foreach (char c in input)
            {
                if (char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
                {
                    sb.Append(c);
                }
                else
                {
                    if (sb.Length > 0 && !char.IsWhiteSpace(sb[sb.Length - 1]))
                    {
                        sb.Append(' ');
                    }
                    sb.Append(c);
                    sb.Append(' ');
                }
            }
            string result = Regex.Replace(sb.ToString(), @"\s+", " ").Trim();
            return result.ToLowerInvariant();
        }

        private bool CheckDangerousCookies(HttpContext context)
        {
            foreach (var cookie in context.Request.Cookies)
            {
                var name = cookie.Key;
                var value = cookie.Value;

                if (name.StartsWith(".AspNetCore", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(value) && IsDangerous(value))
                {
                    return true;
                }
            }
            return false;
        }

        private static bool MatchesSensitiveGlob(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return false;

            var lowerInput = input.ToLowerInvariant();
            if (lowerInput.Contains("$ifs", StringComparison.OrdinalIgnoreCase)) 
                return true;
            if (!lowerInput.Contains('*') && !lowerInput.Contains('?')) return false;


            string fileGlob = lowerInput;
            int lastSlashIndex = lowerInput.LastIndexOf('/');
            if (lastSlashIndex >= 0)
            {
                fileGlob = lowerInput.Substring(lastSlashIndex + 1);
            }

            if (!fileGlob.Contains('*') && !fileGlob.Contains('?')) return false;

            var patternBuilder = new System.Text.StringBuilder("^");
            foreach (char c in fileGlob)
            {
                switch (c)
                {
                    case '*':
                        patternBuilder.Append(".*");
                        break;
                    case '?':
                        patternBuilder.Append(".");
                        break;
                    default:
                        patternBuilder.Append(Regex.Escape(c.ToString()));
                        break;
                }
            }
            patternBuilder.Append(".*");

            string filePattern = patternBuilder.ToString();

            try
            {
                var regex = new Regex(filePattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

                foreach (var target in SensitiveFileTargets)
                {
                    string targetFileName = target;
                    int targetSlash = target.LastIndexOf('/');
                    if (targetSlash >= 0)
                    {
                        targetFileName = target.Substring(targetSlash + 1);
                    }

                    bool isMatch = regex.IsMatch(targetFileName);

                    if (isMatch)
                    {
                        return true;
                    }
                }
            }
            catch (Exception)
            {
            }
            return false;
        }
    }
}

