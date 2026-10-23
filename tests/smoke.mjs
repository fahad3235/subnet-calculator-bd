/* subnet-calculator-bd -- headless-Chrome smoke test via raw CDP.
   Run: node tests/smoke.mjs [desktop|mobile]
   Uses /opt/meta-chromium/chrome + Node global WebSocket. No deps. */
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = process.argv[2] || 'desktop';
const WIDTH = MODE === 'mobile' ? 390 : 1280;
const PORT = MODE === 'mobile' ? 9246 : 9245;
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + DIR + '/index.html';

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); }
  async open() {
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) {
        const { resolve, reject } = this.pending.get(d.id);
        this.pending.delete(d.id);
        d.error ? reject(new Error(JSON.stringify(d.error))) : resolve(d.result);
      } else if (d.method === 'Runtime.consoleAPICalled' && d.params && d.params.type === 'error') {
        this.consoleErrors.push(JSON.stringify(d.params.args));
      } else if (d.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push('exception: ' + JSON.stringify(d.params.exceptionDetails));
      }
    };
    this.consoleErrors = [];
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  async evalExpr(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval exception: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const userDir = '/tmp/subnet-calculator-bd-chrome-' + MODE + '-' + Date.now();
try { execSync('pkill -f "subnet-calculator-bd-chrome-' + MODE + '"'); } catch (e) {}
await sleep(500);
execSync('rm -rf ' + userDir);
const chrome = spawn('/opt/meta-chromium/chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-proxy-server',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir, 'about:blank'
], { stdio: 'ignore' });
await sleep(1500);
let ver = null;
for (let i = 0; i < 40; i++) {
  try { ver = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json(); break; }
  catch (e) { await sleep(750); }
}
if (!ver) throw new Error('Chrome DevTools endpoint never came up');
const cdp = new CDP(ver.webSocketDebuggerUrl);
await cdp.open();
await cdp.send('Target.createTarget', { url: 'about:blank' });
await sleep(500);
const targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
const page = targets.find(t => t.type === 'page' && t.url === 'about:blank') || targets.find(t => t.type === 'page');
const cdp2 = new CDP(page.webSocketDebuggerUrl);
await cdp2.open();
await cdp2.send('Page.enable');
await cdp2.send('Runtime.enable');
await cdp2.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: MODE === 'mobile' });
await cdp2.send('Page.navigate', { url: URL });
await sleep(2000);

