<template lang="pug">
    v-card.mx-10.mt-10(height="600px" class="commentCard")
        v-card-title Click on a note to leave comment
        v-card-subtitle(v-if="selectedIndex !== null") Selected note: {{notesByRow[selectedRowNum-1][selectedIndex].note}}, onset: {{notesByRow[selectedRowNum-1][selectedIndex].onset}}, duration: {{notesByRow[selectedRowNum-1][selectedIndex].duration}}
        v-text-field.mx-10(label="comment" hint="comment on a note" persistent-hint outlined append-icon="mdi-keyboard-return" :disabled="selectedIndex == null" @change="onCommentChange" v-model="comment")
        v-divider
        v-card-text(class="commentCardScores" v-on:scroll.passive='onLineGraphScroll')
            div(v-for="(row, idx) in notesByRow" :key="idx")
                div(:id="`vexflow-wrapper-${idx}`" style="position:relative")
                EvaluationLineGraph( :bpm="bpm" :transcribedNotes="row" :rowNum="idx+1" :onSelectNote="onSelectNote" :isScrolling="isScrolling" :clickedNoteOnset="selectedRowNum !== null && selectedIndex !== null ? notesByRow[selectedRowNum-1][selectedIndex].onset : null" :shouldIndicateNoteClicked="true")
</template>

<script>
import EvaluationLineGraph from "./EvaluationLineGraph";
import CourseService from "../services/CourseService";
import RecordingService from "../services/RecordingService";
import vexUI from "../plugins/vex";
export default {
  name: "AutoEvaluation",
  components: {
    EvaluationLineGraph
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
    onSelectNote(rowNum, noteIndex) {
      if (this.selectedIndex !== noteIndex || this.selectedRowNum !== rowNum) {
        this.selectedIndex = noteIndex;
        this.selectedRowNum = rowNum;
        this.comment = this.notesByRow[rowNum - 1][noteIndex].comment ?? null;
      }
    },
    onCommentChange(data) {
      let rowIndex = this.selectedRowNum - 1;
      let row = [...this.notesByRow[rowIndex]];
      let note = { ...this.notesByRow[rowIndex][this.selectedIndex] };
      note.comment = data;
      row[this.selectedIndex] = note;
      this.$set(this.notesByRow, rowIndex, row);
    },
    splitTranscriptionIntoRows(notes) {
      let timePerRow =
        (60 / this.exercise.bpm) * parseInt(this.exercise.timeSignature[0]) * 4;

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
      scoreRows: [],
      handlers: [],
      exercise: null,
      scrollTimeout: null,
      isScrolling: false,
      comment: null,
      selectedRowNum: null,
      selectedIndex: null,
      bpm: 60,
      notesByRow: [],
      transcribedNotes: []
    };
  },
  created: async function() {
    let cid = this.$route.params.course_id;
    let lessonId = this.$route.params.lesson_id;
    let response = await CourseService.show(cid);
    let lesson = response.data.course.lessons.find(
      lesson => lesson.id == lessonId
    );
    let currEx = lesson.exercises[0];
    this.exercise = currEx;

    // Get data for line graph
    let recordings = (await RecordingService.list(currEx.id)).data.recordings;
    if (recordings.length > 0) {
      //TODO: change the recording index to 0
      this.transcribedNotes = JSON.parse(recordings[5].transcription);
      console.log(this.transcribedNotes);
      this.notesByRow = this.splitTranscriptionIntoRows(this.transcribedNotes);
      console.log(this.notesByRow);
    }

    // Get music score
    if (currEx.useScore) {
      currEx.melody = currEx.melody.split("-");
      // let demoStartTime = currEx.demoStartTime
      let notesInBars = vexUI.notesToBars(currEx.melody, currEx.timeSignature);

      for (let i = 0; i < notesInBars.length; i += 4) {
        this.scoreRows.push(notesInBars.slice(i, i + 4).flat());
      }

      await this.$nextTick();

      let wrapper = document.getElementById(`vexflow-wrapper-${0}`);
      let width = wrapper.offsetWidth;
      for (let i = 0; i < this.scoreRows.length; i++) {
        this.handlers.push(
          new vexUI.Handler(`vexflow-wrapper-${i}`, {
            numberOfStaves: 4,
            stavesPerRow: 4,
            canEdit: false,
            canvasProperties: {
              width,
              id: `vexflow-wrapper-${i}` + "-canvas"
            }
          }).init()
        );

        this.handlers[i].importNotes(this.scoreRows[i], currEx.timeSignature);
      }
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
