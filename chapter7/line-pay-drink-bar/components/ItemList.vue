<template lang="pug">
  v-container(fluid)
    v-row(dense)
      v-col(
        v-for="(item) in items"
        :key="item.id"
        cols="12"
      )
        v-card(color="#f4f4f4")
          div.d-flex.flex-no-wrap
            v-avatar.ma-1.mt-6(
              tile
              size="100"
            )
              v-img(
                :src="item.thumbnailUrl"
              )
            div
              v-card-title.title.pl-0
                | {{ item.name }}
              v-card-subtitle.pb-0.pl-1
                | {{ item.description }}
              v-card-actions
                div.pl-2.mb-6.mt-4
                  v-btn(
                    color="accent"
                    large
                    @click="purchaseItem(item)"
                  )
                    | 購入する（{{ item.unitPrice }} 円）
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  methods: {
    purchaseItem(item) {
      this.$emit('purchaseItem', item)
    }
  }
}
</script>
