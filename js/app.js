/* subnet-calculator-bd - DOM wiring. Depends on Subnet (js/subnet.js) and I18N (js/i18n.js). */
(function () {
  'use strict';
  var S = window.Subnet, I18N = window.I18N;
  var lang = localStorage.getItem('scb-lang') || 'en';
  var bnDigits = localStorage.getItem('scb-bndigits') === '1';

  function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }
  function terr(code) { return (I18N[lang].err && I18N[lang].err[code]) || I18N.en.err[code] || code; }
  function $(id) { return document.getElementById(id); }

  var BN_D = {'0':'\u09E6','1':'\u09E7','2':'\u09E8','3':'\u09E9','4':'\u09EA','5':'\u09EB','6':'\u09EC','7':'\u09ED','8':'\u09EE','9':'\u09EF'};
  function fmtNum(n) {
    var s = String(n);
    if (lang === 'bn' && bnDigits) return s.replace(/[0-9]/g, function (d) { return BN_D[d]; });
    return s;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function showError(box, code) {
    box.innerHTML = '';
    var d = el('div', 'alert error', terr(code));
    box.appendChild(d);
  }

  function clearBox(box, emptyMsgKey) {
    box.innerHTML = '';
    box.appendChild(el('p', 'empty', t(emptyMsgKey)));
  }

  function binaryOctets(value, prefix) {
    var wrap = el('div', 'binview');
    var bits = S.toOctets(value);
    for (var i = 0; i < 4; i++) {
      var grp = el('span', 'octet');
      var b = bits[i].toString(2);
      while (b.length < 8) b = '0' + b;
      for (var j = 0; j < 8; j++) {
        var bitPos = i * 8 + j;
        var sp = el('span', 'bit' + (bitPos < prefix ? ' net' : ' host'), b[j]);
        grp.appendChild(sp);
      }
      wrap.appendChild(grp);
      if (i < 3) wrap.appendChild(el('span', 'dot', '.'));
    }
    return wrap;
  }

  function resultRow(labelKey, value) {
    var row = el('div', 'row');
    row.appendChild(el('span', 'k', t(labelKey)));
    row.appendChild(el('span', 'v mono', value));
    return row;
  }

  /* ---------- calculator ---------- */
  function doCompute() {
    var box = $('calc-result');
    var raw = $('cidr-input').value;
    var parsed = S.parseCidr(raw);
    if (!parsed.ok) { showError(box, parsed.error); return; }
    var r = S.computeSubnet(parsed.ip, parsed.prefix);
    box.innerHTML = '';
    var card = el('div', 'card');
    var rows = [
      ['r_network', r.networkDotted + '/' + r.prefix],
      ['r_broadcast', r.broadcastDotted],
      ['r_mask', r.maskDotted + '  (/' + r.prefix + ')'],
      ['r_wildcard', r.wildcardDotted],
      ['r_total', fmtNum(r.totalAddresses)],
      ['r_usable', fmtNum(r.usableHosts)],
      ['r_first', r.firstHostDotted],
      ['r_last', r.lastHostDotted]
    ];
    rows.forEach(function (p) { card.appendChild(resultRow(p[0], p[1])); });
    card.appendChild(el('h3', 'sub', t('r_binary')));
    var bin = el('div', 'row');
    var bv = el('div');
    bv.appendChild(el('div', 'blabel', 'IP ' + S.toDotted(parsed.ip)));
    bv.appendChild(binaryOctets(parsed.ip, r.prefix));
    bv.appendChild(el('div', 'blabel', 'MASK ' + r.maskDotted));
    bv.appendChild(binaryOctets(r.mask, r.prefix));
    bin.appendChild(bv);
    card.appendChild(bin);
    var legend = el('div', 'legend');
    legend.appendChild(el('span', 'lg net', t('r_network').split(' ')[0]));
    legend.appendChild(el('span', 'lg host', t('r_usable').split(' ')[0]));
    card.appendChild(legend);
    if (r.note === 'RFC3021') card.appendChild(el('p', 'note', t('r_note_rfc3021')));
    if (r.note === 'HOST_ROUTE') card.appendChild(el('p', 'note', t('r_note_host')));
    var copy = el('button', 'btn secondary', t('copy_btn'));
    copy.type = 'button';
    copy.addEventListener('click', function () {
      var lines = [
        'Subnet: ' + S.toDotted(parsed.ip) + '/' + r.prefix,
        'Network: ' + r.networkDotted, 'Broadcast: ' + r.broadcastDotted,
        'Mask: ' + r.maskDotted, 'Wildcard: ' + r.wildcardDotted,
        'Total: ' + r.totalAddresses, 'Usable: ' + r.usableHosts,
        'First: ' + r.firstHostDotted, 'Last: ' + r.lastHostDotted
      ].join('\n');
      var done = function () { copy.textContent = t('copied'); setTimeout(function () { copy.textContent = t('copy_btn'); }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lines).then(done, done);
      } else { done(); }
    });
    card.appendChild(copy);
    box.appendChild(card);
  }

  /* ---------- splitter ---------- */
  function doSplit() {
    var box = $('split-result');
    var raw = $('split-input').value;
    var parsed = S.parseCidr(raw);
    if (!parsed.ok) { showError(box, parsed.error); return; }
    var net = S.computeSubnet(parsed.ip, parsed.prefix).network;
    var mode = document.querySelector('input[name="split-mode"]:checked').value;
    var res;
    if (mode === 'count') {
      var n = parseInt($('split-count').value, 10);
      if (!/^[0-9]+$/.test($('split-count').value.trim())) { showError(box, 'E_SPLIT_COUNT'); return; }
      res = S.splitSubnet(net, parsed.prefix, { count: n });
    } else {
      var np = parseInt($('split-prefix').value, 10);
      if (!/^[0-9]+$/.test($('split-prefix').value.trim())) { showError(box, 'E_SPLIT_PREFIX'); return; }
      res = S.splitSubnet(net, parsed.prefix, { prefix: np });
    }
    if (!res.ok) { showError(box, res.error); return; }
    box.innerHTML = '';
    var card = el('div', 'card');
    card.appendChild(el('h3', 'sub', S.toDotted(net) + '/' + parsed.prefix + ' -> /' + res.newPrefix + ' (' + fmtNum(res.total) + ')'));
    if (res.capped) card.appendChild(el('p', 'note', t('split_capped').replace('{n}', fmtNum(res.total))));
    var table = el('table', 'split-table');
    var thead = el('thead');
    var hr = el('tr');
    ['#', 'c_network', 'c_first', 'c_last', 'c_broadcast'].forEach(function (k, i) {
      hr.appendChild(el('th', '', i === 0 ? '#' : t(k)));
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el('tbody');
    res.rows.forEach(function (row) {
      var tr = el('tr');
      tr.appendChild(el('td', 'mono', String(row.index)));
      tr.appendChild(el('td', 'mono', row.cidr));
      tr.appendChild(el('td', 'mono', row.first));
      tr.appendChild(el('td', 'mono', row.last));
      tr.appendChild(el('td', 'mono', row.broadcast));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    var wrap = el('div', 'tablewrap');
    wrap.appendChild(table);
    card.appendChild(wrap);
    box.appendChild(card);
  }

  /* ---------- checks ---------- */
  function doChecks() {
    var box = $('checks-result');
    var raw = $('checks-input').value;
    var parsed = S.parseIp(raw);
    if (!parsed.ok) { showError(box, parsed.error); return; }
    var info = S.classifyIp(parsed.value);
    box.innerHTML = '';
    var card = el('div', 'card');
    var badge = el('span', 'badge tag-' + info.tag, t('tag_' + info.tag));
    var h = el('h3', 'sub', '');
    h.appendChild(badge);
    card.appendChild(h);
    card.appendChild(resultRow('r_network', S.toDotted(parsed.value)));
    card.appendChild(resultRow('binary_view', S.toBinary(parsed.value)));
    card.appendChild(resultRow('legacy_class', S.legacyClass(parsed.value) + ' (' + t('legacy_class') + ')'));
    var dp = S.defaultPrefixForClass(parsed.value);
    card.appendChild(resultRow('default_mask', dp === null ? '-' : '/' + dp));
    if (info.rfc) card.appendChild(el('p', 'note mono', info.rfc));
    box.appendChild(card);
  }

  /* ---------- tabs & language ---------- */
  function switchTab(name) {
    ['calc', 'split', 'checks'].forEach(function (n) {
      $('tab-' + n).classList.toggle('active', n === name);
      $('pane-' + n).classList.toggle('active', n === name);
    });
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function (e) {
      var k = e.getAttribute('data-i18n');
      if (t(k) !== k) e.textContent = t(k);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (e) {
      e.placeholder = t(e.getAttribute('data-i18n-ph'));
    });
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    $('lang-btn').textContent = t('lang_toggle');
    $('bndigits').checked = bnDigits;
    localStorage.setItem('scb-lang', lang);
    localStorage.setItem('scb-bndigits', bnDigits ? '1' : '0');
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['calc', 'split', 'checks'].forEach(function (n) {
      $('tab-' + n).addEventListener('click', function () { switchTab(n); });
    });
    $('compute-btn').addEventListener('click', doCompute);
    $('cidr-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') doCompute(); });
    $('sample-btn').addEventListener('click', function () {
      $('cidr-input').value = '192.168.1.10/24'; doCompute();
    });
    $('clear-btn').addEventListener('click', function () {
      $('cidr-input').value = ''; clearBox($('calc-result'), 'empty_calc');
    });
    $('split-btn').addEventListener('click', doSplit);
    $('checks-btn').addEventListener('click', doChecks);
    $('checks-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') doChecks(); });
    $('lang-btn').addEventListener('click', function () {
      lang = (lang === 'en') ? 'bn' : 'en'; applyLang();
    });
    $('bndigits').addEventListener('change', function (e) { bnDigits = e.target.checked; applyLang(); });
    applyLang();
    clearBox($('calc-result'), 'empty_calc');
    clearBox($('split-result'), 'empty_split');
    clearBox($('checks-result'), 'empty_checks');
  });
})();
