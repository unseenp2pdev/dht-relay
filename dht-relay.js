
require('sock-plex')
var DHT = require('@tradle/bittorrent-dht')
// var publicAddress = require('bittorrent-dht/lib/public-address')
var Relay = require('./relay')
var DHT_MSG_REGEX = /^d1:.?d2:id20:/
var DHT_ERR_REGEX = /^d1:eli20/

module.exports = function createServer (port, nodeId) {
  var relay = Relay.createServer(port)
  relay.filterMessages(function (msg, rinfo) {
    // console.log(isInDHT(rinfo))
    return !isDHTMessage(msg)
  })

  var dht = new DHT({
    bootstrap: false,
    nodeId: nodeId
  })

  dht.listen(port)
  dht.socket.filterMessages(function (msg) {
    return isDHTMessage(msg)
  })

  return relay

  function isInDHT (rinfo) {
    return dht.nodes.bucket.some(function (n) {
      return n.addr === rinfo.address + ':' + rinfo.port
    })
  }
}

function isDHTMessage (msg) {
  return DHT_MSG_REGEX.test(msg) || DHT_ERR_REGEX.test(msg)
}
