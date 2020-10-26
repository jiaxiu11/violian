<template>
  <v-container text-center>
  <h1 style="margin:2rem;">Notifications</h1>

  <v-card
    class="mx-auto"
    max-width="700"
    tile
  >
    <v-list rounded>
      <!-- <v-subheader>Unread Notifications</v-subheader> -->
      <v-list-item-group
        color="primary"
      >
        <v-list-item
          v-for="(item, i) in recordings"
          :key="i"
        >
          <v-list-item-icon>
            <v-icon v-text="item.icon"></v-icon>
          </v-list-item-icon>
          <v-list-item-content @click="redirect(i)">
            <v-list-item-title>
              <v-row>
                <v-col cols="8">
                  <label class="comment" @click="redirect(i)"  v-text="getMessage(i)"></label>
                </v-col>
                <v-col cols="3">
                  <v-chip style="margin-right:1rem; margin-bottom:2rem;"
                    class="ma-2"
                    color="#fffcbd"
                    label
                  >{{item.updated_at}}
                  </v-chip>
                </v-col>
              </v-row>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </v-card>
  </v-container>
</template>

<script>
import RecordingService from "@/services/RecordingService"

export default {
  data() {
    return {
    recordings2: [],
    recordings:[
      {
        recording_id: '1',
        updated_at: '11/12/2020 11:12',
        course_name: 'Course AAA',
        course_id: '1',
        lesson_id: '1',
        student_name: 'Student',
        tutor_name: 'Tutor'
      },
      {
        recording_id: '2',
        updated_at: '11/12/2020 11:12',
        course_name: 'Course BBB',
        course_id: '2',
        lesson_id: '2',
        student_name: 'Student',
        tutor_name: 'Tutor'
      },
    ],
    
    }
  },

  methods: {
    getMessage(index) {
      const item = this.recordings[index];
      return (`${item.course_name} has a new submission from ${item.student_name}`);
    },
    redirect(index) {
      console.log("clicked")
      const item = this.recordings[index];
      window.location.href = `/feedback/new/${item.course_id}/lesson/${item.lesson_id}`;
    }
  },
  async created() {
    console.log('started'),
    this.recordings2 = (await RecordingService.getUnreadComments()).data.recordings;
    this.recordings2.sort((x, y) => x.updated_at - y.updated_at);
    console.log(this.recordings2)
  }
    
  }
</script>

<style scoped>


.comment {
  font-weight: bold;
}

.courseTitle {
  font-size: 20px;
}

</style>
