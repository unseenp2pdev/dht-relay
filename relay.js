var dgram = require('dgram')
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var reemit = require('re-emitter')
var fwdRegex = /^FWD:([^:]+):(\d+):(.*)$/
var noop = function () {}
var MAGIC = 53243

module.exports = {
  createClient: createClient,
  createServer: createServer,
  encodePacket: encodePacket,
  decodePacket: decodePacket
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
    if (offset || len !== data.length) throw new Error('not supported')

    data = encodePacket(data, {
      address: address,
      port: port
    })

    socket.send(data, 0, data.length, proxy.port, proxy.address, callback || noop)
  }

  // hack
  var filters = []
  if (socket.filterMessages) {
    emitter.filterMessages = filters.push.bind(filters)
  }

  socket.on('message', function (data, rinfo) {
    if (rinfo.address !== proxy.address || rinfo.port !== proxy.port) return

    var packet = decodePacket(data)
    data = packet.data
    if (!filters.every(function (f) { return f(data, rinfo) })) {
      return
    }

    emitter.emit('message', data, extend(rinfo, {
      address: packet.address,
      port: packet.port
    }))
  })

  ;['bind', 'address', 'close'].forEach(function (method) {
    emitter[method] = socket[method].bind(socket)
  })

  reemit(socket, emitter, ['listening', 'error', 'close'])
  return emitter
}

function encodePacket (data, rinfo) {
  var buf = new Buffer(data.length + 8)
  buf.writeUInt16BE(MAGIC, 0)
  rinfo.address.split('.')
    .map(Number)
    .forEach(function (n, i) {
      buf.writeUInt8(n, i + 2)
    })

  buf.writeUInt16BE(rinfo.port, 6)
  data.copy(buf, 8)
  return buf
}

function decodePacket (buf) {
  if (buf.readUInt16BE(0) !== MAGIC) return

  var addr = []
  for (var i = 0; i < 4; i++) {
    addr.push(buf.readUInt8(i + 2))
  }

  return {
    address: addr.join('.'),
    port: buf.readUInt16BE(6),
    data: buf.slice(8)
  }
}
