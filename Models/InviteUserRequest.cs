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

        public InviteRole Role { get; set; } = InviteRole.TenantUser;
    }
}
