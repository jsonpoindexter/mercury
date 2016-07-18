var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('testio.html');
});
var gpsdata = {
        'lat':123423425,
        'lon':123423455
 };
 
payload = 0x0F
io.on('connection', function(socket){
  console.log('a user connected');
  console.log('sending data:',payload);
  //io.emit('data',payload);
  socket.on('data', function(data) {
        console.log('recieved data:',data);
        console.log('sending data:',data);
        io.emit('data',data);
    });
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
