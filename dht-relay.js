
require('sock-plex')
var DHT = require('bittorrent-dht')
var Relay = require('./relay')

module.exports = function createServer (port) {
  var relay = Relay.createServer(port)
  relay.filterMessages(function (msg, rinfo) {
    // console.log(isInDHT(rinfo))
    return !/^d1:.?d2:id20:/.test(msg)
  })

  var dht = new DHT({
    bootstrap: false
  })

  dht.listen(port)
  dht.socket.filterMessages(function (msg) {
    return /^d1:.?d2:id20:/.test(msg)
  })

  return relay

  function isInDHT (rinfo) {
    return dht.nodes.bucket.some(function (n) {
      return n.addr === rinfo.address + ':' + rinfo.port
    })
  }
}
