
//Device ID used in LoRa packets
var devID = hexToBytes(decimalToHexString(process.argv[2]));
devID = devID[0]
console.log("devID: ", devID);


/*******Lora Payload Functions*******/
//convert signed decimal to signed hex string
function decimalToHexString(number)
{
    if (number < 0)
    {
    	number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).toUpperCase();
}

// Convert siged hex to integer
function hexToInt(hex) {
    if (hex.length % 2 != 0) {
        hex = "0" + hex;
    }
    var num = parseInt(hex, 16);
    var maxVal = Math.pow(2, hex.length / 2 * 8);
    if (num > maxVal / 2 - 1) {
        num = num - maxVal
    }
    return num;
}
// Convert a hex string to a byte array
function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join("");
}
/*******END-Lora Payload Functions*******/

// http://nodejs.org/api.html#_child_processes
var sys = require('sys')
var exec = require('child_process').exec;
var child;

//SQL
var sqlite3 = require('sqlite3');
TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
// Setup database connection for logging
var db = new TransactionDatabase(
    new sqlite3.Database("/home/pi/projects/node/mapboxinexpress_001/mercery.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

//start GPSD
// executes `pkill` - make sure socketserver isnt already running
child = exec("pkill -f gpsd");

var gpsd = require('node-gpsd');
var gpsd = require('./lib/gpsd.js');
var previousGpsdTime = new Date(); //keep track of the last time we got a GPSD cvalue
var GpsdInterval = 5;//how often (seconds) to use GPSD data
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
        //console.log(tpv);
        //tpv.mode should be 3 since 3 means lot/lat
		if((((new Date()).getTime() - previousGpsdTime.getTime()) / 1000) > GpsdInterval && tpv.mode > 2){
			
            previousGpsdTime = new Date();
			var statement = db.prepare("INSERT INTO GpsLog VALUES (?, ?, ?, ?, ?)");
			// Insert values into prepared statement
			var lat = tpv.lat;
			var lon = tpv.lon;
			statement.run( tpv.time, lat, lon, tpv.alt, tpv.speed );
			// Execute the statement
			statement.finalize();
			//send info to Python socket / to broadcast
            //init payload to send
            var payload = new Array()
            //Change Lat / Lon to a non decimal number
            lon = Math.round(tpv.lon * 10000000)
            lat = Math.round(tpv.lat * 10000000)
            //convert decimal to hex string
            lonHexStr = decimalToHexString(lon)
            latHexStr = decimalToHexString(lat)

            //convert hex string to byte array
            //Convert signed hex lon to int / lon value
            lonByte =  hexToBytes(lonHexStr)
            latByte =  hexToBytes(latHexStr)

            //put together payload
            payload[0] = devID //add device id to the first bye
            //fill out longitude in payload
            for(var i = 0; i < lonByte.length; i++){
               payload[i + 1]  = lonByte[i]
            }
            //fill out latitude in payload
            for(var i = 0; i < latByte.length; i++){
               payload[i + 1 + lonByte.length]  = latByte[i]
            }
            console.log('sending data_sx127x:',payload);
			io.emit('data_sx127x', payload);
            //data for webclient
            var data = {
                'lat':tpv.lat,
                'lon':tpv.lon
            };
            io.emit('data', data);
		}
    });
    listener.connect(function() {
        listener.watch();
    });
});


// create an express app
var app = require('express')();
    morgan = require('morgan'),
	bodyParser = require('body-parser'),
    port = process.env.PORT || 3000,
    publicDir = require('path').join(__dirname, '/public'),
    //socket server to web client
    http = require('http').Server(app),
    io = require('socket.io')(http);

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
  res.sendFile(publicDir + '/index.html');
});
app.get('/index2.html',function(req,res){
  res.sendFile(publicDir + '/index2.html');
});
app.get('/markers/jpoindexter.jpg',function(req,res){
  res.sendFile(publicDir + '/markers/jpoindexter.jpg');
});
app.get('/bm15/streets.json',function(req,res){
  res.sendFile(publicDir + '/bm15/streets.json');
});
app.get('/bm15/outline.json',function(req,res){
  res.sendFile(publicDir + '/bm15/outline.json');
});
app.get('/bm15/fence.json',function(req,res){
  res.sendFile(publicDir + '/bm15/fence.json');
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

//socket stuff
io.on('connection', function(socket){
    console.log('a user connected to socketIO');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    socket.on('data_sx127x', function(data) {
        console.log('recieved data_sx127x:',data);
        console.log('deviceID: ',data[0]);
        console.log('lon :', hexToInt(bytesToHex(data.slice(1,5))) / 10000000)
        console.log('lat :', hexToInt(bytesToHex(data.slice(5,9))) / 10000000)
    });
});

http.listen(port);

console.log('server started on port %s', port);

// Start socket server python scripts
// executes `pkill` - make sure socketserver isnt already running
child = exec("pkill -f sendRecieveData.py");

var PythonShell = require('python-shell');
PythonShell.run('./pySX127x/sendRecieveData.py',{args: ['freq --433']},function (err, results) {
  if (err) throw err;
  // results is an array consisting of messages collected during execution 
  console.log('results: %j', results);
});

