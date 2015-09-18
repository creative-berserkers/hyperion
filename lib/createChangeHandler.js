/**
 * Created by odrin on 18.09.2015.
 */
'use strict'

module.exports = function createChangeHandler(){

    const listeners = {}
    const onChangeId = Symbol()

    function findParentForPath(path, index, parent) {
        if(index === path.length - 1){
            return parent
        } else {
            if(parent[path[index]] === undefined){
                parent[path[index]] = {}
            }
            return findParentForPath(path, index + 1, parent[path[index]])
        }
    }

    return {
        registerHandler(spec){
            const path = spec.path
            const onChange = spec.onChange

            if(path.length === 0 || onChange === undefined){
                return
            }

            const parent = findParentForPath(path, 0, listeners)
            if(parent[path[path.length-1]] === undefined){
                parent[path[path.length-1]] = {}
            }
            if(parent[path[path.length-1]][onChangeId] === undefined){
                parent[path[path.length-1]][onChangeId] = []
            }
            parent[path[path.length-1]][onChangeId].push(onChange)
        },
        fireOnChangeEvent(spec){
            const path = spec.path
            const oldValue = spec.oldValue
            const newValue = spec.newValue
            const next = spec.next

            if(path.length === 0 || oldValue === undefined || newValue === undefined){
                next()
                return
            }

            const parent = findParentForPath(path, 0 , listeners)
            if(parent[path[path.length-1]] === undefined){
                next()
                return
            }
            if(parent[path[path.length-1]][onChangeId] === undefined){
                next()
                return
            }
            const entrIter = parent[path[path.length-1]][onChangeId].entries()

            let nextCb

            nextCb = ()=>{
                let entry = entrIter.next()
                if(entry.done) {
                    return next()
                } else {
                    return entry.value[1](path, oldValue, newValue, nextCb)
                }
            }
            nextCb()
        }

    }
}