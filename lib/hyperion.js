'use strict'

const Multiobserve = require('cb-multiobserve').Multiobserve
const validateMessage = require('../lib/message-validator').validateMessage
const createObjectStore = require('../lib/object-store').createObjectStore
const guid = require('../lib/guid').guid

exports.createHyperionClient = require('./createHyperionClient')
exports.hyperion = function(spec) {

    if(spec.wss === undefined){
        throw new Error('No socket found, please specify wss')
    }
    
    function send(ws, object) {
        ws.send(JSON.stringify(object))
    }

    const objectStore = createObjectStore((objRecord, changes) => {
        objRecord.bindings.forEach((ctx) => {
            const filteredChanges = spec.modelSpec.onChanges(ctx,changes)
            const msg = JSON.stringify({
                type: 'object-broadcast',
                name: objRecord.name,
                changes: filteredChanges
            })
            ctx.ws.send(msg)
        })
    })
    const newConnectionFn = spec.newConnectionFn
    const errorFn = spec.errorFn
    const wss = spec.wss
    const model = spec.modelSpec.model
    
    objectStore.registerObject(model,0, 'index')

    wss.on('connection', (ws) => {
        if (typeof newConnectionFn === 'function') {
            newConnectionFn(ws)
        }

        const name = guid()
        const store = new Map()
        const ctx = Object.freeze({
            name,
            model,
            ws,
            emit: (adress, msg) => {
                ws.send(ws, {
                    type: 'message',
                    adress: adress,
                    message: msg
                })
            },
            sync: (object) =>{
                objectStore.bind(object, ctx)
            },
            unsync: (object) => {
                objectStore.unbind(object, ctx)
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
            },
            set :(key, value)=>{
                return store.set(key, value)
            },
            get : (key) => {
                return store.get(key)
            },
            has : (key) =>{
                return store.has(key)
            }
        })

        ws.on('message', (message) => {
            try {
                const validMessage = validateMessage(JSON.parse(message))
                if (validMessage.type === 'object-call') {
                    handleObjectCall(ws, ctx, validMessage)
                }
            }
            catch (e) {
                console.log(e)
            }
        })

        ws.on('close', function close() {
            spec.modelSpec.onLeave(ctx)
            objectStore.allBindObjects(ctx).forEach((ob) => {
                objectStore.unbind(ob, ctx)
            })
        })
        spec.modelSpec.onJoin(ctx)
        objectStore.bind(model, ctx)
        handleMethodResult(ws, 'index' , -1, model)
    })


    function handleObjectCall(ws,ctx, msg) {
        const obj= objectStore.lookupByName(msg.name)
        if (obj === undefined) {
            return
        }

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