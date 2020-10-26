<template lang="pug">
  div(v-if="course && lesson")
    v-container.pa-0(fluid)
      v-row(justify="center")
        h1 Do A Live Recording Here:
      audio-recorder(v-if="currEx" :currEx="currEx" v-on:timeUpdate="updateElapsedTime" :start="onStart")
      v-row(style="margin-top: 20px;" justify="center")
        h1 Or Upload Your Audio File Here:
      v-row(justify="center")
        v-col(cols="6")
          v-file-input(v-model="newAudio" label="Upload audio..." outlined color="indigo" dense)
          v-btn(color="#ec5252" dark @click="submitAudio()" style="margin-top: 2px;") Submit
      v-row
        v-col
          score-feedback(v-if="currEx" :currEx="currEx" :isScore="true" :elapsedTime="elapsedTime/1000" :start="start")

</template>

<script>
/* eslint-disable */
import EvaluationLineGraph from "../EvaluationLineGraph";
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
      newAudio: null,
      currEx: null,

      elapsedTime: 0,
      start: false
    }
  },
  methods: {
    updateElapsedTime (time) {
      this.elapsedTime = time
    },

    onStart () {
      this.start = true
    },

    async submitAudio (event) {
      // let feedback = (await RecordingService.getFeedback(5)).data.recording.transcription
      // this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
      if (this.newAudio) {
        console.log(this.newAudio);
        let formData = new FormData()
        formData.set('eid', this.currEx.id)
        formData.append('audio', this.newAudio)
        let recording = (await RecordingService.create(formData)).data.recording
        let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
      } else {
        alert('Please input an audio file to gain feedback')
      }
    },
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
