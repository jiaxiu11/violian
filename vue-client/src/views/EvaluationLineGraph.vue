<template lang="pug">
    Plotly(v-if="graph" :data="graph.data" :layout="graph.layout" :display-mode-bar="false" :responsive="true" @hover="onHover" @unhover="onUnhover" @click="onClick")
</template>

<script>
import { Plotly } from "vue-plotly";
export default {
  name: "EvaluationLineGraph",
  components: {
    Plotly
  },
  props: ["transcribedNotes", "rowNum", "bpm", "onSelectNote"],
  watch: {
    transcribedNotes: function(val) {
      this.graph = this.getGraphForNotes(val);
    }
  },
  methods: {
    onClick(data) {
      let idx = data.points[0].pointIndex;
      this.onSelectNote(this.rowNum, idx);
    },
    onHover(data) {
      let idx = data.points[0].pointIndex;

      let note = { ...this.graph.data[0] };
      let marker = { ...this.graph.data[0].marker };
      let colors = [...this.graph.data[0].marker.color];

      colors[idx] = this.highlightedNoteColor;
      marker.color = colors;
      note.marker = marker;

      this.$set(this.graph.data, 0, note);
    },
    onUnhover(data) {
      let idx = data.points[0].pointIndex;
      let hasComment = this.transcribedNotes[idx].comment;

      let note = { ...this.graph.data[0] };
      let marker = { ...this.graph.data[0].marker };
      let colors = [...this.graph.data[0].marker.color];

      colors[idx] = hasComment ? this.commentedNoteColor : this.noteColor;
      marker.color = colors;
      note.marker = marker;

      this.$set(this.graph.data, 0, note);
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
      return notes.map(note =>
        note.comment ? this.commentedNoteColor : this.noteColor
      );
    },
    getGraphForNotes(notes) {
        console.log('redraw')
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
      return graph;
    }
  },

  data() {
    return {
      minNoteNumber: "C3",
      maxNoteNumber: "C6",
      timeSignature: 4,
      barsPerRow: 4,
      secondsPerRow: this.getSecondsPerRow(),
      graph: null,
      noteColor: "DarkSlateGray",
      highlightedNoteColor: "#e0e5e5",
      selectedNoteColor: "",
      commentedNoteColor: "DarkSeaGreen"
    };
  },
  mounted() {
    this.graph = this.getGraphForNotes(this.transcribedNotes);
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
