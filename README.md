hyperion
========


Custom web protocol implementation with Publish & Subscribe and Point to Point RPC,

here is an example of server:

```js

var hyperion = require('cb-hyperion').Server;

var server = new hyperion(8080);
var allBroadcast = server.registerBroadcast('all');

server.registerMethod('join', function(ws){
    allBroadcast.addTarget(ws);
    console.log('joined all');
});

server.registerMethod('send', function(ws, msg){
    allBroadcast.send(msg);
    console.log('sending to all:'+msg);
});

```