var WebSocketServer = require('ws').Server

exports.Server = function bootstrap(port){
    var self = this
    this.methods = []
    this.broadcasts = []
    this.newConnections = null
    this.wss = new WebSocketServer({port: port})
  
    this.wss.on('connection', function(ws) {
        if(self.newConnections) self.newConnections.callback.call(self.newConnections.ctx, ws)
        ws.on('message', function(message) {
            if (message){
                try {
                    var msg = JSON.parse(message)
                    if(!msg.hasOwnProperty('name')){
                        console.log('missing property name')
                        return 
                    } 
                    if(!msg.hasOwnProperty('arguments')){
                        console.log('missing property arguments')
                        return
                    } 
                    var method = self.methods[msg.name]
                    if(method){ 
                        method.callback.apply(method.ctx,[ws].concat(msg.arguments))
                    } else {
                        console.log('method '+msg.name+' not found')
                    }
                } catch(e){
                    console.log('wrong message format: '+e)
                }
            }
        })
    })
}

exports.Server.prototype.registerNewConnection = function(callback, ctx){
    this.newConnections = { 
        callback: callback,
        ctx : ctx
    }
}

exports.Server.prototype.registerMethod = function(name, callback, ctx){
    this.methods[name] = { 
        callback: callback,
        ctx : ctx
    }
}

exports.Server.prototype.unregisterMethod = function(name){
    this.methods[name] = null
}

exports.Server.prototype.registerBroadcast = function(name){
    
    var targets = []
    
    var broadcast = {
        addTarget : function(target){
            targets.push(target)
        },
        send : function(msg){
            targets.forEach(function(ws){
                ws.send(JSON.stringify({
                    type : 'broadcast',
                    name : name,
                    msg : msg
                }))
            })
        }
    }
    
    this.broadcasts[name] = broadcast
    return broadcast
}

exports.Server.prototype.unregisterBroadcast = function(name){
    this.broadcasts[name] = null
}