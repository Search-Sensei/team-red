using System.ComponentModel.DataAnnotations;

namespace S365.Search.Admin.UI.Models
{
    public class OrganisationRegistrationRequest
    {
        [Required(ErrorMessage = "Organisation name is required.")]
        public string OrganisationName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact person is required.")]
        public string ContactPerson { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact phone is required.")]
        [Phone(ErrorMessage = "Invalid phone number format.")]
        public string ContactPhone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Organisation URL is required.")]
        public string OrganisationUrl { get; set; } = string.Empty;
    }
}
