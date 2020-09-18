/* eslint-disable nuxt/no-cjs-in-config */
const colors = require('vuetify/es5/util/colors').default
// load dotenv
const dotEnvPath =
  process.env.NODE_ENV !== 'production' ? '.env' : './config/.env.prod'
require('dotenv').config({ path: dotEnvPath })

module.exports = {
  mode: 'universal',
  /*
   ** Headers of the page
   */
  head: {
    title: 'LINE Pay Drink Bar',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: process.env.npm_package_description || ''
      },
      {
        hid: 'og:site_name',
        property: 'og:site_name',
        content: 'LINE Pay Drink Bar'
      },
      { hid: 'og:type', property: 'og:type', content: 'website' },
      {
        hid: 'og:url',
        property: 'og:url',
        content: 'https://linepaydrinkbar.an.r.appspot.com'
      },
      { hid: 'og:title', property: 'og:title', content: 'LINE Pay Drink Bar' },
      {
        hid: 'og:description',
        property: 'og:description',
        content: process.env.npm_package_description || ''
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: 'https://linepaydrinkbar.an.r.appspot.com/images/icon.png'
      }
    ],
    script: [
      { src: 'https://static.line-scdn.net/liff/edge/2.1/sdk.js' },
      {
        src:
          'https://cdnjs.cloudflare.com/ajax/libs/vConsole/3.3.4/vconsole.min.js'
      }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
  },
  // PWA Setting
  manifest: {
    name: 'LINE Pay Drink Bar',
    lang: 'ja',
    short_name: 'LINE Pay Drink Bar',
    title: 'LINE Pay Drink Bar',
    description: 'LINE Pay Drink Bar is a sample product using LINE APIs.',
    theme_color: '#ffffff',
    background_color: '#ffffff'
  },
  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#5ded47' },
  /*
   ** Global CSS
   */
  css: ['animate.css/animate.min.css'],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [{ src: '~/plugins/axios.js' }],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [
    // Doc: https://github.com/nuxt-community/eslint-module
    '@nuxtjs/eslint-module',
    '@nuxtjs/vuetify'
  ],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    '@nuxtjs/pwa'
    // Doc: https://github.com/nuxt-community/dotenv-module
    // '@nuxtjs/dotenv'
  ],
  /*
   ** Axios module configuration
   ** See https://axios.nuxtjs.org/options
   */
  axios: {
    baseURL: process.env.API_BASE_URL || 'http://api.example.com',
    browserBaseURL: process.env.API_BASE_URL || 'http://api.example.com',
    credentials: false
  },
  // dotenv: {
  //   path: process.cwd()
  // },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:3000',
    USE_VCONSOLE: process.env.USE_VCONSOLE || false,
    SKIP_LOGIN: process.env.SKIP_LOGIN || false,
    LIFF_ID: process.env.LIFF_ID || '',
    LIFF_CHANNEL_ID: process.env.LIFF_CHANNEL_ID || '',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || '',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
    LINE_PAY_CHANNEL_ID: process.env.LINE_PAY_CHANNEL_ID || '',
    LINE_PAY_CHANNEL_SECRET: process.env.LINE_PAY_CHANNEL_SECRET || ''
  },
  /*
   ** vuetify module configuration
   ** https://github.com/nuxt-community/vuetify-module
   */
  vuetify: {
    customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3
        },
        light: {
          primary: '#00b900',
          accent: '#008700',
          secondary: '#5ded47',
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3
        }
      }
    }
  },
  /*
   ** Build configuration
   */
  build: {
    // for PWA with Safari
    filenames: {
      app: ({ isDev }) => (isDev ? '[name].[hash].js' : '[chunkhash].js'),
      chunk: ({ isDev }) => (isDev ? '[name].[hash].js' : '[chunkhash].js')
    },
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      // Run ESLint on save
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    }
  }
}
