
//Device ID used in LoRa packets
var devId = hexToBytes(decimalToHexString(process.argv[2]));
devId = devId[0]
console.log("devId: ", devId);

var secret =  "332b4c5b2570522f74463944585b5877"
var secretBytes = hexToBytes(secret);


// create an express app
var express = require('express'),
    app = express()
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
app.use(express.static(publicDir));

http.listen(port);

console.log('server started on port %s', port);

// http://nodejs.org/api.html#_child_processes
var sys = require('sys')
var exec = require('child_process').exec;
var child;
//exec("su -l pi -c 'env FRAMEBUFFER=/dev/fb1 startx &'");
//exec("su -l pi -c 'xinit ./util/startB &'");


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
    //send the device Id to web client
    io.emit('data_wclient_init', devId);
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    socket.on('shutdown', function() {
            child = exec("shutdown now");
    });
    //handle data recieved from other LoRa devices
    socket.on('data_sx127x', function(data) {
       
        console.log('recieved data_sx127x:',data);
        /* 
        console.log('deviceID: ',data[0]);
        console.log('lat :', hexToInt(bytesToHex(data.slice(1,5))) / 10000000)
        console.log('lon :', hexToInt(bytesToHex(data.slice(5,9))) / 10000000) */
        console.log('data_sx127x.length', data.length)
        recievedPayload = decodePayload(data);
    
        localTable = updateLocalTable(recievedTable,localTable);
        
        //data for webclient
        var data = {
            'devId' : data[0],
            'lat': (hexToInt(bytesToHex(data.slice(1,5))) / 10000000),
            'lon': (hexToInt(bytesToHex(data.slice(5,9))) / 10000000),
            'time': new Date()
        };
        io.emit('data_web', data);
    });
});







//SQL
var sqlite3 = require('sqlite3');
TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
// Setup database connection for logging
var db = new TransactionDatabase(
    new sqlite3.Database("/projects/mercury/mercury_maps/mercery.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

// Start socket server python scripts
// executes `pkill` - make sure socketserver isnt already running
child = exec("pkill -f sendRecieveData.py");

var PythonShell = require('python-shell');
var pyshell = new PythonShell('./pySX127x/sendRecieveData.py',{args: ['freq --433']},function (err, results) {
  if (err) throw err;
  // results is an array consisting of messages collected during execution
  console.log('results: %j', results);
});
pyshell.on('message', function (message) {
  // received a message sent from the Python script (a simple "print" statement)
  console.log(message);
});
// end the input stream and allow the process to exit
pyshell.end(function (err) {
  if (err) throw err;
  console.log('finished');
});
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
		if(((new Date().getTime() - previousGpsdTime.getTime()) / 1000) > GpsdInterval && tpv.time && tpv.lat && tpv.lon && tpv.alt && tpv.speed){
            previousGpsdTime = new Date();
			var statement = db.prepare("INSERT INTO GpsLog VALUES (?, ?, ?, ?, ?)");
			// Insert values into prepared statement
			var lat = tpv.lat;
			var lon = tpv.lon;
            var time = Date.parse(tpv.time);
            //console.log('parsedTpvDatetime', time)
			statement.run(time, lat, lon, tpv.alt, tpv.speed );
			// Execute the statement
			statement.finalize();        
            //add new GPS units to local table
            DataFromGps(devId, lat, lon, time);
            //convert localtable to payload
            //console.log("localtable:", localTable)
            payload = localTableToPaload(localTable);
            //Send payload
            console.log('sendpayload.length',payload.length);
            console.log('sending data_sx127x:',payload);
            
			io.emit('data_sx127x', payload);
            
            
            //data for webclient
/*             var data = {
                'devId': devId,
                'lat':tpv.lat,
                'lon':tpv.lon,
                'time':new Date()
            }; */
            io.emit('data_web', localTable);
		}
    });
    listener.connect(function() {
        listener.watch();
    });
});


/////////////////// Payload /////////////////// 


var localTable = [];
var recievedTable = [];

//payload/device:		| devId |    Lat    |    Lon    |      Time      |
//propertiesize:	 		1		  4			  4				6 			bytes
//payloadsize/device: 15
devIdsize = 1;
latSize  = 4;
lonSize = 4;
timeSize = 6;
var devicePayloadSize = devIdsize + latSize + lonSize + timeSize;


/*******Lora Payload Functions*******/
(function(){
    var ConvertBase = function (num) {
        return {
            from : function (baseFrom) {
                return {
                    to : function (baseTo) {
                        return parseInt(num, baseFrom).toString(baseTo);
                    }
                };
            }
        };
    };
        
    // binary to decimal
    ConvertBase.bin2dec = function (num) {
        return ConvertBase(num).from(2).to(10);
    };
    
    // binary to hexadecimal
    ConvertBase.bin2hex = function (num) {
        return ConvertBase(num).from(2).to(16);
    };
    
    // decimal to binary
    ConvertBase.dec2bin = function (num) {
        return ConvertBase(num).from(10).to(2);
    };
    
    // decimal to hexadecimal
    ConvertBase.dec2hex = function (num) {
        return ConvertBase(num).from(10).to(16);
    };
    
    // hexadecimal to binary
    ConvertBase.hex2bin = function (num) {
        return ConvertBase(num).from(16).to(2);
    };
    
    // hexadecimal to decimal
    ConvertBase.hex2dec = function (num) {
        return ConvertBase(num).from(16).to(10);
    };
    
    this.ConvertBase = ConvertBase;
    
})(this);



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

