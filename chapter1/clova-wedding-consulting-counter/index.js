const clova = require('@line/clova-cek-sdk-nodejs');
const line = require('@line/bot-sdk');
const express = require('express');
const lineBot = require('./messagingAPI/lineBot');
const linePayConfirm = require('./linepay/linePayConfirm');
const linePayReserve = require('./linepay/linePayReserve');
const planApi = require('./api/plan');
const clovaSkillHandler = require('./clova/clovaSkill');

// LINE BOTの設定
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'test',
    channelSecret: process.env.CHANNEL_SECRET || 'test'
};

const app = new express();
const port = 8080;

// Clova
const clovaMiddleware = clova.Middleware({ applicationId: process.env.EXTENSION_ID });
app.post('/clova', clovaMiddleware, clovaSkillHandler);

// LINE PAY
app.get('/linepay/reserve', linePayReserve);
app.use('/linepay/confirm', linePayConfirm);

// API
app.use('/api/plan', planApi);

// LINE BOT
app.post('/linebot', line.middleware(config), lineBot);

// LIFF
app.use(express.static('liff'));
app.get('/info', function(req, res) {
    res.json({id: process.env.INFO_LIFF_ID});
});

app.listen(port, () => console.log(`Server running on ${port}`));
