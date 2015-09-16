const Multiobserve = require('cb-multiobserve').Multiobserve
const validateMessage = require('../lib/message-validator').validateMessage
const createObjectStore = require('../lib/object-store').createObjectStore
const guid = require('../lib/guid').guid

exports.hyperion = function(spec) {

    if(spec.wss === undefined){
        throw new Error('No socket found, please specify wss')
    }
    
    function send(ws, object) {
        ws.send(JSON.stringify(object))
    }

    const objectStore = createObjectStore((objRecord, changes) => {
        const msg = JSON.stringify({
            type: 'object-broadcast',
            name: objRecord.name,
            changes: changes
        })
        objRecord.bindings.forEach((ws) => {
            ws.send(msg)
        })
    })
    const newConnectionFn = spec.newConnectionFn
    const errorFn = spec.errorFn
    const wss = spec.wss
    const index = spec.index
    
    objectStore.registerObject(index,0, 'index')

    wss.on('connection', (ws) => {
        if (typeof newConnectionFn === 'function') {
            newConnectionFn(ws)
        }

        objectStore.bind(index, ws)

        const name = guid()
        const ctx = Object.freeze({
            name,
            sendMessage: (adress, msg) => {
                ws.send(ws, {
                    type: 'message',
                    adress: adress,
                    message: msg
                })
            },
            sync: (object) =>{
                objectStore.bind(object, ws)
            },
            unsync: (object) => {
                objectStore.unbind(object, ws)
            },
            onDisconnect: (callback)=>{
                ws.on('close', function close() {
                    callback()
                })
            },
            disconnect: ()=>{
                if(ws._socket !== null){
                    ws._socket.server.close()
                }
            }
        })

        ws.on('message', (message) => {
            try {
                var validMessage = validateMessage(JSON.parse(message))
                if (validMessage.type === 'object-call') {
                    handleObjectCall(ws, ctx, validMessage)
                }
            }
            catch (e) {
                console.log(e)
            }
        })

        ws.on('close', function close() {
            objectStore.allBindObjects(ws).forEach((ob) => {
                objectStore.unbind(ob, ws)
            })
        })
        
        handleMethodResult(ws, 'index' , -1, index)
    })


    function handleObjectCall(ws,ctx, msg) {
        var obj= objectStore.lookupByName(msg.name)
        if (obj === undefined) return

        const node = Multiobserve.findNode(obj, msg.path)

        if (node !== undefined && typeof node === 'function') {
            const result = node.apply(obj, [ctx].concat(msg.args))
            if (result instanceof Promise) {
                result.then(function(result) {
                    handleMethodResult(ws, msg.name, msg.id, result)
                })
            }
            else {
                handleMethodResult(ws, msg.name, msg.id, result)
            }
        }
    }

    function handleMethodResult(ws, name, id, result) {
        const objectRecord = objectStore.lookupByObject(result)
        if (objectRecord !== undefined) {
            send(ws, {
                type: 'call-response',
                name: name,
                id: id,
                synced: true,
                methods: objectRecord.methods,
                result: objectRecord.object,
                resultName: objectRecord.name
            })
        } else {
            send(ws, {
                type: 'call-response',
                name: name,
                id: id,
                synced: false,
                result: result
            })
        }
    }

    return Object.freeze({
        syncObject(object, lifetime){
            return objectStore.registerObject(object, lifetime)
        },
        unsyncObject(object){
            return objectStore.unregisterObject(object)
        }
    })
}