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

  updateFeedback(recordingId, updatedTranscription, updatedOverallComment=null) {
    return Api().post(
        `recording/update-notes?rid=${recordingId}`,
        {transcription:updatedTranscription, overallComment: updatedOverallComment}
    );
  },

  delete (recordingId) {
    return Api().delete(`recording/del?rid=${recordingId}`)
  },

  getUnreadComments () {
    return Api().get(`recording/get-unread-comments`)
  },

  getUncommentedRecordings () {
    return Api().get(`recording/get-uncommented-recordings`)
  },

  markAsRead(recordingId) {
    return Api().post(`/recording/mark-read?rid=${recordingId}`)
  },

  markAsCommented(recordingId) {
    return Api().post(`/recording/mark-commented?rid=${recordingId}`)
  }
}