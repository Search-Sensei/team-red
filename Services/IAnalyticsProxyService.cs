using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    public interface IAnalyticsProxyService
    {
        Task<IActionResult> GetUsageAsync(HttpContext httpContext, ClaimsPrincipal user);
    }
}
