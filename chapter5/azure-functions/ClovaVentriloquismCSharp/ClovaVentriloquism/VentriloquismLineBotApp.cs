using ClovaVentriloquism.Configurations;
using LineDC.Messaging;
using LineDC.Messaging.Messages;
using LineDC.Messaging.Webhooks;
using LineDC.Messaging.Webhooks.Events;
using LineDC.Messaging.Webhooks.Messages;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Logging;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClovaVentriloquism
{
    public class VentriloquismLineBotApp : WebhookApplication, IDurableWebhookApplication
    {
        private ILogger Logger { get; }
        public IDurableClient DurableClient { get; set; }

        public VentriloquismLineBotApp(ILineMessagingClient client, SkillSettings settings, ILoggerFactory loggerFactory)
            : base(client, settings.ChannelSecret)
        {
            Logger = loggerFactory.CreateLogger(LogCategories.CreateFunctionUserCategory(nameof(LineBotFunctions)));
        }

        protected override async Task OnMessageAsync(MessageEvent ev)
        {
            if (ev.Message is TextEventMessage message)
            {
                var str = message.Text.Replace("\r\n", "\n").Replace("\n", "。");

                var ventStatus = await DurableClient.GetStatusAsync(ev.Source.UserId);
                if (ventStatus?.RuntimeStatus == OrchestrationRuntimeStatus.ContinuedAsNew ||
                    ventStatus?.RuntimeStatus == OrchestrationRuntimeStatus.Pending ||
                    ventStatus?.RuntimeStatus == OrchestrationRuntimeStatus.Running)
                {
                    // Durable Functionsの外部イベントとして送信メッセージを投げる
                    await DurableClient.RaiseEventAsync(ev.Source.UserId, "LineVentriloquismInput", str);
                }
                else
                {
                    // スキル起動していない状態のため、スキル起動を促す
                    await Client.ReplyMessageAsync(ev.ReplyToken,
                        new List<ISendMessage>
                        {
                            new TextMessage("Clovaで「テキスト腹話術」のスキルを起動してください。")
                        });
                }
            }
        }

        #region テンプレートあり
        //protected override async Task OnMessageAsync(MessageEvent ev)
        //{
        //    if (ev.Message is TextEventMessage message)
        //    {
        //        var str = message.Text.Replace("\r\n", "\n").Replace("\n", "。");

        //        // テンプレート入力中であればテンプレートにメッセージを追加
        //        var tmplStatus = await DurableClient.GetStatusAsync("tmpl_" + ev.Source.UserId);
        //        if (tmplStatus?.RuntimeStatus == OrchestrationRuntimeStatus.ContinuedAsNew ||
        //            tmplStatus?.RuntimeStatus == OrchestrationRuntimeStatus.Pending ||
        //            tmplStatus?.RuntimeStatus == OrchestrationRuntimeStatus.Running)
        //        {
        //            // Durable Functionsの外部イベントとして送信メッセージを投げる
        //            await DurableClient.RaiseEventAsync("tmpl_" + ev.Source.UserId, Consts.DurableEventNameAddToTemplate, str);

        //            await Client.ReplyMessageAsync(ev.ReplyToken,
        //                new List<ISendMessage>
        //                {
        //                    new TextMessage("テンプレートに追加しました。",
        //                        new QuickReply
        //                        {
        //                            Items = { new QuickReplyButtonObject(new PostbackTemplateAction("作成を終了する", "action=endTemplateSetting")) }
        //                        })
        //                });
        //        }
        //        else
        //        {
        //            // 待機中になるまで待つ
        //            while (true)
        //            {
        //                // ひとつ前のイベントを処理している最中は無視されるので注意
        //                var ventStatus = await DurableClient.GetStatusAsync(ev.Source.UserId);
        //                if (ventStatus?.RuntimeStatus == OrchestrationRuntimeStatus.ContinuedAsNew ||
        //                    ventStatus?.RuntimeStatus == OrchestrationRuntimeStatus.Pending ||
        //                    ventStatus?.RuntimeStatus == OrchestrationRuntimeStatus.Running)
        //                {
        //                    // Durable Functionsの外部イベントとして送信メッセージを投げる
        //                    await DurableClient.RaiseEventAsync(ev.Source.UserId, Consts.DurableEventNameLineVentriloquismInput, str);
        //                    break;
        //                }
        //                else
        //                {
        //                    // スキル起動していない状態のため、スキル起動を促す
        //                    await Client.ReplyMessageAsync(ev.ReplyToken,
        //                        new List<ISendMessage>
        //                        {
        //                            new TextMessage("Clovaで「テキスト腹話術」のスキルを起動してください。")
        //                        });
        //                    break;
        //                }
        //            }
        //        }
        //    }
        //}

        //protected override async Task OnPostbackAsync(PostbackEvent ev)
        //{
        //    switch (ev?.Postback?.Data)
        //    {
        //        // テンプレート作成開始
        //        case "action=startTemplateSetting":
        //            await Client.ReplyMessageAsync(ev.ReplyToken,
        //                new List<ISendMessage>
        //                {
        //                    new TextMessage("テンプレートに追加したいセリフを送ってください。")
        //                });

        //            await DurableClient.StartNewAsync(nameof(LineBotFunctions.MakeTemplate), "tmpl_" + ev.Source.UserId);
        //            break;

        //        // テンプレート作成終了
        //        case "action=endTemplateSetting":
        //            // Durable Functionsの外部イベントとして送信メッセージを投げる
        //            await DurableClient.RaiseEventAsync("tmpl_" + ev.Source.UserId, Consts.DurableEventNameAddToTemplate, $"{Consts.FinishMakingTemplate}_{ev.ReplyToken}");
        //            break;

        //        // 無限セッション終了
        //        case "action=terminateDurableSession":
        //            await Client.ReplyMessageAsync(ev.ReplyToken,
        //                new List<ISendMessage> { new TextMessage("スキルを終了します。") });

        //            // Durable Functionsの外部イベントとして送信メッセージを投げる
        //            await DurableClient.TerminateAsync(ev.Source.UserId, "User Canceled");
        //            await DurableClient.TerminateAsync("translation_" + ev.Source.UserId, "User Canceled");
        //            break;
        //    }
        //}
        #endregion
    }
}
