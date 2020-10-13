'use strict';

/**
「./linePay.js」のファイルは下記から持ってきました。
https://github.com/nkjm/line-pay/blob/v3/module/line-pay.js
*/
const line_pay = require('./linePay.js');
const line = require('@line/bot-sdk');
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'test',
    channelSecret: process.env.CHANNEL_SECRET || 'test'
};

const pay = new line_pay({
    channelId: process.env.LINEPAY_CHANNEL_ID || 'test',
    channelSecret: process.env.LINEPAY_CHANNEL_SECRET || 'test',
    isSandbox: true
})
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

module.exports = async( req, res ) => {
    if (!req.query.transactionId){
        throw new Error('Transaction Id not found.');
    }
    
    // get Datasore data
    const query = datastore.createQuery('planData').filter('transactionId', '=', req.query.transactionId);
    const [planData] = await datastore.runQuery(query);
    var reservation = "";
    for (const plan of planData) {
      reservation = plan.options
    }
    
    // Retrieve the reservation from database.
    if (!reservation){
        throw new Error('Reservation not found.');
    }

    console.log(`Retrieved following reservation.`);
    console.log(reservation);

    let confirmation = {
        transactionId: req.query.transactionId,
        amount: reservation.amount,
        currency: reservation.currency
    }

    console.log(`Going to confirm payment with following options.`);
    console.log(confirmation);

    pay.confirm(confirmation).then(async(response) => {
      
        const client = new line.Client(config);
        await client.pushMessage(reservation.userid, [
        {
          "type": "flex",
          "altText": "お支払いを完了しました。",
          "contents": {
            "type": "bubble",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "お支払い完了しました。💰",
                  "size": "md",
                  "weight": "bold"
                },
                {
                  "type": "text",
                  "text": "ありがとうございました。🌟",
                  "size": "md",
                  "weight": "bold"
                }
              ]
            }
          }
        },
        {
          "type": "sticker",
          "packageId" : 11537,
          "stickerId" : 52002734
        },
        {
          "type": "text",
          "text": "最後に、プラン申込からお支払いまでのお手続きは分かりやすかったですか？",
          "quickReply": {
            "items": [
              {
                "type": "action",
                "action": {
                   "type":"postback",
                   "label":"はい🎵",
                   "data": "action=questionnaire&result=yes",
                   "displayText":"はい🎵"
                }
              },
              {
                "type": "action",
                "action": {
                   "type":"postback",
                   "label":"いいえ😞",
                   "data": "action=questionnaire&result=no",
                   "displayText":"いいえ😞"
                }
              }
            ]
          }
        }]);
    });
    
    // delete
    const planDataKey = datastore.key(['planData', reservation.userid]);
    await datastore.delete(planDataKey);
};