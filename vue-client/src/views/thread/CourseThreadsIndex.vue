<template lang="pug">
  #student
    panel(title="All Students" md="8")
      v-list
        v-list-item(v-for='(student, idx) in students' :key='student.id' @click="showThread($event, student)")
          v-list-item-content
            v-list-item-title(v-text='student.username')
          v-list-item-icon
            .notification 
              p.pa-0.mx-auto {{ unreads[idx] }}
</template>

<script>
import { mapState } from 'vuex'
import SubscriptionService from '@/services/SubscriptionService'
import ThreadService from '@/services/ThreadService'

export default {
  name: 'CourseThreadsIndex',
  data () {
    return {
      students: [],
      unreads: []
    }
  },

  computed: {
    ...mapState(['user'])
  },

  methods: {
    showThread (event, student) {
      this.$router.push({
        name: `showthread`,
        params: {
          course_id: this.$route.params.course_id,
          student_id: student.id
        }
      })
    }
  },

  mounted: async function () {
    const response = await SubscriptionService.getSubscriptionInfoOfCourse(this.$route.params.course_id)
    this.students = response.data.students
    for (var i = 0; i < this.students.length; i++) {
      const unreadResponse = await ThreadService.getUnread(this.$route.params.course_id, this.students[i].id)
      this.unreads.push(unreadResponse.data.unread)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.notification {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1.8rem;
  color: white;
  background: #C62828;
  text-align: center;
}
</style>
