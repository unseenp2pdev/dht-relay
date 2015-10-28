// require('sock-plex')
var crypto = require('crypto')
var test = require('tape')
var Relay = require('../relay')
var basePort = 12345

test('encode, decode', function (t) {
  var msg = new Buffer(crypto.randomBytes(100))
  var to = { address: '127.0.0.1', port: 10000 }
  var encoded = Relay.encodePacket(msg, to)
  var decoded = Relay.decodePacket(encoded)
  t.deepEqual(decoded.data, msg)
  t.equal(decoded.address, to.address)
  t.equal(decoded.port, to.port)
  t.end()
})

test('plain relay', function (t) {
  // create relay server
  // connect 2 clients through it
  // restart clients
  // reconnect

  var restarted
  var relayAddr = {
    port: basePort++,
    address: '127.0.0.1'
  }

  var a, b
  var togo
  var msg = new Buffer('hey')
  var server = Relay.createServer(relayAddr.port)
  server.on('listening', init)

  function init () {
    togo = 2
    a = Relay.createClient(relayAddr)
    a.bind(basePort++, '127.0.0.1', onlistening)

    b = Relay.createClient(relayAddr)
    b.bind(basePort++, '127.0.0.1', onlistening)
  }

  function onlistening () {
    if (--togo === 0) {
      talk()
    }
  }

  function die () {
    if (--togo) return

    a.close()
    b.close()
    if (restarted) {
      server.close()
      t.end()
      return
    }

    restarted = true
    init()
  }

  function talk () {
    togo = 2
    ;[a, b].forEach(function (s) {
      var other = s === a ? b : a
      s.send(msg, 0, msg.length, other.address().port, '127.0.0.1')
      s.on('message', function (data, rinfo) {
        t.equal(rinfo.address, other.address().address)
        t.equal(rinfo.port, other.address().port)
        t.deepEqual(data, msg)
        die()
      })
    })
  }
})

test('don\'t use proxy for local destination addresses', function (t) {
  var relayAddr = {
    port: basePort++,
    address: '127.0.0.1'
  }

  var a, b
  var togo
  var msg = new Buffer('hey')
  var server = Relay.createServer(relayAddr.port)
  server.on('listening', init)
  server.on('message', t.fail)

  function init () {
    togo = 2
    a = Relay.createClient(relayAddr, true)
    a.bind(basePort++, '127.0.0.1', onlistening)

    b = Relay.createClient(relayAddr, true)
    b.bind(basePort++, '127.0.0.1', onlistening)
  }

  function onlistening () {
    if (--togo === 0) {
      talk()
    }
  }

  function talk () {
    togo = 2
    ;[a, b].forEach(function (s) {
      var other = s === a ? b : a
      s.send(msg, 0, msg.length, other.address().port, '127.0.0.1')
      s.on('message', function (data, rinfo) {
        t.equal(rinfo.address, other.address().address)
        t.equal(rinfo.port, other.address().port)
        t.deepEqual(data, msg)
        a.close()
        b.close()
        server.close()
        t.end()
      })
    })
  }
})
