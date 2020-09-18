const Router = require('express-promise-router')
const router = new Router()
const { v4: uuidv4 } = require('uuid')
const admin = require('firebase-admin')
const Obniz = require('obniz')
const request = require('request')
const Promise = require('bluebird')
Promise.promisifyAll(request)

const bunyan = require('bunyan')
const LinePay = require('./line-pay/line-pay')

// Initialize logger
const logger = bunyan.createLogger({
  name: 'LinePayDrinkBar-Pay'
})

// obniz setting values
const obnizDeviceId = process.env.OBNIZ_DEVICE_ID
const obnizApiToken = process.env.OBNIZ_API_TOKEN

// Initialize firebase-admin
if (process.env.NODE_ENV === 'production') {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
} else {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
}
const database = admin.firestore()
const ordersRef = database.collection('orders')

// LINE Pay
const payApi = new LinePay({
  channelId: process.env.LINE_PAY_CHANNEL_ID,
  channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
  isSandbox: true
})

router.post('/request', async (req, res) => {
  const data = req.body
  logger.info('Passed data', data)
  const item = data.item
  const accessToken = data.accessToken
  const userId = await verifyAndGetLineUserId(accessToken)
  logger.info('LINE userId', userId)
  // set Order info before Pay Request
  const order = await generateOrder(userId, item)
  const payOptions = setupPayOption(req, item)
  await payApi
    .request(payOptions)
    .then(async (response) => {
      logger.info(`LINE Pay Request API result`, response)
      order.transactionId = response.info.transactionId
      order.payStatus = 'REQUESTED'
      // API Result
      logger.info(`Return code: ${response.returnCode}`)
      logger.info(`Return message: ${response.returnMessage}`)
      logger.info(`Reservation was made. Detail is following.`)
      logger.info(`Order: ${order}`)
      // Update requested order
      await setOrder(order)
      // return LINE Pay payment URL to front
      res.send({
        paymentUrl: response.info.paymentUrl.web
      })
    })
    .catch((error) => {
      // error
      logger.info(`Error at LINE Pay Request API...: ${error}`)
    })
})

async function generateOrder(userId, item) {
  const order = {
    id: uuidv4(),
    userId,
    item,
    quantity: 1,
    title: item.name,
    payStatus: 'ORDERED',
    amount: item.unitPrice,
    currency: 'JPY',
    orderedAt: new Date(),
    lotteryResult: ''
  }
  return await setOrder(order)
}

function setupPayOption(req, item) {
  const quantity = 1
  const amount = item.unitPrice * quantity
  // for V3
  const product = {
    id: item.id,
    name: item.name,
    imageUrl: item.thumbnailUrl,
    quantity,
    price: amount
  }
  const packages = [
    {
      id: `PKG_${uuidv4()}`,
      amount,
      name: item.name,
      products: [product]
    }
  ]
  const options = {
    amount,
    currency: 'JPY',
    orderId: `ORDER_${uuidv4()}`,
    packages,
    redirectUrls: {
      confirmUrl: `https://${req.get('Host')}${req.baseUrl}/paid`,
      confirmUrlType: 'CLIENT',
      cancelUrl: `https://${req.get('Host')}${req.baseUrl}/cancel`
    },
    options: {
      display: {
        locale: 'ja',
        checkConfirmUrlBrowser: false
      },
      payment: {
        capture: true
      }
    }
  }
  return options
}

router.post('/confirm', async (req, res) => {
  const data = req.body
  logger.info('Passed data', data)
  const transactionId = data.transactionId
  logger.info('transactionId', transactionId)
  const accessToken = data.accessToken
  const userId = await verifyAndGetLineUserId(accessToken)
  // Get order info by userId and transactionId
  const order = await getOrderByTransactionId(userId, transactionId)
  // Pay Confirm
  const confirmedOrder = await confirmPayment(order)
  logger.info('Confirmed order', confirmedOrder)
  if (confirmedOrder) {
    logger.info('Payment completed!')
    // Dispense drink
    dispenseDrink(order.item.slot, order.item.dispenseTime)
    // Draw Lots
    order.payStatus = 'PAYMENT_COMPLETED'
    order.paidAt = new Date()
    order.lotteryResult = drawLots()
    order.drawLotsAt = new Date()
  } else {
    // Confirm failed
    logger.error('Payment failed...')
    order.payStatus = 'PAYMENT_ERROR'
  }
  // Update Order
  await setOrder(order)
  // return Order info
  res.json({
    order
  })
})

