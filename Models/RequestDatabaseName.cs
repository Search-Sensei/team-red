using System.ComponentModel.DataAnnotations;

namespace S365.Search.Admin.UI.Models
{
    public class RequestDatabaseName
    {
        [Required]
        public string DatabaseName { get; set; }
    }
}
