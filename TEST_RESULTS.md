# TEST_RESULTS — subnet-calculator-bd (2026-10-23, 14:00 slot)

## Unit tests — `node tests/subnet.test.js`
- **107 passed, 0 failed**
- Covers: parseIp (valid, octet-count, range, leading-zero, alpha, empty, IPv6
  rejection), parsePrefix/parseCidr, toDotted/toBinary/maskFromPrefix,
  computeSubnet for /0 /8 /24 /30 /31 (RFC 3021) /32 (host route),
  classifyIp for PRIVATE/PUBLIC/LOOPBACK/LINK_LOCAL/MULTICAST/RESERVED/
  CGNAT/UNSPECIFIED incl. 172.16/172.31 edges and 100.64/100.128 edges,
  legacyClass A–E + default classful prefixes,
  splitSubnet: count mode (4 → /26 rows verified), prefix mode (/8→/16 = 256
  rows), count rounding (3 → /26), error codes (E_SPLIT_COUNT,
  E_SPLIT_TOO_MANY, E_SPLIT_PREFIX), 256-row cap (/0→/9 = 512 total).
- 1 test-side fix: /0→/8 yields exactly 256 (correctly not capped); test
  corrected to /0→/9. 0 app-logic bugs.

## Headless-Chrome smoke — `node tests/smoke.mjs desktop` (1280px)
- **40 passed, 0 failed, 0 console/page errors**
- Verified live in UI: title/tagline, empty state, three error states (bad
  octet → "0-255", bad prefix → "0-32", missing slash → "/prefix"),
  192.168.1.10/24 → 192.168.1.0/24, .255 broadcast, 255.255.255.0,
  0.0.0.255 wildcard, 254 usable, first .1 / last .254, 64 binary bits with
  48 network bits highlighted, copy button, /31 RFC 3021 note, sample/clear,
  splitter /24→4×/26 (row2 192.168.0.64/26, row4 bcast .255), split-by-prefix
  /25 = 2 rows, split error state, checks: 10.0.0.1→PRIVATE/Class A,
  8.8.8.8→PUBLIC, 127.0.0.1→LOOPBACK, bad input error,
  BN title/Tab labels after toggle, compute in BN, lang persisted in
  localStorage + across reload, Bengali digits option.
- 1 test-side fix: net-bits count 24 → 48 (two binary views: IP + mask).

## Headless-Chrome smoke — `node tests/smoke.mjs mobile` (390px)
- **41 passed, 0 failed, 0 console/page errors** (all desktop checks +
  390px no-horizontal-overflow).

## Total: 188 checks green, 0 repairs to app logic.
