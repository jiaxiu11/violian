<template>
  <div id="inner">
    <section class="main-controls">
      <button id="recButton" class="notRec" @click="onClick" style="margin-top: 2px;"></button>
      <div style="margin-left: 10px; margin-top: 15px; "> {{ formattedElapsedTime }} </div>

    </section>

    <section class="sound-clips">
    </section>
  </div>
</template>

<script>
/* eslint-disable */
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
      this.elapsedTime = 0;
      clearInterval(this.timer);
    },

    onClick() {
      const record = document.getElementById('recButton');
      if (record.classList.contains('notRec')) {
        record.classList.remove('notRec');
        record.classList.add('Rec');
      } else {
        record.classList.add('notRec');
        record.classList.remove('Rec');
      }
      console.log('classList', record.classList)


      this.isRecording ? this.onStop() : this.onStart()
      this.isRecording = !this.isRecording;
      
    },

    onStart() {
      this.startTimer()
      const record = document.getElementById('recButton');
      navigator.mediaDevices.getUserMedia(this.constraints).then(this.onSuccess, this.onError);
      
      record.style.background = "red";

      // stop.disabled = false;
      // record.disabled = true;
    },
    onStop() {
      this.stopTimer()
      this.mediaRecorder.stop();
      console.log(this.mediaRecorder.state, ", Recorder Stopped");
      const soundClips = document.querySelector('.sound-clips');
      for (var x in soundClips.childNodes) {
        console.log(x)
      }
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
      console.log(mediaRecorder.state);
      console.log("recorder started");

      mediaRecorder.onstop = function(e) {
        console.log("data available after MediaRecorder.stop() called.");

        const clipName = prompt('Enter a name for your sound clip?','My recording');

        const clipContainer = document.createElement('article');
        const clipLabel = document.createElement('label');
        const audio = document.createElement('audio');
        const deleteButton = document.createElement('button');
        const row = document.createElement('row');
        const radioInput = document.createElement('input');
        

        clipContainer.classList.add('clip');
        audio.setAttribute('controls', '');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete';
        if(clipName === null) {
          clipLabel.textContent = 'My unnamed clip';
        } else {
          clipLabel.textContent = clipName;
        }
        
        // clipLabel.innerHTML = "<style>label {margin-bottom:50px;background-color: blue;}</style>";
        // var sheet2 = document.createElement('style')
        // sheet2.innerHTML = "button {margin-bottom:50px;background-color: blue;}";
        // // clipLabel.appendChild(sheet)
        // deleteButton.appendChild(sheet2)
        // clipLabel.innerHTML = "<style>{ margin-bottom:10px;}</style>";
        // deleteButton.innerHTML = "<style>button { float:right; }</style>";


        // row.appendChild(clipLabel);
        // row.appendChild(deleteButton);
        // clipContainer.appendChild(row);

        clipContainer.appendChild(radioInput);
        clipContainer.appendChild(clipLabel);
        clipContainer.appendChild(audio);

        clipContainer.appendChild(deleteButton);
        soundClips.appendChild(clipContainer);

        audio.controls = true;
        console.log(this.chunks)
        const blob = new Blob(chunks, { 'type' : 'audio/wav; codecs=opus' });
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped", audioURL);

        radioInput.setAttribute('type', 'radio');
        radioInput.setAttribute('name', audio);
        radioInput.setAttribute('checked', true);
        radioInput.onclick = function() {
          this.selectedAudioFile = this.name;
          console.log(this.selectedAudioFile);
        }
        clipLabel.classList.add('label')

        deleteButton.onclick = function(e) {
          let evtTgt = e.target;
          evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
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
        console.log(chunks);

      }
      this.mediaRecorder = mediaRecorder;
    },

    onError(err){
      console.log(err)
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
        console.log(transcribedNotes)
      } else {
        alert('Please input an audio file to gain feedback')
      }
    },

  }
}
</script>

<style scoped>
button {
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


.main-controls {
  padding: 0.5rem 0;
}

.label {
  font-size: 20px;
  background-color: #f00;
  margin-bottom: 30px;
}



button:hover, button:focus {
  box-shadow: inset 0px 0px 10px rgba(255, 255, 255, 1);
  background: rgb(205, 23, 23);
}


/* Make the clips use as much space as possible, and
 * also show a scrollbar when there are too many clips to show
 * in the available space */
.sound-clips {
  flex: 1;
  overflow: auto;
}

section, article {
  display: block;
}

.clip {
  padding-bottom: 1rem;
}

audio {
  width: 100%;
  display: block;
  margin: 1rem auto 0.5rem;
}

.clip p {
  display: inline-block;
  font-size: 1rem;
}

.clip button {
  font-size: 1rem;
  float: right;
}

button.delete {
  margin: 0 auto;
  background: #f00;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

#inner {
  /* width: 50%; */
  margin: 0 auto;
}

</style>
