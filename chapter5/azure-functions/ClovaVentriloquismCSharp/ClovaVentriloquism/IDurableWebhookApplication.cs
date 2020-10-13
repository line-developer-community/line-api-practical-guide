using LineDC.Messaging.Webhooks;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;

namespace ClovaVentriloquism
{
    public interface IDurableWebhookApplication : IWebhookApplication
    {
        IDurableClient DurableClient { get; set; }
    }
}
