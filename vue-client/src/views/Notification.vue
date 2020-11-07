<template>
  <v-card
    class="mx-auto"
    style="margin-top:30px;"
    max-width="700"
    
    v-if="notifications==0"
  ><v-row justify="center">
      <h1>No {{isTutor?'submissions':'notifications'}} found</h1>
    </v-row>
  </v-card>
  <v-card
    class="mx-auto"
    max-width="700"
    style="margin-top:30px;"
    v-else
  >
    <v-toolbar
      color="indigo"
      dark
    >
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-toolbar-title>Submissions</v-toolbar-title>

      <v-spacer></v-spacer>
    </v-toolbar>

    <v-list>
      <v-list-group
        v-for="(recordings, key) in sortedRecordings"
        :key="key"
        no-action
      >
        <template v-slot:activator>
          <v-list-item-content>
            <v-list-item-title class="courseName" v-text="recordings[0].course_name"></v-list-item-title>
          </v-list-item-content>
        </template>

        <v-list-item
          v-for="(item, index) in recordings"
          :key="index"
        >
          <v-list-item-content>
            <v-list-item-title v-text="item.student_name"></v-list-item-title>
            <v-list-item-subtitle v-text="getTime(item)"></v-list-item-subtitle>
          </v-list-item-content>
          <v-spacer></v-spacer>
          <v-list-item-action>
            <v-btn @click="redirect(item)" v-if="isTutor">
              Grade
              <v-icon right color="red lighten-1">mdi-marker</v-icon>
            </v-btn>
            <v-btn @click="destroy(item)" v-if="isTutor && $store.state.user.email == 'wangrunding@gmail.com' ">
              Delete
              <v-icon right color="red lighten-1">mdi-trash-can</v-icon>
            </v-btn>
            <v-btn @click="redirect(item)" v-if="!isTutor">
              View
              <v-icon right color="green lighten-1">mdi-eye</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list-group>
    </v-list>
  </v-card>
</template>

<script>
import store from "../store/store"
import RecordingService from "@/services/RecordingService"
import moment from 'moment'

export default {
  data() {
    return {
    recordings: [],
    isTutor: null,
    sortedRecordings: [],
    notifications: 0,
    // recordings2:[
    //   {
    //     recording_id: '1',
    //     updated_at: '11/12/2020 11:12',
    //     course_name: 'Course AAA',
    //     course_id: '1',
    //     lesson_id: '1',
    //     student_name: 'Student',
    //     tutor_name: 'Tutor'
    //   },
    //   {
    //     recording_id: '2',
    //     updated_at: '11/12/2020 11:12',
    //     course_name: 'Course BBB',
    //     course_id: '2',
    //     lesson_id: '2',
    //     student_name: 'Student',
    //     tutor_name: 'Tutor'
    //   },
    // ],
    
    }
  },

  methods: {
    getTime(item) {
      const localTime = new Date(item.updated_at).toLocaleString("en-US", {timeZone: "Asia/Singapore"});
      const time = moment(localTime).calendar()
      return time;
    },

    getMessage(item) {
      if (this.isTutor) {
        return this.truncateString(`${item.course_name} has a new submission from ${item.student_name}`);
      } else {
        return this.truncateString(`${item.course_name} has new comments from ${item.tutor_name}`);
      }
    },

    redirect(item) {
      if (this.isTutor) {
        window.location.href = (`/feedback/new/${item.course_id}/lesson/${item.lesson_id}/recording/${item.recording_id}`);
      } else {
        window.location.href = (`/feedback/show/${item.course_id}/lesson/${item.lesson_id}`);
        RecordingService.markAsRead(item.recording_id)
        this.$store.dispatch('clearOneNotification')
      }
    },

    async destroy(item) {
      if (confirm('Are you sure?')) {
        await RecordingService.delete(item.recording_id)
        this.$store.dispatch('clearOneNotification')
        this.$router.go()
      }
    }
  },
    
    async created() {
      this.isTutor = store.state.user.isTutor;
      this.notifications = store.state.notifications;
      if (this.isTutor) {
        this.recordings = (await RecordingService.getUncommentedRecordings()).data.recordings;
      } else {
        this.recordings = (await RecordingService.getUnreadComments()).data.recordings;
      }

      const groupBy = (xs, key) => {
        return xs.reduce(function(rv, x) {
          (rv[x[key]] = rv[x[key]] || []).push(x);
          return rv;
        }, {});
      }
      // console.log(this.recordings);
      this.sortedRecordings = groupBy(this.recordings, 'course_id')
    }
  }
</script>

<style scoped>
.courseName {
  font-size: 20px;
  font-weight: bold;
}
</style>
