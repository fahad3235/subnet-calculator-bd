/* Node unit tests for js/subnet.js — run: node tests/subnet.test.js */
const S = require('../js/subnet.js');
let pass = 0, fail = 0;
function eq(a, b, name) {
  if (a === b) { pass++; }
  else { fail++; console.log('FAIL', name, '=> got', JSON.stringify(a), 'want', JSON.stringify(b)); }
}
function ok(x, name) { eq(!!x, true, name); }
function errCode(r, code, name) { eq(r.ok, false, name + ':ok'); eq(r.error, code, name + ':code'); }

// --- parseIp ---
eq(S.parseIp('192.168.1.10').value, 3232235786, 'parseIp basic');
ok(S.parseIp('0.0.0.0').ok, 'parseIp zeros');
ok(S.parseIp('255.255.255.255').ok, 'parseIp max');
ok(S.parseIp('  10.0.0.1  ').ok, 'parseIp trims');
errCode(S.parseIp('1.2.3'), 'E_OCTET_COUNT', 'parseIp short');
errCode(S.parseIp('1.2.3.4.5'), 'E_OCTET_COUNT', 'parseIp long');
errCode(S.parseIp('1.2.3.256'), 'E_OCTET_RANGE', 'parseIp range');
errCode(S.parseIp('1.2.3.-1'), 'E_BAD_OCTET', 'parseIp negative');
errCode(S.parseIp('1.2.3.04'), 'E_LEADING_ZERO', 'parseIp leading zero');
errCode(S.parseIp('1.2.3.x'), 'E_BAD_OCTET', 'parseIp alpha');
errCode(S.parseIp(''), 'E_EMPTY', 'parseIp empty');
errCode(S.parseIp('fe80::1'), 'E_OCTET_COUNT', 'parseIp ipv6 rejected');

// --- parsePrefix / parseCidr ---
eq(S.parsePrefix('24').prefix, 24, 'parsePrefix 24');
eq(S.parsePrefix('0').prefix, 0, 'parsePrefix 0');
errCode(S.parsePrefix('33'), 'E_PREFIX_RANGE', 'parsePrefix 33');
errCode(S.parsePrefix('2a'), 'E_BAD_PREFIX', 'parsePrefix alpha');
const c = S.parseCidr('10.0.0.5/8');
ok(c.ok && c.ip === S.parseIp('10.0.0.5').value && c.prefix === 8, 'parseCidr full');
errCode(S.parseCidr('10.0.0.5'), 'E_CIDR_FORMAT', 'parseCidr no slash');
errCode(S.parseCidr('10.0.0.5/8/1'), 'E_CIDR_FORMAT', 'parseCidr double slash');

// --- conversions ---
eq(S.toDotted(0xC0A8010A), '192.168.1.10', 'toDotted');
eq(S.toBinary(0xFF000000), '11111111.00000000.00000000.00000000', 'toBinary');
eq(S.toDotted(S.maskFromPrefix(24)), '255.255.255.0', 'mask /24');
eq(S.toDotted(S.maskFromPrefix(0)), '0.0.0.0', 'mask /0');
eq(S.toDotted(S.maskFromPrefix(32)), '255.255.255.255', 'mask /32');
eq(S.toDotted(S.maskFromPrefix(30)), '255.255.255.252', 'mask /30');

// --- computeSubnet: 192.168.1.10/24 ---
let r = S.computeSubnet(S.parseIp('192.168.1.10').value, 24);
eq(r.networkDotted, '192.168.1.0', 'net 24');
eq(r.broadcastDotted, '192.168.1.255', 'bcast 24');
eq(r.totalAddresses, 256, 'total 24');
eq(r.usableHosts, 254, 'usable 24');
eq(r.firstHostDotted, '192.168.1.1', 'first 24');
eq(r.lastHostDotted, '192.168.1.254', 'last 24');
eq(r.wildcardDotted, '0.0.0.255', 'wildcard 24');

// --- computeSubnet: 10.5.6.7/8 ---
r = S.computeSubnet(S.parseIp('10.5.6.7').value, 8);
eq(r.networkDotted, '10.0.0.0', 'net 8');
eq(r.broadcastDotted, '10.255.255.255', 'bcast 8');
eq(r.totalAddresses, 16777216, 'total 8');
eq(r.usableHosts, 16777214, 'usable 8');

// --- /32 ---
r = S.computeSubnet(S.parseIp('203.0.113.9').value, 32);
eq(r.networkDotted, '203.0.113.9', 'net 32');
eq(r.broadcastDotted, '203.0.113.9', 'bcast 32');
eq(r.usableHosts, 1, 'usable 32');
eq(r.note, 'HOST_ROUTE', 'note 32');

// --- /31 (RFC 3021) ---
r = S.computeSubnet(S.parseIp('192.0.2.8').value, 31);
eq(r.networkDotted, '192.0.2.8', 'net 31');
eq(r.broadcastDotted, '192.0.2.9', 'bcast 31');
eq(r.usableHosts, 2, 'usable 31');
eq(r.note, 'RFC3021', 'note 31');

// --- /0 ---
r = S.computeSubnet(S.parseIp('1.2.3.4').value, 0);
eq(r.networkDotted, '0.0.0.0', 'net 0');
eq(r.broadcastDotted, '255.255.255.255', 'bcast 0');
eq(r.totalAddresses, 4294967296, 'total 0');

