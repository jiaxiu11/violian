<template lang="pug">
  v-container
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
            :onClickNote="(rowNum, noteIdx)=>{}"
            :onSelectNoteForGreentick="(rowNum,left)=>{updateStudentPos(rowNum, left)}"
            :isScrolling="false"
            :shouldIndicateNoteClicked="false"
            :clickedNoteOnset=null
          )

    v-row
      v-col
        v-btn(@click="play" v-if="isBoth || !isScore") Play
        v-btn(@click="pause" v-if="isBoth || !isScore") Pause

      //- this is the rolling tick
      img(
        v-if="isBoth || isScore"
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
        v-if="isBoth || !isScore"
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
    audio(v-if="isBoth || !isScore" ref="tutorAudio" :src="currEx.videoUrl" type="audio/ogg" @ended="tutorAudioEnd")

    //- Student audio file
    audio(v-if="isBoth || !isScore" ref="studentAudio" :src="recording.audioUrl" type="audio/ogg" @ended="studentAudioEnd")
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
    "isBoth",
    "isScore",
    "currEx",
    "recording",
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
      studentAudioSrc: '',
      scoreRows: [],
      // split into rows of 4 bars
      notePositions: [],
      noteOnsetDurations: [],

      // animation
      animationFrame: null,
    }
  },

  watch: {
    recording: function (val) {
      this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(val.transcription));
    },
  },

  methods: {
    async drawScore () {
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
    },

    async drawLineGraph () {
      this.transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(this.recording.transcription))
      this.studentAudioSrc = this.audioUrl

      await this.$nextTick()
      var tick = document.getElementById('student-tick')
      tick.parentNode.removeChild(tick)
      var wrapper = document.getElementById('lineGraph0')
      wrapper.appendChild(tick)
      this.scoreYInterval = 137 + 150
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
              if (this.activeRow < this.notePositions.length)
                document.getElementById(`vexflow-wrapper-${this.activeRow}`).scrollIntoView(true, {behavior: "smooth"})
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
          document.getElementById(`lineGraph${this.activeRowStudent - 1}`).scrollIntoView(true, {behavior: "smooth"})
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
    
    splitFeedbackIntoRows(notes) {
      let timePerRow = (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature[0]) * 4;

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
      return rows;
    }
  },

  mounted: function () {
    if (this.isBoth) {
      this.drawScore()
      this.drawLineGraph()
    } else {
      if (this.isScore) {
        this.drawScore()
      } else {
        this.drawLineGraph()
      }
    }
  }
}
</script>

<style>
</style>
