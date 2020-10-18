<template lang="pug">
    v-card.mx-10
        Plotly(v-for="graph in graphs" :data="graph.data" :layout="graph.layout" :display-mode-bar="false" :responsive="true" @hover="onHover" @unhover="onUnhover" @click="onClick")
        v-card-title.mt-10 Select a note to leave comment
        v-card-subtitle(v-if="selectedNote") Selected: {{selectedNote.note}}
        v-text-field.mx-10(label="comment" hint="comment on a note" persistent-hint outlined :disabled="selectedNote == null" @change="onCommentChange" v-model="comment")
</template>

<script>
import { Plotly } from "vue-plotly";
export default {
  name: "AutoEvaluation",
  components: {
    Plotly
  },
  methods: {
    onCommentChange(data) {
      let selectedNote = { ...this.selectedNote };
      selectedNote.comment = data;
      this.transcribedNotes[this.selectedIndex] = selectedNote;
      this.graphs = this.getGraphsForNotes(this.transcribedNotes);
    },
    onClick(data) {
      let idx = data.points[0].pointIndex;
      if (this.selectedIndex !== idx) {
        this.selectedIndex = idx;
        this.selectedNote = this.transcribedNotes[idx];
        this.comment = null;
      }
    },
    onHover(data) {
      let idx = data.points[0].pointIndex;
      console.log(idx);
    },
    onUnhover(data) {
      let idx = data.points[0].pointIndex;
      console.log(idx);
    },
    getSecondsPerRow() {
      let timeSignature = 4;
      let bpm = 60;
      let barsPerRow = 4;
      return (60 / bpm) * timeSignature * barsPerRow;
    },
    getNumberFromMusicNote(noteNumber) {
      let octave = noteNumber[1] - "0";
      let note = noteNumber[0].charCodeAt(0) - "C".charCodeAt(0);
      if (note < 0) {
        note = note + 8;
      }
      return octave * 8 + note;
    },
    getLineSegmentForMusicNote(note) {
      let y = this.getLineSegmentYValForMusicNote(note);
      return {
        type: "line",
        x0: note.onset,
        y0: y,
        x1: note.onset + note.duration,
        y1: y,
        line: {
          color: "rgb(55, 128, 191)",
          width: 3
        }
      };
    },
    getLineSegmentYValForMusicNote(note) {
      let minY = this.getNumberFromMusicNote(this.minNoteNumber);
      let maxY = this.getNumberFromMusicNote(this.maxNoteNumber);
      let y = this.getNumberFromMusicNote(note.note);
      return (
        ((y - minY) / (maxY - minY)) *
        (this.maxNoteNumber[1] - this.minNoteNumber[1])
      );
    },
    getTickTextsForRow(rowIndex) {
      let ticks = [];
      for (let i = 0; i <= this.barsPerRow * this.timeSignature; i++) {
        ticks.push(i);
      }
      return ticks.map(tick =>
        (tick + rowIndex * this.barsPerRow * this.timeSignature).toString()
      );
    },
    getTickValsForRow(rowIndex) {
      let ticks = [];
      for (let i = 0; i <= this.barsPerRow * this.timeSignature; i++) {
        ticks.push(i);
      }
      return ticks.map(
        tick => (tick * 60) / this.bpm + rowIndex * this.secondsPerRow
      );
    },
    getAnnotationXValsForNotes(notes) {
      return notes.map(note => note.onset + note.duration / 2);
    },
    getAnnotationYValsForNotes(notes) {
      return notes.map(note => {
        let yVal = this.getLineSegmentYValForMusicNote(note) + 0.3;
        return yVal <= this.maxNoteNumber[1] - this.minNoteNumber[1]
          ? yVal
          : yVal - 0.7;
      });
    },
    getAnnotationsForNotes(notes) {
      let annotations = [];
      for (let i = 0; i < notes.length; i++) {
        let comment = notes[i].comment;
        let note = notes[i].note;
        let annotation = comment ? note + " " + comment : note;
        annotations.push(annotation);
      }
      return annotations;
    },
    getBarDividers(rowIndex) {
      let y0 = 0;
      let y1 = this.maxNoteNumber[1] - this.minNoteNumber[1];
      let barDividers = [];
      for (let i = 1; i <= this.barsPerRow; i++) {
        let x =
          (i * this.timeSignature * 60) / this.bpm +
          rowIndex * this.secondsPerRow;
        let divider = {
          type: "line",
          x0: x,
          y0: y0,
          x1: x,
          y1: y1,
          line: {
            color: "#bdbdbd",
            width: 2
          }
        };
        barDividers.push(divider);
      }
      return barDividers;
    },
    getBarXValsForNotes(notes) {
      return notes.map(note => note.onset + note.duration / 2);
    },
    getBarYValsForNotes(notes) {
      return Array(notes.length).fill(0.1);
    },
    getBarBaseValsForNotes(notes) {
      return notes.map(note => {
        return this.getLineSegmentYValForMusicNote(note) - 0.05;
      });
    },
    getBarWidthValsForNotes(notes) {
      return notes.map(note => note.duration);
    },
    getBarColorsForNotes(notes) {
      return Array(notes.length).fill("rgb(55, 128, 191)");
    },
    getGraphsForNotes(notes) {
      let row = notes;
      let graph = {
        data: [
          {
            type: "bar",
            x: this.getBarXValsForNotes(row),
            y: this.getBarYValsForNotes(row),
            width: this.getBarWidthValsForNotes(row),
            base: this.getBarBaseValsForNotes(row),
            text: this.getAnnotationsForNotes(row),
            hovertemplate: "<i>%{text}</i><extra></extra>",
            marker: {
              color: this.getBarColorsForNotes(row)
            },
            name: "notes"
          }
        ],
        layout: {
          hovermode: "closest",
          hoverlabel: { bgcolor: "#FFF" },
          xaxis: {
            zeroline: false,
            range: [
              (this.rowNum - 1) * this.secondsPerRow,
              this.rowNum * this.secondsPerRow + 0.1
            ],
            tickvals: this.getTickValsForRow(this.rowNum - 1),
            ticktext: this.getTickTextsForRow(this.rowNum - 1),
            tickfont: {
              family: "Old Standard TT, serif",
              size: 10,
              color: "Brown"
            }
          },
          yaxis: {
            range: [0, 3.3],
            tickvals: [0, 1, 2, 3],
            ticktext: ["C3", "C4", "C5", "C6"],
            tickfont: {
              family: "Old Standard TT, serif",
              size: 10,
              color: "Brown"
            }
          },
          height: 150,
          margin: {
            l: 30,
            r: 20,
            b: 20,
            t: 20,
            pad: 8
          },
          shapes: this.getBarDividers(this.rowNum - 1)
        }
      };
      return [graph];
    }
  },

  data() {
    return {
      comment: null,
      selectedNote: null,
      selectedIndex: null,
      minNoteNumber: "C3",
      maxNoteNumber: "C6",
      bpm: 60,
      rowNum: 1,
      timeSignature: 4,
      barsPerRow: 4,
      secondsPerRow: this.getSecondsPerRow(),
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
          duration: 8
        }
      ],
      graphs: []
    };
  },
  mounted() {
    this.graphs = this.getGraphsForNotes(this.transcribedNotes);
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
