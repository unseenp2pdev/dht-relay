var dgram = require('dgram')
var EventEmitter = require('events').EventEmitter
var reemit = require('re-emitter')
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
    if (!packet) return

    var toPort = packet.port
    var toAddress = packet.address
    packet.port = rinfo.port
    packet.address = rinfo.address
    data = encodePacket(packet.data, rinfo)
    proxy.send(data, 0, data.length, toPort, toAddress)
  })

  return proxy
}

function createClient (socket, proxy) {
  if (!proxy) {
    proxy = socket
    socket = null
  }

  socket = socket || dgram.createSocket('udp4')

  var emitter = new EventEmitter()
  emitter.send = function (data, offset, len, port, address, callback) {
    if (offset) throw new Error('not supported')

    data = encodePacket(data, {
      address: address,
      port: port
    })

    socket.send(data, 0, data.length, proxy.port, proxy.address, callback || noop)
  }

  socket.on('message', function (data, rinfo) {
    if (rinfo.address !== proxy.address || rinfo.port !== proxy.port) return

    var packet = decodePacket(data)
    emitter.emit('message', packet.data, {
      address: packet.address,
      port: packet.port
    })
  })

  ;['bind', 'address', 'close'].forEach(function (method) {
    emitter[method] = socket[method].bind(socket)
  })

  reemit(socket, emitter, ['listening', 'error', 'close'])
  return emitter
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
