var PythonShell = require('python-shell');
var pyshelltx = new PythonShell('tx_beacon.py');

// sends a message to the Python script via stdin 
//pyshell.send('heeeeeeeeeeeeeeeeeeeeeeeeello');
 
pyshelltx.on('message', function (message) {
  // received a message sent from the Python script (a simple "print" statement) 
  console.log(message);
});
 
// end the input stream and allow the process to exit 
pyshelltx.end(function (err) {
  if (err) throw err;
  console.log('finished');
});

var pyshellrx = new PythonShell('rx_cont.py');
pyshellrx.on('message', function (message) {
  // received a message sent from the Python script (a simple "print" statement) 
  console.log(message);
});
 
// end the input stream and allow the process to exit 
pyshellrx.end(function (err) {
  if (err) throw err;
  console.log('finished');
});