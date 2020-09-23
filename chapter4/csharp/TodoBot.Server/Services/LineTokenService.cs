using Newtonsoft.Json;
using System.Net.Http;
using System.Threading.Tasks;

namespace TodoBot.Server.Services
{
    public class LineTokenService : ILineTokenService
    {
        private HttpClient httpClient = new HttpClient();
        private string clientId;
        private string url;
        public LineTokenService(string clientId, string url = "https://api.line.me/oauth2/v2.1/verify")
        {
            this.clientId = clientId;
            this.url = url;
        }

        public async Task<bool> VerifyTokenAsync(string accessToken)
        {
            if (string.IsNullOrEmpty(accessToken)) { return false; }
            var response = await httpClient.GetStringAsync($"{url}?access_token={accessToken}");
            var result = JsonConvert.DeserializeAnonymousType(response, new { scope = "", client_id = "", expires_in = 0 });
            return result?.client_id == clientId;
        }
    }
}