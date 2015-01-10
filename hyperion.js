var WebSocketServer = require('ws').Server
var http = require("http")
var fs = require("fs")
var url = require("url")
var path = require("path")

function createServer(dir) {
    var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};
    
    return http.createServer(function(req, res) {
        var uri = url.parse(req.url).pathname;
        var unescapedUri = unescape(uri);
        if(unescapedUri === '/') unescapedUri = 'index.html';
        var filename = path.join(process.cwd()+dir, unescapedUri);
        console.log('handling:' +filename);
        var stats;

        try {
            stats = fs.lstatSync(filename); // throws if path doesn't exist
        }
        catch (e) {
            res.writeHead(415, {
                'Content-Type': 'text/plain'
            });
            res.write('404 Not Found\n');
            res.end();
            return;
        }


        if (stats.isFile()) {
            // path exists, is a file
            var mimeType = mimeTypes[path.extname(filename).split(".").reverse()[0]];
            res.writeHead(200, {
                'Content-Type': mimeType
            });

            var fileStream = fs.createReadStream(filename);
            fileStream.pipe(res);
        }
        else {
            res.writeHead(415, {
                'Content-Type': 'text/plain'
            });
            res.write('404 Not Found\n');
            res.end();
            return;
        }

    })
}

exports.Server = function bootstrap(port, dirname) {
    var self = this
    this.methods = []
    this.broadcasts = []
    this.newConnections = null

    var server = createServer(dirname);
    server.listen(port);

    console.log("http server listening on %d", port);

    this.wss = new WebSocketServer({
        server: server
    })

    this.wss.on('connection', function(ws) {
        console.log(ws)
        if (self.newConnections) self.newConnections.callback.call(self.newConnections.ctx, ws)
        ws.on('message', function(message) {
            console.log(message)
            if (message) {
                try {
                    var msg = JSON.parse(message)
                    if (!msg.hasOwnProperty('name')) {
                        console.log('missing property name')
                        return
                    }
                    if (!msg.hasOwnProperty('arguments')) {
                        console.log('missing property arguments')
                        return
                    }
                    var method = self.methods[msg.name]
                    if (method) {
                        var result = method.callback.apply(method.ctx, [ws].concat(msg.arguments))
                        if (!result) result = null;
                        ws.send(JSON.stringify({
                            type: 'response',
                            name: msg.name,
                            result: result
                        }));
                    }
                    else {
                        console.log('method ' + msg.name + ' not found')
                    }
                }
                catch (e) {
                    console.log('wrong message format: ' + e)
                }
            }
        })
    })
}

exports.Server.prototype.registerNewConnection = function(callback, ctx) {
    this.newConnections = {
        callback: callback,
        ctx: ctx
    }
}

exports.Server.prototype.registerMethod = function(name, callback, ctx) {
    this.methods[name] = {
        callback: callback,
        ctx: ctx
    }
}

exports.Server.prototype.unregisterMethod = function(name) {
    this.methods[name] = null
}

exports.Server.prototype.registerBroadcast = function(name) {

    if (this.broadcasts[name]) {
        return this.broadcasts[name];
    }

    var targets = []

    var broadcast = {
        addTarget: function(target) {
            targets.push(target)
        },
        send: function() {
            var self = this
            targets.forEach(function(ws) {
                ws.send(JSON.stringify({
                    type: 'broadcast',
                    name: name,
                    arguments: Array.prototype.slice(self.arguments,0)
                }))
            })
        }
    }

    this.broadcasts[name] = broadcast
    return broadcast
}

exports.Server.prototype.unregisterBroadcast = function(name) {
    this.broadcasts[name] = null
}