<template lang="pug">
  v-container(
    fluid
    justify-center
    align-center
  )
    h2.mx-auto.text-center(
      v-if="!showResult"
    )
      | 抽選してみよう！
    div.mt-4
      transition(
        enter-active-class="bounceInDown"
        )
        div.animated.mb-4.text-center(
          v-if="showResult"
        )
          v-avatar(
            size="128"
            tile
          )
            v-img(
                :src="getLotteryResultImage(lotteryResult)"
              )
      transition(
        enter-active-class="bounceInDown"
        )
        div.animated.display-1.font-weight-black.text-center(
          v-if="showResult"
        )
          | {{ resultTitle }}
      transition(
        enter-active-class="bounceInDown"
        )
        div.animated.headline.text-center.mt-2(
          v-if="showResult"
        )
          | {{ resultDescription }}
    div(
      v-if="!showResult"
    )
      div.mt-6
        v-layout(justify-center)
          v-avatar(
            size="128"
            tile
          )
            v-img(
              src="/images/fukubiki.png"
            )
      div.mt-6
        v-layout(justify-center)
          v-btn(
            x-large
            color="accent" 
            @click="showResult=true"
            dark
          )
            | 抽選する
</template>

<script>
export default {
  props: {
    lotteryResult: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      showResult: false,
      resultTitle: 'はずれ…',
      resultDescription: 'また挑戦してね'
    }
  },
  mounted() {
    if (this.lotteryResult) {
      this.resultTitle = 'あたり！！！'
      this.resultDescription = 'おめでとうございます〜'
    }
  },
  methods: {
    getLotteryResultImage(result) {
      let imgSrc = '/images/fukubiki_hazure.png'
      if (result) {
        imgSrc = '/images/fukubiki_atari.png'
      }
      return imgSrc
    }
  }
}
</script>
