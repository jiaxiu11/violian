import Api from '@/services/Api'

export default {
  create (formdata) {
    return Api().post('recording/new', formdata)

  },

  list (exerciseId) {
    return Api().get(`recording/list?eid=${exerciseId}`)
  },

  getFeedback (recordingId) {
    return Api().get(`recording/get-notes?rid=${recordingId}`)
  },

  delete (recordingId) {
    return Api().delete(`recording/del?rid=${recordingId}`)
  }
}