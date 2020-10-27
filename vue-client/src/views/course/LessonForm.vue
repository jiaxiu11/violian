<template lang="pug">
v-container
  //- if have lesson_id means it's an edit action, if it has course_id means it's a new lesson action
  v-row(v-if="($route.params.lesson_id && lesson) || $route.params.course_id")
    v-col
      v-card.text-left(outlined).mb-12
        v-card-title.display-1.px-10.font-weight-bold Lesson
          v-spacer
          v-btn(outlined color='indigo' right @click="deleteLesson")
            v-icon(color="indigo") mdi-trash-can-outline
        v-divider
        v-card-text.px-10
          v-form(:ref="`lessonForm`")
            v-row
              v-col.pb-0(cols="12" md="6")
                v-text-field(dense label='Name' name='name' type='text' v-model='newLesson.name' :rules="requiredRules" outlined color="indigo" ) Title*
            v-row
              v-col.pb-0(cols="12")
                v-textarea(dense label="Description" auto-grow v-model='newLesson.description' color="indigo" outlined)
          v-divider
          v-row
            v-col(cols="12")         
                div(v-for="(exercise, exerciseIdx) in newLesson.exercises" @click="" :key='exerciseIdx' )
                  div.text-h5 Video
                    v-form(:ref="`exerciseForm-${exerciseIdx}`")
                      v-row
                        v-col(cols="12" md="6")
                          v-file-input(
                            accept="video/mp4, video/ogg"
                            :placeholder="exercise.videoFilename ? exercise.videoFilename : 'Choose explanation video'" 
                            prepend-icon="mdi-video" 
                            label="Explanation Video"
                            v-model="exercise.video"
                            outlined
                            color="indigo"
                            dense
                            hide-details
                            :rules="requiredRules")
                        v-col(cols="12" md="6")
                          v-file-input(
                            accept="image/*" 
                            :placeholder="exercise.videoPosterFilename ? exercise.videoPosterFilename : 'Choose coverpage for video'" 
                            prepend-icon="mdi-image" 
                            label="Explanation Video Poster (Optional)"
                            v-model="exercise.videoPoster"
                          @change="onVideoPosterInput"
                            outlined
                            color="indigo"
                            dense
                            hide-details)
                      v-row(v-if="exercise.video" style="width: 100%;" :key="componentKey")
                        video.vjs-big-play-centered(
                            ref="videoPlayer"
                            class="video-js"
                            :id="`video`"
                            controls
                            :poster="getFileUrl(exercise.videoPoster)"
                            data-setup='{"fluid": true, "aspectRatio": "16:9"}'
                        )
                            source(:src="getFileUrl(exercise.video)" type="video/mp4")
                      v-divider.mt-3
                      div.text-h5.mt-6 Score
                      v-row
                        v-col(cols="12" md="6")
                          v-switch.ma-0(v-model="exercise.useScore" :label="`Overlay score on your video`" color="indigo" dense hide-details)
                        v-col.py-0(cols="12" md="6" v-if="exercise.useScore")
                            v-text-field(label='Demo Start Time' v-model='exercise.demoStartTime' color="indigo" prepend-icon="mdi-alarm" persistent-hint hint="At roughly which second did you start playing in demo video" :rules="demoStartTimeRules")
                      div.text-h6.mt-3 Input score
                      v-row  
                        v-col.py-0(cols="12" md="6" v-if="exercise.useScore")
                          v-radio-group(v-model="exercise.useXml" :mandatory="true" @change="showVex($event, exerciseIdx)")
                            v-radio(label="Upload musicXML file" :value="true" color="indigo")
                            v-radio(label="Design your own score" :value="false" color="indigo")

                    
                      div(v-show="!exercise.useXml && exercise.useScore")
                        v-row
                          v-col(cols="12" md="6")
                            v-text-field(dense label='BPM for this score' name='bpm' v-model='exercise.bpm' outlined color="indigo")
                          v-col(cols="12" md="6")
                            v-select(dense :items="time_signatures" outlined v-model="exercise.timeSignature" label='Time Signature' @change="changeTimeSignature($event, exerciseIdx)" color="indigo")
                          v-col.pt-0(cols="12" md="6")
                            div.pl-0 No. Bars:   {{ exercise.numberOfBars }}
                            v-slider(v-model='exercise.numberOfBars' min='0' max='16' thumb-label :thumb-size="24" @change="changeBars($event, exerciseIdx)" color="indigo" track-color="indigo lighten-3" hide-details)
                        v-row
                          v-col.pa-0(:id="`pannel-content-${exerciseIdx}`" @click="changeMelody($event, exerciseIdx)")
                      div(v-show="exercise.useXml && exercise.useScore")
                        v-row
                          v-col(cols="12" md="6")
                            v-file-input(
                              accept="text/xml, .musicxml" 
                              :placeholder="exercise.musicXmlFilname ? exercise.musicXmlFilename : 'Music XML file'" 
                              prepend-icon="mdi-file-document-outline"
                              label="Upload musicxml file"
                              v-model="exercise.musicXml"
                              outlined
                              dense)
                          v-col(cols="12" md="6")
                            v-text-field(dense label='BPM for this score' name='bpm' v-model='exercise.bpm' outlined color="indigo")

  v-row.justify-center
    v-col.text-center
      v-btn(color="indigo" @click='update' :loading="loading" dark)
        | Save
      v-btn(@click="cancel" :disabled="loading") Cancel
