<template>
  <div>
    <v-overlay
      :value="overlay"
    >
      <label class="countdown">{{ countDown }} </label>
    </v-overlay>

    <v-row>
      <v-col cols="12">
        <section class="main-controls">
          <v-row justify="center">
            <v-col cols="12">
              <canvas class="visualizer" justify="center" height="60px"></canvas>
            </v-col>
          </v-row>
          <button id="recButton" class="notRec" @click="onClick"></button>
          <v-btn class="mx-auto px-6 action-button" large @click="onClick"> Record
            <v-icon right dark size="20" color="red"> 
              mdi-record-circle-outline
            </v-icon>
          </v-btn>
          <v-btn
            class="mx-2"
            fab
            small
            icon
            elevation="2"
            @click="onClick"
          >
            <v-icon color="#747474">
              mdi-microphone
            </v-icon>
          </v-btn>
          <label> {{ formattedElapsedTime }} </label>
        </section>
      </v-col>
    </v-row>

    <v-divider v-show="showSubmit"></v-divider>
    
    <section class="sound-clips"  >
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
    <v-divider v-show="showSubmit"></v-divider>
    <v-row justify="center">
      <v-btn class="submit" v-show="showSubmit" @click="submitAudio"
      :disabled="dialog" :loading="dialog">Upload</v-btn>
      <v-alert class="submitError"
        type="error"
        v-show="submissionError"
      >An error has occurred</v-alert>
    </v-row>
    <div class="text-center">
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
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import RecordingService from "@/services/RecordingService"
import ScoreAndFeedback from "@/components/Course/ScoreAndFeedback"

export default {
  name: 'AudioRecorder',
  props: ['currEx', 'start'],

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
      dialog: false

    }
  },
  watch: {
    // dialog (val) {
    //   if (!val) return

    //   setTimeout(() => (this.dialog = false), 1000)
    // },
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
    }
    
  },

  created() {
    console.log('started'),
    navigator.mediaDevices.getUserMedia(this.constraints).then(this.onSuccess, this.onError);
  },

  methods: {
    countDownTimer() {
        if(this.countDown > 0) {
            setTimeout(() => {
                this.countDown -= 1
                this.countDownTimer()
            }, 1000)
        }

        if (this.countDown == 0) {
          const record = document.getElementById('recButton');
          if (record.classList.contains('notRec')) {
            record.classList.remove('notRec');
            record.classList.add('Rec');
          } else {
            record.classList.add('notRec');
            record.classList.remove('Rec');
          }
          if (!this.isRecording) {
            this.onStart()
            this.isRecording = !this.isRecording;
            this.overlay = false;
          }
        }
    },

    startTimer() {
      this.timer = setInterval(() => {
        this.elapsedTime += 50;
        this.$emit('timeUpdate', this.elapsedTime)
      }, 50);
    },

    stopTimer() {
      this.showSubmit = true;
      this.elapsedTime = 0;
      clearInterval(this.timer);
    },

    onClick(e) {
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
      this.dialog = true
      const file = this.recordingsData[this.selectedFileIndex][2];
      console.log(file)
      try {
        let formData = new FormData()
        formData.set('eid', this.currEx.id)
        console.log(this.currEx.id, file)
        formData.append('audio', file);
        let recording = (await RecordingService.create(formData)).data.recording
        let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
        const transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
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
      this.start()
    },

    onStop() {
      console.log("Recorder state: ", this.mediaRecorder.state);
      this.stopTimer();
      this.mediaRecorder.stop();
      this.countDown = this.defaultCountDown;
      this.isRecording = false;
      this.hasCountDownStarted = false;
    },

    onDelete(recordingData) {
      this.recordingsData = this.recordingsData.filter(x => x != recordingData)
    },

    onSuccess(stream) {
      const soundClips = document.querySelector('.sound-clips');
      const mainSection = document.querySelector('.main-controls');
      console.log(soundClips, mainSection)
      const mediaRecorder = new MediaRecorder(stream);
      this.visualize(stream);

      this.mediaRecorder = mediaRecorder;
      var chunks = [];
      console.log("Recorder state: ", mediaRecorder.state);

      mediaRecorder.onstop = (e) => {
        const clipName = prompt('Enter a name for your sound clip?','My recording');

        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        const fileName = clipName.concat(".ogg");
        const file = new File([blob], fileName);
        this.recordingsData.push([clipName, audioURL, file]);
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
      var newData = this.recordingsData[index];
      newData[0] = newClipName
      console.log(newData)

      if(newClipName === null) {
        this.recordingsData[index]= newData;
      } else {
        this.recordingsData[index] = newData;
      }
    },

    visualize(stream) {
      const canvas = document.querySelector('.visualizer');
      const canvasCtx = canvas.getContext("2d");

      if(!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);

      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      draw()

      function draw() {
        const WIDTH = canvas.width
        const HEIGHT = canvas.height;

        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'rgb(200, 200, 200)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

        canvasCtx.beginPath();

        let sliceWidth = WIDTH * 1.0 / bufferLength;
        let x = 0;


        for(let i = 0; i < bufferLength; i++) {

          let v = dataArray[i] / 128.0;
          let y = v * HEIGHT/2;

          if(i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height/2);
        canvasCtx.stroke();
      }
    }

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

button.submit {
  margin: 2rem;
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


</style>
