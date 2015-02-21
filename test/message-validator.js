'use strict'
const validateMessage = require('../lib/message-validator').validateMessage
const expect = require('chai').expect
const assert = require('assert')

describe('message-validator', () => {
    describe('#validateMessage(msg)', () => {
        it('return result - missing type', () => {
            const result = validateMessage({
                invalid: 'invalid'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(1)
            expect(result.errDesc).to.eql('Missing type property')
        })
        
        it('return result - wrong type', () => {
            const result = validateMessage({
                type: 'invalid'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(2)
            expect(result.errDesc).to.eql('Type must be one of [object-get,object-call]')
        })
    })
        
    describe('#validateMessage(msg) with msg.type === object-get', () => {
        
        it('return result - missing name', () => {
            const result = validateMessage({
                type: 'object-get'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(3)
            expect(result.errDesc).to.eql('Missing name property')
        })
        
        it('return result - ok', () => {
            const result = validateMessage({
                type: 'object-get',
                name: 'mySecretObject'
            })

            expect(result.isValid).to.eql(true)
            expect(result.errCode).to.eql(undefined)
            expect(result.errDesc).to.eql(undefined)
        })
    })
    
    
    describe('#validateMessage(msg) with msg.type === object-call', () => {
        
        it('return result - missing name', () => {
            const result = validateMessage({
                type: 'object-call'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(3)
            expect(result.errDesc).to.eql('Missing name property')
        })
        
        it('return result - missing path', () => {
            const result = validateMessage({
                type: 'object-call',
                name: 'mySecretObject'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(4)
            expect(result.errDesc).to.eql('Missing path property')
        })
        
        it('return result - path is not array', () => {
            const result = validateMessage({
                type: 'object-call',
                name: 'mySecretObject',
                path: 'wrong-path'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(5)
            expect(result.errDesc).to.eql('Property path is not an array')
        })
        
        it('return result - missing args', () => {
            const result = validateMessage({
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX']
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(6)
            expect(result.errDesc).to.eql('Missing args property')
        })
        
        it('return result - args is not array', () => {
            const result = validateMessage({
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX'],
                args: 'invalid args'
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(7)
            expect(result.errDesc).to.eql('Property args is not an array')
        })
        
        it('return result - missing id', () => {
            const result = validateMessage({
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX'],
                args: ['arg1']
            })

            expect(result.isValid).to.eql(false)
            expect(result.errCode).to.eql(8)
            expect(result.errDesc).to.eql('Missing id property')
        })
        
        it('return result - ok', () => {
            const result = validateMessage({
                type: 'object-call',
                name: 'mySecretObject',
                path: ['propX'],
                args: ['arg1'],
                id: 'some_id34'
            })

            expect(result.isValid).to.eql(true)
            expect(result.errCode).to.eql(undefined)
            expect(result.errDesc).to.eql(undefined)
        })
    })
})