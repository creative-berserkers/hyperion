#!javascript
/**
 * Created by odrin on 02.11.2015.
 */
'use strict'

const chai = require('chai')
const expect = chai.expect
const createChangeFilter = require('../lib/createChangeFilter')

describe('createChangeFilter', ()=>{
    it('should pass',()=>{
        const changeFilter = createChangeFilter()

        const result = changeFilter.filter([])

        expect(result).to.eql([])
    })
})