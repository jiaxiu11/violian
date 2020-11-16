<template>
  <v-card
    class="mx-auto"
    style="margin-top:30px;"
    max-width="700"
    
    v-if="Object.keys(this.sortedRecordings).length==0"><v-row justify="center">
      <h1>No submissions found</h1>
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

    <v-list
      two-line>
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
          <v-list-item-icon class="listItemIcon" v-if="(!isTutor && !item.is_read && item.is_commented) || (isTutor && !item.is_commented) ">
            <v-icon size="35" color="red">mdi-email-alert</v-icon>
          </v-list-item-icon>
          <v-list-item-icon class="listItemIcon" v-else-if="(!isTutor && item.is_read) || (isTutor && item.is_commented)">
            <v-icon size="35" color="green">mdi-check-decagram</v-icon>
          </v-list-item-icon>
          <v-list-item-icon class="listItemIcon" v-else>
            <v-icon size="35" color="#ff9800">mdi-clock-alert-outline</v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            
            <v-list-item-title v-if="isTutor && item.is_commented" v-text="item.student_name" class="listItemTitle"></v-list-item-title>
            <v-list-item-title v-else-if="isTutor && !item.is_commented" v-text="item.student_name" class="listItemTitle unread">
            </v-list-item-title>

            <v-list-item-title v-else-if="!isTutor && !item.is_read" v-text="item.lesson_name" class="listItemTitle unread">
            </v-list-item-title>

            <v-list-item-title v-else v-text="item.lesson_name" class="listItemTitle"></v-list-item-title>

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
            <div v-if="!isTutor && item.is_commented">
            <v-btn @click="redirect(item)" v-if="!isTutor && item.is_commented">
              View
              <v-icon right color="green lighten-1">mdi-eye</v-icon>
            </v-btn>
            </div>

            <v-btn @click="redirect(item)" v-if="!isTutor && !item.is_commented">
              Pending
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
    }
  },

  methods: {
    getTime(item) {
      const localTime = new Date(item.updated_at).toLocaleString("en-US", {timeZone: "Asia/Singapore"});
      const time = moment(localTime).calendar()
      return time;
    },

    redirect(item) {
      if (this.isTutor) {
        window.location.href = (`/feedback/new/${item.course_id}/lesson/${item.lesson_id}/recording/${item.recording_id}`);
      } else {
        // this.$router.push('/')
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
      this.sortedRecordings = groupBy(this.recordings, 'course_id')
      // console.log(this.sortedRecordings, Object.keys(this.sortedRecordings).length)
    }
  }
</script>

<style scoped>
.courseName {
  font-size: 20px;
  font-weight: bold;
}

.listItemTitle {
  font-size: 20px;
}

.listItemTitle.unread {
  font-weight: bold;
}

.listItemIcon {
  position: relative;
  top: 10px
}
</style>