// --- classifyIp ---
eq(S.classifyIp(S.parseIp('10.1.2.3').value).tag, 'PRIVATE', 'cls 10/8');
eq(S.classifyIp(S.parseIp('172.16.5.4').value).tag, 'PRIVATE', 'cls 172.16');
eq(S.classifyIp(S.parseIp('172.31.255.1').value).tag, 'PRIVATE', 'cls 172.31');
eq(S.classifyIp(S.parseIp('172.15.0.1').value).tag, 'PUBLIC', 'cls 172.15 public');
eq(S.classifyIp(S.parseIp('172.32.0.1').value).tag, 'PUBLIC', 'cls 172.32 public');
eq(S.classifyIp(S.parseIp('192.168.0.1').value).tag, 'PRIVATE', 'cls 192.168');
eq(S.classifyIp(S.parseIp('127.0.0.1').value).tag, 'LOOPBACK', 'cls loopback');
eq(S.classifyIp(S.parseIp('169.254.10.20').value).tag, 'LINK_LOCAL', 'cls linklocal');
eq(S.classifyIp(S.parseIp('224.0.0.1').value).tag, 'MULTICAST', 'cls multicast');
eq(S.classifyIp(S.parseIp('240.0.0.1').value).tag, 'RESERVED', 'cls reserved');
eq(S.classifyIp(S.parseIp('100.64.0.5').value).tag, 'CGNAT', 'cls cgnat');
eq(S.classifyIp(S.parseIp('100.127.255.1').value).tag, 'CGNAT', 'cls cgnat edge');
eq(S.classifyIp(S.parseIp('100.128.0.1').value).tag, 'PUBLIC', 'cls 100.128 public');
eq(S.classifyIp(S.parseIp('8.8.8.8').value).tag, 'PUBLIC', 'cls public');
eq(S.classifyIp(S.parseIp('0.0.0.0').value).tag, 'UNSPECIFIED', 'cls unspecified');

// --- legacy class ---
eq(S.legacyClass(S.parseIp('10.0.0.1').value), 'A', 'class A');
eq(S.legacyClass(S.parseIp('150.0.0.1').value), 'B', 'class B');
eq(S.legacyClass(S.parseIp('200.0.0.1').value), 'C', 'class C');
eq(S.legacyClass(S.parseIp('230.0.0.1').value), 'D', 'class D');
eq(S.legacyClass(S.parseIp('250.0.0.1').value), 'E', 'class E');
eq(S.defaultPrefixForClass(S.parseIp('10.0.0.1').value), 8, 'default A');
eq(S.defaultPrefixForClass(S.parseIp('200.0.0.1').value), 24, 'default C');
eq(S.defaultPrefixForClass(S.parseIp('230.0.0.1').value), null, 'default D none');

// --- splitSubnet ---
let sp = S.splitSubnet(S.parseIp('192.168.0.0').value, 24, { count: 4 });
ok(sp.ok, 'split count ok');
eq(sp.newPrefix, 26, 'split /24 x4 -> /26');
eq(sp.rows.length, 4, 'split rows');
eq(sp.rows[0].network, '192.168.0.0', 'split row0 net');
eq(sp.rows[1].network, '192.168.0.64', 'split row1 net');
eq(sp.rows[3].broadcast, '192.168.0.255', 'split row3 bcast');
eq(sp.rows[0].first, '192.168.0.1', 'split row0 first');
sp = S.splitSubnet(S.parseIp('10.0.0.0').value, 8, { prefix: 16 });
ok(sp.ok, 'split prefix ok');
eq(sp.total, 256, 'split /8->/16 count 256');
eq(sp.rows[255].network, '10.255.0.0', 'split last net');
sp = S.splitSubnet(S.parseIp('192.168.0.0').value, 24, { count: 3 });
eq(sp.newPrefix, 26, 'split x3 rounds up to /26');
errCode(S.splitSubnet(S.parseIp('192.168.0.0').value, 24, { count: 0 }), 'E_SPLIT_COUNT', 'split count 0');
errCode(S.splitSubnet(S.parseIp('192.168.0.0').value, 24, { count: 1.5 }), 'E_SPLIT_COUNT', 'split count frac');
errCode(S.splitSubnet(S.parseIp('192.168.0.0').value, 31, { count: 4 }), 'E_SPLIT_TOO_MANY', 'split overflow');
errCode(S.splitSubnet(S.parseIp('192.168.0.0').value, 24, { prefix: 23 }), 'E_SPLIT_PREFIX', 'split prefix smaller');
errCode(S.splitSubnet(S.parseIp('192.168.0.0').value, 24, { prefix: 33 }), 'E_SPLIT_PREFIX', 'split prefix 33');
sp = S.splitSubnet(S.parseIp('10.0.0.0').value, 8, { prefix: 8 });
eq(sp.total, 1, 'split same prefix = 1 subnet');
sp = S.splitSubnet(S.parseIp('0.0.0.0').value, 0, { prefix: 9 });
ok(sp.capped, 'split /0->/9 capped');
eq(sp.total, 512, 'split /0->/9 total 512');
eq(sp.rows.length, 256, 'split capped rows 256');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
