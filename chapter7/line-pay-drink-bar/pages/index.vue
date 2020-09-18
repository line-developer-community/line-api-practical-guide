<template lang="pug">
  v-layout(
    column
    justify-center
    align-center
  )
    v-flex(
      xs12
      sm12
      md12
      lg12
      xl12
    )
      item-list(
        :items="items"
        @purchaseItem="purchaseItem"
      )
</template>

<script>
import consola from 'consola'
import ItemList from '~/components/ItemList.vue'
import getLineAccessToken from '~/utils/liff'

export default {
  components: {
    ItemList
  },
  asyncData(context) {
    return {
      items: context.req.items
    }
  },
  data() {
    return {
      items: null,
      accessToken: null
    }
  },
  async mounted() {
    const accessToken = await getLineAccessToken()
    if (!accessToken) {
      if (process.env.SKIP_LOGIN === 'true') {
        consola.warn('Skip LINE Login because of SKIP_LOGIN is set.')
      } else {
        consola.log('Need to login!')
        // eslint-disable-next-line no-undef
        liff.login()
      }
    } else {
      this.accessToken = accessToken
    }
  },
  methods: {
    async purchaseItem(item) {
      consola.log('purchaseItem called!', Object.assign({}, item))
      this.$store.dispatch('progressCircleOn')
      const data = {
        accessToken: this.accessToken,
        item
      }
      const result = await this.$axios.$post(`/pay/request`, data)
      consola.log('result', result)
      // Move to LINE Pay payment page
      window.location.href = result.paymentUrl
    }
  }
}
</script>
