const raw_melody = "B/4/4-B/4/4-B/4/2-B/4/2-A/4/4-A/4/4-A/4/4-A/4/4-F/5/4-F/5/4-F/5/4-F/5/4-A/4/4-A/4/4-A/4/4-A/4/4";
const time_signature = "4/4";
const bpm = "60";
 
// raw_note: B/4/4
function parse_note(raw_note, time_signature, bpm) {
    let note_delimiter = "/";
    const arr = raw_note.split(note_delimiter);
    const note = arr[0].concat(arr[1]);
    const duration = (parseFloat(bpm) / 60) / parseFloat(arr[2]);
    return [note, duration];
}
 
// returns (note, duration)
function parse_score(raw_melody, time_signature, bpm) {
    let score_delimiter = "-";
    const arr = raw_melody.split(score_delimiter);
    const result = arr.map(note => parse_note(note, time_signature, bpm));
    return result;
}
 
function parse_score_with_duration(raw_melody, time_signature, bpm) {
    const melody = parse_score(raw_melody, time_signature, bpm);
    var onset_time = 0;
    var result = [];
 
    for (var i = 0; i < melody.length; i++) {
        const item = melody[i];
        result.push([onset_time, item[0], item[1]]);
        onset_time += parseFloat(item[1]);
    }
    return result;
}
 
console.log(parse_score_with_duration(raw_melody, time_signature, bpm));