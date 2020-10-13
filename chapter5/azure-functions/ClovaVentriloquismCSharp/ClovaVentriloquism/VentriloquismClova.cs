using ClovaVentriloquism.Configurations;
using LineDC.CEK;
using LineDC.CEK.Models;
using LineDC.Messaging;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Logging;
using Microsoft.Extensions.Logging;
using System.Threading;
using System.Threading.Tasks;

namespace ClovaVentriloquism
{
    public class VentriloquismClova : ClovaBase, IDurableClova
    {
        private ILogger Logger { get; }
        public IDurableClient DurableClient { get; set; }
        private ILineMessagingClient LineMessagingClient { get; }
        private string AudioUrl { get; }

        public VentriloquismClova(ILineMessagingClient lineMessagingClient, SkillSettings settings, ILoggerFactory loggerFactory)
        {
            LineMessagingClient = lineMessagingClient;
            AudioUrl = settings.AudioUrl;
            Logger = loggerFactory.CreateLogger(LogCategories.CreateFunctionUserCategory(nameof(ClovaFunctions)));
        }

        protected override Task OnLaunchRequestAsync(Session session, CancellationToken cancellationToken)
        {
            Response
                .AddText("腹話術を開始します。準備はいいですか？")
                .KeepListening();

            return Task.CompletedTask;
        }

        protected override async Task OnIntentRequestAsync(Intent intent, Session session, CancellationToken cancellationToken)
        {
            switch (intent.Name)
            {
                case "Clova.GuideIntent":
                    Response
                        .AddText("LINEに入力をした内容をしゃべります。準備はいいですか？")
                        .KeepListening();
                    break;

                case "Clova.YesIntent":
                case "ReadyIntent":
                    // 友だち追加チェック
                    try
                    {
                        await LineMessagingClient.GetUserProfileAsync(session.User.UserId);
                    }
                    catch
                    {
                        Response.AddText("連携するLINEアカウントが友だち追加されていません。" +
                            "Clovaアプリの本スキルのページから、連携するLINEアカウントを友だち追加してください。");
                        break;
                    }

                    await DurableClient.StartNewAsync(nameof(ClovaFunctions.WaitForLineInput), session.User.UserId);
                    Response.AddText("LINEに入力をした内容をしゃべります。好きな内容をLINEから送ってね。");

                    // 無音無限ループに入る
                    KeepClovaWaiting();
                    break;

                case "Clova.PauseIntent":
                    // 無限ループ中の一時停止指示に対し、スキル終了をする
                    await DurableClient.TerminateAsync(session.User.UserId, "intent");
                    Response.AddText("腹話術を終了します。");
                    break;

                case "Clova.NoIntent":
                case "Clova.CancelIntent":
                case "NotReadyIntent":
                    // オーケストレーターが起動していないなら終了
                    var status = await DurableClient.GetStatusAsync(session.User.UserId);
                    if (status?.RuntimeStatus == OrchestrationRuntimeStatus.ContinuedAsNew ||
                        status?.RuntimeStatus == OrchestrationRuntimeStatus.Pending ||
                        status?.RuntimeStatus == OrchestrationRuntimeStatus.Running)
                    {
                        Response.AddText("腹話術を終了します。");
                    }
                    else
                    {
                        KeepClovaWaiting();
                    }
                    break;
            }
        }

        protected override async Task OnPlayFinishedEventAsync(Event ev, Session session, CancellationToken cancellationToken)
        {
            // 終わっていなければ無音再生リクエストを繰り返す
            var status = await DurableClient.GetStatusAsync(session.User.UserId);
            if (status?.RuntimeStatus == OrchestrationRuntimeStatus.ContinuedAsNew ||
                status?.RuntimeStatus == OrchestrationRuntimeStatus.Pending ||
                status?.RuntimeStatus == OrchestrationRuntimeStatus.Running)
            {
                KeepClovaWaiting();
            }
            else if (status.RuntimeStatus == OrchestrationRuntimeStatus.Completed)
            {
                // 完了していた場合（＝LINEからの外部イベント処理が実行された場合）
                // 再度セッション継続
                KeepClovaWaiting();

                // 入力内容をそのまま話させる
                Response.AddText(status.Output.ToObject<string>());

                // オーケストレーターを再実行
                await DurableClient.StartNewAsync(nameof(ClovaFunctions.WaitForLineInput), session.User.UserId);
            }
            else if (status.RuntimeStatus == OrchestrationRuntimeStatus.Failed)
            {
                // 失敗していたら結果をしゃべって終了
                Response.AddText("失敗しました。");
            }
            else if (status.RuntimeStatus == OrchestrationRuntimeStatus.Terminated)
            {
                // Botからのスキル停止指示
                Response.AddText("腹話術を終了します。");
            }
        }

        protected override async Task OnPlayPausedEventAsync(Event ev, Session session, CancellationToken cancellationToken)
        {
            await DurableClient.TerminateAsync(session.User.UserId, "PlayPaused");
            Response.AddText("腹話術を終了します。");
        }

        /// <summary>
        /// Clovaを無音再生で待機させます。
        /// </summary>
        private void KeepClovaWaiting()
        {
            // 無音mp3の再生指示
            PlayAudio(
                new Source { Name = "Microsoft Azure" },
                new AudioItem
                {
                    AudioItemId = "silent-audio",
                    TitleText = "Durable Session",
                    TitleSubText1 = "Azure Functions",
                    TitleSubText2 = "Durable Functions",
                    Stream = new AudioStreamInfoObject
                    {
                        BeginAtInMilliseconds = 0,
                        Url = AudioUrl,
                        UrlPlayable = true
                    }
                });
        }
    }
}
