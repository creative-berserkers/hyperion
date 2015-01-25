var WebSocketServer = require('ws').Server
var http = require('http')
var fs = require('fs')
var url = require('url')
var path = require('path')
var deep = require('cb-multiobserve').deep
var util = require('cb-util').util

function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (value instanceof Array) {
                s = 'array'
            }
        }
        else {
            s = 'null';
        }
    }
    return s;
}

function remove(arr, item) {
    var i;
    while ((i = arr.indexOf(item)) !== -1) {
        arr.splice(i, 1);
    }
}

function send(ws, object){
    //console.log('<=')
    //console.log(object)
    ws.send(JSON.stringify(object))
}

function createServer(dir) {
    var mimeTypes = {
        "html": "text/html",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "png": "image/png",
        "js": "text/javascript",
        "css": "text/css"
    };

    return http.createServer(function(req, res) {
        var uri = url.parse(req.url).pathname;
        var unescapedUri = unescape(uri);
        if (unescapedUri === '/') unescapedUri = 'index.html';
        var filename = path.join(process.cwd() + dir, unescapedUri);
        console.log('handling:' + filename);
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

function handleCall(msg, ws, self) {
    if (!msg.hasOwnProperty('name')) {
        console.log('missing property name')
        return
    }
    if (!msg.hasOwnProperty('path')) {
        console.log('missing property name')
        return
    }
    if (!msg.hasOwnProperty('args')) {
        console.log('missing property args')
        return
    }
    if (!msg.hasOwnProperty('id')) {
        console.log('missing property id')
        return
    }
    var c = self.objects[msg.name]
    if (!c) return
    var curr = null
    if(c.type === 'request'){
        if(!ws.objects[msg.name]) return
        curr = ws.objects[msg.name]
    } else {
        curr = c.object
    }
    msg.path.forEach(function(node) {
        if (typeOf(curr[node]) === 'function') {
            var method = curr[node]
            var result = method.apply(c.object, [ws].concat(msg.args))
            if (result instanceof Promise) {
                result.then(function(result) {
                    if (!result) result = null
                    send(ws,{
                        type: 'call-response',
                        name: msg.name,
                        id: msg.id,
                        result: result
                    })
                });
            }
            else {
                if (!result) result = null
                send(ws,{
                    type: 'call-response',
                    name: msg.name,
                    id: msg.id,
                    result: result
                })
            }
        }
    })
}



function handleGetObject(msg, ws, self) {
    if (!msg.hasOwnProperty('name')) {
        console.log('missing property name')
        return
    }
    if (self.objects[msg.name]) {
        var object = null
        if (self.objects[msg.name].type === 'request') {
            if(!ws.objects) ws.objects = {}
            if(!ws.objects[msg.name]){
                object = self.objects[msg.name].callback(ws)
                ws.objects[msg.name] = object
                Object.observe(deep(object), function(changes) {
    
                    var result = changes.map(function(change) {
                        return {
                            type: change.type,
                            path: change.path || [change.name],
                            value: change.node ? change.node[change.name] : change.object[change.name],
                            oldValue: change.oldValue
                        }
                    })
    
                    send(ws,{
                        type: 'object-broadcast',
                        name: msg.name,
                        changes: result
                    })
                });
            }
        } else {
            object = self.objects[msg.name].object
            self.objects[msg.name].peers.push(ws)
        }
        var escapedObject = {}
        var methods = []
        util.copyAndEscape(object, escapedObject, function(path) {
            methods.push(path)
        })
        
        send(ws,{
            type: 'object-response',
            name: msg.name,
            object: escapedObject,
            methods: methods
        })
    }
}

exports.Server = function bootstrap(port, dirname) {
    var self = this
    this.objects = []
    this.newConnections = null

    var server = createServer(dirname);
    server.listen(port);

    console.log("http server listening on %d", port);

    this.wss = new WebSocketServer({
        server: server
    })

    this.wss.on('connection', function(ws) {
        if (self.newConnections) self.newConnections.callback.call(self.newConnections.ctx, ws)
        ws.on('message', function(message) {
            //console.log('=>')
            //console.log(message)
            if (message) {
                try {
                    var msg = JSON.parse(message)
                    if (!msg.hasOwnProperty('type')) {
                        console.log('missing property type')
                        return
                    }
                    if (msg.type === 'object-call') handleCall(msg, ws, self)
                    if (msg.type === 'get-object') handleGetObject(msg, ws, self)
                }
                catch (e) {
                    console.log('wrong message format: ')
                    console.log(e)
                }
            }
        })
        ws.on('close', function close() {
            if (self.onDisconnect) self.onDisconnect.callback.call(self.onDisconnect.ctx, ws)
            /*self.broadcasts.forEach(function(broadcast) {
                broadcast.remove(ws)
            })*/
        });
    })
}

exports.Server.prototype.registerNewConnection = function(callback, ctx) {
    this.newConnections = {
        callback: callback,
        ctx: ctx
    }
}

exports.Server.prototype.registerOnDisconnect = function(callback, ctx) {
    this.onDisconnect = {
        callback: callback,
        ctx: ctx
    }
}

exports.Server.prototype.registerObject = function(name, object) {
    if (this.objects[name]) return
    var record = this.objects[name] || {
        name: name,
        type: 'global',
        object: object,
        peers: []
    } 
    Object.observe(deep(object), function(changes) {

        var result = changes.map(function(change) {
            if(change.arrayChangeType){
                return {
                    type : change.arrayChangeType,
                    path: change.path || [change.name],
                    index : change.index,
                    added: change.node.slice(change.index,change.index+change.addedCount),
                    removedCount: change.removed.length
                }
            } else {
                return {
                    type: change.type,
                    path: change.path || [change.name],
                    value: change.node ? change.node[change.name] : change.object[change.name],
                    oldValue: change.oldValue
                }
            }
        })
        
        var msg = {
            type: 'object-broadcast',
            name: record.name,
            changes: result
        }

        record.peers.forEach(function(peer) {
            send(peer, msg)
        })
    });
    this.objects[name] = record
}

exports.Server.prototype.unregisterObject = function(name) {
    this.objects[name] = null
}

exports.Server.prototype.registerObjectGenerator = function(name, callback) {
    if (!this.objects[name]) {
        this.objects[name] = {
            name: name,
            type: 'request',
            callback: callback
        }
    }

}

exports.Server.prototype.unregisterObjectGenerator = function(name) {
    this.objects[name] = null
}