using System;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

namespace S365.Search.Admin.UI.Controllers
{
    public class HomeController : Controller
    {
        [AllowAnonymous]
        [HttpGet]
        [Route("/")]
        public IActionResult Root()
        {
            if (!User.Identity.IsAuthenticated)
            {
                return Redirect("/adminui");
            }
            return Redirect("/adminui");
        }

        [Authorize]
        [HttpGet]
        [Route("/adminui")]
        [Route("/adminui/{*catchall:nonfile}")]  // Only catch routes that don't look like files
        public async System.Threading.Tasks.Task<IActionResult> Index()
        {
            var path = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "adminui", "index.html");
            if (!System.IO.File.Exists(path))
            {
                return NotFound();
            }

            var content = await System.IO.File.ReadAllTextAsync(path);

            if (User.Identity.IsAuthenticated)
            {
                var accessToken = await HttpContext.GetTokenAsync("access_token");
                var refreshToken = await HttpContext.GetTokenAsync("refresh_token");
                var expiresIn = await HttpContext.GetTokenAsync("expires_in");
                var refreshExpiresIn = await HttpContext.GetTokenAsync("refresh_expires_in");
                var sessionState = await HttpContext.GetTokenAsync("session_state");
                var scope = await HttpContext.GetTokenAsync("scope");
                var notBeforePolicy = await HttpContext.GetTokenAsync("not_before_policy");
                var expiresInSec = int.TryParse(expiresIn, out var ei) ? ei : 300;
                if (!string.IsNullOrEmpty(accessToken))
                {
                    var tokenJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        access_token = accessToken,
                        refresh_token = refreshToken ?? "",
                        token_type = "Bearer",
                        expires_in = expiresInSec,
                        refresh_expires_in = int.TryParse(refreshExpiresIn, out var rei) ? rei : 1800,
                        session_state = sessionState ?? "",
                        scope = scope ?? "email profile",
                        not_before_policy = int.TryParse(notBeforePolicy, out var nbp) ? nbp : 0
                    });
                    var base64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(tokenJson));
                    var script = $@"<script>
                        try {{
                            var t = JSON.parse(atob('{base64}'));
                            if (t.access_token) localStorage.setItem('accessToken', t.access_token);
                            if (t.refresh_token) localStorage.setItem('refreshToken', t.refresh_token);
                            if (t.token_type != null) localStorage.setItem('token_type', t.token_type);
                            if (t.expires_in != null) localStorage.setItem('expires_in', String(t.expires_in));
                            if (t.refresh_expires_in != null) localStorage.setItem('refresh_expires_in', String(t.refresh_expires_in));
                            if (t.session_state != null) localStorage.setItem('session_state', t.session_state);
                            if (t.scope != null) localStorage.setItem('scope', t.scope);
                            if (t.not_before_policy != null) localStorage.setItem('not_before_policy', String(t.not_before_policy));
                            localStorage.setItem('timestamp', (Date.now() + (t.expires_in || 300) * 1000).toString());
                        }} catch (e) {{ console.error('Failed to set token', e); }}
                    </script></body>";
                    content = content.Replace("</body>", script);
                }
            }

            return Content(content, "text/html");
        }
    }
}