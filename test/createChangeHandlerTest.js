/**
 * Created by odrin on 18.09.2015.
 */

'use strict'

const createChangeHandler = require('../lib/createChangeHandler')
const expect = require('chai').expect
const assert = require('assert')

describe('createChangeHandler', () => {
    describe('default usage', () => {
        it('creates a change handler', (done) => {
            const changeHandler = createChangeHandler()

            const nextCb = ()=>{
                done()
            }

            changeHandler.registerHandler({
                path: ['aaaa', 'bbbb', 'cccc'],
                onChange : (path, oldValue, newValue, next) => {
                    expect(path).to.eql(['aaaa', 'bbbb', 'cccc'])
                    expect(oldValue).to.eql(10)
                    expect(newValue).to.eql(11)
                    next()
                }
            })

            changeHandler.fireOnChangeEvent({
                path : ['aaaa', 'bbbb', 'cccc'],
                oldValue : 10,
                newValue : 11,
                next :  nextCb
            })

            expect(changeHandler).not.to.eql(undefined)
        })

        it('call handlers in order', (done) => {
            const changeHandler = createChangeHandler()

            const nextCb = ()=>{
                done()
            }

            changeHandler.registerHandler({
                path: ['aaaa', 'bbbb', 'cccc'],
                onChange : (path, oldValue, newValue, next) => {
                    expect(path).to.eql(['aaaa', 'bbbb', 'cccc'])
                    expect(oldValue).to.eql(10)
                    expect(newValue).to.eql(11)
                    next()
                }
            })

            changeHandler.registerHandler({
                path: ['aaaa', 'bbbb', 'cccc'],
                onChange : (path, oldValue, newValue, next) => {
                    expect(path).to.eql(['aaaa', 'bbbb', 'cccc'])
                    expect(oldValue).to.eql(10)
                    expect(newValue).to.eql(11)
                    next()
                }
            })

            changeHandler.fireOnChangeEvent({
                path : ['aaaa', 'bbbb', 'cccc'],
                oldValue : 10,
                newValue : 11,
                next :  nextCb
            })

            expect(changeHandler).not.to.eql(undefined)
        })
    })
})