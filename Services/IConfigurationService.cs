using S365.Search.Admin.UI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    
    public interface IConfigurationService
    {
        
        
        AdminSettings GetSettings();

        Task<string> CreateDatabaseFirst(RequestDatabaseName request);

        Task<string> GetAccessTokenAsync();

        bool IsCertificateAuthenticationEnabled();
    }
}
