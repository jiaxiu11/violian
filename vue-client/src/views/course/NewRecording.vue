<template lang="pug">
  div(v-if="course && lesson")
    v-container
      v-row
        v-col(cols="12")
          h1.font-weight-bold Record your practice!
      audio-recorder(v-if="currEx" :currEx="currEx" :courseId="course.id" :lessonId="lesson.id")

</template>

<script>
/* eslint-disable */
import RecordingService from "@/services/RecordingService"
import AudioRecorder from "@/components/Course/AudioRecorder"
import ScoreAndFeedback from "@/components/Course/ScoreAndFeedback"
import CourseService from "@/services/CourseService"

export default {
  name: 'NewRecording',
  components: {
    'score-feedback': ScoreAndFeedback,
    'audio-recorder': AudioRecorder
  },
  data () {
    return {
      course: null,
      lesson: null,
      currEx: null,
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
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
