'use strict';
const clova = require('@line/clova-cek-sdk-nodejs');
const line = require('@line/bot-sdk');
const jsonData = require('../data.json');

// LINE BOTの設定
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'test',
    channelSecret: process.env.CHANNEL_SECRET || 'test'
};
const base_url = process.env.BASE_URL;

const client = new line.Client(config);
const repromptMsg = '式場はチャペルですか？神社ですか？'

module.exports = clova.Client
  .configureSkill()

  //起動時
  .onLaunchRequest(async responseHelper => {
    console.log('onLaunchRequest');
    
    const speech = [
        clova.SpeechBuilder.createSpeechUrl('https://clova-soundlib.line-scdn.net/clova_behavior_door_knock.mp3'),
        clova.SpeechBuilder.createSpeechUrl('https://clova-soundlib.line-scdn.net/clova_behavior_door_open.mp3'),
        clova.SpeechBuilder.createSpeechText('こんにちは！結婚式相談カウンターへようこそ。あなたに合った結婚式プランをお探しします。ご希望の' + repromptMsg)
      ];
    
    responseHelper.setSpeechList(speech);
    responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(repromptMsg)));
  
  })

  //ユーザーからの発話が来たら反応する箇所
  .onIntentRequest(async responseHelper => {
    const intent = responseHelper.getIntentName();
    console.log('Intent:' + intent);
    switch (intent) {
      // ヘルプ
      case 'Clova.GuideIntent':
        const helpSpeech = [
          clova.SpeechBuilder.createSpeechText('スキルの説明をします。あなたに合った、結婚式プランをご提供いたします。お気に召しましたら、お申し込みできます。'),
          clova.SpeechBuilder.createSpeechText(repromptMsg)];
          responseHelper.setSpeechList(helpSpeech);
          responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(repromptMsg)));
        break;
      
      case 'BridalPlaceIntent':
        const slots = responseHelper.getSlots();
        const place = slots.place;
        
        const placeSpeech = [];
        console.log(slots.place);
        
        // ユーザID取得
        const { userId } = responseHelper.getUser();

        // チャペルか神社の選択
        let placeEn;
        if (place === 'チャペル') {
          placeEn = 'chapel';
        } else if (place === '神社') {
          placeEn = 'jinja';
        } else {
          placeSpeech.push(clova.SpeechBuilder.createSpeechText('聞き取れませんでした。もう一度お願いします。' + repromptMsg));
          responseHelper.setSpeechList(placeSpeech);
          return;
        }

        // オススメのプランをBOTへ送信
        await sendLineBot(userId, jsonData[placeEn], placeEn)
          .then(() => {
            if (place === 'チャペル') {
              placeSpeech.push(clova.SpeechBuilder.createSpeechText('チャペルのおすすめプランをボットに送信しました。ご確認くださいませ。'));
            } else {
              placeSpeech.push(clova.SpeechBuilder.createSpeechText('神社のおすすめプランをボットに送信しました。ご確認くださいませ。'));
            }
          })
          .catch((err) => {
            console.log(err);
            placeSpeech.push(clova.SpeechBuilder.createSpeechText('botを連携させてください。'));
          });
        
        placeSpeech.push(clova.SpeechBuilder.createSpeechText('また、ご利用くださいませ。'));
        placeSpeech.push(clova.SpeechBuilder.createSpeechUrl('https://clova-soundlib.line-scdn.net/clova_behavior_door_close.mp3'));
        responseHelper.setSpeechList(placeSpeech);
        responseHelper.endSession();
        break;
        
      default:
        responseHelper.setSimpleSpeech(clova.SpeechBuilder.createSpeechText(repromptMsg));
        responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(repromptMsg)));
        break;
    }
  })

  //終了時
  .onSessionEndedRequest(async responseHelper => {
    console.log('onSessionEndedRequest');
  })
  .handle();
  


// オススメのプランをBOTへ送信
async function sendLineBot(userId, jsonData, placeEn) {
    await client.pushMessage(userId, [
      {
        "type": "flex",
        "altText": "プランを送信しました。",
        "contents": {
          "type": "carousel",
          "contents": await getPlanCarousel(jsonData, placeEn)
        }
      }
    ]);
}


const getPlanJson = (jsonData, placeEn) => {
  // LIFFでプラン詳細
  const planLiff = "https://liff.line.me/" + process.env.PLAN_LIFF_ID + '?planId=' + jsonData.id;
  // jsonデータからプランを取得
  return {
    "type": "bubble",
    "size": "micro",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "size": "sm",
          "text": jsonData.name
        }
      ]
    },
    "hero": {
      "type": "image",
      "url": base_url + jsonData.placeImageUrl,
      "size": "full",
      "aspectRatio": "20:13",
      "aspectMode": "cover"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": jsonData.price
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "secondary",
          "action": {
            "type": "uri",
            "label": "プランの詳細",
            "uri": planLiff
          }
        },
        {
          "type": "button",
          "style": "primary",
          "action": {
           "type":"postback",
           "label":"プランの申込",
           "data": "action=select&place="+ placeEn + "&planId=" + jsonData.id,
           "displayText":jsonData.name + "のプランを申込"
          }
        }
      ]
    },
    "styles": {
      "header": {
        "backgroundColor": "#00ffff"
      },
      "hero": {
        "separator": true,
        "separatorColor": "#000000"
      },
      "footer": {
        "separator": true,
        "separatorColor": "#000000"
      }
    }
  };
};

const getPlanCarousel = async(jsonData, placeEn) => {
  const planJsons = [];
  const randomAry = await funcRandom(jsonData);
  for (let i = 0; i < 3; i++) {
    planJsons.push(getPlanJson(jsonData[randomAry[i]], placeEn));
  }
  return planJsons;
};

// ランダム
async function funcRandom(data){
  let arr = [];
  for (let i=0; i<data.length; i++) {
    arr[i] = i;
  }
  let a = arr.length;
 
  // ランダムアルゴリズム
  while (a) {
      let j = Math.floor( Math.random() * a );
      let t = arr[--a];
      arr[a] = arr[j];
      arr[j] = t;
  }
   
  // ランダムされた配列の要素を順番に表示する
  await arr.forEach( function( value ) {} );
  return arr;
}


// リプロント
function getRepromptMsg(speechInfo){
  const speechObject = {
    type: "SimpleSpeech",
    values: speechInfo,
  };
  return speechObject;
}