<template lang="pug">
  div(v-if="course && lesson")
    v-container.pa-0(fluid)
      v-row(no-gutters)
        v-col(cols="9").text-left.pa-0
          v-row.ma-0(style="width: 100%;")
            v-col.pa-0#title
              h1.font-weight-bold.pl-8.py-2 {{ course.name }}
          v-row.ma-0(style="width: 100%;")
            v-col.pa-0
              video-player(:exercise="this.lesson.exercises[0]" :videoSrc="src" v-if="isVideoContent")
          
          v-container 
            v-tabs(v-model='tab' color="indigo")
              v-tabs-slider
              v-tab(href=`#feedback`) Auto Feedback
              v-tab-item(value="feedback")
                v-card(flat tile)
                  v-container
                    v-row
                      v-col
                        h1 Submit your practice audio to get feedback!
                        
                    v-row
                      v-col(cols="6")
                        v-file-input(v-model="newAudio" label="Upload audio..." multiple outlined color="indigo" dense)
                      v-col(cols="6")
                        v-btn(color="#ec5252" dark @click="getFeedback()" style="margin-top: 2px;") Submit

                    v-row.justify-center
                      v-col(cols="12")
                        div(v-for="(part, idx) in scoreParts" :id="`vexflow-wrapper-${idx}`" :key="idx")

        v-col.pa-0(cols="3" style="border-bottom: 1px solid #BDBDBD; border-left: 1px solid #BDBDBD; position: fixed; right:0;" :class="{ 'full-height': fullHeight, 'partial-height': !fullHeight }")
          h1.font-weight-bold.pl-4.py-2(style="background-color:#EEEEEE;") Lessons

          v-list.py-0
            v-list-item.px-0(v-for='(currLesson, lessonIdx) in course.lessons' :key='lessonIdx')
              v-expansion-panels.px-0(accordion flat hover tile dense v-if="currLesson == lesson && lesson.exercises.length > 1" v-model="opened" multiple)
                v-expansion-panel
                  v-expansion-panel-header.py-0.pl-4.pr-2(style="font-size: 16px; background-color:#C5CAE9;") {{ lessonIdx + 1 }}. {{currLesson.name}}
                  v-expansion-panel-content.pa-0
                    v-list.py-0
                      v-list-item-group.py-0
                        v-list-item.px-0(v-for="(exercise, exerciseIdx) in currLesson.exercises" @click="src = exercise.videoUrl" :key="exerciseIdx")
                          v-list-item-content
                            div.pl-4.text-decoration-underline(style="font-size: 14px; color:#291957;") {{ exercise.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson == lesson && lesson.exercises.length == 1")
                a.link.pl-4.py-5(style="font-size: 16px; background-color:#C5CAE9;") {{ lessonIdx + 1 }}. {{ currLesson.name }}
              v-list-item-content.py-0.link(v-else-if="currLesson != lesson")
                a.link.pl-4.py-5(style="font-size: 16px;" @click="goToLesson($event, currLesson)") {{ lessonIdx + 1 }}. {{ currLesson.name }}
</template>

<script>
/* eslint-disable */
import vexUI from "@/plugins/vex";
import { mapState } from "vuex";
import utils from "@/utils";
import videojs from "video.js";
import PostService from "@/services/PostService"
import "videojs-hotkeys"
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay"
import CourseService from "@/services/CourseService"
import FileService from "@/services/FileService"
import VideoPlayer from "@/components/Course/VideoPlayer"
import ThreadService from "@/services/ThreadService"
import _ from 'lodash'

export default {
  name: 'ShowLesson',
  components: {
    'video-player': VideoPlayer
  },
  data () {
    return {
      course: null,
      lesson: null,

      // exercise info
      currEx: null,
      notesInBars: [],
      handlers: [],
      scoreParts: [],

      // auto feedback
      newAudio: null,

      // thread info
      thread: null,
      dialog: false,
      requiredRules: [
        v => !!v || "This field is required"
      ],
      message: null,
      file: null,
      grade: null,
      avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
      error: null,

      // video events
      isVideoContent: true,

      // osmd renderer
      osmd: null,
      videoOsmd: null,
      from: 1,
      to: 2,

      // page design
      selected: null,
      fullHeight: false,
      opened: [0],
      src: '',

      // tabs
      tab: null,
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    }
  },
  watch: {
    bpm: function (val) {
      this.bpm_label = "BPM: " + val;
    },
    no_bars: function (val) {
      this.bars_label = "No. Bars: " + val;
    },
    // playbackBpm: function (val) {
    //   this.player.playbackRate(val / this.bpm)
    // }
    '$route.params.lesson_id': function (val) {
      this.$router.go()
    },
  },
  computed: {
    ...mapState(["user", "students", "subscribedTutors"])
  },
  methods: {
    async create_post () {
      if (this.$refs.form.validate()) {
        if (!this.message && !this.file) {
          alert('Please either input video or message or both')
          return
        }
        var formData = new FormData()
        formData.set('tid', this.lesson.thread.id)
        if (this.message) 
          formData.set('message', this.message)
        if (this.grade) 
          formData.set('grade', parseInt(this.grade))
        if (this.file)
          formData.append('video', this.file)
        const response = await PostService.create(formData)
        this.lesson.thread.posts.splice(this.lesson.thread.posts.length, 0, response.data.post)
        this.message = ''
        this.file = null
      } else {
        return
      }
    },

    async deletePost (event, post) {
      if (confirm('Are you sure you want to delete?')) {
        await PostService.delete(post.id)
        this.lesson.thread.posts.splice(this.lesson.thread.posts.indexOf(post), 1)
      }
    },

    goToLesson (event, lesson) {
      this.$router.push({
        name: `showlesson`,
        params: {
          course_id: this.course.id,
          lesson_id: lesson.id,
          course: this.course,
          lesson: lesson
        }
      })
    },

    async getFeedback (event) {
      if (this.newAudio) {

      } else {
        alert('Please input an audio file to gain feedback')
      }
    }
  },

  created: async function () {
    if (!this.course || !this.lesson) {
      let response = await CourseService.show(this.$route.params.course_id)
      try {
        response.data.course.lessons = await Promise.all(response.data.course.lessons.map(async (lesson) => {
          var threadResponse = null
          this.$store.dispatch('setNotifications', this.$store.state.notifications - response.data.course.unreadTutorPost)
          threadResponse = await ThreadService.show(lesson.id, this.user.id)
          lesson.thread = threadResponse.data.thread
          return lesson
        }))
        this.course = response.data.course
      } catch (err) {
        console.log(err)
      }
      this.lesson = this.course.lessons.find(lesson => lesson.id == this.$route.params.lesson_id)
      this.lesson.files = (await FileService.list(this.lesson.id)).data.files
    }

    this.selected = this.course.lessons.indexOf(this.lesson)
    this.src = this.lesson.exercises[0].videoUrl
    this.currEx = this.lesson.exercises[0]

    window.addEventListener('scroll', () => {
      if (window.pageYOffset == 0) {
        this.fullHeight = false
      } else if (window.pageYOffset > 64) {
        this.fullHeight = true
      }
    })


    this.currEx.melody = this.currEx.melody.split('-')
    if (this.currEx.useScore) {
      this.notesInBars = vexUI.notesToBars(this.currEx.melody, this.currEx.timeSignature)
    
      for (let i = 0; i < this.notesInBars.length; i += 2) {
        this.scoreParts.push(this.notesInBars.slice(i, i + 2).flat())
      }

      await this.$nextTick()
      
      var wrapper = document.getElementById(`vexflow-wrapper-${0}`)
      var width = wrapper.offsetWidth;
      for (let i = 0; i < this.scoreParts.length; i++) {
        this.handlers.push(new vexUI.Handler(`vexflow-wrapper-${i}`, {
          numberOfStaves: 2,
          canEdit: false,
          canvasProperties: {
            width
          }
        }).init())

        this.handlers[i].importNotes(this.scoreParts[i], this.currEx.timeSignature)
      }
    }
  },

  beforeDestroy() {
    if (this.player) {
        this.player.dispose()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
 
/* 
bg: #5d646e
slider-bg: #72839d
 */
.hide {
  opacity: 0 !important;
  visibility: hidden !important;
}

.bpm-control {
  background-color: rgba(43, 51, 63, 0.7); 
  position: absolute; 
  bottom: 30px; 
  left: 12px; 
  width: 30px;
  visibility: visible;
  opacity: 1;
  transition: visibility 1000ms, opacity 1000ms;
}

#title {
  background-color: #1e1e1c;
  color: white;
}

.selected-border {
  background-color: #E8EAF6;
}

.full-height {
  height: 100vh;
  top: 0;
}

.partial-height {
  height: calc(100vh - 64px);
}

.link:hover {
  background-color: #FAFAFA;
}

.link, .link:link, .link:visited, .link:active, .link:hover {
  text-decoration: none;
  color: #1e1e1c;
}

div >>> .v-slide-group__content {
  border-bottom: 1px solid #BDBDBD;
}
</style>
