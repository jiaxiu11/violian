<template lang="pug">
  div(style="font-size:16px !important;")
    v-row
      v-btn(:id="`recButton`" :class="`notRec`" @click="onClick" style="margin-top: 2px;background-color:red;")
      div(style="margin-left: 10px; margin-top: 15px; ") {{formattedElapsedTime}}
    v-row
      v-col
        div(:class="`sound-clips`")
        div(:class="`main-controls`")
</template>

<script>
/* eslint-disable */
export default {
  name: 'AudioRecorder',
  
  data () {
    return {
      // exercise info
      showRecorder: true,
      constraints: { audio: true },
      chunks: [],
      mediaRecorder: null,
      isRecording: false,

      elapsedTime: 0,
      timer: undefined

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
      console.log(this.mediaRecorder.state);
      console.log("recorder stopped");
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
        const clipLabel = document.createElement('p');
        const audio = document.createElement('audio');
        const deleteButton = document.createElement('button');

        clipContainer.classList.add('clip');
        audio.setAttribute('controls', '');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete';

        if(clipName === null) {
          clipLabel.textContent = 'My unnamed clip';
        } else {
          clipLabel.textContent = clipName;
        }

        clipContainer.appendChild(audio);
        clipContainer.appendChild(clipLabel);
        clipContainer.appendChild(deleteButton);
        soundClips.appendChild(clipContainer);

        audio.controls = true;
        console.log(this.chunks)
        const blob = new Blob(chunks, { 'type' : 'audio/wav; codecs=opus' });
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped", audioURL);

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

</style>
