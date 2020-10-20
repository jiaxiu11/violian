<template lang="pug">
    v-card.mx-10.mt-10(height="600px" class="commentCard")
        v-card-title Click on a note to leave comment
        v-card-subtitle(v-if="selectedIndex !== null") Selected note: {{notesByRow[selectedRowNum-1][selectedIndex].note}}, onset: {{notesByRow[selectedRowNum-1][selectedIndex].onset}}, duration: {{notesByRow[selectedRowNum-1][selectedIndex].duration}}
        v-text-field.mx-10(label="comment" hint="comment on a note" persistent-hint outlined append-icon="mdi-keyboard-return" :disabled="selectedIndex == null" @change="onCommentChange" v-model="comment")
        v-divider
        v-card-text(class="commentCardScores" v-on:scroll.passive='onLineGraphScroll')
            div(v-for="(row, idx) in notesByRow" :key="idx")
                EvaluationLineGraph( :bpm="bpm" :transcribedNotes="row" :rowNum="idx+1" :onSelectNote="onSelectNote" :isScrolling="isScrolling" :clickedNoteRowNum="selectedRowNum")
</template>

<script>
import EvaluationLineGraph from "./EvaluationLineGraph";
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
    }
  },
  data() {
    return {
      scrollTimeout: null,
      isScrolling: false,
      comment: null,
      selectedRowNum: null,
      selectedIndex: null,
      bpm: 60,
      notesByRow: [],
      transcribedNotes: [
        {
          onset: 0.3,
          note: "C6",
          duration: 1
        },
        {
          onset: 1.3,
          note: "B5",
          duration: 0.8
        },
        {
          onset: 2.4,
          note: "A5",
          duration: 0.1
        },
        {
          onset: 2.5,
          note: "G4",
          duration: 0.5
        },
        {
          onset: 5.3,
          note: "A3",
          duration: 2
        },
        {
          onset: 7.3,
          note: "B3",
          duration: 1
        },
        {
          onset: 8.5,
          note: "C3",
          duration: 0.5
        },
        {
          onset: 10,
          note: "D3",
          duration: 2
        },
        {
          onset: 12,
          note: "C6",
          duration: 3
        }
      ]
    };
  },
  mounted() {
    //TODO: split notes into rows
    let secondRow = this.transcribedNotes.map(note => {
      let noteCopy = { ...note };
      let onset = note.onset;
      noteCopy.onset = onset + 16;
      return noteCopy;
    });
    let thirdRow = this.transcribedNotes.map(note => {
      let noteCopy = { ...note };
      let onset = note.onset;
      noteCopy.onset = onset + 32;
      return noteCopy;
    });
    let fourthRow = this.transcribedNotes.map(note => {
      let noteCopy = { ...note };
      let onset = note.onset;
      noteCopy.onset = onset + 48;
      return noteCopy;
    });
    this.notesByRow = [this.transcribedNotes, secondRow, thirdRow, fourthRow];
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
