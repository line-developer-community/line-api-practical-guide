using ClovaVentriloquism.Configurations;
using LineDC.CEK;
using LineDC.Messaging;
using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

[assembly: FunctionsStartup(typeof(ClovaVentriloquism.Startup))]
namespace ClovaVentriloquism
{
    public class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            var config = new ConfigurationBuilder()
                .AddJsonFile("local.settings.json", true)
                .AddEnvironmentVariables()
                .Build();

            var settings = config.GetSection(nameof(SkillSettings)).Get<SkillSettings>();

            builder.Services
                .AddSingleton(settings)
                .AddSingleton<ILineMessagingClient>(_ => LineMessagingClient.Create(settings.ChannelAccessToken))
                .AddSingleton<IDurableWebhookApplication, VentriloquismLineBotApp>()
                .AddClova<IDurableClova, VentriloquismClova>();
        }
    }
}

