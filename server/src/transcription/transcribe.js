const { PythonShell } = require("python-shell");

// const sampleAudioUrl = "https://raw.githubusercontent.com/calvincxz/cs2106/master/violin2.wav";

module.exports = {
  async transcribe(audioUrl) {
    let response;

    let options = {
      mode: "text",
      pythonPath: process.env.PYTHON_PATH,
      pythonOptions: ["-u"], // get print results in real-time
      // scriptPath: '',
      args: [audioUrl], // url for audio file
    };

    await new Promise((resolve, reject) => {
      PythonShell.run(process.env.PYTHON_SCRIPT_PATH, options, function (
        err,
        results
      ) {
        response = JSON.parse(results[0]);
        console.log(response);
        if (response.success) {
          response.transcribed_notes = JSON.stringify(response.transcribed_notes)
        }
        resolve("transcription succeeded");
      });
    });

    return response;
  },
};
