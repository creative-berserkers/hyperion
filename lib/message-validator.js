exports.validateMessage = (msg) =>{

    if (!msg.hasOwnProperty('type')) {
        throw new Error('Missing type property.')
    }
    if (msg.type !== 'object-get' && msg.type !== 'object-call') {
        throw new Error('Type must be one of [object-get,object-call].')
    }
    
    if(msg.type === 'object-get'){
    
        if (!msg.hasOwnProperty('name')) {
            throw new Error('Missing name property.')
        }
        
    } else if(msg.type === 'object-call'){
        if (!msg.hasOwnProperty('name')) {
            throw new Error('Missing name property.')
        }
        if (!msg.hasOwnProperty('path')) {
            throw new Error('Missing path property.')
        }
        if (!Array.isArray(msg.path)) {
            throw new Error('Property path is not an array.')
        }
        if (!msg.hasOwnProperty('args')) {
            throw new Error('Missing args property.')
        }
        if (!Array.isArray(msg.args)) {
            throw new Error('Property args is not an array.')
        }
        if (!msg.hasOwnProperty('id')) {
            throw new Error('Missing id property.')
        }
    }
    
    return msg
}