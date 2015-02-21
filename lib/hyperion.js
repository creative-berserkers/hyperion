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
    ws.send(JSON.stringify(object))
}

exports.hyperion = function (spec) {
    let objects = []
    let newConnectionFn = spec.newConnectionFn
    let errorFn = spec.errorFn
    let wss = spec.wss

    wss.on('connection', function(ws) {
        if (typeof newConnectionFn === 'function') newConnectionFn(ws)
        handleNewConnection(ws)
    })
    
    function handleNewConnection(ws){
        ws.on('message', function(message) {
            if (message) {
                try {
                    var msg = JSON.parse(message)
                    if (!msg.hasOwnProperty('type')) {
                        console.log('missing property type')
                        return
                    }
                    if (msg.type === 'object-call') handleCall(msg, ws)
                    if (msg.type === 'get-object') handleGetObject(msg, ws)
                }
                catch (e) {
                    console.log('wrong message format: ')
                    console.log(e)
                }
            }
        })
        ws.on('close', function close() {
            
        });
    }
    
    function handleGetObject(msg, ws) {
        if (!msg.hasOwnProperty('name')) {
            console.log('missing property name')
            return
        }
        if (objects[msg.name]) {
            var object = null
            if (objects[msg.name].type === 'request') {
                if(!ws.objects) ws.objects = {}
                if(!ws.objects[msg.name]){
                    object = objects[msg.name].callback(ws)
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
                object = objects[msg.name].object
                objects[msg.name].peers.push(ws)
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
    
    function validate(obj, prop){
        if (!obj.hasOwnProperty(prop)) {
            errorFn('missing property ' + prop)
            return false
        }
        return true
    }
    
    function handleCall(msg, ws) {
        if (!validate( msg, 'name')) { return }
        if (!validate( msg, 'path')) { return }
        if (!validate( msg, 'args')) { return }
        if (!validate( msg, 'id')) { return }
        
        var c = objects[msg.name]
        if (c === undefined) return
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
    
    function registerObject(name, object) {
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
    
    function registerObjectGenerator(name, callback) {
        if (this.objects[name] === undefined) {
            this.objects[name] = {
                name: name,
                type: 'request',
                callback: callback
            }
        }
    }
    
    function unregisterObject(name) {
        this.objects[name] = undefined
    }
    
    function unregisterObjectGenerator(name) {
        this.objects[name] = undefined
    }
    
    return Object.freeze({
        registerObject,
        registerObjectGenerator,
        unregisterObject,
        unregisterObjectGenerator
    })
}