function confirmPayment(order) {
  return new Promise((resolve) => {
    if (!order) {
      // return null when Order is invalid
      resolve(null)
    }
    // Confirm payment options
    const options = {
      transactionId: order.transactionId,
      amount: order.amount,
      currency: order.currency
    }
    payApi
      .confirm(options)
      .then((response) => {
        logger.info('LINE Pay Confirm API Response', JSON.stringify(response))
        // Pay complete
        order.payStatus = 'PAYMENT_COMPLETED'
        resolve(order)
      })
      .catch((error) => {
        logger.error('Error at LINE Pay Confirm API', error)
        // Return null when Confirm API failed
        resolve(null)
      })
  })
}

// Set pin assign for DCMotors on your obniz Board
const obnizSlotInfo = [
  { forward: 0, back: 1 },
  { forward: 2, back: 3 },
  { forward: 4, back: 5 }
]

function dispenseDrink(slot, dispenseTime) {
  return new Promise((resolve) => {
    console.log('Initializing obniz...')
    console.log('Slot', slot)
    console.log('Dispense time', dispenseTime)
    const obniz = new Obniz(obnizDeviceId, {
      auto_connect: false,
      access_token: obnizApiToken
    })
    obniz.connect()
    obniz.onconnect = function() {
      logger.info('Connected to your obniz device!! [', obnizDeviceId, ']')
      obniz.display.clear()
      obniz.display.print('LINE Pay Drink Bar')
      // Dispense setting
      const slotInfo = obnizSlotInfo[slot]
      const forwardPort = slotInfo.forward
      const backPort = slotInfo.back
      // Start dispense
      const motor = obniz.wired('DCMotor', {
        forward: forwardPort,
        back: backPort
      })
      obniz.display.clear()
      obniz.display.print(`Dispensing at [Slot: ${slot}]`)
      motor.power(100)
      motor.forward()
      setTimeout(function() {
        // Dispense finished
        motor.stop()
        // Close obniz connection
        obniz.close()
        resolve()
      }, dispenseTime)
    }
  })
}

function drawLots() {
  const max = 100
  const min = 1
  const draw = Math.floor(Math.random() * (max - min)) + min
  let result = 'LOSE'
  if (draw >= 33) {
    result = 'WIN'
  }
  return result
}

// ------------------------------------
// LINE API functions
// ------------------------------------

async function verifyAndGetLineUserId(accessToken) {
  try {
    await verifyAccessToken(accessToken)
  } catch (error) {
    logger.error('Verify access token failed...', error)
    return new Error('Verify access token failed...', error)
  }
  try {
    const profile = await getLineProfile(accessToken)
    return profile.userId
  } catch (error) {
    logger.error('Get LINE user id failed...', error)
    return new Error('Get LINE user id failed...', error)
  }
}

async function verifyAccessToken(accessToken) {
  const url = `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`
  return await request.getAsync({ url, json: true }).then((response) => {
    logger.info('Response', response.body)
    logger.info('Status Code', response.statusCode)
    if (response.statusCode !== 200) {
      logger.error(response.body.error_description)
      return Promise.reject(new Error(response.body.error))
    }
    // Check client_id
    if (response.body.client_id !== process.env.LIFF_CHANNEL_ID) {
      return Promise.reject(
        new Error(`client_id does not match...: ${response.body.client_id}`)
      )
    }
    // Check expire or not
    if (response.body.expires_in < 0) {
      throw new Error('access token is expired.')
    }
  })
}

async function getLineProfile(accessToken) {
  const url = `https://api.line.me/v2/profile`
  const headers = {
    Authorization: `Bearer ${accessToken}`
  }
  return await request
    .getAsync({
      url,
      headers,
      json: true
    })
    .then((response) => {
      logger.info('Response', response.body)
      logger.info('Status Code', response.statusCode)
      if (response.statusCode !== 200) {
        logger.error(response.body.error_description)
        return Promise.reject(new Error(response.body.error))
      }
      logger.info('LINE Profile', response.body)
      return response.body
    })
}

// ------------------------------------
// Firebase access functions
// ------------------------------------

function setOrder(order) {
  return new Promise((resolve) => {
    console.log('Add order', order)
    ordersRef.doc(order.id).set(Object.assign({}, order))
    resolve(order)
  })
}

function getOrderByTransactionId(userId, transactionId) {
  return new Promise((resolve) => {
    ordersRef
      .where('userId', '==', userId)
      .where('transactionId', '==', transactionId)
      .get()
      .then((snapshot) => {
        const orders = []
        snapshot.forEach((doc) => {
          orders.push(doc.data())
        })
        if (orders.length > 0) {
          resolve(orders[0])
        } else {
          resolve(null)
        }
      })
  })
}

module.exports = router
