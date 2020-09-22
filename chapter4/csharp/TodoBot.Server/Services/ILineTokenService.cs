using System.Threading.Tasks;

namespace TodoBot.Server.Services
{
    public interface ILineTokenService
    {
        Task<bool> VerifyTokenAsync(string accessToken);
    }
}