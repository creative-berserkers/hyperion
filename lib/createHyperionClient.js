'use strict'

const createChangeHandler = require('./createChangeHandler')

module.exports = function createHyperionClient(spec) {
    const socket = spec.socket || new WebSocket(spec.host)
    const response = Object.create(null,{})
    const objects = Object.create(null,{})
    const changeHandler = createChangeHandler()
    let id = 0
    let messageLock = false
    let messages = []

    function send(msg){
        console.log('=>')
        console.log(msg)
        socket.send(JSON.stringify(msg))
    }

    function createProxyMethod(object, objectName, method) {
        let curr = object
        method.forEach(function(node) {
            if (curr[node] === undefined) {
                curr[node] = function() {
                    const currId = id++

                    const promise = new Promise(function(resolve, reject) {
                        response[currId] = {
                            resolve: resolve,
                            reject: reject
                        }
                    })
                    const msg = {
                        type : 'object-call',
                        path : method,
                        name : objectName,
                        id : currId,
                        args : Array.prototype.slice.call(arguments, 0)
                    }
                    send(msg)
                    return promise
                }
            }
            else {
                curr = curr[node]
            }
        })

    }

    function applyChange(object, change, next){
        if(change.type === 'update'){
            let curr = object
            change.path.forEach(function(node){
                if(change.path[change.path.length-1] === node){
                    curr[node] = change.node[change.path[change.path.length -1]]
                }
                curr = curr[node]
            })
            changeHandler.fireOnChangeEvent({
                path: change.path,
                newValue : change.node[change.path[change.path.length -1]],
                oldValue : change.oldValue,
                next : next
            })
        } else if(change.type === 'splice'){
            let curr = object
            change.path.forEach(function(node){
                if(change.path[change.path.length-1] === node){
                    curr[node].splice.apply(curr[node],[change.index,change.removedCount].concat(change.added))
                }
                curr = curr[node]
            })
            next()
        }
    }

    function applyChanges(object, changes, next){
        let nextCb
        let entries = changes.entries()
        nextCb = ()=>{
            let entry = entries.next()
            if(entry.done) {
                return next()
            } else {
                return applyChange(object, entry.value[1], nextCb)
            }
        }
        nextCb()
    }

    const clientCtx = {
        model: {},
        createChangeListener : changeHandler.registerHandler
    }

    return new Promise(function(resolve, reject) {

        function process(){
            if(messageLock === true) {
                return
            }
            if(messages.length >= 1){
                messageLock = true
                apply(messages.shift())
            }
        }

        function apply(data) {
            let msg = JSON.parse(data)
            console.log('<=')
            console.log(msg)
            if (msg.type === 'call-response') {
                if(msg.synced === true && objects[msg.resultName] === undefined){
                    msg.methods.forEach(function(method) {
                        createProxyMethod(msg.result, msg.resultName, method)
                    })
                    if(msg.resultName === 'index'){
                        clientCtx.model = msg.result
                        resolve(clientCtx)
                    }
                    objects[msg.resultName] = msg.result
                }

                if(response[msg.id] !== undefined){
                    response[msg.id].resolve(msg.result)
                    delete response[msg.id]
                }
                messageLock = false
                setTimeout(process,0)
            } else if (msg.type === 'object-broadcast') {
                console.log('applying changes')
                const object = objects[msg.name]
                if(object){
                    applyChanges(object, msg.changes, ()=>{
                        messageLock = false
                        setTimeout(process,0)
                    })
                } else {
                    console.log('object not found '+msg.name)
                    messageLock = false
                    setTimeout(process,0)
                }
            } else {
                messageLock = false
                setTimeout(process,0)
            }
        }

        socket.onopen = function() {
            if (spec.onopen) {
                spec.onopen(clientCtx)
            }
        }

        socket.onmessage = function(event) {
            messages.push(event.data)
            if(messages.length === 1){
                setTimeout(process,0)
            }
        }

        socket.onerror = function(event){
            if(clientCtx.model === undefined){
                reject(event)
            }
        }
    })
}