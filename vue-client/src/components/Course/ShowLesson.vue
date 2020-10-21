<template lang="pug">
  div(v-if="course && lesson")
    v-container.pa-0(fluid)
      v-row(no-gutters)
        v-col(cols="9").text-left.pa-0
          v-row.ma-0(style="width: 100%;")
            v-col.pa-0#title
              h1.font-weight-bold.pl-8.py-2 {{ course.name }}
          v-row.ma-0(style="width: 100%;")
            v-col.pa-0
              video-player(:exercise="this.lesson.exercises[0]" :videoSrc="src" v-if="isVideoContent")
          
          v-container 
            v-tabs(v-model='tab' color="indigo")
              v-tabs-slider
              v-tab(href=`#feedback`) Auto Feedback
              v-tab-item(value="feedback")
                v-card(flat tile)
                  v-container
                    v-row
                      v-col
                        h1 Submit your practice audio to get feedback!

                    v-row
                      v-col(cols="6")
                        v-file-input(v-model="newAudio" label="Upload audio..." outlined color="indigo" dense)
                      v-col(cols="6")
                        v-btn(color="#ec5252" dark @click="submitAudio()" style="margin-top: 2px;") Submit

                    v-row
                      v-col
                        v-menu(offset-y)
                          template(v-slot:activator='{ on, attrs }')
                            v-btn(light v-bind='attrs' v-on='on') Past Submissions
                              v-icon(right dark) mdi-menu-down
                          v-list
                            v-list-item(v-for='(recording, index) in recordings' :key='index' @click="transcribedNotes = splitFeedbackIntoRows(JSON.parse(recording.transcription)); audioSrc = recording.audioUrl")
                              v-list-item-title {{ recording.audioFilename }}

                    v-row.justify-center
                      v-col.py-0(cols="12")
                        div(v-for="(part, idx) in scoreParts" :key="idx")
                          div(:id="`vexflow-wrapper-${idx}`" style="position:relative")
                          line-graph(v-if="transcribedNotes.length > 0"
                              :transcribedNotes="transcribedNotes[idx]"
                              :rowNum="idx + 1"
                              :bpm="currEx.bpm"
                              :onSelectNote="(rowNum,noteIdx)=>{}"
                              :isScrolling="false"
                              :shouldIndicateNoteClicked="false"
                              :clickedNoteOnset=null
                          )

                    v-row
                      v-col
                        v-btn(@click="playTutorAudio") Play
                        v-btn(@click="pauseTutorAudio") Pause
                        v-btn(@click="transform = 0") reset

                      //- this is the rolling tick
                      img(
                        :src="require('../../assets/tick.png')" 
                        style=`
                          position:absolute; 
                          top:0; 
                          opacity:0.7; 
                          transition: 8s transform linear;
                          `
                        :style="{ transform: `translateX(${transform}px)`, left: `${left}px`, transition: `${transitionTime}s transform linear` }"
                        id="tick"
                      )

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
                        v-list-item.px-0(v-for="(exercise, exerciseIdx) in currLesson.exercises" @click="src = exercise.videoUrl" :key="exerciseIdx")
                          v-list-item-content
                            div.pl-4.text-decoration-underline(style="font-size: 14px; color:#291957;") {{ exercise.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson == lesson && lesson.exercises.length == 1")
                a.link.pl-4.py-5(style="font-size: 16px; background-color:#C5CAE9;") {{ lessonIdx + 1 }}. {{ currLesson.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson != lesson")
                a.link.pl-4.py-5(style="font-size: 16px;" @click="goToLesson($event, currLesson)") {{ lessonIdx + 1 }}. {{ currLesson.name }}

    //- Tutor audio file
    audio(ref="tutorAudio" @timeupdate="tutorAudioTimeUpdate" :src="audioSrc" type="audio/ogg")
</template>

<script>
/* eslint-disable */
import EvaluationLineGraph from "../../views/EvaluationLineGraph";
import vexUI from "@/plugins/vex";
import { mapState } from "vuex";
import utils from "@/utils";
import videojs from "video.js";
import PostService from "@/services/PostService"
import "videojs-hotkeys"
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay"
import CourseService from "@/services/CourseService"
import FileService from "@/services/FileService"
import VideoPlayer from "@/components/Course/VideoPlayer"
import ThreadService from "@/services/ThreadService"
import _ from 'lodash'
import RecordingService from "@/services/RecordingService"

export default {
  name: 'ShowLesson',
  components: {
    'video-player': VideoPlayer,
    'line-graph': EvaluationLineGraph
  },
  data () {
    return {
      course: null,
      lesson: null,

      // exercise info
      currEx: null,
      notesInBars: [],
      handlers: [],
      scoreParts: [],
      startEndPosOfRows: [],

      // auto feedback
      newAudio: null,
      transform: 0,
      activeRow: 0,
      left: 0,
      transitionTime: 2,
      moving: false,
      playing: false,
      recordings: [],
      audioSrc: '',

      // thread info
      thread: null,
      dialog: false,
      requiredRules: [
        v => !!v || "This field is required"
      ],
      message: null,
      file: null,
      grade: null,
      avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
      error: null,

      // video events
      isVideoContent: true,

      // osmd renderer
      osmd: null,
      videoOsmd: null,
      from: 1,
      to: 2,

      // page design
      selected: null,
      fullHeight: false,
      opened: [0],
      src: '',

      // tabs
      tab: null,

      // line graph
      transcribedNotes: [],
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
      // let feedback = (await RecordingService.getFeedback(5)).data.recording.transcription
      // this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
      if (this.newAudio) {
        let formData = new FormData()
        formData.set('eid', this.currEx.id)
        formData.append('audio', this.newAudio)
        let recording = (await RecordingService.create(formData)).data.recording
        let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
        this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
      } else {
        alert('Please input an audio file to gain feedback')
      }
    },

    async getPastFeedback () {
      let recordings = (await RecordingService.list(this.currEx.id)).data.recordings
      this.recordings = recordings
    },

    playTutorAudio () {
      // play the audio
      this.$refs['tutorAudio'].play()
      this.transform = this.startEndPosOfRows[this.activeRow][1] - this.startEndPosOfRows[this.activeRow][0]
      this.moving = true
      this.playing = true
    },

    pauseTutorAudio () {
      this.$refs['tutorAudio'].pause()
      let tick = document.getElementById('tick')
      let transform = window.getComputedStyle(tick).transform
      let parts = transform.slice(7,-1).split(','); 
      this.transform = parseFloat(parts[parts.length - 2])
      this.moving = false
      this.playing = false
    },

    tutorAudioTimeUpdate (event) {
      // if it is not moving means it has just been shifted to the next row
      if (!this.moving && this.playing) {
        this.transform = this.startEndPosOfRows[this.activeRow][1] - this.startEndPosOfRows[this.activeRow][0]
        this.transitionTime = (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature.split('/')[0]) * this.handlers[this.activeRow].getNotePositions().filter(x => x.length > 0).length
      }

      if (event.target.currentTime / this.transitionTime > this.activeRow + 1) {
        this.activeRow++
        // shift the tick to the next row
        if (this.activeRow < this.handlers.length) {
          this.left = this.startEndPosOfRows[this.activeRow][0]
          this.transitionTime = 0
          this.transform = 0
          var tick = document.getElementById('tick')
          tick.parentNode.removeChild(tick)
          var wrapper = document.getElementById(`vexflow-wrapper-${this.activeRow}`)
          wrapper.appendChild(tick);
          this.moving = false
        }
      }
    },

    splitFeedbackIntoRows (feedback) {
      let result = []
      let temp = []
      let perRowTime = (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature[0]) * 4
      let currRow = 0
      for (let i = 0; i < feedback.length; i++) {
        if ((feedback[i].onset + feedback[i].duration) / perRowTime < currRow + 1){
          temp.push(feedback[i])
        } else {
          result.push([...temp])
          temp = []
          temp.push(feedback[i])
          currRow++
        }
      }
      if (temp.length > 0)
        result.push(temp)
      return result
    }
  },

  created: async function () {
    if (!this.course || !this.lesson) {
      let response = await CourseService.show(this.$route.params.course_id)
      try {
        response.data.course.lessons = await Promise.all(response.data.course.lessons.map(async (lesson) => {
          var threadResponse = null
          this.$store.dispatch('setNotifications', this.$store.state.notifications - response.data.course.unreadTutorPost)
          threadResponse = await ThreadService.show(lesson.id, this.user.id)
          lesson.thread = threadResponse.data.thread
          return lesson
        }))
        this.course = response.data.course
      } catch (err) {
        console.log(err)
      }
      this.lesson = this.course.lessons.find(lesson => lesson.id == this.$route.params.lesson_id)
      this.lesson.files = (await FileService.list(this.lesson.id)).data.files
    }

    this.selected = this.course.lessons.indexOf(this.lesson)
    this.src = this.lesson.exercises[0].videoUrl
    this.currEx = this.lesson.exercises[0]

    window.addEventListener('scroll', () => {
      if (window.pageYOffset == 0) {
        this.fullHeight = false
      } else if (window.pageYOffset > 64) {
        this.fullHeight = true
      }
    })

    if (this.currEx.useScore) {
      this.currEx.melody = this.currEx.melody.split('-')
      this.notesInBars = vexUI.notesToBars(this.currEx.melody, this.currEx.timeSignature)
    
      for (let i = 0; i < this.notesInBars.length; i += 4) {
        this.scoreParts.push(this.notesInBars.slice(i, i + 4).flat())
      }

      await this.$nextTick()
      
      var wrapper = document.getElementById(`vexflow-wrapper-${0}`)
      var width = wrapper.offsetWidth;
      for (let i = 0; i < this.scoreParts.length; i++) {
        this.handlers.push(new vexUI.Handler(`vexflow-wrapper-${i}`, {
          numberOfStaves: 4,
          stavesPerRow: 4,
          canEdit: false,
          canvasProperties: {
            width
          }
        }).init())

        this.handlers[i].importNotes(this.scoreParts[i], this.currEx.timeSignature)
        var notePositions = this.handlers[i].getNotePositions().filter(x => x.length > 0)
        this.startEndPosOfRows.push([notePositions[0][0].x, notePositions[notePositions.length - 1][notePositions[notePositions.length - 1].length - 1].x])
      }
    
      // append the tick to the score
      this.left = this.startEndPosOfRows[0][0]
      // time per 4 bars
      this.transitionTime = (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature.split('/')[0]) * this.handlers[this.activeRow].getNotePositions().filter(x => x.length > 0).length
      var tick = document.getElementById('tick')
      tick.parentNode.removeChild(tick)
      wrapper.appendChild(tick)

      // get past recordings
      this.getPastFeedback()
    }
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
</style>
