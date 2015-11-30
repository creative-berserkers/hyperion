'use strict'

const Multiobserve = require('cb-multiobserve').Multiobserve
const guid = require('../lib/guid').guid

exports.createObjectStore = function (transformer) {
    
    const objectToRecord = new Map()
    const nameToRecord = new Map()
    const targetToObjects = new Map()
    
    const trfm = transformer || (()=>{})
    
    let statObject
    
    const self = Object.freeze({
        registerObject(obj, lifetime, name){
            let objRecord = objectToRecord.get(obj)
            if(objRecord === undefined){
                objRecord = Object.freeze({
                    name : (name || guid()),
                    bindings : new Set(),
                    object : obj,
                    methods : [],
                    lifetime : (lifetime || 0),
                    timerHandle : -1
                })
                objectToRecord.set(obj, objRecord)
                nameToRecord.set(objRecord.name, objRecord)
                
                Multiobserve.observe(obj,(changes) => {
                    trfm(objRecord, changes)
                },
                (node, path) => {
                    if(typeof node === 'function'){
                        objRecord.methods.push(path)
                    }
                    return true
                })
                if(statObject !== undefined){
                    statObject.objects++
                }
            } 
            return objRecord
        },
        unregisterObject(obj){
            const objRecord = objectToRecord.get(obj)
            if(objRecord !== undefined){
                Multiobserve.unobserve(objRecord.object)
                objectToRecord.delete(objRecord)
                nameToRecord.delete(objRecord)
                if(statObject !== undefined){
                    statObject.objects--
                }
            }
        },
        bind(object, ctx){
            let objRecord = objectToRecord.get(object)
            if(objRecord === undefined){
                objRecord = self.registerObject(object)
            }
            
            objRecord.bindings.add(ctx)
            const objects = targetToObjects.get(ctx)
            if(objects === undefined){
                targetToObjects.set(ctx, new Set([objRecord.object]))
                if(statObject !== undefined){
                    statObject.targets++
                }
            } else {
                objects.add(objRecord.object)
            }
            if(objRecord.timerHandle !== -1){
                clearTimeout(objRecord.timerHandle)
                objRecord.timerHandle = -1
            }
            
            return objRecord
        },
        unbind(object, ctx){
            const objRecord = objectToRecord.get(object)
            if(objRecord !== undefined){
                objRecord.bindings.delete(ctx)
                const objects = targetToObjects.get(ctx)
                if(objects !== undefined){
                    objects.delete(objRecord.object)
                    if(objects.size === 0 && statObject !== undefined){
                        statObject.targets--
                    }
                }
                if(objRecord.bindings.size === 0 && objRecord.lifetime !== 0){
                    if(objRecord.timerHandle !== -1) {
                        clearTimeout(objRecord.timerHandle)
                    }
                    objRecord.timerHandle = setTimeout(()=>{
                        self.unregisterObject(objRecord.object)
                        objRecord.timerHandle = -1
                    }, objRecord.lifetime)
                }
            }
            return objRecord
        },
        lookupByName(name){
            const objRecord = nameToRecord.get(name)
            if(objRecord !== undefined){
                return objRecord.object
            }
            return undefined
        },
        lookupByObject(object){
            const objRecord = objectToRecord.get(object)
            if(objRecord !== undefined){
                return objRecord
            }
            return undefined
        },
        allBindObjects(target){
            return targetToObjects.get(target)
        },
        getStatObject(){
            if(statObject === undefined){
                statObject = Object.freeze({
                    objects : Number(objectToRecord.size),
                    targets : Number(targetToObjects.size)
                })
                self.registerObject(statObject)
            }
            return statObject
        }
    })
    
    return self
}