</template>

<script>
/* eslint-disable */
import LessonService from '@/services/LessonService'
import ExerciseService from '@/services/ExerciseService'
import FileService from '@/services/FileService'
import vexUI from '@/plugins/vex'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export default {
  name: 'LessonForm',
  data () {
    return {
        componentKey:1,
      newLesson: {
        name: '',
        duration: '',
        description: '',
        files: [],
        exercises: [{
          name: '',
          video: null,
          videoFilename: '',
          videoPoster: null,
          videoPosterFilename: '',
          useScore: true,
          timeSignature: '4/4',
          bpm: 60,
          numberOfBars: 4,
          melody: [],
          demoStartTime: "0",
          useXml: true,
          musicXml: null,
          musicXmlFilename: '',
          handler: null,
        }]
      },
      lesson: null,
      requiredRules: [
        v => !!v || "This field is required"
      ],
      durationRules: [
        v => !!v || "Duration is required",
        v => new RegExp(/^\d+$/).test(v) || "Please input numbers only"
      ],
      demoStartTimeRules: [
        v => !!v || "Demo Start Time is required",
        v => new RegExp(/^\d+$/).test(v) || "Please input numbers only"
      ],
      nameRules: [
        v => !!v || "Name is required",
        v => new RegExp(/^[a-zA-Z0-9 ]{2,30}$/).test(v) || "Name must be alphanumeric characters and of length 2 - 30"
      ],
      fileRules: [
        files => {
          for (var i = 0; i < files.length; i++) {
            if (files[i].size > 2097152214783648) {
              return 'File cannot be larger than 2GB'
            }
          }
          return true
        }
      ],
      time_signatures: ["4/4", "3/4", "2/4", "3/8", "6/8"],
      loading: false,
      error: null,

      // dialog
      fileDialog: false,
      newFiles: [],

      // options for file CRUD
      options: ['Download', 'Delete'],
      uuid: 0,

      // expansion panel
      openedExercise: [0]
    }
  },
  
  // watch: {
  //   newFiles (val) {
  //     console.log(val)
  //   }
  // },

  methods: {
      onVideoPosterInput() {
          this.componentKey += 1
      },
      getFileUrl(file) {
          if(!file) {
              return null
          }
          if (typeof file === 'string') {
              return file
          }
          let url = window.URL.createObjectURL(file)
          return url
      },
    showFile () {
      this.fileDialog = true
    },

    async showVex (event, exerciseIdx) {
      if (this.newLesson.exercises[exerciseIdx].handler == null && !this.newLesson.exercises[exerciseIdx].useXml && this.newLesson.exercises[exerciseIdx].useScore) {
        await this.$nextTick()
        var div = document.createElement("div")
        div.id = `vexflow-wrapper-${exerciseIdx}`
        var pannel = document.getElementById(`pannel-content-${exerciseIdx}`)
        pannel.appendChild(div)
        this.newLesson.exercises[exerciseIdx].handler = new vexUI.Handler(div.id, {
          canvasProperties: {
            id: div.id + '-canvas',
            width: pannel.offsetWidth,
            tabindex: 1
          }
        }).init()
      }
      console.log(this.newLesson.exercises[exerciseIdx].handler)
    },
    
    changeTimeSignature (event, exerciseIdx) {
      this.newLesson.exercises[exerciseIdx].handler.setTimeSignature(this.newLesson.exercises[exerciseIdx].timeSignature)
    },

    changeBars (event, exerciseIdx) {
      console.log(exerciseIdx)
      this.newLesson.exercises[exerciseIdx].handler.changeNumberOfBars(this.newLesson.exercises[exerciseIdx].numberOfBars, this.newLesson.exercises[exerciseIdx].handler.exportNotes())
    },

    changeMelody (event, exerciseIdx) {
      this.newLesson.exercises[exerciseIdx].melody = this.newLesson.exercises[exerciseIdx].handler.exportNotes()
    },

    async update () {
      var tempLesson = this.newLesson

      if (!this.$refs.lessonForm.validate())
        return

      for (let i = 0; i < tempLesson.exercises.length; i++) {
        if (tempLesson.exercises[i].useScore && !tempLesson.exercises[i].musicXml && tempLesson.exercises[i].melody.length == 0) {
          alert('Please ensure that you have input corresponding data if you choose to use score')
          return
        }
        if (!tempLesson.exercises[i].video && tempLesson.exercises[i].videoFilename == "") {
          alert('Please ensure that you have input a video for video content')
          return
        }
      }

      this.loading = true
      let lessonResponse = null
      if (this.$route.params.lesson_id) {
        await LessonService.edit({
          id: this.lesson.id,
          name: this.newLesson.name,
          duration: Number(this.newLesson.duration),
          description: this.newLesson.description,
        })
      } else {
        lessonResponse = await LessonService.create({
          name: this.newLesson.name,
          duration: Number(this.newLesson.duration),
          description: this.newLesson.description,
          cid: this.$route.params.course_id
        })

        await Promise.all(this.newLesson.files.map(async fileObj => {
          let formData = new FormData()
          formData.set('lessonId', lessonResponse.data.lesson.id)
          formData.set('name', fileObj.name)
          formData.set('size', parseInt(fileObj.size))
          formData.set('type', fileObj.type)
          formData.append('file', fileObj.file)
          return FileService.create(formData)
        }))
      }

      // create exercise that belongs to lessons
      for (let i = 0; i < tempLesson.exercises.length; i++) {
        var formData = new FormData()
        formData.set('name', tempLesson.exercises[i].name)
        formData.set('melody', tempLesson.exercises[i].melody.join('-'))
        formData.set('timeSignature', tempLesson.exercises[i].timeSignature)
        formData.set('bpm', tempLesson.exercises[i].bpm)
        formData.set('numberOfBars', tempLesson.exercises[i].numberOfBars)
        formData.set('demoStartTime', parseInt(tempLesson.exercises[i].demoStartTime))
        formData.set('useScore', tempLesson.exercises[i].useScore)
        if (tempLesson.exercises[i].useScore) {
          if (!tempLesson.exercises[i].useXml) {
            formData.set('useXml', false)
            formData.set('melody', tempLesson.exercises[i].melody.join('-'))
            formData.set('timeSignature', tempLesson.exercises[i].timeSignature)
          } else {
            formData.set('useXml', true)
          }
        }
        if (tempLesson.exercises[i].video) {
          formData.append('video', tempLesson.exercises[i].video)
        }
        if (tempLesson.exercises[i].videoPoster) {
          formData.append('videoPoster', tempLesson.exercises[i].videoPoster)
        }
        if (tempLesson.exercises[i].musicXml) {
          formData.append('musicXml', tempLesson.exercises[i].musicXml)
        }

        if (tempLesson.exercises[i].id) {
          formData.set('id', tempLesson.exercises[i].id)
          await ExerciseService.edit(formData)
        } else {
          if (this.lesson) {
            formData.set('lid', this.lesson.id)
            await ExerciseService.create(formData)
          } else {
            formData.set('lid', lessonResponse.data.lesson.id)
            await ExerciseService.create(formData)
          }
        }
      }

      this.loading = false
      this.cancel()
    },

    cancel () {
      if (this.$route.params.lesson_id) {
        this.$router.push(`/course/edit/${this.lesson.CourseId}`)
      } else {
        this.$router.push(`/course/edit/${this.$route.params.course_id}`)
      }
    },

    async deleteLesson () {
      await LessonService.delete(this.lesson.id)
      this.$router.push(`/course/edit/${this.lesson.CourseId}`)
    },

    async newFile () {
      if (this.$refs.fileForm.validate()) {
        this.loading = true
        if (this.lesson) {
          this.newFiles.forEach(async f => {
            let formData = new FormData()
            formData.set('lessonId', this.lesson.id)
            formData.set('name', f.name)
            formData.set('size', parseInt(f.size / 1024))
            formData.set('type', f.type)
            formData.append('file', f)
            this.newLesson.files.push((await FileService.create(formData)).data.file)
          })
        } else {
          this.newLesson.files = this.newLesson.files.concat(this.newFiles.map(f => {
            return {
              file: f,
              size: f.size / 1024,
              type: f.type,
              name: f.name
            }
          }))
        }
        this.newFiles = []
        this.fileDialog = false
        this.loading = false
      }
    },

    async fileCrud (event, file, action) {
      if (action == 'Download') {
        var zip = new JSZip();
        fetch(file.url)
          .then(resp => resp.blob())
          .then(content => saveAs(content, file.name));
      } else if (action == 'Delete') {
        let idx = this.newLesson.files.indexOf(file)
        this.newLesson.files.splice(idx, 1)
        await FileService.delete(file.id)
      } else if (action == 'Download All') {
        if (this.newLesson.files.length > 0) {
          const zip = new JSZip()
          let files = this.newLesson.files
          Promise.all(files.map(file => fetch(file.url))).then(function (responses) {
            // Get a JSON object from each of the responses
            return Promise.all(responses.map(function (response) {
              return response.blob();
            }));
          }).then(function (data) {
            for (var i = 0; i < data.length; i++) {
              zip.file(files[i].name, data[i])
            }
            zip.generateAsync({type:"blob"})
              .then(function (blob) {
                saveAs(blob, "download.zip")
              })
          }).catch(function (error) {
            // if there's an error, log it
            console.log(error);
          });
        }
      }
    },

    newExercise () {
      this.newLesson.exercises.push({
        name: '',
        video: null,
        videoFilename: '',
        videoPoster: null,
        videoPosterFilename: '',
        useScore: true,
        timeSignature: '4/4',
        bpm: 60,
        numberOfBars: 4,
        melody: [],
        demoStartTime: '',
        useXml: true,
        musicXml: null,
        musicXmlFilename: '',
        handler: null,
      })
    },

    deleteExercise (event, exerciseIdx) {
      this.newLesson.exercises.splice(exerciseIdx, 1)
    }
  },

  mounted: async function () {
    if (this.$route.params.lesson_id) {
      this.lesson = (await LessonService.show(this.$route.params.lesson_id)).data.lesson

      this.newLesson.files = (await FileService.list(this.lesson.id)).data.files

      this.newLesson.name = this.lesson.name
      this.newLesson.duration = this.lesson.duration
      this.newLesson.description = this.lesson.description
      if (this.lesson.Exercises.length > 0) {
        for (var i = 0; i < this.lesson.Exercises.length; i++) {
          if (!this.newLesson.exercises[i]) {
            this.newExercise()
          }
          this.newLesson.exercises[i].id = this.lesson.Exercises[i].id
          this.newLesson.exercises[i].name = this.lesson.Exercises[i].name
          this.newLesson.exercises[i].useScore = this.lesson.Exercises[i].useScore
          this.newLesson.exercises[i].useXml = this.lesson.Exercises[i].useXml
          this.newLesson.exercises[i].videoFilename = this.lesson.Exercises[i].videoFilename
          this.newLesson.exercises[i].videoPosterFilename = this.lesson.Exercises[i].videoPosterFilename
          if (this.newLesson.exercises[i].useScore) {
            this.newLesson.exercises[i].bpm = this.lesson.Exercises[i].bpm
            this.newLesson.exercises[i].demoStartTime = this.lesson.Exercises[i].demoStartTime.toString()
            // if the first exercise uses vexflow, immediately render it
            if (!this.newLesson.exercises[i].useXml && i == 0) {
              this.newLesson.exercises[i].timeSignature = this.lesson.Exercises[i].timeSignature
              this.newLesson.exercises[i].numberOfBars = this.lesson.Exercises[i].numberOfBars
              this.newLesson.exercises[i].melody = this.lesson.Exercises[i].melody.split('-')

              await this.$nextTick()
              var div = document.createElement("div")
              div.id = `vexflow-wrapper-${i}`
              var pannel = document.getElementById(`pannel-content-${i}`)
              pannel.appendChild(div)
              this.newLesson.exercises[i].handler = new vexUI.Handler(div.id, {
                numberOfStaves: this.newLesson.exercises[i].numberOfBars,
                canvasProperties: {
                  id: div.id + '-canvas',
                  width: pannel.offsetWidth,
                  tabindex: 1
                }
              }).init()
              if (this.newLesson.exercises[i].melody != '')
                this.newLesson.exercises[i].handler.importNotes(this.newLesson.exercises[i].melody, this.newLesson.exercises[i].timeSignature)
            } else {
              this.newLesson.exercises[i].musicXmlFilename = this.lesson.Exercises[i].musicXmlFilename
            }
          }
        }
      }
    }
  }
}
</script>

<style scoped>
.file-name {
  flex-grow: 3;
}
.video-js {
    position: relative !important;
    width: 60% !important;
    height: auto !important;
    margin:0px auto;
}
</style>