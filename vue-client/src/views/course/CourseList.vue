<template lang="pug">
  div
    v-container
      v-row.mt-10
        v-col.text-center(cols="12")
          h1 {{ $route.params.instrument }}

      v-row.mt-10
        v-col(v-for="course in courses" cols="12" sm="6" md="4" lg="3" xl="2" :key="course.id")
          course-card(:course="course")
            v-card-actions
              v-btn(color='indigo' text @click="go_to_course($event, course.id)")
                | Find out more
</template>

<script>
import { mapState } from 'vuex'
import CourseService from '@/services/CourseService'
import CourseCard from '@/components/Course/CourseCard'

export default {
  name: 'Home',
  components: {
    'course-card': CourseCard
  },

  data () {
    return {
      isLoading: false,
      items: [],
      search: null,
      courses: []
    }
  },

  computed: {
    is_student () {
      if (this.user) {
        return this.user.isStudent
      } else {
        return null
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
    }
  },

  mounted: async function () {
    this.courses = (await CourseService.listAll(null, this.$route.params.instrument)).data.courses
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
