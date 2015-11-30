'use strict'

const hyperion = require('../lib/hyperion').hyperion

describe('hyperion', () => {
    describe('#constructor()', () => {
        it('return no error', () => {
            const wssMock = {
                on: () => {}
            }

            const createChannel = (ctx, name) => {

                return Object.freeze({
                    send: (ctx, msg) => {},
                    leave: (ctx) => {}
                })
            }

            const createChannelLink = (ctx, channel) => {
                const clients = []

                return Object.freeze({
                    clients: clients,
                    join: (ctx) => {} //return Channel
                })
            }

            const rootObject = {
                lookupChannelLink: (ctx, name) => {}, //return ChannelLink
                publicChannelLinksList: (ctx) => {} //return ChannelLink Array
            }

            const server = hyperion({
                wss: wssMock,
                modelSpec: {
                    model : rootObject
                }
            })


        })
    })
})