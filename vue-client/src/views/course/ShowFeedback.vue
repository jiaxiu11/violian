<template lang="pug">
  div(v-if="course && lesson")
    v-container
      v-row
        v-col
          h1 {{course.name}} - Feedback

      v-row
        v-col
          v-menu(offset-y)
            template(v-slot:activator='{ on, attrs }')
              v-btn(light v-bind='attrs' v-on='on') Past Submissions
                v-icon(right dark) mdi-menu-down
            v-list
              v-list-item(v-for='(recording, index) in recordings' :key='index' @click="updateFeedback($event, index)")
                v-list-item-title {{ recording.audioFilename }}

      v-row(v-if="currRecording&&currRecording.overallComment")
        v-col.ml-3
            h4 Overall comment from tutor:
            div.ml-5 {{currRecording.overallComment}}
      v-row.align-center.ml-3(v-if="shouldShowCommentTip(currRecording)")
        h4 Hover over orange notes on your recording to view tutor's comment!
        v-tooltip.ml-2(right color="#FFFFFF")
          template(v-slot:activator="{ on, attrs }")
            v-btn(icon color="orange" v-bind="attrs" v-on="on")
              v-icon mdi-information-outline
          div
            v-card
              v-card-title Hover over commented note
              v-card-subtitle Example recording with commented note
              v-card-text.justify-center
                v-img(max-height="240" max-width="300" :src="require('../../assets/orange-note-example.png')")
      v-row
        v-col
          score-feedback(v-if="currEx && currRecording" :currEx="currEx" :isShowFeedback="true" :recording="currRecording")

</template>

<script>
/* eslint-disable */
import EvaluationLineGraph from "../EvaluationLineGraph";
import RecordingService from "@/services/RecordingService"
import ScoreAndFeedback from "@/components/Course/ScoreAndFeedback"
import CourseService from "@/services/CourseService"
export default {
  name: 'ShowFeedback',
  components: {
    'score-feedback': ScoreAndFeedback,
  },
  data () {
    return {
      course: null,
      lesson: null,
      newAudio: null,
      currEx: null,
      currRecording: null,
      recordings: []
    }
  },
  methods: {
    async getPastFeedback () {
      let recordings = (await RecordingService.list(this.currEx.id)).data.recordings
      this.recordings = recordings

      if (recordings.length > 0) {
        this.currRecording = recordings[recordings.length - 1]
      }
    },

    updateFeedback (event, idx) {
      this.currRecording = this.recordings[idx]
    },

    shouldShowCommentTip(currRecording) {
      if(!(currRecording && currRecording.isCommented)) {
          return false
      }
      let notes = JSON.parse(currRecording.transcription)
      let commentedNotes = notes.filter(note=>note.comment)
      return commentedNotes.length > 0
    }
  },

  created: async function () {
    if (!this.course || !this.lesson) {
      let response = await CourseService.show(this.$route.params.course_id)
      try {
        this.course = response.data.course
      } catch (err) {
        console.log(err)
      }
      this.lesson = this.course.lessons.find(lesson => lesson.id == this.$route.params.lesson_id)
    }

    this.currEx = this.lesson.exercises[0]
    this.getPastFeedback()
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
