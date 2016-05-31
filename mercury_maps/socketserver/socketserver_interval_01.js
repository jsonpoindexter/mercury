var express = require('express'),
    app = express(),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    port = process.env.PORT || 3000;

var net = require('net');
var HOST = '127.0.0.1';
var clientPORT = 4001;

// add logging middleware
app.use(morgan('dev'));
// parsing get
app.use(bodyParser.json());

var test = {"employees":[
    {"firstName":"John", "lastName":"Doe"},
    {"firstName":"Anna", "lastName":"Smith"},
    {"firstName":"Peter", "lastName":"Jones"}
]}

var interval = setInterval( function() {
  var client = new net.Socket();
  client.connect(clientPORT, HOST, function(err) {
      console.log('CONNECTED TO: ' + HOST + ':' + clientPORT);
      if (err)  return next(err);
      client.write(JSON.stringify(test));
  });

  client.on('error', function() {
      console.log('Connection error');
      client.destroy();
  });

  client.on('data', function(data) {
      console.log("Received data!" );
      client.destroy();
      //data recevied
      console.log('data: ' + data);
  });
}, 1000); 
 
app.listen(port);
console.log('server started on port %s', port);
