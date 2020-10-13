const df = require('durable-functions');
const express = require('express');
const createHandler = require('azure-function-express').createHandler;

// CEK
const clova = require('@line/clova-cek-sdk-nodejs');

// Messaging API
const Client  = require('@line/bot-sdk').Client;
const lineMessagingClient = new Client({
    channelAccessToken: process.env.MESSAGING_API_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.MESSAGING_API_CHANNEL_SECRET,
});

let durableClient;
let log;

function keepClovaWaiting(responseHelper) {
    responseHelper.responseObject.response.directives = [
        {
            header: {
                name: 'Play',
                namespace: 'AudioPlayer'
            },
            payload: {
                audioItem: {
                    audioItemId: 'silent-audio',
                    titleSubText1: 'subText1',
                    titleSubText2: 'subText2',
                    titleText: 'titleText',
                    stream: {
                        beginAtInMilliseconds: 0,
                        url: process.env.AUDIO_URL,
                        urlPlayable: true
                    }
                },
                playBehavior: 'REPLACE_ALL',
                source: { name: 'audioPlayerTest' }
            }
        }
    ];
    responseHelper.responseObject.response.shouldEndSession = true;
}

const clovaClient = clova.Client
    .configureSkill()
    .onLaunchRequest(responseHelper => {
        log('LaunchRequest');

        responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText('腹話術を開始します。準備はいいですか？'));
    })
    .onIntentRequest(async responseHelper => {
        const intentName = responseHelper.getIntentName();

        log(`IntentRequest: ${intentName}`);

        switch (intentName) {
            case 'Clova.GuideIntent':
                responseHelper.setSimpleSpeech(
                    clova.SpeechBuilder.createSpeechText(
                        'LINEに入力をした内容をしゃべります。準備はいいですか？'));
                break;

            case 'Clova.YesIntent':
            case 'ReadyIntent':
                // 友だち追加チェック
                try {
                    await lineMessagingClient.getProfile(responseHelper.getUser().userId);
                } catch {
                    responseHelper.setSimpleSpeech(
                        clova.SpeechBuilder.createSpeechText('連携するLINEアカウントが友だち追加されていません。' +
                        'Clovaアプリの本スキルのページから、連携するLINEアカウントを友だち追加してください。')).endSession();
                    break;
                }

                await durableClient.startNew('WaitForLineInput', responseHelper.getUser().userId);

                responseHelper.setSimpleSpeech(
                    clova.SpeechBuilder.createSpeechText('LINEに入力をした内容をしゃべります。好きな内容をLINEから送ってね。')).endSession();

                // 無音無限ループに入る
                keepClovaWaiting(responseHelper);
                break;

            case 'Clova.PauseIntent':
            case 'PauseIntent':
                // 無限ループ中の一時停止指示に対し、スキル終了をする
                await durableClient.terminate(responseHelper.getUser().userId, 'intent');
                responseHelper.setSimpleSpeech(
                    clova.SpeechBuilder.createSpeechText('腹話術を終了します。')).endSession();
                break;

            case 'Clova.NoIntent':
            case 'Clova.CancelIntent':
            case 'NotReadyIntent':
                // オーケストレーターが起動していないなら終了
                const status = await durableClient.getStatus(responseHelper.getUser().userId);
                if (status && (
                    status.runtimeStatus === 'ContinuedAsNew' ||
                    status.runtimeStatus === 'Pending' ||
                    status.runtimeStatus === 'Running')) {
                    responseHelper.setSimpleSpeech(
                        clova.SpeechBuilder.createSpeechText('腹話術を終了します。')).endSession();
                } else {
                    keepClovaWaiting(responseHelper);
                }
                break;
        }
    })
    .onEventRequest(async responseHelper => {
        log(`EventRequest: ${responseHelper.requestObject.request.event.name}`);

        switch (responseHelper.requestObject.request.event.name) {
            case 'PlayFinished':
                // 終わっていなければ無音再生リクエストを繰り返す
                var status = await durableClient.getStatus(responseHelper.getUser().userId);
                if (status && (
                    status.runtimeStatus === 'ContinuedAsNew' ||
                    status.runtimeStatus === 'Pending' ||
                    status.runtimeStatus === 'Running')) {
                    keepClovaWaiting(responseHelper);

                } else if (status && status.runtimeStatus === 'Completed') {
                    // 完了していた場合（＝LINEからの外部イベント処理が実行された場合）
                    // 再度セッション継続
                    keepClovaWaiting(responseHelper);

                    // 入力内容をそのまま話させる
                    responseHelper.setSimpleSpeech(
                        clova.SpeechBuilder.createSpeechText(status.output)).endSession();

                    // オーケストレーターを再実行
                    await durableClient.startNew('WaitForLineInput', responseHelper.getUser().userId);

                } else if (status && status.runtimeStatus === 'Failed') {
                    // 失敗していたら結果をしゃべって終了
                    responseHelper.setSimpleSpeech(
                        clova.SpeechBuilder.createSpeechText('失敗しました。')).endSession();

                } else if (status && status.runtimeStatus === 'Terminated') {
                    // Botからのスキル停止指示
                    responseHelper.setSimpleSpeech(
                        clova.SpeechBuilder.createSpeechText('腹話術を終了します。')).endSession();
                }
                break;

            case 'PlayPaused':
                log('PlayPaused');

                await durableClient.terminate(responseHelper.getUser().userId, 'PlayPaused');
                responseHelper.setSimpleSpeech(
                    clova.SpeechBuilder.createSpeechText('腹話術を終了します。')).endSession();
                break;
        }
    });

const clovaMiddleware = clova.Middleware({ applicationId: process.env.CLOVA_APP_ID });

const app = express();

app.post('/api/ClovaEndpoint', 
    (req, res, next) => { req.body = req.rawBody; next(); },
    clovaMiddleware,
    (req, res, next) => {
        (async () => {
            // Durable Functions の機能を利用
            durableClient = df.getClient(req.context);
            // ロガーのセット
            log = req.context.log;

            const ctx = new clova.Context(req.body);
            const requestType = ctx.requestObject.request.type;
            const requestHandler = clovaClient.config.requestHandlers[requestType];
            await requestHandler.call(ctx,ctx);
            res.json(ctx.responseObject);
            
        })().catch(next);
    }
);

module.exports = createHandler(app);
