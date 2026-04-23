using System.ComponentModel.DataAnnotations;

namespace S365.Search.Admin.UI.Models
{
    public class InviteUserRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "First name is required.")]
        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role is required.")]
        [RegularExpression("^(org-admin|contributor)$", ErrorMessage = "Role must be 'org-admin' or 'contributor'.")]
        public string Role { get; set; } = string.Empty;
    }
}
