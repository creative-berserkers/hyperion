'use strict'

const createChangeHandler = require('./createChangeHandler')

module.exports = function createHyperionClient(spec) {
    if(spec.onIndex === undefined) {
        throw new Error('onIndex must be callback')
    }
    const socket = spec.socket || new WebSocket(spec.host)
    const response = Object.create(null,{})
    const objects = Object.create(null,{})
    const changeHandler = createChangeHandler()
    let id = 0
    let index
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
                    curr[node] = change.value
                }
                curr = curr[node]
            })
            changeHandler.fireOnChangeEvent({
                path: change.path,
                newValue : change.value,
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
        nextCb = ()=>{
            let entry = changes.next()
            if(entry.done) {
                return next()
            } else {
                return applyChange(object, entry, nextCb)
            }
        }
        nextCb()
    }

    const clientCtx = {
        model: function() {
            return index
        },
        createChangeListener : changeHandler.registerHandler
    }

    return new Promise(function(resolve, reject) {

        function process(){
            if(messageLock === true) {
                return
            }
            messageLock = true
            if(messages.length >= 1){
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
                        index = msg.result
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
            if(index === undefined){
                reject(event)
            }
        }
    })
}