const setVal = async (id, value) => {
  await cdp2.evalExpr(`(() => { const el = document.getElementById('${id}'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(500);
};
const click = async (id) => {
  await cdp2.evalExpr(`document.getElementById('${id}').click()`);
  await sleep(700);
};
const text = async (sel) => cdp2.evalExpr(`(() => { const el = document.querySelector('${sel}'); return el ? el.textContent : null; })()`);

check('title renders', (await cdp2.evalExpr('document.title')) === 'Subnet Calculator BD');
check('tagline EN', (await text('.tagline')).includes('fully offline'));
check('calc pane active initially', await cdp2.evalExpr(`document.getElementById('pane-calc').classList.contains('active')`));
check('empty state shows', (await text('#calc-result')).includes('192.168.1.10/24'));

// invalid input -> error state
await setVal('cidr-input', '999.1.2.3/24');
await click('compute-btn');
check('bad octet shows error', (await text('#calc-result .alert.error')).includes('0-255'));
await setVal('cidr-input', '10.0.0.1/33');
await click('compute-btn');
check('bad prefix shows error', (await text('#calc-result .alert.error')).includes('0-32'));
await setVal('cidr-input', '10.0.0.1');
await click('compute-btn');
check('missing slash shows error', (await text('#calc-result .alert.error')).includes('/prefix'));

// valid compute
await setVal('cidr-input', '192.168.1.10/24');
await click('compute-btn');
const calcText = await text('#calc-result');
check('network 192.168.1.0/24', calcText.includes('192.168.1.0/24'));
check('broadcast 192.168.1.255', calcText.includes('192.168.1.255'));
check('mask 255.255.255.0', calcText.includes('255.255.255.0'));
check('wildcard 0.0.0.255', calcText.includes('0.0.0.255'));
check('usable 254', calcText.includes('254'));
check('first 192.168.1.1', calcText.includes('192.168.1.1'));
check('last 192.168.1.254', calcText.includes('192.168.1.254'));
check('binary view rendered', await cdp2.evalExpr(`document.querySelectorAll('#calc-result .bit').length === 64`));
check('net bits highlighted', await cdp2.evalExpr(`document.querySelectorAll('#calc-result .bit.net').length === 48`));
check('copy button present', (await text('#calc-result .btn.secondary')).includes('Copy'));

// /31 note
await setVal('cidr-input', '192.0.2.8/31');
await click('compute-btn');
check('/31 RFC3021 note', (await text('#calc-result')).includes('RFC 3021'));

// sample + clear
await click('sample-btn');
check('sample computes', (await text('#calc-result')).includes('192.168.1.0/24'));
await click('clear-btn');
check('clear restores empty state', (await text('#calc-result')).includes('Enter an address'));

// splitter tab
await click('tab-split');
check('split pane active', await cdp2.evalExpr(`document.getElementById('pane-split').classList.contains('active')`));
await setVal('split-input', '192.168.0.0/24');
await click('split-btn');
const splitText = await text('#split-result');
check('split header /26', splitText.includes('-> /26'));
check('split row count 4', await cdp2.evalExpr(`document.querySelectorAll('#split-result tbody tr').length === 4`));
check('split row2 net 192.168.0.64/26', splitText.includes('192.168.0.64/26'));
check('split row4 bcast 192.168.0.255', splitText.includes('192.168.0.255'));
// split by prefix mode
await cdp2.evalExpr(`document.querySelector('input[name="split-mode"][value="prefix"]').click()`);
await setVal('split-prefix', '25');
await click('split-btn');
check('split by prefix -> /25', (await text('#split-result')).includes('-> /25'));
check('split /25 rows 2', await cdp2.evalExpr(`document.querySelectorAll('#split-result tbody tr').length === 2`));
// split error
await setVal('split-input', 'not-an-ip');
await click('split-btn');
check('split bad input errors', (await text('#split-result .alert.error')).length > 0);

// checks tab
await click('tab-checks');
await setVal('checks-input', '10.0.0.1');
await click('checks-btn');
const checksText = await text('#checks-result');
check('10/8 -> Private badge', await cdp2.evalExpr(`document.querySelector('#checks-result .badge.tag-PRIVATE') !== null`));
check('checks show class A', checksText.includes('A ('));
await setVal('checks-input', '8.8.8.8');
await click('checks-btn');
check('8.8.8.8 -> Public badge', await cdp2.evalExpr(`document.querySelector('#checks-result .badge.tag-PUBLIC') !== null`));
await setVal('checks-input', '127.0.0.1');
await click('checks-btn');
check('127 -> Loopback badge', await cdp2.evalExpr(`document.querySelector('#checks-result .badge.tag-LOOPBACK') !== null`));
await setVal('checks-input', '1.2.3');
await click('checks-btn');
check('checks bad input errors', (await text('#checks-result .alert.error')).length > 0);

// language toggle
await click('lang-btn');
check('BN title', (await text('h1')) === 'সাবনেট ক্যালকুলেটর বিডি');
check('BN tab labels', (await text('#tab-calc')) === 'ক্যালকুলেটর');
await click('tab-calc');
await setVal('cidr-input', '10.0.0.5/8');
await click('compute-btn');
check('compute works in BN', (await text('#calc-result')).includes('10.0.0.0/8'));
check('lang persisted', await cdp2.evalExpr(`localStorage.getItem('scb-lang')`) === 'bn');
await cdp2.send('Page.navigate', { url: URL });
await sleep(2000);
check('BN persists after reload', (await text('h1')) === 'সাবনেট ক্যালকুলেটর বিডি');

// Bengali digits
await click('lang-btn'); // back to EN first, then bn + digits
await click('lang-btn');
await cdp2.evalExpr(`document.getElementById('bndigits').click()`);
await click('tab-calc');
await setVal('cidr-input', '192.168.1.1/24');
await click('compute-btn');
check('Bengali digits shown', /[০-৯]/.test(await text('#calc-result')));

if (MODE === 'mobile') {
  check('390px no page overflow', await cdp2.evalExpr(`document.documentElement.scrollWidth <= 390`), await cdp2.evalExpr(`document.documentElement.scrollWidth`));
}

check('zero console/page errors', cdp2.consoleErrors.length === 0, JSON.stringify(cdp2.consoleErrors).slice(0, 300));

console.log(`\n${passed} passed, ${failed} failed (${MODE})`);
cdp2.close(); cdp.close();
chrome.kill();
process.exit(failed ? 1 : 0);
