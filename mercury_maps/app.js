//SQL
var sqlite3 = require('sqlite3');
TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
// Setup database connection for logging
var db = new TransactionDatabase(
    new sqlite3.Database("/home/pi/projects/node/mapboxinexpress_001/mercery.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

//start GPSD
var gpsd = require('node-gpsd');
var gpsd = require('./lib/gpsd.js');
var previousGpsdTime = new Date(); //keep track of the last time we got a GPSD cvalue
var GpsdInterval = 1;//how often (seconds) to use GPSD data
var daemon = new gpsd.Daemon({
    program: 'gpsd',
    device: '/dev/ttyAMA0',
    port: 2947,
    pid: '/tmp/gpsd.pid',
    logger: {
        info: function() {},
        warn: console.warn,
        error: console.error
    }
});
daemon.start(function() {
    console.log('Started GPSD daemon');
	var listener = new gpsd.Listener();
    listener.on('TPV', function (tpv) {
		//only collect data every GpsdInterval
		if((((new Date()).getTime() - previousGpsdTime.getTime()) / 1000) > GpsdInterval){
			previousGpsdTime = new Date();
			//console.log(tpv);
			var statement = db.prepare("INSERT INTO GpsLog VALUES (?, ?, ?, ?, ?)");
			// Insert values into prepared statement
			var lat = tpv.lat;
			var lon = tpv.lon;
			statement.run( tpv.time, lat, lon, tpv.alt, tpv.speed );
			// Execute the statement
			statement.finalize();
			//send info to Python socket
			
		}
    });
    listener.connect(function() {
        listener.watch();
    });
});


// create an express app
var express = require('express'),
    app = express(),
    morgan = require('morgan'),
	bodyParser = require('body-parser'),
    port = process.env.PORT || 3000,
    publicDir = require('path').join(__dirname, '/public');

// add logging middleware
app.use(morgan('dev'));
// parsing get
app.use(bodyParser.json());
// add the express.static middleware to the app to
// serve files in the specified path
// This middleware will only call the next middleware if
// path doesn't match the static directory
//app.use(express.static(publicDir));
app.get('/index.html',function(req,res){
  res.sendfile(publicDir + '/index.html');
});
app.get('/markers/jpoindexter.jpg',function(req,res){
  res.sendfile(publicDir + '/markers/jpoindexter.jpg');
});
app.get('/bm15/streets.json',function(req,res){
  res.sendfile(publicDir + '/bm15/streets.json');
});
app.get('/bm15/outline.json',function(req,res){
  res.sendfile(publicDir + '/bm15/outline.json');
});
app.get('/bm15/fence.json',function(req,res){
  res.sendfile(publicDir + '/bm15/fence.json');
});


function lastGpsCordinate(callback){
	db.each("select time,lon,lat from gpslog order by time desc limit 1;", function (err, data) {
		if (err) {
			response.writeHead(500, { "Content-type": "text/html" });
			response.end(err + "\n");
			console.log('Error serving querying database. ' + err);
			return;
		}
		callback(data);
	});
}

app.get('/GpsData.json', function(req, res) {
	lastGpsCordinate(function (data) {
	  console.log(data);
	  res.send(data);         // automatic -> application/json
	});
});
app.listen(port);

console.log('server started on port %s', port);

