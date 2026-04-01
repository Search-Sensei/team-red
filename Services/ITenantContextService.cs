using Microsoft.AspNetCore.Http;
using S365.Search.Admin.UI.Models;
using System.Security.Claims;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    public interface ITenantContextService
    {
        Task<SwitchContextResponse> SwitchContextAsync(HttpContext httpContext, ClaimsPrincipal user, SwitchContextRequest request);
    }
}