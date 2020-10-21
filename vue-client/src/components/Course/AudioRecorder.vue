<template>
  <div id="inner">
    <a id="currEx" style="display:none">{{ currEx.id }}</a>
    <section class="main-controls">
      <button id="recButton" class="notRec" @click="onClick" style="margin-top: 10px;"></button>
      <div style="margin-left: 15px; margin-top: 10px; "> {{ formattedElapsedTime }} </div>

    </section>

    <section class="sound-clips">
    </section>

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
      selectedAudioFile: null,
      soundClips: null,
      recordings: {},
      recordingId: 0,
      showSubmit: false,

      // timer
      elapsedTime: 0,
      timer: null,

    }
  },
  computed: {
    formattedElapsedTime() {
      const date = new Date(null);
      date.setSeconds(this.elapsedTime / 1000);
      const utc = date.toUTCString();
      return utc.substr(utc.indexOf(":") + 1, 5);
    }
    
  },

  methods: {
    
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
      const record = document.getElementById('recButton');
      if (record.classList.contains('notRec')) {
        record.classList.remove('notRec');
        record.classList.add('Rec');
      } else {
        record.classList.add('notRec');
        record.classList.remove('Rec');
      }

      this.isRecording ? this.onStop() : this.onStart()
      this.isRecording = !this.isRecording;
    },

    onStart() {
      
      this.startTimer()
      const record = document.getElementById('recButton');
      navigator.mediaDevices.getUserMedia(this.constraints).then(this.onSuccess, this.onError);
    },

    onStop() {
      this.stopTimer()
      this.mediaRecorder.stop();
      console.log("Recorder state: ", this.mediaRecorder.state);
      const soundClips = document.querySelector('.sound-clips');
    },

    onSuccess(stream) {
      const record = document.querySelector('.record');
      const stop = document.querySelector('.stop');
      const soundClips = document.querySelector('.sound-clips');
      const mainSection = document.querySelector('.main-controls');
      console.log(soundClips, mainSection)
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      var chunks = [];
      console.log("Recorder state: ", mediaRecorder.state);

      mediaRecorder.onstop = function(e) {
        const clipName = prompt('Enter a name for your sound clip?','My recording');

        const clipContainer = document.createElement('article');
        const clipLabel = document.createElement('label');
        const audio = document.createElement('audio');
        const deleteButton = document.createElement('button');
        const uploadButton = document.createElement('button');
        const radioInput = document.createElement('input');
        
        clipContainer.classList.add('clip');
        clipContainer.style.margin = '0 auto'
        audio.setAttribute('controls', '');
        uploadButton.textContent = 'UPLOAD THIS';
        deleteButton.textContent = 'X';
        deleteButton.className = 'delete';
        clipLabel.className = 'date';

        // Style for elements
        audio.style.padding = '20px 0 0 0';
        audio.style.position = 'relative'
        audio.style.top = '12px'
        clipContainer.style.display = 'block';
        clipLabel.style.color = 'blue';
        clipLabel.style.padding = '10px'

        uploadButton.style.backgroundColor = '#ec5252';
        // uploadButton.style.position = 'relative'
        // uploadButton.style.top = '0px'
        uploadButton.style.padding = '0.3em 1.2em'
        uploadButton.style.margin = '0.3em 0.3em 0'
        uploadButton.style.borderRadius = '2em'
        uploadButton.style.color = 'white'
        uploadButton.style.fontWeight = 'bold'
        uploadButton.style.boxSizing = 'border-box'

        deleteButton.style.margin = '10px'
        deleteButton.style.color = 'red';
        deleteButton.style.fontWeight = 'bold';
        deleteButton.style.fontSize = '30px';
        deleteButton.style.position = 'relative'
        deleteButton.style.top = '5px'

        radioInput.style.height = '30px'
        radioInput.style.width = '30px'
        radioInput.style.position = 'relative'
        radioInput.style.top = '12px'

        if (clipName === null) {
          clipLabel.textContent = 'My unnamed clip';
        } else {
          clipLabel.textContent = clipName;
        }
        // Not using radio input
        // radioInput.setAttribute('type', 'radio');
        // radioInput.setAttribute('name', 'radio');
        // radioInput.setAttribute('value', 1);
        // clipContainer.appendChild(radioInput);

        clipContainer.appendChild(deleteButton);
        clipContainer.appendChild(clipLabel);
        clipContainer.appendChild(audio);
        clipContainer.appendChild(uploadButton);
        soundClips.appendChild(clipContainer);

        audio.controls = true;
        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        const fileName = clipLabel.textContent.concat(".ogg");
        const file = new File([blob], fileName);

        // Download file during testing
        // const url = window.URL.createObjectURL(file);
        // var a = document.createElement("a");
        // document.body.appendChild(a);
        // a.style = "display: none";
        // a.href = url;
        // a.download = fileName;
        // a.click();
        // console.log("A", a)
        // window.URL.revokeObjectURL(url);



        deleteButton.onclick = function(e) {
          let evtTgt = e.target;
          evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
        }

        uploadButton.onclick = async function() {
          if (file) {
            console.log(file)
            let formData = new FormData()
            const currExId = document.getElementById("currEx").innerText
            formData.set('eid', currExId)
            formData.append('audio', file);
            let recording = (await RecordingService.create(formData)).data.recording
            let feedback = (await RecordingService.getFeedback(recording.id)).data.recording.transcription
            const transcribedNotes = this.splitFeedbackIntoRows(JSON.parse(feedback))
            console.log('transcribed notes: ', transcribedNotes)
          } else {
            alert('Please input an audio file to gain feedback')
          }
          
        }

        clipLabel.onclick = function() {
          const existingName = clipLabel.textContent;
          const newClipName = prompt('Enter a new name for your sound clip?');
          if(newClipName === null) {
            clipLabel.textContent = existingName;
          } else {
            clipLabel.textContent = newClipName;
          }
        }
      }

      mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
      }


      this.mediaRecorder = mediaRecorder;
    },

    onError(err){
      console.log(err)
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

</style>
