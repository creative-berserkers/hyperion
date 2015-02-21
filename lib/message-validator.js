function result(isValid, errCode, errDesc) {
    return {
        isValid, errCode, errDesc
    }
}

exports.validateMessage = (msg) =>{

    if (!msg.hasOwnProperty('type')) {
        return result(false, 1, 'Missing type property')
    }
    if (msg.type !== 'object-get' && msg.type !== 'object-call') {
        return result(false, 2, 'Type must be one of [object-get,object-call]')
    }
    
    if(msg.type === 'object-get'){
    
        if (!msg.hasOwnProperty('name')) {
            return result(false, 3, 'Missing name property')
        }
        
        return result(true)
        
    } else if(msg.type === 'object-call'){
        if (!msg.hasOwnProperty('name')) {
            return result(false, 3, 'Missing name property')
        }
        if (!msg.hasOwnProperty('path')) {
            return result(false, 4, 'Missing path property')
        }
        if (!Array.isArray(msg.path)) {
            return result(false, 5, 'Property path is not an array')
        }
        if (!msg.hasOwnProperty('args')) {
            return result(false, 6, 'Missing args property')
        }
        if (!Array.isArray(msg.args)) {
            return result(false, 7, 'Property args is not an array')
        }
        if (!msg.hasOwnProperty('id')) {
            return result(false, 8, 'Missing id property')
        }
        return result(true)
    }
}