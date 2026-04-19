namespace S365.Search.Admin.UI.Models
{
    public class SwitchContextRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
        public string ActiveTenant { get; set; } = string.Empty;
    }

    public class SwitchContextResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; }
        public int RefreshExpiresIn { get; set; }
        public string? RefreshToken { get; set; }
        public string TokenType { get; set; } = "Bearer";
        public int NotBeforePolicy { get; set; }
        public string? SessionState { get; set; }
        public string? Scope { get; set; }
        public string? IdToken { get; set; }
    }
}