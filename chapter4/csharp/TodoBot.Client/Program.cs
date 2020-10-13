using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.Extensions.DependencyInjection;
using LineDC.Liff;
using Microsoft.Extensions.Configuration;
using TodoBot.Client.Services;
using System.Net.Http;
using TodoBot.Client.Srvices;

namespace TodoBot.Client
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebAssemblyHostBuilder.CreateDefault(args);
            builder.RootComponents.Add<App>("app");
            var appSettings = builder.Configuration.Get<AppSettings>();
            
            builder.Services.AddSingleton(new HttpClient
            {
                BaseAddress = new Uri(builder.HostEnvironment.BaseAddress)
            });
            builder.Services.AddSingleton<ILiffClient>(new LiffClient(appSettings.LiffId));
            if (string.IsNullOrEmpty(appSettings?.FunctionUrl))
            {
                builder.Services.AddSingleton<ITodoClient>(new MockTodoClient());
            }
            else
            {
                builder.Services.AddSingleton<ITodoClient>(serviceProvider => {
                    var httpClient = serviceProvider.GetRequiredService<HttpClient>();
                    return new TodoClient(httpClient, appSettings?.FunctionUrl);
                });
            }
            await builder.Build().RunAsync();
        }
    }
}
