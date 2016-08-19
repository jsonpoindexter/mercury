
//payload/device:		| devId |    Lat    |    Lon    |      Time      |
//propertiesize:	 		1		  4			  4				6 			bytes
//payloadsize/device: 15
devIdsize = 1;
latSize  = 4;
lonSize = 4;
timeSize = 6;
var devicePayloadSize = devIdsize + latSize + lonSize + timeSize;

///////////////////PRODUCTION PURPOSE FUNCTIONS //////////////////
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
function hexToBytes(hex){
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

//convert time portion of payload to time
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
	if(payload.length % devicePayloadSize === 0){
		recievedTable = new Array();
		for(var i = 0; i < payload.length / devicePayloadSize; i++){
			var id = payload[i * (payload.length / (i + 1))];
			var lat = (hexToInt(bytesToHex(payload.slice(i * (payload.length / (i + 1)) + devIdsize, i * (payload.length / (i + 1)) + devIdsize + latSize))) / 10000000);
			var lon = (hexToInt(bytesToHex(payload.slice(i * (payload.length / (i + 1)) + devIdsize + latSize, i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize))) / 10000000);
            console.log(payload.slice(i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize, i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize + timeSize));
			var timePayload = timePayloadToTime( payload.slice(i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize, i * (payload.length / (i + 1)) + devIdsize + latSize + lonSize + timeSize) ); 
			
            var tempDevice = new device(id,lat,lon,timePayload);
			recievedTable.push(tempDevice);
		}
		return recievedTable;
	}
	else{
		console.log("not the packet we are looking for");
	}
}

//Create devie object
function device(id, lat, lon, time) {
    this.id = id;
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
			if(recievedTable[i].id == localTable[j].id) {
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
		payload = payload.concat( makePayload(localTable[i].id, localTable[i].lat, localTable[i].lon, localTable[i].time ) );
	}
	return payload;
}
///////////////////END PRODUCTION PURPOSE FUNCTIONS //////////////////

///////////////////TESTING PURPOSE FUNCTIONS //////////////////
// take id, lat lon, and time and turns it into a byte array
function makePayload(id,lat,lon,time){ 
	//data from SX127x / socketio
	var payload = new Array()
	
	//add devId to payload
	payload[0] = id //add device id to the first bye
	
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
	for(var i = 0; i < latByte.length; i++){
	   payload[i + devIdsize]  = latByte[i]
	}
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

//simulate data in from GPS
function DataFromGps(id, lat, lon, time){
    var myDevice = new device(id, lat, lon, time);
    var recievedTable = [];
    recievedTable.push(myDevice);
    localTable = updateLocalTable(recievedTable,localTable);
} 

///////////////////END TESTING PURPOSE FUNCTIONS //////////////////

var localTable = [];

//simulate recieving gps data
var devId = 1;
var lat = 32.123456789;
var lon = -120.123456789
var time = new Date(1470277964432).getTime();
makePayload(devId, lat, lon ,time);
DataFromGps(devId, lat, lon, time);

//simulate recieving sc127x data
//create payload
var devId = 3;
var lat = 35.987654321;
var lon = -120.987654321;
var time = new Date(1470277964432).getTime();
payload = makePayload(devId, lat, lon ,time);
console.log(payload);
// recieve payload from SX127x
recievedPayload = decodePayload(payload);
//update local table against recieved table 
updateLocalTable(recievedTable,localTable);

//convert localtable to payload
payload = localTableToPaload(localTable);
//send out 

//recieve incomine  payload 
recievedTable = decodePayload(payload)


