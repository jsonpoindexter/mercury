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
io.on('connection', function(socket){
  console.log('a user connected');
  io.emit('data',0xFF);
  socket.on('data', function(data) {
        console.log('recieved data:',data);
        console.log('sending data:',data);
        io.emit('data',0xFF);
    });
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
