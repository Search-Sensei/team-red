using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace S365.Search.Admin.UI.Services
{
    public interface IProxyAuthenticationService
    {
        IActionResult ValidateTokenBeforeProxyIfEnabled(HttpRequest request, ClaimsPrincipal user);
    }
}