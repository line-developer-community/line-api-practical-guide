using LineDC.Liff;
using Microsoft.JSInterop;
using System.Threading.Tasks;

namespace TodoBot.Client
{
    public static class LiffClientExtensions
    {
        public static async Task<bool> InitializeAsync(this ILiffClient liff, IJSRuntime jSRuntime)
        {
            if (liff.Initialized)
            {
                return true;
            }

            await liff.Init(jSRuntime);
            if (!await liff.IsLoggedIn())
            {
                await liff.Login();
                return false;
            }
            liff.Initialized = true;

            return true;
        }
    }
}
