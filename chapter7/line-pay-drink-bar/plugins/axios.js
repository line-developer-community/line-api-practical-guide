export default function({ $axios, redirect }) {
  $axios.onRequest((config) => {
    config.headers.common['Access-Control-Allow-Origin'] = '*'
    config.headers.common['Content-Type'] = 'application/x-www-form-urlencoded'
    config.headers.common['X-Requested-With'] = 'XMLHttpRequest'
  })
  $axios.onError((error) => {
    if (error.response.status === 500) {
      redirect('/sorry')
    }
  })
}
