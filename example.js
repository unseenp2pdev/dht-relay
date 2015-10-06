var Relay = require('./')
var relayAddr = {
  // specify relay ip:port
  address: '127.0.0.1',
  port: 25778
}

var server = Relay.createServer(relayAddr.port)
var clientA = Relay.createClient(relayAddr)
clientA.bind()
var clientB = Relay.createClient(relayAddr)
clientB.bind()

var togo = 0
;[clientA, clientB, server].forEach(function (n, i) {
  togo++
  n.once('listening', start)
})

clientB.on('message', function (msg, rinfo) {
  // rinfo should be same as relayAddr
  console.log(msg.toString())
})

function start () {
  if (--togo === 0) {
    // message goes through relay
    clientA.send(new Buffer('hey'), 0, 3, clientB.address().port, '127.0.0.1')
  }
}
