<template lang="pug">
  div
    v-progress-linear(
      v-model="progress"
      color="accent"
      height="64"
      rounded
    )
      strong
        | 抽出中
</template>

<script>
import consola from 'consola'

export default {
  props: {
    progressLimit: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      progress: 0
    }
  },
  mounted() {
    this.progressBar(this.progressLimit)
  },
  methods: {
    progressBar(limit) {
      const max = 100
      const intervalTime = 100
      const progressPerIntervalTime = max / (limit / intervalTime)
      const disappearLimit = max + progressPerIntervalTime * 10
      const interval = setInterval(() => {
        this.progress += progressPerIntervalTime
        consola.debug('Progress', this.progress)
        if (this.progress >= disappearLimit) {
          clearInterval(interval)
          this.$emit('dispenseProgressDone')
        }
      }, intervalTime)
    }
  }
}
</script>
