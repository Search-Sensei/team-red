using System.Collections.Generic;

namespace S365.Search.Admin.UI.Models
{
    public class AuthenticatedUserResponse
    {
        public bool IsAuthenticated { get; set; }
        public bool IsAuthenticationEnabled { get; set; }
        public string? Email { get; set; }
        public string? Name { get; set; }
        public List<string> Groups { get; set; } = new List<string>();
        public List<string> GroupIds { get; set; } = new List<string>();
        public string? GroupId { get; set; }
        public bool IsKeycloakToken { get; set; }
        public List<string> Tenants { get; set; } = new List<string>();
        public string? CurrentTenant { get; set; }
    }
}