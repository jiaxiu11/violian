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

  updateFeedback(recordingId, updatedTranscription) {
    return Api().post(`recording/update-notes?rid=${recordingId}`, {transcription:updatedTranscription})
  },

  delete (recordingId) {
    return Api().delete(`recording/del?rid=${recordingId}`)
  },

  getUnreadComments () {
    return Api().get(`recording/get-unread-comments`)
  },

  markAsRead(recordingId) {
    return Api().post(`/recording/mark?rid=${recordingId}`)
  }
}