<template lang="pug">
    <div>
      Plotly(v-for="graph in graphs" :data="graph.data" :layout="graph.layout" :display-mode-bar="false" :static-plot="true" :responsive="true")
    </div>
</template>

<script>
import { Plotly } from "vue-plotly";
export default {
  name: "LineGraph",
  components: {
    Plotly
  },
  props: ["transcribedNotes", "rowNum", "bpm"],
  watch: {
    transcribedNotes: function (val) {
      console.log(val)
      this.graphs = this.getGraphsForNotes(val);
    }
  },

  data() {
    return {
      minNoteNumber: "C3",
      maxNoteNumber: "C6",
      timeSignature: 4,
      barsPerRow: 4,
      secondsPerRow: 0,
      graphs: []
    };
  },
  methods: {
    getSecondsPerRow() {
      return (60 / this.bpm) * this.timeSignature * this.barsPerRow;
    },
    getNumberFromMusicNote(noteNumber) {
      let octave = 0;
      if (noteNumber.length > 2)
        octave = noteNumber[noteNumber.length - 1] - "0";
      else
        octave = noteNumber[1] - "0";
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
    splitIntoRows(notes) {
      let timePerRow = this.getSecondsPerRow();
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
    },
    getTickValsForRow(rowIndex) {
      let ticks = [];
      for (let i = 0; i <= this.barsPerRow * this.timeSignature; i++) {
        ticks.push(i);
      }
      return ticks.map(
        tick => tick + rowIndex * this.barsPerRow * this.timeSignature
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
      return notes.map(note => note.note);
    },
    getBarDividers(rowIndex) {
      let y0 = 0;
      let y1 = this.maxNoteNumber[1] - this.minNoteNumber[1];
      let barDividers = [];
      for (let i = 1; i <= this.barsPerRow; i++) {
        let x =
          i * this.timeSignature +
          rowIndex * this.timeSignature * this.barsPerRow;
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
    getGraphsForNotes(notes) {
      let rows = this.splitIntoRows(notes);
      let graphs = [];
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let graph = {
          data: [
            {
              x: this.getAnnotationXValsForNotes(row),
              y: this.getAnnotationYValsForNotes(row),
              text: this.getAnnotationsForNotes(row),
              mode: "text"
            }
          ],
          layout: {
            xaxis: {
              zeroline: false,
              range: [
                i * this.secondsPerRow,
                (i + 1) * this.secondsPerRow + 0.1
              ],
              tickvals: this.getTickValsForRow(i),
              tickfont: {
                family: "Old Standard TT, serif",
                size: 10,
                color: "Brown"
              }
            },
            yaxis: {
              range: [0, 3.1],
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
            shapes: row
              .map(note => this.getLineSegmentForMusicNote(note))
              .concat(this.getBarDividers(i))
          }
        };
        graphs.push(graph);
      }
      return graphs;
    }
  },
  async mounted() {
    this.secondsPerRow = this.getSecondsPerRow();
    if (this.transcribedNotes.length > 0)
      this.graphs = this.getGraphsForNotes(this.transcribedNotes);
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
