<template lang="pug">
  v-container(
    fluid
    justify-center
    align-center
  )
    //- Show dispense progress bar
    v-card(
      v-if="order && !dispenseDone"
    )
      v-card-title.title
        v-layout(justify-center)
          | ありがとうございました！！
      v-card-subtitle.subtitle-2
        v-layout(justify-center)
          | ドリンクを抽出しています...
      v-card-text
        v-layout(justify-center)
          v-avatar(
            size="128"
            tile
          )
            v-img(
              :src="order.item.thumbnailUrl"
            )
        dispense-progress-bar.mt-4(
          :progressLimit="progressLimit"
          @dispenseProgressDone="dispenseProgressDone"
        )
    //- Show lottery box after dispense finished
    v-card(
      v-if="dispenseDone"
    )
      v-card-text
        v-layout(justify-center)
          lottery-box.mt-4(
            :lotteryResult="lotteryResult"
            v-show="dispenseDone"
          )
      v-card-actions
        v-layout(justify-center)
          v-btn.mt-2(
            v-show="dispenseDone"
            link
            href="/"
          )
            | もう一度購入する
</template>

<script>
import consola from 'consola'
import DispenseProgressBar from '~/components/DispenseProgressBar.vue'
import LotteryBox from '~/components/LotteryBox.vue'
import getLineAccessToken from '~/utils/liff'

export default {
  components: {
    DispenseProgressBar,
    LotteryBox
  },
  asyncData(context) {
    consola.log('transactionId', context.query.transactionId)
    const transactionId = context.query.transactionId
    return {
      transactionId
    }
  },
  data() {
    return {
      accessToken: null,
      order: null,
      transactionId: '',
      progressLimit: 3000,
      dispenseDone: false,
      lotteryResult: false
    }
  },
  async mounted() {
    this.$store.dispatch('progressCircleOn')
    const accessToken = await getLineAccessToken()
    if (!accessToken) {
      if (process.env.SKIP_LOGIN === 'true') {
        consola.warn('Skip LINE Login because of SKIP_LOGIN is set.')
        this.order = this.getDummyOrder()
      } else {
        consola.log('Need to login!')
        // eslint-disable-next-line no-undef
        liff.login()
      }
    } else {
      this.accessToken = accessToken
      // finalize payment
      const data = {
        accessToken: this.accessToken,
        transactionId: this.transactionId
      }
      const result = await this.$axios.$post(`/pay/confirm`, data)
      consola.log('result', result)
      this.order = result.order
    }
    this.progressLimit = this.order.item.dispenseTime
    if (this.order.lotteryResult === 'WIN') {
      this.lotteryResult = true
    }
    this.$store.dispatch('progressCircleOff')
  },
  methods: {
    dispenseProgressDone() {
      consola.info('Dispense Progress done!!!')
      this.dispenseDone = true
    },
    getDummyOrder() {
      // for Debug
      const order = {
        lotteryResult: 'LOSE',
        payStatus: 'PAYMENT_COMPLETED',
        userId: 'DUMMY_USER',
        transactionId: '20200418000000000000',
        item: {
          imageUrl:
            'https://my-qiita-images.s3-ap-northeast-1.amazonaws.com/line_things_drink_bar/orange_juice.jpg',
          slot: 1,
          id: 'item-0002',
          description: 'みんな大好きオレンジジュース',
          dispenseTime: 4000,
          unitPrice: 100,
          active: true,
          name: 'オレンジジュース',
          thumbnailUrl:
            'https://my-qiita-images.s3-ap-northeast-1.amazonaws.com/line_things_drink_bar/orange_juice.jpg'
        },
        amount: 100,
        id: 'ORDER-99999999999999',
        currency: 'JPY',
        quantity: 1,
        title: 'オレンジジュース'
      }
      return order
    }
  }
}
</script>

<style>
.v-card {
  box-shadow: 0px 0px 0px 0px rgba(0, 0, 0, 0), 0px 0px 0px 0px rgba(0, 0, 0, 0),
    0px 0px 0px 0px rgba(0, 0, 0, 0);
}
</style>
