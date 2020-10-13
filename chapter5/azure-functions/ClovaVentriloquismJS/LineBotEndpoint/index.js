const df = require('durable-functions');
const line = require('@line/bot-sdk');
const createHandler = require('azure-function-express').createHandler;
const express = require('express');

const config = {
    channelAccessToken: process.env.MESSAGING_API_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.MESSAGING_API_CHANNEL_SECRET,
};

const lineMessagingClient = new line.Client(config);

const app = express();
app.post('/api/LineBotEndpoint',
    line.middleware(config),
    (req, res) => {
        Promise
            .all(req.body.events.map(e => handleEvent(e, req.context)))
            .then((result) => res.json(result))
            .catch((err) => {
                req.context.log.error(err);
                res.status(500).end();
            });
    }
);

async function handleEvent(event, context) {
    if (event.type === 'message' && event.message.type === 'text') {
        const str = event.message.text.replace(/\r?\n/g, '。');

        context.log(`送信テキスト: ${str}`);

        const durableClient = df.getClient(context);

        const ventStatus = await durableClient.getStatus(event.source.userId);

        if (!!ventStatus && (
            ventStatus.runtimeStatus === 'ContinuedAsNew' ||
            ventStatus.runtimeStatus === 'Pending' ||
            ventStatus.runtimeStatus === 'Running')) {
            
            // 「終了」とメッセージが来たら止まるようにしておく
            if (str === '終了') {
                // オーケストレーターを終了させる
                await durableClient.terminate(event.source.userId, 'User Canceled');

            } else {
                // Durable Functionsの外部イベントとして送信メッセージを投げる
                await durableClient.raiseEvent(event.source.userId, 'LineVentriloquismInput', str);

            }

        } else {
            // スキル起動していない状態のため、スキル起動を促す
            return lineMessagingClient.replyMessage(event.replyToken,
                {
                    type: 'text',
                    text: 'Clovaで「テキスト腹話術」のスキルを起動してください。'
                });
        }
    }
}

async function handleEventWithTemplate(event, log, durableClient) {
    if (event.type === 'message' && event.message.type === 'text') {
        const str = event.message.text.replace(/\r?\n/g, '。');

        // テンプレート入力中であればテンプレートにメッセージを追加
        const tmplStatus = await durableClient.getStatus('tmpl_' + event.source.userId);

        if (!!tmplStatus && (
            tmplStatus.runtimeStatus === 'ContinuedAsNew' ||
            tmplStatus.runtimeStatus === 'Pending' ||
            tmplStatus.runtimeStatus === 'Running')) {

            // Durable Functionsの外部イベントとして送信メッセージを投げる
            await durableClient.raiseEvent('tmpl_' + event.source.userId, 'AddToTemplate', str);

            return lineMessagingClient.replyMessage(event.replyToken,
                {
                    type: 'text',
                    text: 'テンプレートに追加しました。',
                    quickReply: {
                        items: [
                            {
                                type: 'action',
                                action: {
                                    type: 'postback',
                                    label: '作成を終了する',
                                    data: 'action=endTemplateSetting'
                                }
                            }
                        ]
                    }
                });

        } else {
            // ひとつ前のイベントを処理している最中は無視されるので注意
            const ventStatus = await durableClient.getStatus(event.source.userId);
            log('vent:' + ventStatus);

            if (!!ventStatus && (
                ventStatus.runtimeStatus === 'ContinuedAsNew' ||
                ventStatus.runtimeStatus === 'Pending' ||
                ventStatus.runtimeStatus === 'Running')) {
                // Durable Functionsの外部イベントとして送信メッセージを投げる
                await durableClient.raiseEvent(event.source.userId, 'DurableEventNameLineVentriloquismInput', str);
            } else {
                // スキル起動していない状態のため、スキル起動を促す
                return lineMessagingClient.replyMessage(event.replyToken,
                    {
                        type: 'text',
                        text: 'Clovaで「テキスト腹話術」のスキルを起動してください。'
                    });
            }
        }

    } else if (event.type === 'postback') {
        switch (event.postback.data) {
            // テンプレート作成開始
            case 'action=startTemplateSetting':
                await durableClientstartNew(`MakeTemplate`, 'tmpl_' + event.source.userId);
                return lineMessagingClient.replyMessage(event.replyToken,
                    {
                        type: 'text',
                        text: 'テンプレートに追加したいセリフを送ってください。。'
                    });


            // テンプレート作成終了
            case 'action=endTemplateSetting':
                // Durable Functionsの外部イベントとして送信メッセージを投げる
                await durableClient.raiseEvent('tmpl_' + event.source.userId, 'DurableEventNameAddToTemplate', `FinishMakingTemplate_${event.replyToken}`);
                break;

            // 無限セッション終了
            case 'action=terminateDurableSession':
                // オーケストレーターを終了する
                await durableClient.terminate(event.source.userId, 'User Canceled');
                
                return lineMessagingClient.replyMessage(event.replyToken,
                    {
                        type: 'text',
                        text: 'スキルを終了します。'
                    });
       }
    }
}

module.exports = createHandler(app);