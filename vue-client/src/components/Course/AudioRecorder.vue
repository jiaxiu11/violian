<template>
  <div>
    <v-overlay
      :value="overlay"
    >
      <label class="countdown">{{ countDown }} </label>
    </v-overlay>

    <v-row class="main-controls" justify="center">
      <v-col cols="10" class="text-center" style="border: 1px solid #E0E0E0; border-radius:10px;">
        <!-- <v-row justify="center">
          <v-col cols="12">
            <canvas class="visualizer" justify="center" height="60px"></canvas>
          </v-col>
        </v-row>
        <button id="recButton" class="notRec" @click="onClick"></button> -->
        <!-- <v-btn class="mx-auto px-6 action-button" large @click="onClick"> Record
          <v-icon right dark size="20" color="red"> 
            mdi-record-circle-outline
          </v-icon>
        </v-btn> -->
        <div style="position:relative;">
          <v-btn fab icon elevation="3" @click="onClick" medium v-if="!isRecording">
            <v-icon large color="#747474">
              mdi-microphone
            </v-icon>
          </v-btn>
          <v-btn icon color="#C62828" @click="onClick" height="56" width="56" v-if="isRecording">
            <v-icon size="48">
              mdi-stop-circle
            </v-icon>
          </v-btn>
          <v-chip style="position:absolute; bottom:0; left:calc(50% + 48px);"><strong>{{ formattedElapsedTime }}</strong></v-chip>

          <v-chip style="position:absolute; bottom:0; left:calc(70%);" @click="metronome = !metronome">
            <v-icon left>
              mdi-metronome
            </v-icon>
            <strong v-if="metronome">ON</strong>
            <strong v-if="!metronome">OFF</strong>
          </v-chip>

          <v-chip style="position:absolute; bottom:0; left:calc(70% + 92px);" v-if="bpmConfirmed" @click="bpmClicked">
            <v-icon left>
              mdi-music-note-eighth
            </v-icon>
            <strong>= {{ bpm }}</strong>
          </v-chip>

          <v-chip style="position:absolute; bottom:0; left:calc(70% + 92px);" v-else>
            <v-icon left>
              mdi-music-note-eighth
            </v-icon>
            <strong>=</strong>
            <input ref="bpmInput" type="text" name="fname" v-model="bpm" v-on:keyup="keyPressed" v-click-outside="onClickOutside">
          </v-chip>
        </div>

        <v-divider class="my-4" v-show="showSubmit"></v-divider>
        
        <v-list flat class="py-0">
          <v-list-item-group v-model="selectedFileIndex" active-class>
            <v-list-item v-for='(recordingData, index) in recordingsData' :key="index">
              <template v-slot:default="{ active }">
                <v-list-item-action>
                  <v-checkbox :input-value="active"></v-checkbox>
                </v-list-item-action>

                <v-list-item-content class="py-0">
                  <v-list-item-title @click="changeFileName(index)">
                    {{ recordingData[0] }}(bpm: {{ recordingData[3] }})
                  </v-list-item-title>
                </v-list-item-content>
                <v-list-item-content class="py-0" style="overflow:visible;">
                  <v-list-item-title>
                    <audio controls :src='recordingData[1]'></audio>
                  </v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon color="red" @click="onDelete(recordingData)">
                    <v-icon>
                      mdi-trash-can-outline
                    </v-icon>
                  </v-btn>
                </v-list-item-action>
              </template>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-col>
    </v-row>

    <!-- <v-divider v-show="showSubmit"></v-divider>

    <section class="sound-clips">
      <article class="sound-clip" v-for='(recordingData, index) in recordingsData' :key='index'>
        <v-row justify="center">
          <v-col cols="1">
            <input type="radio" :id='index' :value='index' v-model="selectedFileIndex">
          </v-col>
          <v-col cols="2">  
            <div class="audioName">
            <v-chip class="ma-2" column=true color="primary" nlabel @click="changeFileName(index)">
            {{ recordingData[0] }}
            </v-chip>
            </div>
          </v-col>
          
          <audio controls :src='recordingData[1]'></audio>
          <v-btn class="delete" @click="onDelete(recordingData)" color="error">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-row>
      </article>
    </section>
    <v-divider v-show="showSubmit"></v-divider> -->

    <v-row v-show="showSubmit">
      <v-col cols="12" class="text-center">
        <v-btn color="indigo" dark @click="submitAudio" :loading="dialog"> Upload
          <v-icon right dark> 
            mdi-cloud-upload
          </v-icon>
        </v-btn>
        <v-alert class="submitError"
          type="error"
          v-show="submissionError"
        >An error has occurred</v-alert>
      </v-col>
    </v-row>

    <!-- <div class="text-center">
      <v-dialog
        v-model="dialog"
        hide-overlay
        persistent
        width="300"
      >
        <v-card color="primary" dark>
          <v-card-text>
            Uploading recording...
            <v-progress-linear
              indeterminate
              color="white"
              class="mb-0"
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
    </div> -->
    <v-row>
      <v-col cols="12">
        <score-feedback :currEx="currEx" :isNewRecording="true" :elapsedTime="elapsedTime/1000" :start="start" :bpm="bpm">
        </score-feedback>
      </v-col>
    </v-row>

    <audio :src="require('../../assets/upbeat.mp3')" ref="upbeat"></audio>
    <audio :src="require('../../assets/downbeat.mp3')" ref="downbeat"></audio>

  </div>
