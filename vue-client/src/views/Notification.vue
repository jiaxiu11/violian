<template>
  <v-container text-center>
  <h1 style="margin:2rem;">Notifications</h1>

  <v-card
    class="mx-auto"
    max-width="700"
    tile
  >
    <v-list rounded>
      <v-list-item-group
        color="primary"
        
      >
      
        <v-list-item
          v-for="(item, i) in recordings"
          :key="i"
        >
          <v-list-item-icon>
            <v-icon>mdi-bell</v-icon>
          </v-list-item-icon>
          <v-list-item-content @click="redirect(item)">
            <v-list-item-title>
              <v-row>
                <v-col cols="8">
                  <label class="comment" @click="redirect(item)"  v-text="getMessage(item)"></label>
                </v-col>
                <v-col cols="3">
                  <v-chip style="margin-right:0.5rem; margin-bottom:2rem;"
                    class="ma-2"
                    color="#fffcbd"
                    label
                  >{{getTime(item)}}
                  </v-chip>
                </v-col>
              </v-row>
              <v-divider></v-divider>

            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </v-card>
  </v-container>
</template>

<script>
import store from "../store/store"
import RecordingService from "@/services/RecordingService"

export default {
  data() {
    return {
    recordings: [],
    isTutor: null,
    // recordings:[
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
      let time = item.updated_at.substring(0, item.updated_at.indexOf(':') + 3);
      return time;
    },

    getMessage(item) {
      if (this.isTutor) {
        return (`${item.course_name} has a new submission from ${item.student_name}`);
      } else {
        return (`${item.course_name} has new comments from ${item.tutor_name}`);
      }
    },

    redirect(item) {
      if (this.isTutor) {
        window.location.href = `/feedback/new/${item.course_id}/lesson/${item.lesson_id}`;
      } else {
        window.location.href = `/feedback/show/${item.course_id}/lesson/${item.lesson_id}`;
      }
      RecordingService.markAsRead(item.recording_id)
    }
  },
  async created() {
    this.recordings = (await RecordingService.getUnreadComments()).data.recordings;
    this.recordings.sort((x, y) => y.updated_at < x.updated_at);

    this.isTutor = store.state.user.isTutor;
    console.log(this.recordings)
    // console.log(store.state.user)
  }
    
  }
</script>

<style scoped>


.comment {
  font-weight: bold;
}

</style>
