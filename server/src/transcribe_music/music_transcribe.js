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
 
PythonShell.run('test.py', options, function (err, results) {
  if (err) throw err;
  // results is an array consisting of messages collected during execution
  console.log('results: %j', results);
  // console.log(results[0], results[1], results[2]);
});