</template>

<script>
/* eslint-disable */
import RecordingService from "@/services/RecordingService"
import ScoreAndFeedback from "@/components/Course/ScoreAndFeedback"

export default {
  name: 'AudioRecorder',
  props: ['currEx',
  'courseId',
  'lessonId'],
  components: {
    'score-feedback': ScoreAndFeedback
  },

  data () {
    return {
      // show: false,
      overlay: false,
      zIndex: 0,
      // exercise info
      showRecorder: true,
      constraints: { audio: true },
      chunks: [],
      mediaRecorder: null,
      isRecording: false,
      recordingsData: [],
      selectedFileIndex: null,
      audioCtx: null,

      // timer
      elapsedTime: 0,
      timer: null,

      //countdown
      countDown: 4,
      defaultCountDown: 1,
      hasCountDownStarted: false,

      submissionError: false,
      dialog: false,
      start: false,
      totalTime: 0,

      settings: [],
      bpm: this.currEx.bpm,
      bpmConfirmed: true,
      metronome: true
    }
  },
  watch: {
    bpm: function (val) {
      if (typeof val == "number") {
        this.totalTime = this.countDown * 1000 * 60 / val * this.currEx.numberOfBars
      }
    },
  },
  computed: {
    showSubmit() {
      return this.recordingsData.length != 0;
    },

    formattedElapsedTime() {
      const date = new Date(null);
      date.setSeconds(this.elapsedTime / 1000);
      const utc = date.toUTCString();
      return utc.substr(utc.indexOf(":") + 1, 5);
    },
    
    msPerBeat() {
      return (60 / parseInt(this.bpm)) * 1000;
    }
  },

  created() {
    console.log('started'),
    navigator.mediaDevices.getUserMedia(this.constraints).then(this.onSuccess, this.onError);

    this.countDown = parseInt(this.currEx.timeSignature.split('/')[0])
    this.defaultCountDown = this.countDown

    this.totalTime = this.countDown * 1000 * 60 / this.currEx.bpm * this.currEx.numberOfBars

    this.$notify({
      group: 'foo',
      title: 'Please wear a earpiece if you are using the metronome!',
    });
  },

  methods: {
    keyPressed (e) {
      if (e.code == "Enter") {
        this.bpmConfirmed = true
        let bpm = parseInt(this.bpm)
        if (bpm >= 30 && bpm <= 180) {
          this.bpm = bpm
        } else if (bpm < 30) {
          this.bpm = 30
        } else {
          this.bpm = 180
        }
      }
    },

    onClickOutside () {
      this.bpmConfirmed = true
      let bpm = parseInt(this.bpm)
      if (bpm >= 30 && bpm <= 180) {
        this.bpm = bpm
      } else if (bpm < 30) {
        this.bpm = 30
      } else {
        this.bpm = 180
      }
    },

    async bpmClicked () {
      if (this.isRecording)
        return
      this.bpmConfirmed = false
      await this.$nextTick()
      this.$refs['bpmInput'].select()
    },

    countDownTimer() {
        if(this.countDown > 0) {
          if (this.metronome) {
            this.$refs['downbeat'].play()
            setTimeout(() => {
                this.countDown -= 1
                this.countDownTimer()
                this.$refs['downbeat'].play()
            }, 1000 * 60 / this.bpm)
          } else {
            setTimeout(() => {
                this.countDown -= 1
                this.countDownTimer()
            }, 1000 * 60 / this.bpm)
          }
        }

        if (this.countDown == 0) {
          if (!this.isRecording) {
            this.onStart()
            this.isRecording = true;
            this.start = true
            this.overlay = false;
          }
        }
    },

    startTimer() {
      if (this.metronome) {
        this.timer = setInterval(() => {
          this.elapsedTime += 10;
          if (this.elapsedTime > this.totalTime) {
            clearInterval(this.timer);
            if (this.isRecording) {
              this.onStop();
            }
          }
          if (this.elapsedTime % this.msPerBeat == 0) this.$refs['downbeat'].play()
        }, 10);
      } else {
        this.timer = setInterval(() => {
          this.elapsedTime += 10;
          if (this.elapsedTime > this.totalTime) {
            clearInterval(this.timer);
            if (this.isRecording) {
              this.onStop();
            }
          }
        }, 10);
      }
    },

    stopTimer() {
      this.elapsedTime = 0;
      clearInterval(this.timer);
    },

    onClick(e) {
      if (!this.bpmConfirmed) {
        alert('Please choose a bpm to record with')
        return
      }

      if (!this.isRecording && !this.hasCountDownStarted) {
        this.countDownTimer();
        this.hasCountDownStarted = true;
        this.overlay = !this.overlay
      } 
      
      if (this.isRecording) {
        this.onStop();
      }
      
    },

    async submitAudio() {
      if (this.selectedFileIndex == null) {
        alert('Please select one of the recordings');
        return
      }
      this.dialog = true
      const blob = this.recordingsData[this.selectedFileIndex][2];
      const clipName = this.recordingsData[this.selectedFileIndex][0];
      const fileName = clipName.concat(".ogg");
      const file = new File([blob], fileName);
      console.log(file)
      try {
        let formData = new FormData()
        formData.set('eid', this.currEx.id)
        formData.set('bpm', this.recordingsData[this.selectedFileIndex][3])
        console.log(this.currEx.id, file)
        formData.append('audio', file);
        let recording = (await RecordingService.create(formData)).data.recording
        let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
        alert('Success!')
        this.$router.push(`/course/show/${this.courseId}/lesson/${this.lessonId}`)
      } catch (error) {
        console.log(error)
        this.submissionError = true;
      } finally {
        this.dialog = false
      }
    },

    onStart() {
      // this.countDownTimer()
      this.mediaRecorder.start()
      this.startTimer()
      const record = document.getElementById('recButton');
    },

    onStop() {
      console.log("Recorder state: ", this.mediaRecorder.state);
      this.stopTimer();
      this.start = false;
      this.mediaRecorder.stop();
      this.countDown = this.defaultCountDown;
      this.hasCountDownStarted = false;
    },

    onDelete(recordingData) {
      this.recordingsData = this.recordingsData.filter(x => x != recordingData)
    },

    onSuccess(stream) {
      const mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder = mediaRecorder;
      var chunks = [];
      console.log("Recorder state: ", mediaRecorder.state);

      mediaRecorder.onstop = (e) => {
        const clipName = prompt('Enter a name for your sound clip?','My recording');
        this.isRecording = false;
        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=vorbis' });
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        
        this.recordingsData.push([clipName, audioURL, blob, this.bpm]);
      }

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      }
    },

    onError(err){
      console.log(err)
    },
    changeFileName(index) {
      const existingName = this.recordingsData[index][0];
      const newClipName = prompt('Enter a new name for your sound clip?');

      if(newClipName !== null && newClipName.trim().length > 0) {
        this.recordingsData[index][0] = newClipName;
      } 
    },

  }
}
</script>

