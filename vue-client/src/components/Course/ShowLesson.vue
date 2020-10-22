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
              video-player(:exercise="this.lesson.exercises[0]" :videoSrc="videoSrc" v-if="isVideoContent")
          

          v-container
            v-tabs(v-model='tab' color="indigo")
              v-tabs-slider
              v-tab(href=`#feedback`) Auto Feedback
              v-tab-item(value="feedback")
                v-card(flat tile)
                  v-container

                    h1 Do A Live Recording Here:
                    audio-recorder(:currEx="this.lesson.exercises[0]")

                    v-row(style="margin-top: 20px;")
                      h1 Or Upload Your Audio File Here:
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
                            v-list-item(v-for='(recording, index) in recordings' :key='index' @click="transcribedNotes = splitFeedbackIntoRows(JSON.parse(recording.transcription)); studentAudioSrc = recording.audioUrl")
                              v-list-item-title {{ recording.audioFilename }}

                    v-row.justify-center
                      v-col.py-0(cols="12")
                        div(v-for="(part, idx) in scoreRows" :key="idx")
                          div(:id="`vexflow-wrapper-${idx}`" style="position:relative")
                          line-graph(v-if="transcribedNotes.length > 0"
                              :transcribedNotes="transcribedNotes[idx]"
                              :rowNum="idx + 1"
                              :bpm="currEx.bpm"
                              :timeSignature="currEx.timeSignature"
                              :barsPerRow="4"
                              :onSelectNote="(rowNum,left)=>{updateStudentPos(rowNum, left)}"
                              :isScrolling="false"
                              :shouldIndicateNoteClicked="false"
                              :clickedNoteOnset=null
                          )

                    v-row
                      v-col
                        v-btn(@click="play") Play
                        v-btn(@click="pause") Pause

                      //- this is the rolling tick
                      img(
                        :src="require('../../assets/tick.png')" 
                        style=`
                          position:absolute; 
                          top:0;
                          left:0;
                          transform-origin: top left;
                          will-change: transform;
                          z-index: 2;
                          cursor: pointer;
                          `
                        :style="{ transform: `translate3d(${transformX}px, ${transformY}px, 0px)`, opacity: tutorFocused ? '0.8' : '0.4' }"
                        id="tick"
                        @click="tutorFocused = true"
                      )

                      img(
                        :src="require('../../assets/tick.png')"
                        style=`
                          position:absolute;
                          top:0;
                          left:0;
                          transform-origin: top left;
                          will-change: transform;
                          z-index: 2;
                          cursor: pointer;
                          `
                        :style="{ transform: `translate3d(${transformXStudent}px, ${transformYStudent}px, 0px)`, opacity: tutorFocused ? '0.4' : '0.8' }"
                        id="student-tick"
                        @click="tutorFocused = false"
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
                        v-list-item.px-0(v-for="(exercise, exerciseIdx) in currLesson.exercises" @click="videoSrc = exercise.videoUrl" :key="exerciseIdx")
                          v-list-item-content
                            div.pl-4.text-decoration-underline(style="font-size: 14px; color:#291957;") {{ exercise.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson == lesson && lesson.exercises.length == 1")
                a.link.pl-4.py-5(style="font-size: 16px; background-color:#C5CAE9;") {{ lessonIdx + 1 }}. {{ currLesson.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson != lesson")
                a.link.pl-4.py-5(style="font-size: 16px;" @click="goToLesson($event, currLesson)") {{ lessonIdx + 1 }}. {{ currLesson.name }}

    //- Tutor audio file
    audio(ref="tutorAudio" :src="videoSrc" type="audio/ogg" @ended="tutorAudioEnd")

    //- Student audio file
    audio(ref="studentAudio" :src="studentAudioSrc" type="audio/ogg" @ended="studentAudioEnd")
</template>

<script>
/* eslint-disable */
import EvaluationLineGraph from "../../views/EvaluationLineGraph";
import vexUI from "@/plugins/vex";
import vexUtils from "@/plugins/vexUtils"
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
import AudioRecorder from "@/components/Course/AudioRecorder"


export default {
  name: 'ShowLesson',
  components: {
    'video-player': VideoPlayer,
    'audio-recorder': AudioRecorder,
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
      demoStartTime: 0,

      // auto feedback
      tutorFocused: true,
      scoreYInterval: 137,
      newAudio: null,
      transformX: 0,
      transformY: 0,
      transformXStudent: 30,
      transformYStudent: 0,
      canvasWidth: 0,
      activeRow: 0,
      activeRowStudent: 1,
      activeNote: 0,
      recordings: [],
      studentAudioSrc: '',
      scoreRows: [],
      // split into rows of 4 bars
      notePositions: [],
      noteOnsetDurations: [],

      // animation
      animationFrame: null,

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
      fullHeight: false,
      opened: [0],
      videoSrc: '',

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
    secondsPerRow () {
      return (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature.split('/')[0]) * 4;
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
      // let feedback = (await RecordingService.getFeedback(5)).data.recording.transcription
      // this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
      if (this.newAudio) {
        console.log(this.newAudio);
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

      if (recordings.length > 0) {
        this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(recordings[0].transcription))
        this.studentAudioSrc = recordings[0].audioUrl

        await this.$nextTick()
        var tick = document.getElementById('student-tick')
        tick.parentNode.removeChild(tick)
        var wrapper = document.getElementById('lineGraph0')
        wrapper.appendChild(tick)
        this.scoreYInterval = 137 + 150
      }
    },

    play () {
      if (this.tutorFocused) {
        this.playTutorAudio()
      } else {
        this.playStudentAudio()
      }
    },

    pause () {
      if (this.tutorFocused) {
        this.pauseTutorAudio()
      } else {
        this.pauseStudentAudio()
      }
    },

    playTutorAudio () {
      // play the audio
      this.tutorFocused = true
      for (let i = 0; i < this.handlers.length; i++) {
        this.handlers[i].canvas.removeEventListener('mousemove', this.canvasMouseMove, false)
      }

      this.$refs['tutorAudio'].play()

      let animate = () => {
        let currTime = this.$refs['tutorAudio'].currentTime - this.demoStartTime
        if (currTime > this.demoStartTime) {
          currTime = currTime - this.demoStartTime
          let currNoteOnsetDuration = this.noteOnsetDurations[this.activeRow][this.activeNote]
          if (currTime < currNoteOnsetDuration.onset + currNoteOnsetDuration.duration) {
            // move within this note
            let timeFraction = (currTime - currNoteOnsetDuration.onset) / currNoteOnsetDuration.duration;
            if (this.activeNote == this.scoreRows[this.activeRow].length - 1) {
              this.transformX = (this.notePositions[this.activeRow][this.activeNote].x + parseFloat((this.canvasWidth - 20 - this.notePositions[this.activeRow][this.activeNote].x) * timeFraction))
            } else {
              this.transformX = (this.notePositions[this.activeRow][this.activeNote].x + parseFloat((this.notePositions[this.activeRow][this.activeNote + 1].x - this.notePositions[this.activeRow][this.activeNote].x) * timeFraction))
            }
          } else {
            // move to next note, if needed move to next row
            // console.log(this.activeRow, this.activeNote)
            if (this.activeNote == this.scoreRows[this.activeRow].length - 1) {
              this.activeNote = 0
              this.activeRow += 1
              this.transformY = this.transformY + this.scoreYInterval + 10
            } else {
              this.activeNote += 1
            }
          }
        }

        this.animationFrame = requestAnimationFrame(animate);
      }

      this.animationFrame = requestAnimationFrame(animate);
    },

    pauseTutorAudio () {
      this.$refs['tutorAudio'].pause()
      cancelAnimationFrame(this.animationFrame)

      for (let i = 0; i < this.handlers.length; i++) {
        this.handlers[i].canvas.addEventListener('mousemove', this.canvasMouseMove, false)
      }
    },

    tutorAudioEnd () {
      this.transformX = this.notePositions[0][0].x
      this.transformY = 10
      cancelAnimationFrame(this.animationFrame)
      this.activeRow = 0
      this.activeNote = 0
    },

    updateStudentPos (rowNum, left) {
      this.tutorFocused = false
      this.transformXStudent = left
      this.transformYStudent = (rowNum - 1) * (this.scoreYInterval)
      this.$refs['studentAudio'].currentTime = ((rowNum - 1) + (left - 30) / (this.canvasWidth - 50)) * this.secondsPerRow
    },

    playStudentAudio (rowNum, left) {
      this.tutorFocused = false
      this.$refs['studentAudio'].play()

      let animate = () => {
        let currTime = this.$refs['studentAudio'].currentTime
        let endOfRowTime = this.activeRowStudent * this.secondsPerRow
        if (currTime < endOfRowTime) {
          // move within this row
          let timeFraction = (currTime % this.secondsPerRow) / this.secondsPerRow
          this.transformXStudent = (this.canvasWidth - 50) * timeFraction + 30
        } else {
          // move to next row
          this.activeRowStudent += 1
          if (this.activeRowStudent > this.notePositions.length) {
            cancelAnimationFrame(this.animationFrame)
            return
          }
          this.transformYStudent = this.transformY + this.scoreYInterval
          this.transformXStudent = 30
        }

        this.animationFrame = requestAnimationFrame(animate);
      }

      this.animationFrame = requestAnimationFrame(animate);
    },

    pauseStudentAudio () {
      this.$refs['studentAudio'].pause()
      cancelAnimationFrame(this.animationFrame)
    },

    studentAudioEnd () {
      this.transformXStudent = 30
      this.transformYStudent = 10
      cancelAnimationFrame(this.animationFrame)
      this.activeRowStudent = 1
    },

    canvasMouseMove (e) {
      let mousePos = vexUtils.getMousePositionInCanvas(e.srcElement, e)
      let rowNum = parseInt(e.srcElement.id.split('-')[2])
      this.handlers[rowNum].deHighlightAll()
      for (let i = 0; i < this.notePositions[rowNum].length; i++) {
        if (mousePos.x > this.notePositions[rowNum][i].x && mousePos.x < this.notePositions[rowNum][i].x + this.notePositions[rowNum][i].w) {
          this.handlers[rowNum].highlightNote(i)
        }
      }
    },

    canvasMouseUp (e) {
      this.tutorFocused = true
      let mousePos = vexUtils.getMousePositionInCanvas(e.srcElement, e)
      let rowNum = parseInt(e.srcElement.id.split('-')[2])
      for (let i = 0; i < this.notePositions[rowNum].length; i++) {
        if (mousePos.x > this.notePositions[rowNum][i].x && mousePos.x < this.notePositions[rowNum][i].x + this.notePositions[rowNum][i].w) {
          this.transformX = this.notePositions[rowNum][i].x
          this.transformY = rowNum * (this.scoreYInterval)
          this.$refs['tutorAudio'].currentTime = this.noteOnsetDurations[rowNum][i].onset
          this.activeRow = rowNum
          this.activeNote = i
        }
      }
    },

    canvasMouseLeave (e) {
      let rowNum = parseInt(e.srcElement.id.split('-')[2])
      this.handlers[rowNum].deHighlightAll()
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

    this.videoSrc = this.lesson.exercises[0].videoUrl
    let ex = this.lesson.exercises[0]
      ex.bpm = 80
      this.currEx = ex

    window.addEventListener('scroll', () => {
      if (window.pageYOffset == 0) {
        this.fullHeight = false
      } else if (window.pageYOffset > 64) {
        this.fullHeight = true
      }
    })

    if (this.currEx.useScore) {
      this.currEx.melody = this.currEx.melody.split('-')
      this.demoStartTime = this.currEx.demoStartTime
      this.notesInBars = vexUI.notesToBars(this.currEx.melody, this.currEx.timeSignature)
    
      for (let i = 0; i < this.notesInBars.length; i += 4) {
        this.scoreRows.push(this.notesInBars.slice(i, i + 4).flat())
      }

      await this.$nextTick()
      
      var wrapper = document.getElementById(`vexflow-wrapper-${0}`)
      var width = wrapper.offsetWidth
      this.canvasWidth = width
      for (let i = 0; i < this.scoreRows.length; i++) {
        this.handlers.push(new vexUI.Handler(`vexflow-wrapper-${i}`, {
          numberOfStaves: 4,
          stavesPerRow: 4,
          canEdit: false,
          canvasProperties: {
            width,
            id: `vexflow-wrapper-${i}` + "-canvas",
          }
        }).init())

        this.handlers[i].importNotes(this.scoreRows[i], this.currEx.timeSignature)
        this.handlers[i].canvas.addEventListener('mousemove', this.canvasMouseMove, false)
        this.handlers[i].canvas.addEventListener('mouseup', this.canvasMouseUp, false)
        this.handlers[i].canvas.addEventListener('mouseleave', this.canvasMouseLeave, false)
        this.handlers[i].canvas.style.cursor = 'pointer'
        this.notePositions.push(this.handlers[i].getNotePositions().filter(x => x.length > 0).flat())
        this.noteOnsetDurations.push(vexUI.notesToOnsetDuration(this.scoreRows[i], this.currEx.timeSignature, this.currEx.bpm, i))
      }
    
      // set up and append the tick to the score
      this.transformX = parseFloat(this.notePositions[0][0].x)
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
