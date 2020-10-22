<template>
  <div>
    <section class="main-controls">
      <canvas class="visualizer" height="60px"></canvas>
      <button id="recButton" class="notRec" @click="onClick" style="margin-top: 10px;"></button>
      <div style="margin-left: 15px; margin-top: 10px; "> {{ countDown }} </div>
      <div style="margin-left: 15px; margin-top: 10px; margin-bottom: 20px;"> {{ formattedElapsedTime }} </div>
    </section>

    <section class="sound-clips">
      <article v-for='(recordingData, index) in recordingsData' :key='index'>
        <input type="radio" :id='index' :value='index' v-model="selectedFileIndex">
        <label class="audio" @click="changeFileName(index)">{{ recordingData[0] }}</label>
        <audio controls :src='recordingData[1]'>
          
        </audio>
        <button class="delete" @click="onDelete(recordingData)">Delete</button>
        
      </article>
    </section>

    <button v-show="showSubmit" @click="submitAudio">Upload</button>

    <!-- <button class="submit" v-show="showSubmit" @click="submitAudio" style="margin-top: 2px;">Upload Recording</button> -->
  </div>
</template>

<script>
/* eslint-disable */
import RecordingService from "@/services/RecordingService"
export default {
  name: 'AudioRecorder',
  props: ['currEx'],

  data () {
    return {
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
      countDown: 1,
      defaultCountDown: 1,
      hasCountDownStarted: false

    }
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
          }
        }
    },

    startTimer() {
      this.timer = setInterval(() => {
        this.elapsedTime += 1000;
      }, 1000);
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
      } 
      
      if (this.isRecording) {
        this.onStop();
      }
      
    },

    async submitAudio() {
      const file = this.recordingsData[this.selectedFileIndex][2];
      console.log(file)
      if (file) {
        let formData = new FormData()
        formData.set('eid', this.currEx.id)
        console.log(this.currEx.id, file)
        formData.append('audio', file);
        let recording = (await RecordingService.create(formData)).data.recording
        let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
        const transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
        console.log('transcribed notes: ', transcribedNotes)
        alert("Audio file successfully uploaded")
      } else {
        alert('Please input an audio file to gain feedback')
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
      this.mediaRecorder.stop();
      this.countDown = this.defaultCountDown;
      this.isRecording = false;
      this.hasCountDownStarted = false;
    },

    onDelete(recordingData) {
      this.recordingsData = this.recordingsData.filter(x => x != recordingData)
    },

    onSuccess(stream) {
      const record = document.querySelector('.record');
      const stop = document.querySelector('.stop');
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
      if(newClipName === null) {
        this.recordingsData[index][0]= existingName;
      } else {
        this.recordingsData[index][0] = newClipName;
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
      //analyser.connect(audioCtx.destination);

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

button.submit {
  padding:0.3em 1.2em;
  margin:0 0.3em 0.3em 0;
  border-radius:2em;
  box-sizing: border-box;
  font-family:'Roboto',sans-serif;
  font-weight:300;
  color:#FFFFFF;
  background-color:#ec5252;
  text-align:center;
}

button.submit:hover{
  background-color:#4b93bd;
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

.main-controls {
  width: 50%;
  margin: 0 auto;
}


* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.8rem;
}

.wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

h1, h2 {
  font-size: 2rem;
  text-align: center;
  font-weight: normal;
  padding: 0.5rem 0 0 0;
}

canvas {
  display: block;
  margin-bottom: 0.5rem;
}


button {
  font-size: 1rem;
  background: #0088cc;
  text-align: center;
  color: white;
  border: none;
  transition: all 0.2s;
  padding: 0.5rem;
}

button:hover, button:focus {
  box-shadow: inset 0px 0px 10px rgba(255, 255, 255, 1);
  background: #0ae;
}

button.delete {
  float: right;
  background: rgb(238, 28, 0);
  position: relative;
  top: -120px;
}


/* Make the clips use as much space as possible, and
 * also show a scrollbar when there are too many clips to show
 * in the available space */
.sound-clips {
  flex: 1;
  width: 70%;
  
  /* margin: 0 auto; */
  
}

section, article {
  display: block;
}

.clip {
  padding-bottom: 1rem;
}

audio {
  /* width: 50%; */
  display: block;
  margin: 1rem auto 0.5rem;
  position: relative;
  bottom: 65px;
  left: -30px;
  padding: 0.5rem 0.3rem;
}


/* Checkbox hack to control information box display */

label {
  position: relative;
  top: -10px;
  right: -10px;
  cursor: pointer;
  background-color: rgb(117, 214, 117);
  border-radius: 5px;
  padding: 0.5rem 0.3rem;
}

/* input[type=checkbox] {
   position: absolute;
   top: -100px;
} */
input[type=radio] {
   width: 30px;
   height: 30px;
}
.visualizer {
  position: relative;
  left: -50px;
}

/* Cursor when clip name is clicked over */

.clip p {
  cursor: pointer;
}


/* Adjustments for wider screens */
@media all and (min-width: 800px) {
  /* Don't take all the space as readability is lost when line length
     goes past a certain size */
  .wrapper {
    width: 90%;
    max-width: 1000px;
    margin: 0 auto;
  }
}


</style>