<style scoped>

#recButton {
	width: 35px;
	height: 35px;
	font-size: 0;
	background-color: red;
	border: 0;
	border-radius: 35px;
	margin: 18px;
	outline: none;
}

.notRec{
	background-color: darkred;
}

.Rec{
	animation-name: pulse;
	animation-duration: 1.5s;
	animation-iteration-count: infinite;
	animation-timing-function: linear;
}

@keyframes pulse{
	0%{
		box-shadow: 0px 0px 5px 0px rgba(173,0,0,.3);
	}
	65%{
		box-shadow: 0px 0px 5px 13px rgba(173,0,0,.3);
	}
	90%{
		box-shadow: 0px 0px 5px 13px rgba(173,0,0,0);
	}
}

label.countdown {
  font-size: 100px;
}

input[type=radio] {
   width: 30px;
   height: 30px;
}
.visualizer {
  position: relative;
} 
.audio {
  position: relative;
  left: -30px;
}

.audioName {
  /* margin-bottom: 5rem;
  margin-right: 2rem; */
  position: relative;
  top: -10px;
}

canvas {
  display: block;
  margin-bottom: 0.5rem;
}

.submitError {
  margin: 1.5rem;
}

button.delete {
  margin-top: 0.5rem;
  margin-left: 2rem;
}

.sound-clips {
  margin: 1rem;
}

.sound-clip {
  margin: 1rem;
}

.clip {
  padding-bottom: 1rem;
}

audio:focus {
  outline:0;
}

input[type=text] {
  border-bottom: 1px solid black;
  width:50px;
  padding-left: 12px;
  margin: 0 8px;
}

input[type=text]:focus {
  outline: 0;
}

</style>
