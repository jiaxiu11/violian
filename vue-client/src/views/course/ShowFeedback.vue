<template lang="pug">
  div(v-if="course && lesson")
    v-container.pa-0(fluid)
      v-row
        v-col
          h1 Feedback

      v-row
        v-col
          v-menu(offset-y)
            template(v-slot:activator='{ on, attrs }')
              v-btn(light v-bind='attrs' v-on='on') Past Submissions
                v-icon(right dark) mdi-menu-down
            v-list
              v-list-item(v-for='(recording, index) in recordings' :key='index' @click="updateFeedback($event, index)")
                v-list-item-title {{ recording.audioFilename }}
      
      v-row
        v-col
          score-feedback(v-if="currEx && currRecording" :currEx="currEx" :isBoth="true" :recording="currRecording")

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
        this.currRecording = recordings[0]
      }
    },

    updateFeedback (event, idx) {
      this.currRecording = this.recordings[idx]
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
