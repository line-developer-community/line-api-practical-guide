'use strict';

const uuid = require('uuid/v4');
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();
/**
「./linePay.js」のファイルは下記から持ってきました。
https://github.com/nkjm/line-pay/blob/v3/module/line-pay.js
*/
const line_pay = require('./linePay.js');
const pay = new line_pay({
    channelId: process.env.LINEPAY_CHANNEL_ID || 'test',
    channelSecret: process.env.LINEPAY_CHANNEL_SECRET || 'test',
    isSandbox: true
})

module.exports = async( req, res ) => {
    const queryString = req.query["liff.state"];
    const params = new URLSearchParams(queryString);
    const userId = params.get('userid');
    console.log(userId);
    
    // get Datastore data
    const query = datastore.createQuery('planData').filter('userId', '=', userId);
    const [planData] = await datastore.runQuery(query);
    var planName = "";
    var planImageUrl = "";
    for (const plan of planData) {
      planName = plan.planName
      planImageUrl = plan.planImageUrl
    }
    
    // Generate order information
    const options = {
        amount: 1,
        currency: 'JPY',
        orderId: uuid(),
        packages: [
            {
                id: uuid(),
                amount: 1,
                name: planName,
                products: [
                    {
                        id: uuid(),
                        name: planName,
                        imageUrl: process.env.BASE_URL + planImageUrl,
                        quantity: 1,
                        price: 1
                    }
                ]
            }
        ],
        redirectUrls: {
            confirmUrl: process.env.BASE_URL + "/linepay/confirm"
        }
    }
    
    pay.reserve(options).then(async(response) => {
        let reservation = options;
        reservation.transactionId = response.info.transactionId;
        reservation.userid = userId;

        console.log(`Reservation was made. Detail is following.`);
        console.log(reservation);

        // Save order information
        const planDataKey = datastore.key(['planData', reservation.userid]);
        const planData = {
            key: planDataKey,
            data: {
                transactionId: reservation.transactionId,
                userId: reservation.userid,
                options: reservation,
            },
        };
         
        // Saves the entity
        await datastore.save(planData);

        res.redirect(response.info.paymentUrl.web);
    })  
};