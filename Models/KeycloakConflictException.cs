using System;

namespace S365.Search.Admin.UI.Models
{
    public class KeycloakConflictException : Exception
    {
        public KeycloakConflictException(string message) : base(message) { }
    }
}
