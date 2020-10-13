using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace ClovaVentriloquism
{
    public class ClovaFunctions
    {
        private IDurableClova DurableClova { get; }

        public ClovaFunctions(IDurableClova clova)
        {
            DurableClova = clova;
        }

        /// <summary>
        /// CEKのエンドポイント。
        /// </summary>
        /// <param name="req"></param>
        /// <param name="client"></param>
        /// <param name="context"></param>
        /// <param name="log"></param>
        /// <returns></returns>
        [FunctionName(nameof(ClovaEndpoint))]
        public async Task<IActionResult> ClovaEndpoint(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)]HttpRequest req,
            [DurableClient] IDurableClient client,
            ILogger log)
        {
            DurableClova.DurableClient = client;

            var response = await DurableClova.RespondAsync(req.Headers["SignatureCEK"], req.Body);
            return new OkObjectResult(response);
        }

        
        /// <summary>
        /// LINEからのイベントを待機し、その入力内容を返すオーケストレーター。
        /// </summary>
        /// <param name="context"></param>
        /// <returns></returns>
        [FunctionName(nameof(WaitForLineInput))]
        public async Task<string> WaitForLineInput(
            [OrchestrationTrigger] IDurableOrchestrationContext context)
        {
            return await context.WaitForExternalEvent<string>("LineVentriloquismInput");
        }
    }
}