<template lang="pug">
  v-card.mx-10.mt-10(class="commentCard")
      v-card-title Click on a note in student's recording to leave comment
      v-card-subtitle(v-if="selectedIndex !== null") Selected note: {{notesByRow[selectedRowNum-1][selectedIndex].note}}, onset: {{notesByRow[selectedRowNum-1][selectedIndex].onset}}, duration: {{notesByRow[selectedRowNum-1][selectedIndex].duration}}
      v-text-field.mx-10(label="comment" hint="Press enter to save" persistent-hint outlined append-icon="mdi-keyboard-return" :disabled="selectedIndex == null" @change="onCommentChange" v-model="comment")
      v-divider
      v-card-text(class="commentCardScores" v-on:scroll.passive='onLineGraphScroll')
        score-feedback(
          v-if="currEx && recording" 
          :currEx="currEx" 
          :recording="recording" 
          :isNewFeedback="true"
          :onClickNote="onClickNote" 
          :clickedNoteOnset="clickedNoteOnset"
          :shouldIndicateNoteClicked="true"
        )
</template>

<script>
import EvaluationLineGraph from "./EvaluationLineGraph";
import CourseService from "../services/CourseService";
import RecordingService from "../services/RecordingService";
import ScoreAndFeedback from "@/components/Course/ScoreAndFeedback"

export default {
  name: "NewFeedback",
  components: {
    EvaluationLineGraph,
    'score-feedback': ScoreAndFeedback
  },
  methods: {
    onLineGraphScroll() {
      clearTimeout(this.scrollTimeout);

      if (!this.isScrolling) {
        this.isScrolling = true;
      }

      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 200);
    },
    onClickNote(rowNum, noteIndex) {
      if (this.selectedIndex !== noteIndex || this.selectedRowNum !== rowNum) {
        this.selectedIndex = noteIndex;
        this.selectedRowNum = rowNum;
        this.comment = this.notesByRow[rowNum - 1][noteIndex].comment ?? null;
      }
    },
    async onCommentChange(data) {
      let rowIndex = this.selectedRowNum - 1;
      let row = [...this.notesByRow[rowIndex]];
      let note = { ...this.notesByRow[rowIndex][this.selectedIndex] };
      note.comment = data;
      row[this.selectedIndex] = note;
      this.$set(this.notesByRow, rowIndex, row);

      let updatedTranscriptions = JSON.stringify(this.notesByRow.flat());
      let newRecording = (await RecordingService.updateFeedback(
        this.recording.id,
        updatedTranscriptions
      )).data.recording;
      this.recording = newRecording;
    },
    clickedNoteOnset () {
      if (this.selectedRowNum !== null && this.selectedIndex !== null) 
        return this.notesByRow[this.selectedRowNum-1][this.selectedIndex].onset
      else
        return null
    },

    splitTranscriptionIntoRows(notes) {
      let timePerRow = (60 / this.currEx.bpm) * parseInt(this.currEx.timeSignature[0]) * 4;

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
                  noteCopy.duration = note.onset + note.duration - (newRowStartTime + timePerRow);
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
      comment: null,
      selectedRowNum: null,
      selectedIndex: null,
      notesByRow: [],
      transcribedNotes: []
    };
  },
  created: async function() {
    let response = await CourseService.show(this.$route.params.course_id)
    this.course = response.data.course
    this.lesson = this.course.lessons.find(lesson => lesson.id == this.$route.params.lesson_id)
    
    this.videoSrc = this.lesson.exercises[0].videoUrl
    this.currEx = this.lesson.exercises[0]

    let recordings = (await RecordingService.list(this.currEx.id)).data.recordings
      this.recording = recordings.find(recording => recording.id == this.$route.params.recording_id)

      if(this.recording != null) {
          this.transcribedNotes = JSON.parse(this.recording.transcription)
          this.notesByRow = this.splitTranscriptionIntoRows(this.transcribedNotes)
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
  flex-grow: 1;
  overflow: auto;
}
</style>
