<template lang="pug">
  div
    v-container
      v-row.mt-16.mb-12(justify="space-between")
        v-col.text-left(cols="12" md="6")
          h1.pb-6 Welcome to Violian!
          v-autocomplete(v-model='model' :items='items' :loading='isLoading' :search-input.sync='search' cache-items multiple clearable hide-details hide-selected item-text='name' item-value='symbol' label='Search for a course...' solo)
            template(v-slot:no-data)
              v-list-item
                v-list-item-title
                  | Search for your favorite 
                  strong Course
            //- template(v-slot:selection='{ attr, on, item, selected }')
            //-   v-chip.white--text(v-bind='attr' :input-value='selected' color='indigo' v-on='on')
            //-     v-icon(left) mdi-coin
            //-     span(v-text='item')
            template(v-slot:item='{ item }')
              v-list-item(@click="go_to_course($event, item.id)")
                v-list-item-content {{ item.name }}

        v-col.text-left(cols="4" v-if="cardsPerRow > 2")
          video.vjs-big-play-centered(ref="videoPlayer" class="video-js" :id="`video`")

      v-divider

      v-row.mt-10(v-if="is_student && studentCourses.length > 0")
        v-col.text-left(cols="12")
          h2 My Courses
        v-col(v-for="course in studentCourses.slice(0, cardsPerRow)" cols="12" sm="6" md="4" lg="3" xl="2" :key="course.id")
          course-card(:course="course")
            v-card-actions
              v-btn(color='indigo' text @click="go_to_course($event, course.id, course.lessons[0].id)")
                | Continue Learning
        v-col.text-left(cols="12")
          v-btn(color='indigo' dark @click="$router.push('/course/index')") See All
            v-icon(right dark size="20") mdi-arrow-right

      v-row.mt-10(v-if="!is_student && tutorCourses.length > 0")
        v-col.text-left(cols="12")
          h2 My Courses
        v-col(v-for="course in tutorCourses.slice(0, cardsPerRow)" cols="12" sm="6" md="4" lg="3" xl="2" :key="course.id")
          course-card(:course="course")
            v-card-actions
              v-btn(color='indigo' text @click="go_to_course_edit($event, course.id)")
                | Edit
              v-btn(color='indigo' text @click="go_to_course($event, course.id, course.lessons[0].id)")
                | View
        v-col.text-left(cols="12")
          v-btn(color='indigo' dark @click="$router.push('/course/index')") See All
            v-icon(right dark size="20") mdi-arrow-right

      v-row.mt-10(v-for="courseEntry in Object.entries(coursesInCategory)")
        v-col.text-left(cols="12")
          h2 {{ courseEntry[0] }} Courses
        v-col(v-for="course in courseEntry[1].slice(0, cardsPerRow)" cols="12" sm="6" md="4" lg="3" xl="2" :key="course.id")
          course-card(:course="course")
            v-card-actions
              v-btn(color='indigo' text @click="go_to_course($event, course.id)")
                | Find out more
        v-col.text-left(cols="12")
          v-btn(color='indigo' dark @click="$router.push(`/course/list/${courseEntry[0]}`)") See All
            v-icon(right dark size="20") mdi-arrow-right
</template>

<script>
/* eslint-disable */
import { mapState } from 'vuex'
import CourseService from '@/services/CourseService'
import SubscriptionService from '@/services/SubscriptionService'
import _ from 'lodash'
import CourseCard from '@/components/Course/CourseCard'
import videojs from "video.js";

export default {
  name: 'Home',
  components: {
    'course-card': CourseCard
  },

  data () {
    return {
      isLoading: false,
      items: [],
      model: null,
      search: null,
      popularCourses: [],
      studentCourses: [],
      tutorCourses: [],
      coursesInCategory: {}
    }
  },

  watch: {
    model (value) {
      console.log(value)
    },

    search: _.debounce(async function (value) {
      if (value != '' &&  value != undefined) {
        this.isLoading = true
        try {
          this.items = (await CourseService.listAll(value)).data.courses
          this.isLoading = false
        } catch (err) {
          this.isLoading = false
          console.log(err)
        }
      }
    }, 700)
  },

  computed: {
    is_student () {
      if (this.user) {
        return this.user.isStudent
      } else {
        return null
      }
    },

    cardsPerRow () {
      switch(this.$vuetify.breakpoint.name){
        case"xs":
          return 2;
        case"sm":
          return 2;
        case"md":
          return 3;
        case"lg":
          return 4;
        case"xl":
          return 5;
        default:
          return 2;
      }
    },

    ...mapState(['user'])
  },

  methods: {
    go_to_course (event, id, lesson_id) {
      if (lesson_id != undefined) {
        this.$router.push(`/course/show/${id}/lesson/${lesson_id}`)
      } else {
        this.$router.push({
          name: `showcourse`,
          params: {
            course_id: id
          }
        })
      }
    },

    go_to_course_edit (event, id) {
      this.$router.push({
        name: `editcourse`,
        params: {
          course_id: id
        }
      })
    },
  },

  mounted: async function () {
    this.popularCourses = (await CourseService.listAll()).data.courses
    if (this.user) {
      if (this.is_student) {
        this.studentCourses = (await SubscriptionService.getSubscriptionInfoOfStudent(this.user.id)).data.courses
      } else {
        this.tutorCourses = (await CourseService.list(this.user.id)).data.courses
      }
    }

    for (let i = 0; i < this.popularCourses.length; i++) {
      if (this.coursesInCategory[this.popularCourses[i].instrument] == undefined) {
        this.$set(this.coursesInCategory, this.popularCourses[i].instrument, [this.popularCourses[i]])
      } else {
        this.$set(this.coursesInCategory, this.popularCourses[i].instrument, this.coursesInCategory[this.popularCourses[i].instrument].concat(this.popularCourses[i]))
      }
    }

    const player = videojs(this.$refs.videoPlayer, {
        controls: true,
        aspectRatio: '16:9',
        sources: [
          {
            src: 'https://rhythm-academy.s3-ap-southeast-1.amazonaws.com/violian.mp4',
            type: "video/mp4"
          }
        ],
        playbackRates: [0.8, 0.9, 1, 1.1, 1.2],
        poster: 'https://rhythm-academy.s3-ap-southeast-1.amazonaws.com/violian_cover.jpg'
      }, () => {
        // console.log('onPlayerReady', this)
        player.hotkeys({
          volumeStep: 0.1,
          seekStep: 2,
          enableModifiersForNumbers: false,
          enableHoverScroll: true
        })
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
