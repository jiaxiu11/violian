// WIP
var lineReader = require('line-reader');
const insertLine = require('insert-line');
 
const file_path = 'ttls.musicxml';
insertLine(file_path).appendSync('EOF');
 
var result = [];
const keywords = ["duration", "step", "octave", "type"]
function read() {
    lineReader.eachLine(file_path, function(line, last) {
        for (var i = 0; i < keywords.length; i++) {
            if (line.includes(keywords[i])) {
                result.push(line);
            }
        }
        console.log(line)
        if (line.length < 1 || line.includes("EOF")) {
            console.log(result)
            return false; // stop reading
        }
    });
}
read();