const line = require('@line/bot-sdk');

const config = {
    channelAccessToken: process.env.MESSAGING_API_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.MESSAGING_API_CHANNEL_SECRET,
};

const client = new line.Client(config);

module.exports = async function (context, count) {
    const input = context.df.getInput();

    client.replyMessage(input.token,
    {
        type: 'flex',
        altText: 'セリフをタップしてね',
        contents: {
            type: 'bubble',
            direction: 'ltr',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        'type': 'text',
                        'text': 'セリフをタップしてね',
                        'margin': 'xs',
                        'size': 'sm',
                        'align': 'center',
                        'gravity': 'bottom',
                        'weight': 'bold'
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                flex: 0,
                contents: input.list.map(text => ({
                    type: 'button',
                    action: {
                        type: 'message',
                        label: text,
                        text: text
                    }
                }))
            }
        }
    });
};
