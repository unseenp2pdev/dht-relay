// require('sock-plex')
var test = require('tape')
var Relay = require('../relay')
var basePort = 12345

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
    a.bind(basePort++, onlistening)

    b = Relay.createClient(relayAddr)
    b.bind(basePort++, onlistening)
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
        t.equal(rinfo.address, relayAddr.address)
        t.equal(rinfo.port, relayAddr.port)
        t.deepEqual(data, msg)
        die()
      })
    })
  }
})