// take id, lat lon, and time and turns it into a byte array
function makePayload(devId,lat,lon,time){ 
	//data from SX127x / socketio
	var payload = new Array()
	
	//add devId to payload
	payload[0] = devId //add device id to the first bye
	
	//Change Lat / Lon to a non decimal number
	lat = Math.round(lat * 10000000)
    
	lon = Math.round(lon * 10000000)
	
	//convert decimal to hex string
	latHexStr = decimalToHexString(lat)
	//convert hex string to byte array
	latByte =  hexToBytes(latHexStr)
	
	//convert decimal to hex string
	lonHexStr = decimalToHexString(lon)
	//convert hex string to byte array
	lonByte =  hexToBytes(lonHexStr)
	
	
	//fill out longitude in payload
    //console.log('latByte.length', latByte.length);
	for(var i = 0; i < latByte.length; i++){
	   payload[i + devIdsize]  = latByte[i]
	}
    //console.log('lonByte.length',lonByte.length);
	//fill out latitude in payload
	for(var i = 0; i < lonByte.length; i++){
	   payload[i + devIdsize + latSize]  = lonByte[i]
	}
	
	//convert time to hext string
	timeHexStr = ConvertBase.dec2hex(time);
	//convert hext string to byte array
	var timeByte = new Array();
	for(var i = 0; i < timeHexStr.length; i=i+2){
		timeByte.push(parseInt(timeHexStr.slice(i, i+2),16))
	}
	//add bye array to payload
	for(var i = 0; i < timeByte.length; i++){
		payload[i + devIdsize + latSize + lonSize]  = timeByte[i]	
	}
	//console.log('sending data_sx127x:',payload);
	return payload
}

/*******END-Lora Payload Functions*******/
//convert time portion of payload to time
function timePayloadToTime(timePayload){
	timeStr = "";
	//byte array to hex string
	for(var i = 0; i < timePayload.length; i++){
		timeStr += timePayload[i].toString(16)
	}
	//hex string to decimal
	/* var time = new Date(ConvertBase.hex2dec(timeStr)).getTime(); */
	var time = parseFloat(ConvertBase.hex2dec(timeStr));
    return time;
}

//take a payload and return recievedTable
function decodePayload(payload){
	//filter out packets that do not correspond with payload sizes.
    if((bytesToHex(payload.slice(0,secretBytes.length)) == secret) && ( (payload.length - secretBytes.length ) % devicePayloadSize == 0)){
	//if(payload.length % devicePayloadSize == 0){
		recievedTable = new Array();
		for(var i = 0; i < payload.length / devicePayloadSize; i++){
			var devId = payload[(i + secretBytes.length) * (payload.length / (i + 1))];
			var lat = (hexToInt(bytesToHex(payload.slice(i * (payload.length / (i + 1)) + devIdsize, i * (payload.length / (i + 1)) + devIdsize + latSize))) / 10000000);
			var lon = (hexToInt(bytesToHex(payload.slice(i * (payload.length / (i + 1)) + devIdsize + latSize, i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize))) / 10000000);
			var time = timePayloadToTime(payload.slice(i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize, i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize + timeSize)); 
			var tempDevice = new device(devId,lat,lon,time);
			recievedTable.push(tempDevice);
		}
		return recievedTable;
	}
	else{
		console.log("not the packet we are looking for");
	}
}

//Create devie object
function device(devId, lat, lon, time) {
    this.devId = devId;
    this.lat = lat;
    this.lon = lon;
    this.time = time;
};

//compare local table to recieved table and return updated table
function updateLocalTable( recievedTable, localTable){
	var newDevices = []; // will hold new found devices to be added to local table
	for(var i = 0; i < recievedTable.length; i++){
		var newDevice = true;
		for(var j = 0; j < localTable.length; j++){
			if(recievedTable[i].devId == localTable[j].devId) {
				newDevice = false;
				if(recievedTable[i].time > localTable[j].time){
					console.log("update local table", recievedTable[i]);
					localTable[j] = recievedTable[i];
				}
			}
		}
		if(newDevice){
			newDevices.push(recievedTable[i])
		}
	}
	for(var i = 0; i < newDevices.length; i++){
		console.log("adding new device", newDevices[i]);
		localTable.push(newDevices[i]);
	}
	return localTable;
};

function localTableToPaload(localTable){
	var payload = new Array()
	for(var i = 0; i < localTable.length; i++){
		payload = payload.concat( makePayload(localTable[i].devId, localTable[i].lat, localTable[i].lon, localTable[i].time ) );
	}
	return payload;
}

//simulate data in from GPS
function DataFromGps(devId, lat, lon, time){
    var myDevice = new device(devId, lat, lon, time);
    var recievedTable = [];
    recievedTable.push(myDevice);
    localTable = updateLocalTable(recievedTable,localTable);
} 




