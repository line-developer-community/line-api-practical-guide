//モジュールを読み込み
const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');

//環境変数を取得
const channelId = process.env.channelId;
const channelSecret = process.env.channelSecret;
const redirectUri = process.env.redirectUri;
const s3Url = process.env.s3Url;

const issuer = 'https://access.line.me';

//Lambda関数が呼び出された時に呼び出される関数
exports.handler = async (event, context) => {
    //パスを取得
    const path = event.path;
    //レスポンスを定義
    let res;
    //パスによって条件分岐
    switch (path) {
        case '/authorize':
            //authorizeFuncを呼び出し
            res = authorizeFunc();
            break;
        case '/callback':
            //callbackFuncを呼び出し
            res = await callbackFunc(event);
            break;
    }

    //レスポンスを返す
    return res;
};

const authorizeFunc = () => {
    //レスポンスのインスタンスを生成
    const response = new Response();
    //CSRF防止用の文字列を生成
    const state = crypto.randomBytes(32).toString('hex');
    //stateのハッシュ値を算出
    const stateHash = crypto.createHash('sha3-256').update(state).digest('hex');
    //リプレイアタック防止用の文字列を生成
    const nonce = crypto.randomBytes(32).toString('hex');
    //nonceのハッシュ値を算出
    const nonceHash = crypto.createHash('sha3-256').update(nonce).digest('hex');

    //Authentication Requestを送信するためのレスポンスを生成
    response.statusCode = 302;
    response.headers.Location = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${stateHash}&scope=openid%20email%20profile&nonce=${nonceHash}`;
    response.multiValueHeaders = {
        'Set-Cookie': [`state=${state}; HttpOnly; Secure`, `nonce=${nonce}; HttpOnly; Secure`]
    };

    return response;
};

const callbackFunc = async (event) => {
    //レスポンスのインスタンスを生成
    const response = new Response();
    //パラメータを取得
    const params = event.queryStringParameters;

    //パラメータに"error"という項目が含まれていた場合
    if (params.error) {
        //エラーを出力
        console.log(`Error: ${params.error}`);
        //エラーページにリダイレクトさせるレスポンスを生成
        response.statusCode = 302;
        response.headers.Location = `${s3Url}/error/error.html`;
        response.body = JSON.stringify({
            status: 'error'
        });
        return response;
    }

    //パラメータからAuthorization Codeを取得
    const code = params.code;
    //パラメータからstate（Authentication Request時に送信したCSRF防止用の文字列）を取得
    const callbackState = params.state;
    //リクエストヘッダからCookieを取得
    const cookie = event.headers.cookie.split('; ');
    //Cookieからstateとnonceを取得し、オブジェクトにして返す
    const cookieObjectFunc = () => {
        const cookieObject = {};
        for (const property in cookie) {
            if (cookie.hasOwnProperty(property)) {
                if ((cookie[property]).indexOf('state') != -1) {
                    cookieObject['state'] = cookie[property].slice(6);
                }
                if ((cookie[property]).indexOf('nonce') != -1) {
                    cookieObject['nonce'] = cookie[property].slice(6);
                }
            }
        }
        return cookieObject;
    };
    const cookieObject = cookieObjectFunc();
    //リクエストパラメータから取得したstateのハッシュとCookieから取得したstateのハッシュが同じものか確認する
    //違うものだった場合はCSRF攻撃を受けている可能性があるため、エラーページへリダイレクトして再ログインを要求する
    if (callbackState !== crypto.createHash('sha3-256').update(cookieObject.state).digest('hex')) {
        //stateを出力
        console.log(`Error: callbackState: ${callbackState}, cookieState: ${cookieObject.state}`);
        response.statusCode = 302;
        response.headers.Location = `${s3Url}/error/error.html`;
        response.body = JSON.stringify({
            status: 'error'
        });
        return response;
    }

    //アクセストークン発行のapiを叩く
    const res = await axios.post('https://api.line.me/oauth2/v2.1/token', qs.stringify({
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirectUri,
            'client_id': channelId,
            'client_secret': channelSecret
        }))
        .catch((err) => {
            console.log(`Error: ${err.response}`);
            return 'err';
        });

    if (res === 'err') {
        //エラーページへリダイレクト
        response.statusCode = 302;
        response.headers.Location = `${s3Url}/error/error.html`;
        response.body = JSON.stringify({
            status: 'error'
        });
        return response;
    }

    //レスポンスボディ
    const resBody = res.data;

    //statusを定義
    let status;

    //ID Tokenを取り出す
    const jwtIdToken = resBody.id_token;
    //ID Tokenを`.`で区切って配列にする
    const idTokenArr = jwtIdToken.split('.');
    //ヘッダとペイロード部分だけを`.`で結合
    const validSignatureTarget = [idTokenArr[0], idTokenArr[1]].join('.');
    //ID Tokenから署名を取りだす
    const signature = idTokenArr[2];

    //channelSecretを鍵にしてvalidSignatureTargetのMAC値を算出し、それをBase64urlに変換
    const hmac = crypto.createHmac('sha256', channelSecret).update(validSignatureTarget).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    //署名検証
    if (signature !== hmac) {
        console.log('signature validate error', signature, hmac);
        status = 'error';
    }

    //ID Tokenのペイロードを取り出し、base64でデコードしてstringに変換し、オブジェクトにperse
    const idTokenPayload = JSON.parse(Buffer.from(idTokenArr[1], 'base64').toString());

    //issを検証
    if (idTokenPayload.iss !== issuer) {
        console.log('issuer validate error', idTokenPayload.iss, issuer);
        status = 'error';
    }

    //audを検証
    if (idTokenPayload.aud !== channelId) {
        console.log('audience validate error', idTokenPayload.aud, channelId);
        status = 'error';
    }

    //現在時刻のunix時間を取得
    const date = new Date();
    const time = Math.floor(date.getTime() / 1000);
    //expを検証
    if (idTokenPayload.exp < time) {
        console.log('expiration validate error', idTokenPayload.exp, time);
        status = 'error';
    }

    //cookieからnonceを取り出してハッシュ値をとる
    const cookieNonceHash = crypto.createHash('sha3-256').update(cookieObject.nonce).digest('hex');
    //nonceのハッシュ値を検証
    if (idTokenPayload.nonce !== cookieNonceHash) {
        console.log('nonce validate error', idTokenPayload.nonce, cookieNonceHash);
        status = 'error';
    }

    //ID Tokenの検証における一連の流れでエラーが発生した場合はエラーページへリダイレクト
    if (status === 'error') {
        response.statusCode = 302;
        response.headers.Location = `${s3Url}/error/error.html`;
        response.body = JSON.stringify({
            status: 'error'
        });
        return response;
    }

    //jsonwebtokenというライブラリを使えば以下のコードでID Tokenの検証ができます
    //IDトークンをデコードする
    /*
    const jsonwebtoken = require('jsonwebtoken');
    const idToken = await new Promise((resolve, reject) => {
        jsonwebtoken.verify(resBody.id_token, channelSecret, {
            issuer: 'https://access.line.me',
            audience: channelId,
            nonce: crypto.createHash('sha3-256').update(cookieObject.nonce).digest('hex')
        }, (err, decoded) => {
            if (err) {
                console.log(`Error: ${err}`);
                reject('err');
            } else {
                resolve(decoded);
            }
        });
    });*/

    //プロフィール表示ページへリダイレクトさせるためのレスポンスを生成
    response.statusCode = 302;
    response.headers.Location = `${s3Url}/profile/profile.html?userId=${idTokenPayload.sub}&displayName=${encodeURIComponent(idTokenPayload.name)}&pictureUrl=${idTokenPayload.picture}&email=${idTokenPayload.email}`;
    //Cookieに保存していたstateとnonceはもういらないので削除
    response.multiValueHeaders = {
        'Set-Cookie': ['state=; HttpOnly; expires=Fri, 31-Dec-1999 23:59:59 GMT', 'nonce=; HttpOnly; expires=Fri, 31-Dec-1999 23:59:59 GMT;']
    };
    response.body = JSON.stringify({
        status: 'succeed'
    });
    return response;
};

//レスポンスのクラスを生成
class Response {
    constructor() {
        this.statusCode = '';
        this.headers = {};
        this.multiValueHeaders = {};
        this.body = '';
    }
}