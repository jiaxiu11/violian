<template lang="pug">
  div(style="font-size:14px !important;")
    video.vjs-big-play-centered(ref="videoPlayer" class="video-js" :id="`video`")

    v-row.bpm-control.pt-2(:id="`slider`" v-show="!hide")
      v-icon(color="white" large) $vuetify.icons.custom_bpm
      v-slider.pb-2(min="20" max="180" vertical color="white" track-color="rgba(115, 133, 159, 0.5)" thumb-label="always" v-model="playbackBpm")

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
        height="92"
        :style="{ transform: `translate3d(${transformX}px, 0px, 0px)`, opacity: '0.8' }"
        id="tick"
      )
</template>

<script>
/* eslint-disable */
import vexUI from "@/plugins/vex";
import videojs from "video.js";
import "videojs-hotkeys"
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay"

export default {
  name: 'VideoPlayer',
  props: ['exercise', 'videoSrc'],
  data () {
    return {
      // exercise info
      numberOfBars: null,
      bpm: null,
      timeSignature: null,
      keySignature: 'C',
      description: '',
      melody: [],
      useScore: false,
      useXml: false,
      notesInBars: null,
      notesInRows: null,
      playbackBpm: 0,
      videoHandler: null,

      // video events
      player: null,
      hide: true,
      timePerTwoBars: 0,
      timePerBar: 0,
      demoStartTime: 0,
      demoEndTime: null,
      activeRow: 0,

      // osmd renderer
      videoOsmd: null,
      from: 1,
      to: 2,

      // green tick
      transformX: 0,
      notePositions: null,
      noteOnsetDurations: null,
      activeNote: 0,
      animationFrame: null,
      canvasWidth: 0
    }
  },

  methods: {
    play () {
      let animate = () => {

        let currTime = this.player.currentTime()
        let offset = currTime - this.demoStartTime
        if (offset >= 0) {
          let currRow = Math.floor(offset / this.timePerTwoBars)
          currTime -= 0.1
          if (currRow != this.activeRow) {
            if (currRow < 0) {
              this.activeRow = 0
              this.videoHandler.importNotes(this.notesInRows[0], this.timeSignature)
              this.noteOnsetDurations = vexUI.notesToOnsetDuration(this.notesInRows[0], this.timeSignature, this.bpm, currRow, 2)
            } else if (currRow < this.notesInRows.length) {
              this.activeRow = currRow
              this.videoHandler.importNotes(this.notesInRows[currRow], this.timeSignature)
              this.noteOnsetDurations = vexUI.notesToOnsetDuration(this.notesInRows[currRow], this.timeSignature, this.bpm, currRow, 2)
            } else {
              this.activeRow = this.notesInRows.length - 1
              this.videoHandler.importNotes(this.notesInRows[this.notesInRows.length - 1], this.timeSignature)
              this.noteOnsetDurations = vexUI.notesToOnsetDuration(this.notesInRows[this.notesInRows.length - 1], this.timeSignature, this.bpm, currRow, 2)
            }

            this.notePositions = this.videoHandler.getNotePositions().flat()
            this.transformX = this.notePositions[0].x
            this.activeNote = 0
          } else {
            let currNoteOnsetDuration = this.noteOnsetDurations[this.activeNote]

            if (currTime < currNoteOnsetDuration.onset + currNoteOnsetDuration.duration) {
              // move within this note
              let timeFraction = (currTime - currNoteOnsetDuration.onset) / currNoteOnsetDuration.duration;
              if (timeFraction < 0)
                timeFraction = 0
              if (this.activeNote == this.notesInRows[this.activeRow].length - 1) {
                this.transformX = this.notePositions[this.activeNote].x + parseFloat((this.canvasWidth - 20 - this.notePositions[this.activeNote].x) * timeFraction)
              } else {
                this.transformX = (this.notePositions[this.activeNote].x + parseFloat((this.notePositions[this.activeNote + 1].x - this.notePositions[this.activeNote].x) * timeFraction))
              }
            } else {
              // move to next note, if needed move to next row
              this.activeNote += 1
              // this.player.pause()
              // this.pause()
            }
          }

          this.animationFrame = requestAnimationFrame(animate);
        }
      }

      this.animationFrame = requestAnimationFrame(animate);
    },

    pause() {
      cancelAnimationFrame(this.animationFrame)
    },

    drawScores () {
      var wrapper = document.createElement("div")
      var tick = document.getElementById('tick')
      tick.parentNode.removeChild(tick)
      wrapper.appendChild(tick)

      wrapper.setAttribute('id', `video-vexflow-wrapper`)
      wrapper.style.position = "absolute";
      wrapper.style.background = "#FAFAFA";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.right = "0";

      this.canvasWidth = this.$refs.videoPlayer.offsetWidth
      this.videoHandler = new vexUI.Handler(`video-vexflow-wrapper`, {
        canEdit: false,
        numberOfStaves: 2,
        lessStaveHeight: true,
        timeSignature: this.timeSignature,
        keySignature: this.keySignature,
        canvasProperties: {
          id: `video-vexflow-wrapper` + "-canvas",
          width: this.canvasWidth,
          height: 80 * vexUI.scale,
          tabindex: 1
        }
      }, wrapper).init();
      
      this.notesInBars = vexUI.notesToBars(this.melody, this.timeSignature)
      let notesInRows = []
      for (let i = 0; i < this.numberOfBars; i++) {
        if (i % 2 == 1) {
          notesInRows.push(this.notesInBars[i - 1].concat(this.notesInBars[i]))
        } else {
          if (i == this.numberOfBars - 1) {
            notesInRows.push(this.notesInBars[i])
          }
        }
      }
      this.notesInRows = notesInRows
      this.videoHandler.importNotes(this.notesInBars[0].concat(this.notesInBars[1])  , this.timeSignature)

      this.notePositions = this.videoHandler.getNotePositions().flat()
      this.transformX = this.notePositions[0].x

      this.noteOnsetDurations = vexUI.notesToOnsetDuration(this.notesInRows[0], this.timeSignature, this.bpm, 0, 2)

      document.getElementById(`video`).appendChild(wrapper)
    }
  },

  watch: {
    playbackBpm: function (val) {
      if (this.bpm) {
        this.player.playbackRate(val / this.bpm)
      }
    },

    videoSrc: function (val) {
      this.player.src(val)
    }
  },

  mounted: async function() {
    let source = ''
    if (!this.exercise.videoUrl && !this.exercise.demoUrl) {
      source = 'undefined'
    } else {
      if (this.exercise.videoUrl) {
        source = this.exercise.videoUrl
      } else {
        source = this.exercise.demoUrl
      }
    }

    const player = videojs(this.$refs.videoPlayer, {
        controls: true,
        aspectRatio: '16:9',
        sources: [
          {
            src: source,
            type: "video/mp4"
          }
        ],
        playbackRates: [0.8, 0.9, 1, 1.1, 1.2],
        poster: this.exercise.demoPosterUrl ? this.exercise.demoPosterUrl : null
      }, () => {
        // console.log('onPlayerReady', this)
        player.hotkeys({
          volumeStep: 0.1,
          seekStep: 2,
          enableModifiersForNumbers: false,
          enableHoverScroll: true
        })

        if (this.exercise.useScore) {
          player.on('userinactive', () => {
            if (player.paused()) {
              this.hide = false
            } else {
              this.hide = true
            }
          })
          player.on('useractive', () => {
            this.hide = false
          })
          player.on('play', () => {
            this.hide = false
            this.play()
          })
          player.on('pause', () => {
            this.pause()
          })
          player.on('ended', () => {
            this.pause()
          })
          player.on('firstplay', () => {
            this.hide = false
          })
          player.on('ratechange', () => {
            this.playbackBpm = this.bpm * this.player.playbackRate()
          })
        }
    })

    this.player = player
    let exercise = this.exercise

    if (exercise.useScore) {
      this.useScore = exercise.useScore
      this.useXml = exercise.useXml
      this.bpm = parseInt(exercise.bpm)
      this.playbackBpm = this.bpm
      this.demoStartTime = exercise.demoStartTime

      this.melody = exercise.melody.split('-')
      this.timeSignature = exercise.timeSignature
      this.keySignature = exercise.keySignature
      this.numberOfBars = parseInt(exercise.numberOfBars)
      this.drawScores()

      this.timePerBar = ((parseInt(this.timeSignature.split('/')[0]) / this.bpm) * 60)
      this.timePerTwoBars = this.timePerBar * 2
      this.demoEndTime = this.demoStartTime + (this.timePerBar * this.numberOfBars)

      // attach slider
      document.getElementById(`video`).appendChild(document.getElementById(`slider`))
      document.getElementsByClassName("v-slider__track-container")[0].style.width = "5px"
      document.getElementsByClassName("v-slider__thumb-label")[0].style.color = "black"
      document.getElementsByClassName("v-slider__thumb-label")[0].style.boxShadow = "0px 0px 5px black"
    }
  }
}
</script>

<style scoped>
.hide {
  opacity: 0 !important;
  visibility: hidden !important;
}

.bpm-control {
  background-color: rgba(43, 51, 63, 0.7); 
  position: absolute; 
  bottom: 42px; 
  left: 12px; 
  width: 30px;
  visibility: visible;
  opacity: 1;
  transition: visibility 1000ms, opacity 1000ms;
}

video:focus {
  outline: none;
}

div {
  font-size: 14px !important;
}
</style>
