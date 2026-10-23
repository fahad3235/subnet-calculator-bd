/* subnet-calculator-bd - pure IPv4 subnet logic (no DOM, no network).
   Works in browsers (sets window.Subnet) and in node (require). */
(function (root) {
  'use strict';

  function parseIp(str) {
    if (typeof str !== 'string') return { ok: false, error: 'E_NOT_STRING' };
    var s = str.trim();
    if (s.length === 0) return { ok: false, error: 'E_EMPTY' };
    var parts = s.split('.');
    if (parts.length !== 4) return { ok: false, error: 'E_OCTET_COUNT' };
    var octets = [];
    for (var i = 0; i < 4; i++) {
      var p = parts[i];
      if (!/^[0-9]+$/.test(p)) return { ok: false, error: 'E_BAD_OCTET' };
      var n = parseInt(p, 10);
      if (n < 0 || n > 255) return { ok: false, error: 'E_OCTET_RANGE' };
      if (p.length > 1 && p[0] === '0') return { ok: false, error: 'E_LEADING_ZERO' };
      octets.push(n);
    }
    return { ok: true, octets: octets, value: toInt(octets) };
  }

  function toInt(o) {
    return ((o[0] * 256 + o[1]) * 256 + o[2]) * 256 + o[3];
  }

  function toOctets(v) {
    v = v >>> 0;
    return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  }

  function toDotted(v) {
    return toOctets(v).join('.');
  }

  function toBinaryOctet(n) {
    var s = n.toString(2);
    while (s.length < 8) s = '0' + s;
    return s;
  }

  function toBinary(v) {
    return toOctets(v).map(toBinaryOctet).join('.');
  }

  function maskFromPrefix(prefix) {
    if (prefix === 0) return 0;
    return ((0xFFFFFFFF << (32 - prefix)) >>> 0);
  }

  function parsePrefix(str) {
    if (typeof str !== 'string') return { ok: false, error: 'E_NOT_STRING' };
    var s = str.trim();
    if (!/^[0-9]+$/.test(s)) return { ok: false, error: 'E_BAD_PREFIX' };
    var p = parseInt(s, 10);
    if (p < 0 || p > 32) return { ok: false, error: 'E_PREFIX_RANGE' };
    return { ok: true, prefix: p };
  }

  function parseCidr(str) {
    if (typeof str !== 'string') return { ok: false, error: 'E_NOT_STRING' };
    var s = str.trim();
    var parts = s.split('/');
    if (parts.length !== 2) return { ok: false, error: 'E_CIDR_FORMAT' };
    var ip = parseIp(parts[0]);
    if (!ip.ok) return ip;
    var pf = parsePrefix(parts[1]);
    if (!pf.ok) return pf;
    return { ok: true, ip: ip.value, prefix: pf.prefix };
  }

  function classifyIp(v) {
    var o = toOctets(v);
    if (v === 0) return { tag: 'UNSPECIFIED', rfc: 'RFC 5735 (0.0.0.0/8)' };
    if (o[0] === 127) return { tag: 'LOOPBACK', rfc: 'RFC 1122 (127.0.0.0/8)' };
    if (o[0] === 10) return { tag: 'PRIVATE', rfc: 'RFC 1918 (10.0.0.0/8)' };
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return { tag: 'PRIVATE', rfc: 'RFC 1918 (172.16.0.0/12)' };
    if (o[0] === 192 && o[1] === 168) return { tag: 'PRIVATE', rfc: 'RFC 1918 (192.168.0.0/16)' };
    if (o[0] === 169 && o[1] === 254) return { tag: 'LINK_LOCAL', rfc: 'RFC 3927 (169.254.0.0/16)' };
    if (o[0] >= 224 && o[0] <= 239) return { tag: 'MULTICAST', rfc: 'RFC 5771 (224.0.0.0/4)' };
    if (o[0] >= 240) return { tag: 'RESERVED', rfc: 'RFC 1112 Class E (240.0.0.0/4)' };
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return { tag: 'CGNAT', rfc: 'RFC 6598 (100.64.0.0/10)' };
    return { tag: 'PUBLIC', rfc: '' };
  }

  function legacyClass(v) {
    var first = (v >>> 24) & 255;
    if (first < 128) return 'A';
    if (first < 192) return 'B';
    if (first < 224) return 'C';
    if (first < 240) return 'D';
    return 'E';
  }

  function defaultPrefixForClass(v) {
    var c = legacyClass(v);
    if (c === 'A') return 8;
    if (c === 'B') return 16;
    if (c === 'C') return 24;
    return null;
  }

  function computeSubnet(ipValue, prefix) {
    var mask = maskFromPrefix(prefix);
    var network = (ipValue & mask) >>> 0;
    var broadcast = (network | (~mask >>> 0)) >>> 0;
    var wildcard = (~mask) >>> 0;
    var hostBits = 32 - prefix;
    var total = Math.pow(2, hostBits);
    var usable, firstHost, lastHost, note;
    if (prefix === 32) {
      usable = 1; firstHost = ipValue; lastHost = ipValue; note = 'HOST_ROUTE';
    } else if (prefix === 31) {
      usable = 2; firstHost = network; lastHost = broadcast; note = 'RFC3021';
    } else {
      usable = total - 2; firstHost = (network + 1) >>> 0; lastHost = (broadcast - 1) >>> 0; note = '';
    }
    return {
      ip: ipValue, prefix: prefix,
      mask: mask, maskDotted: toDotted(mask), maskBinary: toBinary(mask),
      wildcard: wildcard, wildcardDotted: toDotted(wildcard),
      network: network, networkDotted: toDotted(network),
      broadcast: broadcast, broadcastDotted: toDotted(broadcast),
      totalAddresses: total, usableHosts: usable,
      firstHost: firstHost, firstHostDotted: toDotted(firstHost),
      lastHost: lastHost, lastHostDotted: toDotted(lastHost),
      hostBits: hostBits, note: note,
      classInfo: classifyIp(ipValue), legacyClass: legacyClass(ipValue),
      defaultPrefix: defaultPrefixForClass(ipValue)
    };
  }

  function splitSubnet(networkValue, prefix, target) {
    if (typeof target.count === 'number') {
      if (target.count < 1 || target.count > 65536 || Math.floor(target.count) !== target.count)
        return { ok: false, error: 'E_SPLIT_COUNT' };
      var bits = Math.ceil(Math.log2(target.count));
      if (bits < 1) bits = 1;
      var newPrefix = prefix + bits;
      if (newPrefix > 32) return { ok: false, error: 'E_SPLIT_TOO_MANY' };
      return splitInto(networkValue, prefix, newPrefix, target.count);
    }
    var np = target.prefix;
    if (typeof np !== 'number' || np < prefix || np > 32 || Math.floor(np) !== np)
      return { ok: false, error: 'E_SPLIT_PREFIX' };
    var count = Math.pow(2, np - prefix);
    return splitInto(networkValue, prefix, np, count);
  }

  function splitInto(networkValue, prefix, newPrefix, count) {
    var size = Math.pow(2, 32 - newPrefix);
    var rows = [];
    var capped = count > 256;
    var n = capped ? 256 : count;
    for (var i = 0; i < n; i++) {
      var net = (networkValue + i * size) >>> 0;
      var bc = (net + size - 1) >>> 0;
      var first = newPrefix >= 31 ? net : (net + 1) >>> 0;
      var last = newPrefix >= 31 ? bc : (bc - 1) >>> 0;
      rows.push({
        index: i + 1,
        network: toDotted(net), cidr: toDotted(net) + '/' + newPrefix,
        first: toDotted(first), last: toDotted(last), broadcast: toDotted(bc)
      });
    }
    return { ok: true, newPrefix: newPrefix, total: count, capped: capped, rows: rows };
  }

  var Subnet = {
    parseIp: parseIp, parsePrefix: parsePrefix, parseCidr: parseCidr,
    toInt: toInt, toOctets: toOctets, toDotted: toDotted, toBinary: toBinary,
    maskFromPrefix: maskFromPrefix, classifyIp: classifyIp,
    legacyClass: legacyClass, defaultPrefixForClass: defaultPrefixForClass,
    computeSubnet: computeSubnet, splitSubnet: splitSubnet
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Subnet;
  else root.Subnet = Subnet;
})(typeof window !== 'undefined' ? window : globalThis);
