let {PythonShell} = require('python-shell')

let file_url = "https://raw.githubusercontent.com/calvincxz/cs2106/master/violin2.wav"
let options = {
  mode: 'text',
  pythonPath: '/Users/calvin/anaconda3/bin/python3.8',
  // pythonPath: 'python_lib/3.7/bin/python3.8',
  pythonOptions: ['-u'], // get print results in real-time
  // scriptPath: '',
  args: [file_url] // url for audio file
};

function run_python_script(py_file_name, options) {
  PythonShell.run(py_file_name, options, function (err, results) {
    if (err) throw err;

    const json_string = results.reduce((a,b) => a + b).replace(/'/g,'"');
    const transcribed_notes = JSON.parse(json_string);
    console.log(transcribed_notes);
    // for (var i = 0; i < transcribed_notes.length; i++) {
    //   console.log(transcribed_notes[i]);
    // }
    // TODO: save data to db

  });
}
const py_file_name = 'test.py'
run_python_script(py_file_name, options)
