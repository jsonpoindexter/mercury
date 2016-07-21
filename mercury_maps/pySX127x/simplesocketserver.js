/*******Start-Payload*******/
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
/*******END-Payload*******/

/***********FROM GPSD***********/
var lat =  35.112515076
var lon = -120.599338935
/***********END - FROM GPSD***********/
var payload = new Array()
//var payload = new Uint8Array(9)
var devID = 0x01
payload[0] = devID

/***********SENDING***********/
//Change Lat / Lon to a non decimal number
lon = Math.round(lon * 10000000)
lat = Math.round(lat * 10000000)

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

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('testio.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  console.log('sending data_sx127x:',payload);
  io.emit('data_sx127x',payload);
  socket.on('data_sx127x', function(data) {
        console.log('recieved data_sx127x:',data);
        console.log('deviceID: ',data[0]);
        console.log('lon :', hexToInt(bytesToHex(payload.slice(1,5))) / 10000000)
        console.log('lat :', hexToInt(bytesToHex(payload.slice(5,9))) / 10000000)
        console.log('sending data_sx127x:',data);
        io.emit('data_sx127x',data);
    });
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});



