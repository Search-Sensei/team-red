namespace S365.Search.Admin.UI.Models
{
    public class ResponseCreateDatabase
    {
        public bool IsSuccess { get; set; }
        public string Error { get; set; }
        public int Status { get; set; }
        public string Message { get; set; }
    }
}
