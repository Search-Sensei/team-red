# Test OWASP 932 (932115, 932150) compliance for Admin UI
# Usage: .\test-owasp-932.ps1 -BaseUrl "https://your-adminui.azurewebsites.net"
#        .\test-owasp-932.ps1 -BaseUrl "http://localhost:5000"

param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$BaseUrl = $BaseUrl.TrimEnd('/')
$tests = @()

# --- Test 1: Query string with ; (should 400)
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/adminui/account/getuserdetails?x=;ls" -UseBasicParsing -ErrorAction SilentlyContinue
    $tests += @{ Name = "Query string ;ls"; Expected = 400; Actual = $r.StatusCode; Pass = ($r.StatusCode -eq 400) }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $tests += @{ Name = "Query string ;ls"; Expected = 400; Actual = $code; Pass = ($code -eq 400) }
}

# --- Test 2: Query string with | encoded as %7C (should 400; avoid raw | so PowerShell does not treat as pipeline)
try {
    $uri = "${BaseUrl}/adminui/account/getuserdetails?foo=%7Cid"
    $r = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction SilentlyContinue
    $tests += @{ Name = "Query string |id (encoded)"; Expected = 400; Actual = $r.StatusCode; Pass = ($r.StatusCode -eq 400) }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $tests += @{ Name = "Query string |id (encoded)"; Expected = 400; Actual = $code; Pass = ($code -eq 400) }
}

# --- Test 3: Body with ; (should 400)
try {
    $body = '{"query":"*","profile":"test;id"}'
    $r = Invoke-WebRequest -Uri "$BaseUrl/adminui/navigations/search" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue
    $tests += @{ Name = "Body ; in JSON"; Expected = 400; Actual = $r.StatusCode; Pass = ($r.StatusCode -eq 400) }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $tests += @{ Name = "Body ; in JSON"; Expected = 400; Actual = $code; Pass = ($code -eq 400) }
}

# --- Test 4: Body with | (should 400)
try {
    $body = '{"query":"|ls"}'
    $r = Invoke-WebRequest -Uri "$BaseUrl/adminui/navigations/search" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue
    $tests += @{ Name = "Body | in JSON"; Expected = 400; Actual = $r.StatusCode; Pass = ($r.StatusCode -eq 400) }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $tests += @{ Name = "Body | in JSON"; Expected = 400; Actual = $code; Pass = ($code -eq 400) }
}

# --- Test 5: Normal request without RCE pattern (should NOT 400)
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/adminui/account/getuserdetails" -UseBasicParsing -ErrorAction SilentlyContinue
    $tests += @{ Name = "Normal GET (no RCE)"; Expected = "200 or 401"; Actual = $r.StatusCode; Pass = ($r.StatusCode -ne 400) }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $tests += @{ Name = "Normal GET (no RCE)"; Expected = "200 or 401"; Actual = $code; Pass = ($code -ne 400) }
}

# --- Output
Write-Host "`nOWASP 932 Compliance Test - BaseUrl: $BaseUrl`n" -ForegroundColor Cyan
$passCount = ($tests | Where-Object { $_.Pass }).Count
$failCount = $tests.Count - $passCount
foreach ($t in $tests) {
    $status = if ($t.Pass) { "PASS" } else { "FAIL" }
    $color = if ($t.Pass) { "Green" } else { "Red" }
    Write-Host ("  {0}: {1} (Expected: {2}, Actual: {3})" -f $status, $t.Name, $t.Expected, $t.Actual) -ForegroundColor $color
}
Write-Host "`nResult: $passCount/$($tests.Count) passed." -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
if ($failCount -gt 0) { exit 1 }
exit 0
