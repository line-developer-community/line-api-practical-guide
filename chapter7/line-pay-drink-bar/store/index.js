export const state = () => ({
  showProgressCircle: false
})

export const mutations = {
  setProgressCircleState(state, value) {
    state.showProgressCircle = value
  }
}

export const actions = {
  progressCircleOn({ commit }) {
    commit('setProgressCircleState', true)
  },
  progressCircleOff({ commit }) {
    commit('setProgressCircleState', false)
  }
}
