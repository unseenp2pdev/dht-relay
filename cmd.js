#!/usr/bin/env node

var crypto = require('crypto')
var argv = require('minimist')(process.argv.slice(2), {
  alias: {
    p: 'port',
    d: 'dht'
  },
  default: {
    port: 25778
  },
  boolean: [
    'dht'
  ]
})

var get = require('simple-get')
var publicAddress = function (cb) {
  get.concat('http://api.ipify.org?format=json', function (err, body, resp) {
    if (err) return cb(err)

    try {
      var ip = JSON.parse(body).ip
      cb(null, ip)
    } catch (err) {
      cb(err)
    }
  })
}

var createRelay = argv.dht ? require('./dht-relay') : require('./relay').createServer
var port = Number(argv.port) || 25778

publicAddress(function (err, ip) {
  var nodeId = ip && crypto.createHash('sha256')
      .update(ip + ':' + port)
      .digest()
      .slice(0, 20)

  var udpProxy = createRelay(port, nodeId)
  console.log('Running on port', port)
})
