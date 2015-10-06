var dgram = require('dgram')
var fwdRegex = /^FWD:([^:]+):(\d+):(.*)$/
var noop = function () {}

module.exports = {
  createClient: createClient,
  createServer: createServer
}

function createServer (port) {
  var proxy = dgram.createSocket('udp4')
  proxy.bind(port)
  proxy.on('message', function (data, rinfo) {
    var packet = decodePacket(data)
    if (packet) {
      proxy.send(packet.data, 0, packet.data.length, Number(packet.port), packet.address)
    }
  })

  return proxy
}

function createClient (socket, proxy) {
  if (!proxy) {
    proxy = socket
    socket = null
  }

  socket = socket || dgram.createSocket('udp4')

  var send = socket.send
  socket.send = function (data, offset, len, port, address, callback) {
    if (offset) throw new Error('not supported')

    data = encodePacket(data, {
      address: address,
      port: port
    })

    send.call(this, data, 0, data.length, proxy.port, proxy.address, callback || noop)
  }

  return socket
}

function encodePacket (data, rinfo) {
  return Buffer.concat([
    new Buffer('FWD:' + rinfo.address + ':' + rinfo.port + ':'),
    data
  ])
}

function decodePacket (buf) {
  var match = fwdRegex.exec(buf)
  if (match) {
    return {
      address: match[1],
      port: Number(match[2]),
      data: new Buffer(match[3])
    }
  }
}
