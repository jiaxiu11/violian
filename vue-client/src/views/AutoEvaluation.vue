<template lang="pug">
  
  v-card.mx-10.my-10(class="commentCard")
      v-row(justify="center")
        h1 {{course.name}}, {{lesson.name}}
        
      v-card-title Click on a note in student's recording to leave comment
      v-divider
      v-card-text(class="commentCardScores")
        score-feedback(
            id="scoresAndLineGraphs"
          v-if="currEx && recording" 
          :currEx="currEx" 
          :recording="recording" 
          :isNewFeedback="true"
          :onClickNote="onClickNote"
          :clickedNoteOnset="selectedRowNum !== null && selectedIndex !== null ? notesByRow[selectedRowNum-1][selectedIndex].onset : null"
          :shouldIndicateNoteClicked="true"
          :scoreFocused="scoreFocused"
        )
        v-row(v-if="selectedIndex !== null" justify="center" :style="{position:'absolute',left:commentButtonX+'px',top:commentButtonY+'px'}")
          v-dialog(v-model="commentDialog" max-width="600px")
            template(v-slot:activator="{ on, attrs }")
              v-btn(icon medium elevation="2" v-bind="attrs" v-on="on")
                v-icon mdi-pencil
            v-card
              v-card-title
                span(class="headline") Comment on a note
              v-card-subtitle.mt-2(v-if="selectedIndex !== null") Selected note: {{notesByRow[selectedRowNum-1][selectedIndex].note}}, onset: {{notesByRow[selectedRowNum-1][selectedIndex].onset}}s, duration: {{notesByRow[selectedRowNum-1][selectedIndex].duration}}s
              v-card-text
                v-container
                  v-row
                    v-text-field(
                        label="comment"
                        hint="Press enter to save"
                        persistent-hint
                        append-icon="mdi-keyboard-return"
                        :disabled="selectedIndex == null"
                        @change="onCommentChange"
                        v-model="comment"
                        @focus="scoreFocused = false"
                        @blur="scoreFocused = true"
                        )
              v-card-actions
                v-spacer
                v-btn(color="blue darken-1" text @click="commentDialog = false") Cancel
                v-btn(color="blue darken-1" text @click="onCommentChange") Save
        v-divider
        div.mx-5.mt-5
          span.text-h6 General comment on student's practice
          v-textarea.mt-3(label="General Comment" auto-grow outlined v-model="generalComment" @focus="scoreFocused = false" @blur="scoreFocused = true")
          v-btn.mb-3(@click="onGeneralCommentChange") Save general comment
        v-divider
      v-card-actions.justify-center
        v-btn(@click="publishComments" large color="indigo" dark style="margin:0 auto;") Publish Comments to Student
</template>

<script>
import EvaluationLineGraph from "./EvaluationLineGraph";
import CourseService from "../services/CourseService";
import RecordingService from "../services/RecordingService";
import ScoreAndFeedback from "@/components/Course/ScoreAndFeedback";

export default {
  name: "NewFeedback",
  components: {
    EvaluationLineGraph,
    "score-feedback": ScoreAndFeedback
  },
  methods: {
    async publishComments() {
      const recordingId = this.recording.id;
      await RecordingService.markAsCommented(recordingId);
      this.$store.dispatch("clearOneNotification");
      alert("Your comment is sent to student!");
      this.$router.push("/notifications");
    },

    onLineGraphScroll() {
      clearTimeout(this.scrollTimeout);

      if (!this.isScrolling) {
        this.isScrolling = true;
      }

      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 200);
    },
    onClickNote(rowNum, noteIndex, left) {
      if (this.selectedIndex !== noteIndex || this.selectedRowNum !== rowNum) {
        this.selectedIndex = noteIndex;
        this.selectedRowNum = rowNum;
        this.comment = this.notesByRow[rowNum - 1][noteIndex].comment ?? null;

        let scoresAndLineGraphs = document.getElementById(
          "scoresAndLineGraphs"
        );
        let leftOffset = scoresAndLineGraphs.getBoundingClientRect().left - 18;
        this.commentButtonX = left + leftOffset;
        let yInterval = 137 + 150;
        this.commentButtonY = (rowNum - 1) * yInterval + 170;
      }
    },
    async onCommentChange() {
      let rowIndex = this.selectedRowNum - 1;
      let row = [...this.notesByRow[rowIndex]];
      let note = { ...this.notesByRow[rowIndex][this.selectedIndex] };
      note.comment = this.comment;
      row[this.selectedIndex] = note;
      this.$set(this.notesByRow, rowIndex, row);

      let updatedTranscriptions = JSON.stringify(this.notesByRow.flat());
      let newRecording = (
        await RecordingService.updateFeedback(
          this.recording.id,
          updatedTranscriptions
        )
      ).data.recording;
      this.recording = newRecording;

      this.commentDialog = false;
    },

    async onGeneralCommentChange() {
      let updatedTranscriptions = JSON.stringify(this.notesByRow.flat());
      let newRecording = (
        await RecordingService.updateFeedback(
          this.recording.id,
          updatedTranscriptions,
          this.generalComment
        )
      ).data.recording;
      this.recording = newRecording;
    },
    splitTranscriptionIntoRows(notes) {
      let bpm = this.recording.bpm;
      let timePerRow = (60 / bpm) * parseInt(this.currEx.timeSignature[0]) * 4;

      let newRowStartTime = 0;
      let rows = [];
      rows.push([]);
      for (let i = 0; i < notes.length; i++) {
        let note = notes[i];
        if (note.onset < newRowStartTime + timePerRow) {
          if (note.onset + note.duration <= newRowStartTime + timePerRow) {
            rows[rows.length - 1].push(note);
          } else {
            // split a note that lasts across two rows into two notes
            let noteCopy = { ...note };
            noteCopy.onset = newRowStartTime + timePerRow;
            noteCopy.duration =
              note.onset + note.duration - (newRowStartTime + timePerRow);
            note.duration = note.duration - noteCopy.duration;
            rows[rows.length - 1].push(note);
            notes[i] = noteCopy;
            newRowStartTime = newRowStartTime + timePerRow;
            rows.push([]);
            i--;
          }
        } else {
          newRowStartTime = newRowStartTime + timePerRow;
          rows.push([]);
          i--;
        }
      }
      return rows;
    }
  },
  data() {
    return {
      course: null,
      lesson: null,
      currEx: null,
      recording: null,

      scrollTimeout: null,
      isScrolling: false,
      selectedRowNum: null,
      selectedIndex: null,
      notesByRow: [],
      transcribedNotes: [],

      commentButtonX: 0,
      commentButtonY: 0,
      commentDialog: false,
      comment: null,
      generalComment: null,

      // for pressing space to play
      scoreFocused: true
    };
  },
  created: async function() {
    let response = await CourseService.show(this.$route.params.course_id);
    this.course = response.data.course;
    this.lesson = this.course.lessons.find(
      lesson => lesson.id == this.$route.params.lesson_id
    );

    this.videoSrc = this.lesson.exercises[0].videoUrl;
    this.currEx = this.lesson.exercises[0];

    let recordings = (await RecordingService.list(this.currEx.id)).data
      .recordings;
    this.recording = recordings.find(
      recording => recording.id == this.$route.params.recording_id
    );

    if (this.recording != null) {
      this.transcribedNotes = JSON.parse(this.recording.transcription);
      this.notesByRow = this.splitTranscriptionIntoRows(this.transcribedNotes);
      this.generalComment = this.recording.overallComment;
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.commentCard {
  display: flex !important;
  flex-direction: column;
}

.commentCardScores {
  position: relative;
}
</style>
