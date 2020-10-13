const consola = require('consola')
const liffId = process.env.LIFF_ID

function getLineAccessToken() {
  return new Promise((resolve) => {
    consola.log('LIFF_ID', liffId)
    const liff = window.liff
    liff
      .init({ liffId })
      .then(async () => {
        consola.log('LIFF initialized!')
        const accessToken = await liff.getAccessToken()
        consola.info('LINE Access token', accessToken)
        resolve(accessToken)
      })
      .catch((err) => {
        consola.warn('LIFF initialization failed', err)
        resolve(null)
      })
  })
}

export default getLineAccessToken
