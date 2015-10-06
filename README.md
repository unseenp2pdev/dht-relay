# dht-relay

bittorrent dht node that also functions as a udp relay, for getting around symmetric NATs

this module is used by [Tradle](https://github.com/tradle/tim)

## Usage

#### Command line

```bash
./cmd.js 25778 # port to run on
```

#### API

```js
var Relay = require('dht-relay')
var relayAddr = {
  // specify relay ip:port
  address: '127.0.0.1',
  port: 25778
}

// use Relay.createServerWithDHT
// to limit connecting to clients to nodes known to internal DHT
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
```

### Todo

encode fwd'd messages to make them more compact (e.g. right now 'FWD:' and ip:port are unencoded)
