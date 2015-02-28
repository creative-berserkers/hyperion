'use strict'
const validateMessage = require('../lib/message-validator').validateMessage
const expect = require('chai').expect
const assert = require('assert')

describe('message-validator', () => {
    describe('#validateMessage(msg)', () => {
        it('should throw missing type', () => {
            expect(validateMessage.bind(null,{
                invalid: 'invalid'
            })).to.throw('Missing type property.')
        })
        
        it('should throw wrong type', () => {
            expect(validateMessage.bind(null,{
                type: 'invalid'
            })).to.throw('Type must be one of [object-get,object-call].')
        })
    })
        
    describe('#validateMessage(msg) with msg.type === object-get', () => {
        
        it('should throw missing name', () => {
            expect(validateMessage.bind(null,{
                type: 'object-get'
            })).to.throw('Missing name property.')
        })
        
        it('should not throw', () => {
            const msg = {
                type: 'object-get',
                name: 'mySecretObject'
            } 
            expect(validateMessage(msg)).to.eql(msg)
        })
    })
    
    
    describe('#validateMessage(msg) with msg.type === object-call', () => {
        
        it('should throw missing name', () => {
            expect(validateMessage.bind(null,{
                type: 'object-call'
            })).to.throw('Missing name property.');
        })
        
        it('should throw missing path', () => {
            expect(validateMessage.bind(null,{
                type: 'object-call',
                name: 'mySecretObject'
            })).to.throw('Missing path property.')
        })
        
        it('should throw path is not array', () => {
            expect(validateMessage.bind(null,{
                type: 'object-call',
                name: 'mySecretObject',
                path: 'wrong-path'
            })).to.throw('Property path is not an array.')
        })
        
        it('should throw missing args', () => {
            expect(validateMessage.bind(null,{
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX']
            })).to.throw('Missing args property.')
        })
        
        it('should throw args is not array', () => {
            expect(validateMessage.bind(null,{
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX'],
                args: 'invalid args'
            })).to.throw('Property args is not an array.')
        })
        
        it('should throw missing id', () => {
            expect(validateMessage.bind(null,{
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX'],
                args: ['arg1']
            })).to.throw('Missing id property.')
        })
        
        it('should not throw', () => {
            const msg = {
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX'],
                args: ['arg1'],
                id: 'some_id34'
            }
            expect(validateMessage(msg)).to.eql(msg)
        })
    })
})