<template lang="pug">
  div(v-if="course && lesson")
    v-container.pa-0(fluid)
      v-row(no-gutters)
        v-col(cols="9").pa-0
          v-row.ma-0(style="width: 100%;")
            v-col.pa-0#title
              h1.font-weight-bold.pl-8.py-2 {{ course.name }}
          v-row.ma-0(style="width: 100%;")
            v-col.pa-0
              video-player(:exercise="this.lesson.exercises[0]" :videoSrc="videoSrc" v-if="isVideoContent")

          v-container(v-if="is_student")
            v-row.mx-6
              v-col
                h1.font-weight-bold.py-2 Learn more by interacting with the tutor!

            v-row.mx-6(justify="space-around")
              v-col.px-4(cols="6" lg="5")
                v-card(elevation="3" shaped)
                  v-img.white--text.align-end(height="200" :src="require('../../assets/recording.png')" gradient="to top right, rgba(0,0,0,.5), rgba(0,0,0,.5)")
                    v-card-title(style="text-shadow: 1px 1px 2px #000000;") Record your practice
                  //- div.text-center.py-4.card-title Record your practice
                  div.px-4.pt-4.pb-0.text-left.text-primary Record your practice audio either on our platform or upload the audio file of your recording. The tutor will give feedback as soon as possible!
                  v-card-actions
                    v-btn.mx-auto.px-6.action-button(large color="indigo" dark @click="modal = true") Upload
                      v-icon(right dark) mdi-cloud-upload

                    v-btn.mx-auto.px-6.action-button(large color="indigo" dark :to="`/recording/new/${course.id}/lesson/${lesson.id}`") Record
                      v-icon(right dark size="20") mdi-record-circle-outline

              v-col.px-4(cols="6" lg="5")
                v-card(elevation="3" shaped style="height: 100%; position:relative;")
                  v-img.white--text.align-end(height="200" :src="require('../../assets/feedback1.png')" gradient="to top right, rgba(0,0,0,.5), rgba(0,0,0,.5)")
                    v-card-title(style="text-shadow: 1px 1px 2px #000000;") View the feedback
                  //- div.text-center.py-4.card-title View feedback from tutor
                  div.px-4.pt-4.pb-0.text-left.text-primary See the feedback given in line graphs. You can also play the parts highlighted to compare the difference between yours and the answer!
                  v-card-actions(style="position:absolute;  width: 100%; bottom:0; left:0;")
                    v-btn.mx-auto.px-6.action-button(large color="indigo" dark :to="`/feedback/show/${course.id}/lesson/${lesson.id}`") View
                      v-icon(right dark size="20") mdi-arrow-right
                      
          //- v-row
          //-   v-col
          //-     v-menu(offset-y)
          //-       template(v-slot:activator='{ on, attrs }')
          //-         v-btn(light v-bind='attrs' v-on='on') Past Submissions
          //-           v-icon(right dark) mdi-menu-down
          //-       v-list
          //-         v-list-item(v-for='(recording, index) in recordings' :key='index' @click="updateFeedback($event, index)")
          //-           v-list-item-title {{ recording.audioFilename }}

          //- v-row
          //-   v-col
          //-     score-feedback(v-if="currEx != null && currRecording != null" :currEx="currEx" :isBoth="true" :recording="currRecording")

        v-col.pa-0(cols="3" style="border-bottom: 1px solid #BDBDBD; border-left: 1px solid #BDBDBD; position: fixed; right:0;" :class="{ 'full-height': fullHeight, 'partial-height': !fullHeight }")
          h1.font-weight-bold.pl-4.py-2(style="background-color:#EEEEEE;") Lessons

          v-list.py-0
            v-list-item.px-0(v-for='(currLesson, lessonIdx) in course.lessons' :key='lessonIdx')
              v-expansion-panels.px-0(accordion flat hover tile dense v-if="currLesson == lesson && lesson.exercises.length > 1" v-model="opened" multiple)
                v-expansion-panel
                  v-expansion-panel-header.py-0.pl-4.pr-2(style="font-size: 16px; background-color:#C5CAE9;") {{ lessonIdx + 1 }}. {{currLesson.name}}
                  v-expansion-panel-content.pa-0
                    v-list.py-0
                      v-list-item-group.py-0
                        v-list-item.px-0(v-for="(exercise, exerciseIdx) in currLesson.exercises" @click="videoSrc = exercise.videoUrl" :key="exerciseIdx")
                          v-list-item-content
                            div.pl-4.text-decoration-underline(style="font-size: 14px; color:#291957;") {{ exercise.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson == lesson && lesson.exercises.length == 1")
                a.link.pl-4.py-5(style="font-size: 16px; background-color:#C5CAE9;") {{ lessonIdx + 1 }}. {{ currLesson.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson != lesson")
                a.link.pl-4.py-5(style="font-size: 16px;" @click="goToLesson($event, currLesson)") {{ lessonIdx + 1 }}. {{ currLesson.name }}

      //- modal
      v-row(justify='center')
        v-dialog(v-model='modal' max-width='320')
          v-card
            v-container.text-center
              v-row
                v-col(cols="12")
                  h2 Audio upload
              v-row(justify="center")
                v-form.pa-0(:ref="`audioForm`" style="width: 100%;")
                  v-col(cols="12")
                    v-file-input.pr-3(v-model="newAudio" label="Upload audio..." outlined color="indigo" dense accept="audio/*" :rules="requiredRules")
                  v-col(cols="12")
                    v-text-field.px-3(dense label='BPM at which you recorded' name='bpm' v-model='bpm' outlined color="indigo" :rules="requiredRules")
                    v-btn(color="#ec5252" dark @click="submitAudio" style="margin-top: 2px;" :loading="loading") Submit

</template>

<script>
/* eslint-disable */
import EvaluationLineGraph from "../../views/EvaluationLineGraph";
import vexUI from "@/plugins/vex";
import vexUtils from "@/plugins/vexUtils"
import { mapState } from "vuex";
import utils from "@/utils";
import videojs from "video.js";
import "videojs-hotkeys"
import CourseService from "@/services/CourseService"
import VideoPlayer from "@/components/Course/VideoPlayer"
import RecordingService from "@/services/RecordingService"
import AudioRecorder from "@/components/Course/AudioRecorder"
import ScoreAndFeedback from "./ScoreAndFeedback"

export default {
  name: 'ShowLesson',
  components: {
    'video-player': VideoPlayer,
    'audio-recorder': AudioRecorder,
    'line-graph': EvaluationLineGraph,
    'score-feedback': ScoreAndFeedback
  },
  data () {
    return {
      course: null,
      lesson: null,

      // exercise info
      currEx: null,

      // video events
      isVideoContent: true,

      // osmd renderer
      osmd: null,
      videoOsmd: null,
      from: 1,
      to: 2,

      // page design
      fullHeight: false,
      opened: [0],
      videoSrc: '',
      modal: false,
      newAudio: null,
      loading: false,

      bpm: '',
      requiredRules: [
        v => !!v || "This field is required"
      ],
    }
  },
  watch: {
    bpm: function (val) {
      this.bpm_label = "BPM: " + val;
    },
    no_bars: function (val) {
      this.bars_label = "No. Bars: " + val;
    },
    // playbackBpm: function (val) {
    //   this.player.playbackRate(val / this.bpm)
    // }
    '$route.params.lesson_id': function (val) {
      this.$router.go()
    },
  },
  computed: {
    secondsPerRow () {
      return (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature.split('/')[0]) * 4;
    },

    is_student () {
      return this.user.isStudent
    },

    ...mapState(["user", "students", "subscribedTutors"])
  },
  methods: {

    goToLesson (event, lesson) {
      this.$router.push({
        name: `showlesson`,
        params: {
          course_id: this.course.id,
          lesson_id: lesson.id,
          course: this.course,
          lesson: lesson
        }
      })
    },

    async submitAudio (event) {
      if (this.$refs['audioForm'].validate()) {
        let formData = new FormData()
        formData.set('eid', this.currEx.id)
        formData.set('bpm', this.currEx.bpm)
        formData.append('audio', this.newAudio)
        this.loading = true
        try {
          let recording = (await RecordingService.create(formData)).data.recording
          let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
          alert('Success!')
        } catch (e) {
          console.log(e)
        } finally {
          this.loading = false
          this.modal = false
          alert('success!')
        }
      }
    },

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
    let response = await CourseService.show(this.$route.params.course_id)
    this.course = response.data.course
    this.lesson = this.course.lessons.find(lesson => lesson.id == this.$route.params.lesson_id)
    
    this.videoSrc = this.lesson.exercises[0].videoUrl
    this.currEx = this.lesson.exercises[0]
    
    this.getPastFeedback()

    window.addEventListener('scroll', () => {
      if (window.pageYOffset == 0) {
        this.fullHeight = false
      } else if (window.pageYOffset > 64) {
        this.fullHeight = true
      }
    })
  },

  beforeDestroy() {
    if (this.player) {
        this.player.dispose()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
 
/* 
bg: #5d646e
slider-bg: #72839d
 */
.hide {
  opacity: 0 !important;
  visibility: hidden !important;
}

.bpm-control {
  background-color: rgba(43, 51, 63, 0.7); 
  position: absolute; 
  bottom: 30px; 
  left: 12px; 
  width: 30px;
  visibility: visible;
  opacity: 1;
  transition: visibility 1000ms, opacity 1000ms;
}

#title {
  background-color: #1e1e1c;
  color: white;
}

.selected-border {
  background-color: #E8EAF6;
}

.full-height {
  height: 100vh;
  top: 0;
}

.partial-height {
  height: calc(100vh - 64px);
}

.link:hover {
  background-color: #FAFAFA;
}

.link, .link:link, .link:visited, .link:active, .link:hover {
  text-decoration: none;
  color: #1e1e1c;
}

div >>> .v-slide-group__content {
  border-bottom: 1px solid #BDBDBD;
}

.action-button {
  max-width: 40%;
  min-width: 100px;
}

.card-title {
  font-size: 1.5rem; 
  font-weight: 500; 
  line-height:2rem; 
  letter-spacing: 0.0125em; 
  word-break: break-all; 
  align-items: center;
}

</style>
