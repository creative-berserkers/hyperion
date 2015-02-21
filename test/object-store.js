'use strict'
const createObjectStore = require('../lib/object-store').createObjectStore
const expect = require('chai').expect
const assert = require('assert')

describe('object-store', () => {
    describe('#createObjectStore()', () => {
        it('return result - missing type', () => {
            const store = createObjectStore()
        })
    })
})