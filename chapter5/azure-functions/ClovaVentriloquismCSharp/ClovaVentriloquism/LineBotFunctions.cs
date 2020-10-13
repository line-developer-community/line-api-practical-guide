using LineDC.Messaging;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ClovaVentriloquism
{
    public class LineBotFunctions
    {
        private IDurableWebhookApplication App { get; }
        private ILineMessagingClient LineMessagingClient { get; }

        public LineBotFunctions(IDurableWebhookApplication app, ILineMessagingClient lineMessagingClient)
        {
            App = app;
            LineMessagingClient = lineMessagingClient;
        }

        /// <summary>
        /// HTTPトリガー兼スターター関数。
        /// DI で受け取った LineBotApp を呼び出す。
        /// </summary>
        /// <param name="req"></param>
        /// <param name="client"></param>
        /// <param name="log"></param>
        /// <returns></returns>
        [FunctionName(nameof(LineBotEndpoint))]
        public async Task<IActionResult> LineBotEndpoint(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)]HttpRequest req,
            [DurableClient]IDurableClient client,
            ILogger log)
        {
            App.DurableClient = client;

            var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync();
            var xLineSignature = req.Headers["x-line-signature"];
            try
            {
                await App.RunAsync(xLineSignature, body);
            }
            catch (Exception ex)
            {
                log.LogError(ex.Message);
                log.LogError(ex.StackTrace);
            }

            return new OkResult();
        }

        #region テンプレート関係
        ///// <summary>
        ///// LINEからのイベントを待機し、その入力内容をテンプレートに追加するオーケストレーター。
        ///// </summary>
        ///// <param name="context"></param>
        ///// <returns></returns>
        //[FunctionName(nameof(MakeTemplate))]
        //public async Task MakeTemplate(
        //    [OrchestrationTrigger] IDurableOrchestrationContext context)
        //{
        //    // 再帰呼び出しで渡された作成中リストを受け取る
        //    var list = context.GetInput<List<string>>()
        //        ?? new List<string>();  // 初回はリストを新規作成

        //    // 外部イベントの発生を待機
        //    var value = await context.WaitForExternalEvent<string>("AddToTemplate");

        //    if (value.StartsWith("FinishMakingTemplate"))
        //    {
        //        // 完成したリストをReplyトークンとともに返信処理に渡す
        //        // 作成完了かどうかを文字列の頭で判定し、
        //        // 返信アクティビティをコール
        //        var token = value.Replace(
        //            "FinishMakingTemplate_", string.Empty);
        //        await context.CallActivityAsync(
        //            nameof(SendTemplates), (token, list));
        //    }
        //    else
        //    {
        //        // リストにセリフを追加
        //        list.Add(value);

        //        // 自身を再帰的に実行（セリフが追加されたリストを渡す）
        //        context.ContinueAsNew(list);
        //    }
        //}

        ///// <summary>
        ///// 返信処理を行うアクティビティ
        ///// </summary>
        ///// <param name="context"></param>
        ///// <returns></returns>
        //[FunctionName(nameof(SendTemplates))]
        //public async Task SendTemplates(
        //    [ActivityTrigger] IDurableActivityContext context)
        //{
        //    var input = context.GetInput<(string, List<string>)>();

        //    // テンプレート作成処理
        //    await LineMessagingClient.ReplyMessageAsync(input.Item1,
        //        new List<ISendMessage>
        //        {
        //            FlexMessage.CreateBubbleMessage("セリフをタップしてね").SetBubbleContainer(
        //                new BubbleContainer()
        //                    .SetHeader(BoxLayout.Horizontal)
        //                        .AddHeaderContents(new TextComponent
        //                            {
        //                                Text = "セリフをタップしてね",
        //                                Margin = Spacing.Xs,
        //                                Size = ComponentSize.Sm,
        //                                Align = Align.Center,
        //                                Gravity = Gravity.Bottom,
        //                                Weight = Weight.Bold
        //                            })
        //                    .SetFooter(new BoxComponent(BoxLayout.Vertical)
        //                    {
        //                        Spacing = Spacing.Md, Flex = 0,
        //                        Contents = input.Item2.Select(t => new ButtonComponent { Action = new MessageTemplateAction(t, t) }).ToList<IFlexComponent>()
        //                    }))
        //        });
        //}
        #endregion
    }
}
