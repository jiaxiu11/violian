<template lang="pug">
    div
        div(:id="plotDivId" :ref="plotContainerId" style="position: relative;")
        div(v-if="selectedNote  && showTooltip" class="tooltip" :style="{top: tooltipTop + 'px', left:tooltipLeft + 'px'}")
            v-alert(dense border="left" :color="selectedNote.comment ? commentedNoteColor:'#9ab3f5'" colored-border elevation="2")
                div Note: {{selectedNote.note}}
                div(v-if="selectedNote.comment") Comment: {{selectedNote.comment}}

</template>

<script>
import Plotly from "plotly.js/dist/plotly";

export default {
  name: "EvaluationLineGraph",
  props: [
    "transcribedNotes",
    "rowNum",
    "bpm",
    "onClickNote",
    "onSelectNoteForGreentick",
    "isScrolling",
    "clickedNoteOnset",
    "shouldIndicateNoteClicked"
  ],
  watch: {
    transcribedNotes: function(val) {
      this.graph = this.getGraphForNotes(val);
    },
    isScrolling: function(val) {
      if (val) {
        this.showTooltip = false;
      }
    },
    clickedNoteOnset: function(val) {
      if (!this.shouldIndicateNoteClicked || this.clickedNote == null) {
        return;
      }
      if (val !== this.clickedNote.onset) {
        this.clickedNote = null;
      }
    },
    clickedNote: function(val) {
      let shapeCount = this.graph.layout.shapes.length;

      if (
        val === null &&
        this.graph.layout.shapes[shapeCount - 1].type !== "line"
      ) {
        this.graph.layout.shapes.splice(-1, 1);
        return;
      }

      if (val === null) {
        return;
      }

      let noteBackgroundShape = this.getShapeToIndicateNoteAsClicked(val)[0];
      if (this.graph.layout.shapes[shapeCount - 1].type === "line") {
        this.graph.layout.shapes.push(noteBackgroundShape);
      } else {
        this.$set(
          this.graph.layout.shapes,
          shapeCount - 1,
          noteBackgroundShape
        );
      }
    }
  },
  computed: {
    plotDiv() {
      return this.$refs[this.plotContainerId];
    }
  },
  mounted() {
    this.secondsPerRow = this.getSecondsPerRow();
    this.graph = this.getGraphForNotes(this.transcribedNotes);
    Plotly.newPlot(
      this.plotDivId,
      this.graph.data,
      this.graph.layout,
      this.graph.config
    );
    this.plotDiv.on("plotly_hover", this.onHover);
    this.plotDiv.on("plotly_unhover", this.onUnhover);
    this.plotDiv.on("plotly_click", this.onClick);
  },
  created() {
    this.$watch("graph", this.update, { deep: true });
  },
  beforeDestroy() {
    if (!this.plotDiv["off"]) return;
    this.plotDiv.off("plotly_hover", this.onHover);
    this.plotDiv.off("plotly_unhover", this.onUnhover);
    this.plotDiv.off("plotly_click", this.onClick);
  },
  methods: {
    update() {
      Plotly.react(
        this.plotDivId,
        this.graph.data,
        this.graph.layout,
        this.graph.config
      );
    },
    onClick(data) {
      let idx = data.points[0].pointIndex;
      if (this.shouldIndicateNoteClicked) {
        this.clickedNote = this.transcribedNotes[idx];
          let xaxis = data.points[0].xaxis;
          let left = xaxis.l2p(this.transcribedNotes[idx].onset) + xaxis._offset;
        this.onClickNote(this.rowNum, idx, left);
      }
      //fire event for green tick
      // FYI: to get x-position from x-coord, use the method below
      let xaxis = data.points[0].xaxis;
      let left = xaxis.l2p(this.transcribedNotes[idx].onset) + xaxis._offset;
      this.onSelectNoteForGreentick(this.rowNum, left);
    },
    onHover(data) {
      let idx = data.points[0].pointIndex;
      let trace = { ...this.graph.data[0] };
      let marker = { ...this.graph.data[0].marker };
      let colors = [...this.graph.data[0].marker.color];

      colors[idx] = this.highlightedNoteColor;
      marker.color = colors;
      trace.marker = marker;
      this.$set(this.graph.data, 0, trace);

      let lineGraphBoundingRect = this.$refs[
        this.plotContainerId
      ].getBoundingClientRect();
      let xaxis = data.points[0].xaxis;
      let yaxis = data.points[0].yaxis;
      let left = xaxis.l2p(data.points[0].x) + xaxis._offset;
      let top = yaxis.l2p(data.points[0].y) + lineGraphBoundingRect.top;
      // use this line and set .tooltip position to fixed if we want the tooltip to be exactly below the note
      // let top = yaxis.l2p(data.points[0].y) + lineGraphBoundingRect.top + yaxis.l2p(3.1) + yaxis._offset;

      this.selectedNote = this.transcribedNotes[idx];
      this.tooltipLeft = left;
      this.tooltipTop = top;
      this.showTooltip = true;
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
      this.showTooltip = false;
    },
    getSecondsPerRow() {
      return (60 / this.bpm) * this.timeSignature * this.barsPerRow;
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
            color: this.barDividerColor,
            width: 1
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
      return Array(notes.length).fill(0.16);
    },
    getBarBaseValsForNotes(notes) {
      return notes.map(note => {
        return this.getLineSegmentYValForMusicNote(note) - 0.08;
      });
    },
    getBarWidthValsForNotes(notes) {
      return notes.map(note => note.duration - 0.02);
    },
    getBarColorsForNotes(notes) {
      return notes.map(note =>
        note.comment ? this.commentedNoteColor : this.noteColor
      );
    },
    getShapeToIndicateNoteAsClicked(note) {
      if (!note) {
        return [];
      }
      let noteBackgroundShape = {
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: note.onset,
        y0: 0,
        x1: note.onset + note.duration,
        y1: 1,
        fillcolor: this.noteClickedIndicationColor,
        opacity: 0.2,
        line: {
          width: 0
        }
      };
      return [noteBackgroundShape];
    },
    getGraphForNotes(notes) {
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
            hoverinfo: "none",
            marker: {
              color: this.getBarColorsForNotes(row)
            },
            name: "notes"
          }
        ],
        layout: {
          hovermode: "x",
          hoverlabel: { bgcolor: "#FFF" },
          xaxis: {
            zeroline: false,
            range: [
              (this.rowNum - 1) * this.secondsPerRow,
              this.rowNum * this.secondsPerRow + 0.1
            ],
            fixedrange: true,
            tickvals: this.getTickValsForRow(this.rowNum - 1),
            ticktext: this.getTickTextsForRow(this.rowNum - 1),
            tickfont: {
              family: "Roboto",
              size: 10,
              color: "Black"
            }
          },
          yaxis: {
            range: [0, 3.3],
            fixedrange: true,
            tickvals: [0, 1, 2, 3],
            ticktext: ["C3", "C4", "C5", "C6"],
            tickfont: {
              family: "Roboto",
              size: 10,
              color: "Black"
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
          shapes: this.getBarDividers(this.rowNum - 1).concat(
            this.getShapeToIndicateNoteAsClicked(this.clickedNote)
          )
        },
        config: {
          displayModeBar: false,
          showAxisDragHandles: false,
          scrollZoom: false,
          showAxisRangeEntryBoxes: false
        }
      };
      return graph;
    }
  },

  data() {
    return {
      selectedNote: null,
      clickedNote: null,
      plotContainerId: `lineGraphContainer${this.rowNum - 1}`,
      plotDivId: `lineGraph${this.rowNum - 1}`,
      showTooltip: false,
      tooltipLeft: 0,
      tooltipTop: 0,
      minNoteNumber: "C3",
      maxNoteNumber: "C6",
      timeSignature: 4,
      barsPerRow: 4,
      secondsPerRow: 0,
      graph: null,
      noteColor: "#9ba4b4",
      highlightedNoteColor: "#e0e5e5",
      commentedNoteColor: "#ffa62b",
      noteClickedIndicationColor: "Grey",
      barDividerColor: "Black"
    };
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.tooltip {
  margin-top: 0;
  z-index: 200;
  position: absolute;
}
</style>
