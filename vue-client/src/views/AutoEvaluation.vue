<template lang="pug">
    v-card.mx-10
        v-card-title.mt-10 Click on a note to leave comment
        v-card-subtitle(v-if="selectedIndex !== null") Selected: {{notesByRow[selectedRowNum-1][selectedIndex]}}
        v-text-field.mx-10(label="comment" hint="comment on a note" persistent-hint outlined :disabled="selectedIndex == null" @change="onCommentChange" v-model="comment")
        div(v-for="(row, idx) in notesByRow" :key="idx")
            EvaluationLineGraph( :bpm="bpm" :transcribedNotes="row" :rowNum="idx+1" :onSelectNote="onSelectNote")
</template>

<script>
import EvaluationLineGraph from "./EvaluationLineGraph";
export default {
  name: "AutoEvaluation",
  components: {
    EvaluationLineGraph
  },
  methods: {
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
    }
  },
  data() {
    return {
      comment: null,
      selectedRowNum: null,
      selectedIndex: null,
      bpm: 60,
      notesByRow: [],
      transcribedNotes: [
        {
          onset: 0.3,
          note: "C6",
          duration: 5
        },
        {
          onset: 5.3,
          note: "A3",
          duration: 4
        },
        {
          onset: 10,
          note: "D3",
          duration: 6
        }
      ]
    };
  },
  mounted() {
    //TODO: split notes into rows
      let secondRow = this.transcribedNotes.map(note => {
          let noteCopy = {...note}
          let onset = note.onset
          noteCopy.onset = onset + 16
          return noteCopy
      })
      let thirdRow = this.transcribedNotes.map(note => {
          let noteCopy = {...note}
          let onset = note.onset
          noteCopy.onset = onset + 32
          return noteCopy
      })
    this.notesByRow = [this.transcribedNotes, secondRow, thirdRow];
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
