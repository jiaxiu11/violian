<template lang="pug">
  v-container
    v-row.justify-center
      v-col.py-0(cols="12")
        div(v-for="(part, idx) in scoreRows" :key="idx")
          div.font-weight-bold(v-if="isShowFeedback && idx == 0") Tutor's recording
          div(:id="`vexflow-wrapper-${idx}`" style="position:relative")
          div.font-weight-bold(v-if="isShowFeedback && idx == 0") Your recording
          div.font-weight-bold(v-if="isNewFeedback && idx == 0") Student's recording
          line-graph(v-if="transcribedNotes.length > 0"
            :transcribedNotes="transcribedNotes[idx]"
            :rowNum="idx + 1"
            :bpm="recording.bpm"
            :timeSignature="currEx.timeSignature"
            :barsPerRow="4"
            :onSelectNoteForGreentick="(rowNum,left)=>{updateStudentPos(rowNum, left)}"
            :onClickNote="onClickNote"
            :clickedNoteOnset="clickedNoteOnset"
            :shouldIndicateNoteClicked="shouldIndicateNoteClicked"
          )

    v-btn(@click="play" v-if="!playing && (isNewFeedback || isShowFeedback)" fab large style="position:fixed; top:25vh; right:24px;")
      v-icon(color="indigo") mdi-play
    v-btn(@click="pause" v-if="playing && (isNewFeedback || isShowFeedback)" fab large style="position:fixed; top:25vh; right:24px;")
      v-icon(color="indigo") mdi-pause

    v-row(style="position: -webkit-sticky; /* Safari */position: sticky;top: 0;")

      //- this is the rolling tick
      img(
        v-if="isNewRecording || isShowFeedback"
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
        v-if="isNewFeedback || isShowFeedback"
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

    //- Tutor audio file
    audio(v-if="isShowFeedback" ref="tutorAudio" :src="currEx.videoUrl" type="audio/ogg" @ended="tutorAudioEnd")

    //- Student audio file
    audio(v-if="isNewFeedback || isShowFeedback" ref="studentAudio" :src="recording.audioUrl" type="audio/ogg" @ended="studentAudioEnd")
</template>

<script>
/* eslint-disable */
import EvaluationLineGraph from "../../views/EvaluationLineGraph";
import vexUI from "@/plugins/vex";
import vexUtils from "@/plugins/vexUtils"
import { mapState } from "vuex";
import CourseService from "@/services/CourseService"
import RecordingService from "@/services/RecordingService"

export default {
  name: 'Score',
  props: [
    "currEx",
    "recording",
    "onClickNote",
    "clickedNoteOnset",
    "shouldIndicateNoteClicked",
    "elapsedTime",
    "start",
    "isNewFeedback",
    "isShowFeedback",
    "isNewRecording",
    "bpm"
    ],
  components: {
    'line-graph': EvaluationLineGraph
  },
  computed: {
    secondsPerRow () {
      return (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature.split('/')[0]) * 4;
    }
  },
  data () {
    return {
      // exercise info
      notesInBars: [],
      handlers: [],
      demoStartTime: 0,

      // auto feedback
      transcribedNotes: [],
      tutorFocused: true,
      yInterval: 137,
      newAudio: null,
      transformX: 0,
      transformY: 0,
      transformXStudent: 30,
      transformYStudent: 30,
      canvasWidth: 0,
      lineGraphWidth: 0,
      activeRow: 0,
      activeRowStudent: 1,
      activeNote: 0,
      studentAudioSrc: '',
      scoreRows: [],
      // split into rows of 4 bars
      notePositions: [],
      noteOnsetDurations: [],

      // animation
      animationFrame: null,
      playing: false
    }
  },

  watch: {
    recording: function (val) {
      this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(val.transcription));
    },

    start: function (val) {
      if (val) {
        this.playTutorAudio()
      } else {
        this.tutorAudioEnd()
      }
    },

    tutorFocused: function (val) {
      this.pauseTutorAudio()
      this.pauseStudentAudio()
    },

    bpm: function (val) {
      if (typeof val == "number") {
        console.log(val)
        this.noteOnsetDurations = []
        for (let i = 0; i < this.scoreRows.length; i++)
          this.noteOnsetDurations.push(vexUI.notesToOnsetDuration(this.scoreRows[i], this.currEx.timeSignature, val, i))
      }
    }
  },

  methods: {
    async drawScore () {
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
          },
          timeSignature: this.currEx.timeSignature
        }).init())

        this.handlers[i].importNotes(this.scoreRows[i], this.currEx.timeSignature)
        if (this.isShowFeedback) {
          this.handlers[i].canvas.addEventListener('mousemove', this.canvasMouseMove, false)
          this.handlers[i].canvas.addEventListener('mouseup', this.canvasMouseUp, false)
          this.handlers[i].canvas.addEventListener('mouseleave', this.canvasMouseLeave, false)
          this.handlers[i].canvas.style.cursor = 'pointer'
        }
        this.notePositions.push(this.handlers[i].getNotePositions().filter(x => x.length > 0).flat())
        this.noteOnsetDurations.push(vexUI.notesToOnsetDuration(this.scoreRows[i], this.currEx.timeSignature, this.currEx.bpm, i))
      }
    
      // set up and append the tick to the score
      if (this.isNewRecording || this.isShowFeedback) {
        this.transformX = parseFloat(this.notePositions[0][0].x)
        var tick = document.getElementById('tick')
        tick.parentNode.removeChild(tick)
        wrapper.appendChild(tick)
      }
    },

    async drawLineGraph () {
      this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(this.recording.transcription))
      this.studentAudioSrc = this.audioUrl

      await this.$nextTick()
      var tick = document.getElementById('student-tick')
      tick.parentNode.removeChild(tick)
      var wrapper = document.getElementById('lineGraph0')
      this.lineGraphWidth = wrapper.offsetWidth
      wrapper.appendChild(tick)
    },

    play () {
      this.playing = true
      if (this.isShowFeedback) {
        if (this.tutorFocused) {
          this.playTutorAudio()
        } else {
          this.playStudentAudio()
        }
      } else if (this.isNewFeedback) {
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

    recordStart () {
      // play the audio
      let animate = () => {
        let currTime = this.elapsedTime
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
              if (this.activeRow < this.notePositions.length)
                document.getElementById(`vexflow-wrapper-${this.activeRow}`).scrollIntoView(true, {behavior: "smooth"})
              this.transformY = this.transformY + this.yInterval + 10
            } else {
              this.activeNote += 1
            }
          }
        }

        this.animationFrame = requestAnimationFrame(animate);
      }

      this.animationFrame = requestAnimationFrame(animate);
    },

    playTutorAudio () {
      // play the audio
      this.tutorFocused = true
      for (let i = 0; i < this.handlers.length; i++) {
        this.handlers[i].canvas.removeEventListener('mousemove', this.canvasMouseMove, false)
      }

      if (this.isShowFeedback) {
        this.$refs['tutorAudio'].play()
      }

      let animate = () => {
        let currTime = 0
        if (this.isNewRecording) {
          currTime = this.elapsedTime
        } else {
          currTime = this.$refs['tutorAudio'].currentTime - this.demoStartTime
        }
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
              if (this.activeRow < this.notePositions.length)
                document.getElementById(`vexflow-wrapper-${this.activeRow}`).scrollIntoView(true, {behavior: "smooth"})
              this.transformY = this.transformY + this.yInterval + 10
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
      this.playing = false
      cancelAnimationFrame(this.animationFrame)

      for (let i = 0; i < this.handlers.length; i++) {
        this.handlers[i].canvas.addEventListener('mousemove', this.canvasMouseMove, false)
      }
    },

    tutorAudioEnd () {
      this.playing = false
      this.transformX = this.notePositions[0][0].x
      this.transformY = 10
      cancelAnimationFrame(this.animationFrame)
      this.activeRow = 0
      this.activeNote = 0
    },

    updateStudentPos (rowNum, left) {
      this.tutorFocused = false
      this.transformXStudent = left
      this.transformYStudent = (rowNum - 1) * (this.yInterval) + 30
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
          this.transformXStudent = (this.lineGraphWidth - 50) * timeFraction + 30
        } else {
          // move to next row
          this.activeRowStudent += 1
          if (this.activeRowStudent > this.scoreRows.length) {
            cancelAnimationFrame(this.animationFrame)
            return
          }
          document.getElementById(`lineGraph${this.activeRowStudent - 1}`).scrollIntoView(true, {behavior: "smooth"})
          this.transformYStudent = this.transformYStudent + this.yInterval
          this.transformXStudent = 30
        }

        this.animationFrame = requestAnimationFrame(animate);
      }

      this.animationFrame = requestAnimationFrame(animate);
    },

    pauseStudentAudio () {
      this.playing = false

      this.$refs['studentAudio'].pause()
      cancelAnimationFrame(this.animationFrame)
    },

    studentAudioEnd () {
      this.playing = false
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
      let minOffset = 900719925474099
      let idx = 0
      for (let i = 0; i < this.notePositions[rowNum].length; i++) {
        let offset = Math.abs(mousePos.x - this.notePositions[rowNum][i].x)
        if (offset < minOffset) {
          minOffset = offset
          idx = i
        }
      }

      this.transformX = this.notePositions[rowNum][idx].x
      this.transformY = rowNum * (this.yInterval)
      this.$refs['tutorAudio'].currentTime = this.noteOnsetDurations[rowNum][idx].onset
      this.activeRow = rowNum
      this.activeNote = idx
    },

    canvasMouseLeave (e) {
      let rowNum = parseInt(e.srcElement.id.split('-')[2])
      this.handlers[rowNum].deHighlightAll()
    },
    
    splitFeedbackIntoRows(notes) {
      let bpm = this.recording.bpm
      let timePerRow = (60 / bpm) * parseInt(this.currEx.timeSignature[0]) * 4;

      let newRowStartTime = 0;
      let rows = [];
      rows.push([]);
      for (let i = 0; i < notes.length; i++) {
          let note = notes[i];
          if (note.onset < newRowStartTime + timePerRow) {
              if (note.onset + note.duration <= newRowStartTime + timePerRow) {
                  rows[rows.length - 1].push(note);
              } else {
                  // split a note that lasts across two rows into two notes
                  let noteCopy = { ...note };
                  noteCopy.onset = newRowStartTime + timePerRow;
                  noteCopy.duration = note.onset + note.duration - (newRowStartTime + timePerRow);
                  note.duration = note.duration - noteCopy.duration;
                  rows[rows.length - 1].push(note);
                  notes[i] = noteCopy;
                  newRowStartTime = newRowStartTime + timePerRow;
                  rows.push([]);
                  i--;
              }
          } else {
              newRowStartTime = newRowStartTime + timePerRow;
              rows.push([]);
              i--;
          }
      }
      while(rows.length < this.scoreRows.length) {
          rows.push([])
      }
      return rows;
    }
  },

  mounted: function () {
    this.currEx.melody = this.currEx.melody.split('-')
    this.demoStartTime = this.currEx.demoStartTime
    this.notesInBars = vexUI.notesToBars(this.currEx.melody, this.currEx.timeSignature)
  
    for (let i = 0; i < this.notesInBars.length; i += 4) {
      this.scoreRows.push(this.notesInBars.slice(i, i + 4).flat())
    }
    
    if (this.isNewFeedback || this.isShowFeedback) {
      this.yInterval = 137 + 150
      this.drawScore()
      this.drawLineGraph()
      if (this.isNewFeedback)
        this.tutorFocused = false
    } else if (this.isNewRecording) {
      this.yInterval = 137
      this.drawScore()
    }
  }
}
</script>

<style>
</style>
