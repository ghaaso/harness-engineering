// snap.mjs (unit U3a): store a source's own bytes and its extracted text by sha256 (R25).
// The only script of the trusted base with network use (CONTRACT §6). It never judges a card.
// Spec: spec/snap.mjs.md. Formats: CONTRACT §3.13. Exits: CONTRACT §1.4 (1 is not used).
//
// Named exports (pure or side-effect free on import; for tests):
//   addressVerdict(addr, {allowLoopback}) -> 'ok' | 'private-address'
//   addressAllowed(addr, {allowLoopback}) -> bool
//   embeddedIPv4(addr) -> string[]          (IPv4 addresses embedded in an IPv6 one)
//   extractHtml(buffer, contentType) -> string   (html-v1)
//   htmlToText(htmlString) -> string             (html-v1 on an already decoded string)
//   decodeEntities(string) -> string
//   classifyBody(buffer, contentType) -> {text?, reason?, extractor?}
//   fetchUrl(url, {maxBytes, timeoutMs, maxRedirects, allowLoopback, lookup?, onAgent?})
//     -> {finalUrl, status?, contentType?, body?: Buffer, reason?}

import * as dns from 'node:dns';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'snap';

// ---------------------------------------------------------------------------------------------
// Address filter (step 5b). Built once. Two BlockLists, not one: Node's BlockList matches an IPv4
// address against an IPv6 rule through its mapped form, so `::ffff:0:0/96` in a shared list would
// refuse every IPv4 address.

const BLOCK4 = new net.BlockList();
for (const [a, p] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) BLOCK4.addSubnet(a, p, 'ipv4');
BLOCK4.addAddress('255.255.255.255', 'ipv4');
const BLOCK6 = new net.BlockList();
for (const [a, p] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32],
  ['2002::', 16], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['::ffff:0:0', 96],
]) BLOCK6.addSubnet(a, p, 'ipv6');

const LOOP4 = new net.BlockList();
LOOP4.addSubnet('127.0.0.0', 8, 'ipv4');

function stripBrackets(addr) {
  const s = String(addr ?? '').trim();
  return s.startsWith('[') && s.endsWith(']') ? s.slice(1, -1) : s;
}

// Parse an IPv6 literal into 8 16-bit groups (no zone id); null when not parseable.
function ipv6Groups(addr) {
  let s = addr;
  const pct = s.indexOf('%');
  if (pct >= 0) s = s.slice(0, pct);
  const lastColon = s.lastIndexOf(':');
  const lastPart = s.slice(lastColon + 1);
  if (lastPart.includes('.')) {
    // A dotted IPv4 tail becomes two hex groups.
    if (!net.isIPv4(lastPart)) return null;
    const b = lastPart.split('.').map(Number);
    s = `${s.slice(0, lastColon + 1)}${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const parse = (h) => (h === '' ? [] : h.split(':').map((x) => (/^[0-9a-fA-F]{1,4}$/.test(x) ? parseInt(x, 16) : NaN)));
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 1 && fill !== 0) return null;
  if (fill < 0) return null;
  const g = [...head, ...new Array(halves.length === 2 ? fill : 0).fill(0), ...rest];
  if (g.length !== 8 || g.some((x) => !Number.isInteger(x) || x < 0 || x > 0xffff)) return null;
  return g;
}

function v4FromGroups(hi, lo) {
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

// IPv4 addresses embedded in an IPv6 address: IPv4-mapped (::ffff:0:0/96), IPv4-compatible
// (::/96, deprecated), NAT64 (64:ff9b::/96 and 64:ff9b:1::/48, RFC 6052 layout), 6to4 (2002::/16).
export function embeddedIPv4(addr) {
  const a = stripBrackets(addr);
  if (net.isIP(a) !== 6) return [];
  const g = ipv6Groups(a);
  if (!g) return [];
  const out = [];
  const zero5 = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0;
  if (zero5 && g[5] === 0xffff) out.push(v4FromGroups(g[6], g[7]));
  if (zero5 && g[5] === 0 && (g[6] !== 0 || g[7] > 1)) out.push(v4FromGroups(g[6], g[7]));
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) {
    out.push(v4FromGroups(g[6], g[7]));
  }
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) {
    // /48 prefix: IPv4 bits sit in bytes 6,7 and 9,10 (byte 8 is the reserved u octet).
    const b6 = g[3] >> 8, b7 = g[3] & 0xff, b9 = g[4] & 0xff, b10 = g[5] >> 8;
    out.push(`${b6}.${b7}.${b9}.${b10}`);
  }
  if (g[0] === 0x2002) out.push(v4FromGroups(g[1], g[2]));
  return out;
}

function isLoopback(addr) {
  const fam = net.isIP(addr);
  if (fam === 4) return LOOP4.check(addr, 'ipv4');
  if (fam !== 6) return false;
  const g = ipv6Groups(addr);
  if (!g) return false;
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  const zero5 = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0;
  if (zero5 && g[5] === 0xffff) return LOOP4.check(v4FromGroups(g[6], g[7]), 'ipv4'); // mapped
  return false;
}

export function addressVerdict(addr, { allowLoopback = false } = {}) {
  const a = stripBrackets(addr);
  const fam = net.isIP(a);
  if (fam === 0) return 'private-address';
  if (allowLoopback && isLoopback(a)) return 'ok';
  if (fam === 4 ? BLOCK4.check(a, 'ipv4') : BLOCK6.check(a, 'ipv6')) return 'private-address';
  for (const v4 of embeddedIPv4(a)) {
    if (BLOCK4.check(v4, 'ipv4')) return 'private-address';
  }
  return 'ok';
}

export function addressAllowed(addr, opts = {}) {
  return addressVerdict(addr, opts) === 'ok';
}

// ---------------------------------------------------------------------------------------------
// Text extraction (steps 5f, 5g).

const INLINE = new Set(['a', 'abbr', 'b', 'cite', 'code', 'em', 'i', 'mark', 'q', 's', 'small', 'span',
  'strong', 'sub', 'sup', 'u']);
const BLOCK_TAGS = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'br', 'caption',
  'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'legend', 'li', 'main', 'nav',
  'ol', 'option', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'tfoot', 'thead', 'title', 'tr',
  'ul']);
const RAWTEXT = new Set(['script', 'style', 'noscript', 'template', 'svg']);

// The fixed named-entity table of html-v1.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­',
  ndash: '–', mdash: '—', minus: '−', hyphen: '‐',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„',
  laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›',
  hellip: '…', middot: '·', bull: '•', prime: '′', Prime: '″',
  copy: '©', reg: '®', trade: '™', deg: '°', plusmn: '±', times: '×',
  divide: '÷', micro: 'µ', para: '¶', sect: '§', cent: '¢', pound: '£',
  yen: '¥', euro: '€', frac12: '½', frac14: '¼', frac34: '¾',
  sup1: '¹', sup2: '²', sup3: '³', permil: '‰', le: '≤', ge: '≥',
  ne: '≠', asymp: '≈', approx: '≈', infin: '∞', larr: '←', rarr: '→',
  uarr: '↑', darr: '↓', ensp: ' ', emsp: ' ', thinsp: ' ',
  zwnj: '‌', zwj: '‍', lrm: '‎', rlm: '‏', iexcl: '¡', iquest: '¿',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', tau: 'τ', Delta: 'Δ',
  Sigma: 'Σ', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö',
  Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', ecirc: 'ê',
  aacute: 'á', agrave: 'à', acirc: 'â', iacute: 'í', oacute: 'ó',
  uacute: 'ú', ntilde: 'ñ', ccedil: 'ç', Eacute: 'É', aring: 'å',
  oslash: 'ø', aelig: 'æ',
};

let cp1252 = null;
function c1(n) {
  // Numeric references 128-159 name windows-1252 characters (HTML's rule).
  try {
    cp1252 ??= new TextDecoder('windows-1252');
    return cp1252.decode(Uint8Array.of(n));
  } catch {
    return String.fromCodePoint(n);
  }
}

export function decodeEntities(s) {
  return s.replace(/&(#[0-9]{1,8}|#[xX][0-9a-fA-F]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/g, (m, body) => {
    if (body[0] === '#') {
      const n = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(n) || n === 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return '�';
      if (n >= 0x80 && n <= 0x9f) return c1(n);
      return String.fromCodePoint(n);
    }
    return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : m;
  });
}

// Index just after the '>' that ends a tag whose name ends at j; -1 when unterminated.
// Quotes count only at the start of an attribute value.
function tagEnd(s, j) {
  const n = s.length;
  while (j < n) {
    const c = s[j];
    if (c === '>') return j + 1;
    if (c === '=') {
      j++;
      while (j < n && /\s/.test(s[j])) j++;
      if (s[j] === '"' || s[j] === "'") {
        const close = s.indexOf(s[j], j + 1);
        if (close < 0) return -1;
        j = close + 1;
        continue;
      }
      continue;
    }
    j++;
  }
  return -1;
}

export function htmlToText(html) {
  const n = html.length;
  let out = '';
  let i = 0;
  const nameRe = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)/y;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    if (html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
      continue;
    }
    const c = html[lt + 1];
    if (c === '!' || c === '?') {
      const e = html.indexOf('>', lt + 2);
      i = e < 0 ? n : e + 1;
      out += ' ';
      continue;
    }
    nameRe.lastIndex = lt;
    const m = nameRe.exec(html);
    if (!m) {
      out += '<';
      i = lt + 1;
      continue;
    }
    const end = tagEnd(html, lt + m[0].length);
    if (end < 0) break; // an unterminated tag runs to the end: nothing visible after it
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const selfClosing = html[end - 2] === '/';
    i = end;
    if (!closing && RAWTEXT.has(name) && !selfClosing) {
      const closeRe = new RegExp(`</${name}(?![A-Za-z0-9:-])`, 'gi');
      closeRe.lastIndex = i;
      const cm = closeRe.exec(html);
      if (!cm) {
        i = n;
      } else {
        const e = tagEnd(html, cm.index + cm[0].length);
        i = e < 0 ? n : e;
      }
      out += ' ';
      continue;
    }
    out += INLINE.has(name) ? '' : BLOCK_TAGS.has(name) ? '\n' : ' ';
  }
  const text = decodeEntities(out);
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function mimeOf(contentType) {
  return String(contentType ?? '').split(';')[0].trim().toLowerCase();
}

function headerCharset(contentType) {
  const m = /charset\s*=\s*["']?([^"';\s]+)/i.exec(String(contentType ?? ''));
  return m ? m[1] : null;
}

function metaCharset(buf) {
  const head = buf.subarray(0, 4096).toString('latin1');
  const m = /<meta\b[^>]*?charset\s*=\s*["']?\s*([A-Za-z0-9_.:-]+)/i.exec(head);
  return m ? m[1] : null;
}

function decodeBytes(buf, label) {
  if (label) {
    try {
      return new TextDecoder(label.toLowerCase()).decode(buf);
    } catch {
      // an unknown label falls back to UTF-8
    }
  }
  return new TextDecoder('utf-8').decode(buf);
}

export function extractHtml(buf, contentType) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const charset = headerCharset(contentType) ?? metaCharset(b);
  return htmlToText(decodeBytes(b, charset));
}

export function classifyBody(buf, contentType) {
  const mime = mimeOf(contentType);
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-' || mime === 'application/pdf') {
    return { reason: 'pdf' };
  }
  let text;
  let extractor;
  if (mime === 'text/html' || mime === 'application/xhtml+xml') {
    text = extractHtml(buf, contentType);
    extractor = 'html-v1';
  } else if (mime === 'text/plain') {
    text = decodeBytes(buf, headerCharset(contentType));
  } else {
    return { reason: 'unsupported-type' };
  }
  if (!/\S/u.test(text)) return { reason: 'empty-text', extractor };
  return { text, extractor };
}

// ---------------------------------------------------------------------------------------------
// The fetch (steps 5a-5e).

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const BLOCKED = new Set([401, 403, 407, 429, 451]);

function lookupAll(host) {
  return new Promise((resolve, reject) => {
    dns.lookup(host, { all: true, verbatim: true }, (err, addrs) => (err ? reject(err) : resolve(addrs)));
  });
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'));
    const onAbort = () => reject(new Error('aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
      (e) => { signal.removeEventListener('abort', onAbort); reject(e); },
    );
  });
}

function makeDecoder(encoding, first) {
  if (encoding === 'gzip' || encoding === 'x-gzip') return zlib.createGunzip();
  if (encoding === 'br') return zlib.createBrotliDecompress();
  if (encoding === 'deflate') {
    const zlibHeader = first.length >= 2 && (first[0] & 0x0f) === 8 && ((first[0] << 8) | first[1]) % 31 === 0;
    return zlibHeader ? zlib.createInflate() : zlib.createInflateRaw();
  }
  return null;
}

function readBody(res, maxBytes, signal) {
  return new Promise((resolve) => {
    if (signal.aborted) {
      res.destroy();
      return resolve({ reason: 'timeout' });
    }
    const encoding =String(res.headers['content-encoding'] ?? 'identity').trim().toLowerCase() || 'identity';
    if (!['identity', 'gzip', 'x-gzip', 'br', 'deflate'].includes(encoding)) {
      res.destroy();
      return resolve({ reason: 'http-error' });
    }
    const declared = Number(res.headers['content-length']);
    if (encoding === 'identity' && Number.isFinite(declared) && declared > maxBytes) {
      res.destroy();
      return resolve({ reason: 'too-large' });
    }
    const chunks = [];
    let decodedTotal = 0;
    let rawTotal = 0;
    let decoder = null;
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      if (v.reason) {
        res.destroy();
        decoder?.destroy();
      }
      resolve(v);
    };
    const onAbort = () => finish({ reason: 'timeout' });
    signal.addEventListener('abort', onAbort, { once: true });
    const onDecoded = (c) => {
      decodedTotal += c.length;
      if (decodedTotal > maxBytes) finish({ reason: 'too-large' });
      else chunks.push(c);
    };
    res.on('data', (c) => {
      if (settled) return;
      rawTotal += c.length;
      if (rawTotal > maxBytes) return finish({ reason: 'too-large' });
      if (encoding === 'identity') return onDecoded(c);
      if (!decoder) {
        decoder = makeDecoder(encoding, c);
        decoder.on('data', (d) => { if (!settled) onDecoded(d); });
        decoder.on('error', () => finish({ reason: 'http-error' }));
        decoder.on('end', () => finish({ body: Buffer.concat(chunks) }));
      }
      decoder.write(c);
    });
    res.on('end', () => {
      if (settled) return;
      if (decoder) decoder.end();
      else finish({ body: Buffer.concat(chunks) });
    });
    res.on('error', () => finish({ reason: signal.aborted ? 'timeout' : 'http-error' }));
    res.on('aborted', () => finish({ reason: signal.aborted ? 'timeout' : 'http-error' }));
  });
}

function requestOnce(url, address, family, signal, onAgent) {
  const isHttps = url.protocol === 'https:';
  const fixedLookup = (hostname, options, cb) => {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }
    if (options && options.all) cb(null, [{ address, family }]);
    else cb(null, address, family);
  };
  const Agent = isHttps ? https.Agent : http.Agent;
  const agent = new Agent({ keepAlive: false, maxSockets: 1, lookup: fixedLookup });
  if (onAgent) onAgent(agent);
  const host = stripBrackets(url.hostname);
  const opts = {
    protocol: url.protocol,
    hostname: host,
    port: url.port || (isHttps ? 443 : 80),
    path: (url.pathname || '/') + url.search,
    method: 'GET',
    agent,
    lookup: fixedLookup,
    signal,
    setHost: false,
    headers: {
      Host: url.host,
      'User-Agent': 'tcb-snap/1',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.8,*/*;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  };
  if (isHttps && net.isIP(host) === 0) opts.servername = host;
  const mod = isHttps ? https : http;
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = mod.request(opts, (res) => resolve({ res, agent }));
    } catch (e) {
      agent.destroy();
      return reject(e);
    }
    req.on('error', (e) => {
      agent.destroy();
      reject(e);
    });
    req.end();
  });
}

export async function fetchUrl(u, {
  maxBytes, timeoutMs, maxRedirects, allowLoopback = false, lookup = lookupAll, onAgent,
} = {}) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let current = u;
  let redirects = 0;
  const agents = [];
  try {
    for (;;) {
      let url;
      try {
        url = new URL(current);
      } catch {
        return { finalUrl: current, reason: 'bad-scheme' };
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return { finalUrl: url.href, reason: 'bad-scheme' };
      const host = stripBrackets(url.hostname);
      let addrs;
      try {
        addrs = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await abortable(lookup(host), signal);
      } catch {
        return { finalUrl: url.href, reason: signal.aborted ? 'timeout' : 'http-error' };
      }
      if (!Array.isArray(addrs) || addrs.length === 0) return { finalUrl: url.href, reason: 'http-error' };
      for (const a of addrs) {
        if (addressVerdict(a.address, { allowLoopback }) !== 'ok') return { finalUrl: url.href, reason: 'private-address' };
      }
      const chosen = addrs[0];
      let res;
      try {
        const r = await requestOnce(url, chosen.address, chosen.family || net.isIP(chosen.address), signal, (ag) => {
          agents.push(ag);
          if (onAgent) onAgent(ag);
        });
        res = r.res;
      } catch {
        return { finalUrl: url.href, reason: signal.aborted ? 'timeout' : 'http-error' };
      }
      const status = res.statusCode;
      const contentType = res.headers['content-type'] ?? '';
      if (REDIRECTS.has(status) && res.headers.location) {
        res.resume();
        res.destroy();
        redirects += 1;
        if (redirects > maxRedirects) return { finalUrl: url.href, status, reason: 'too-many-redirects' };
        try {
          current = new URL(res.headers.location, url).href;
        } catch {
          return { finalUrl: url.href, status, reason: 'http-error' };
        }
        continue;
      }
      if (status < 200 || status > 299) {
        res.destroy();
        return { finalUrl: url.href, status, contentType, reason: BLOCKED.has(status) ? 'blocked' : 'http-error' };
      }
      const body = await readBody(res, maxBytes, signal);
      if (body.reason) return { finalUrl: url.href, status, contentType, reason: body.reason };
      return { finalUrl: url.href, status, contentType, body: body.body };
    }
  } finally {
    clearTimeout(timer);
    for (const ag of agents) ag.destroy();
  }
}

// ---------------------------------------------------------------------------------------------
// The script.

function isoOf(now) {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return String(now);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function usage(detail) {
  return new lib.TcbError('usage', 66, detail);
}

function snapDirs(root) {
  const P = lib.paths(root);
  const base = typeof P.snapshots === 'string' ? P.snapshots : path.join(root, '.snapshots');
  const objects = typeof P.objects === 'string' ? P.objects : path.join(root, 'store', 'objects');
  return {
    objects,
    raw: path.join(base, 'raw'),
    text: path.join(base, 'text'),
    meta: path.join(base, 'meta'),
    byUrl: path.join(base, 'by-url'),
  };
}

function keyOf(u) {
  try {
    return lib.urlKey(u);
  } catch {
    return null;
  }
}

// Step 3 for --new: distinct source.url of every c_ object with no by-url file, sorted by urlKey.
function newUrls(root, dirs) {
  let names = [];
  try {
    names = fs.readdirSync(dirs.objects);
  } catch {
    names = [];
  }
  const ids = names
    .filter((n) => /^c_[0-9a-f]{16}\.json$/.test(n))
    .map((n) => n.slice(0, -5))
    .sort();
  const byKey = new Map();
  for (const id of ids) {
    const card = lib.getObject(root, id); // missing 2, object-mismatch 3
    const u = card?.source?.url;
    if (typeof u !== 'string') continue;
    const k = keyOf(u);
    if (k === null) {
      process.stderr.write(`snap: card ${id} has an unparseable source url; skipped\n`);
      continue;
    }
    if (byKey.has(k)) continue;
    if (fs.existsSync(path.join(dirs.byUrl, `${k}.jsonl`))) continue;
    byKey.set(k, u);
  }
  return [...byKey.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([k, u]) => ({ url: u, url_key: k }));
}

async function tamperIncident(root, ctx, { ce, proc, now, retries }, code) {
  try {
    await lib.withRunLock(root, { script: SCRIPT, ce, proc, now, retries }, (handle) => {
      lib.recordIncident(root, handle, {
        ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code }, now,
      });
    });
  } catch (e) {
    process.stderr.write(`snap: could not record the tamper incident (${e?.code ?? e?.message})\n`);
  }
}

function createOrSame(file, data) {
  // raw/text are named by their sha: other bytes under the name mean the store was edited.
  try {
    return lib.createExclusive(file, data);
  } catch (e) {
    if (e?.code === 'exists-different') throw new lib.TcbError('snapshot-mismatch', 3, { file });
    throw e;
  }
}

function writeRetrieval(root, handle, dirs, entry, fetched, retrievedAt) {
  for (const d of [dirs.raw, dirs.text, dirs.meta, dirs.byUrl]) fs.mkdirSync(d, { recursive: true });
  let created = false;
  if (entry.raw_sha) {
    created = createOrSame(path.join(dirs.raw, entry.raw_sha), fetched.body) === 'created';
    if (entry.text_sha) createOrSame(path.join(dirs.text, entry.text_sha), fetched.textBytes);
    const meta = {
      schema_version: 1,
      url: entry.url,
      final_url: fetched.finalUrl,
      retrieved_at: retrievedAt,
      http_status: fetched.status,
      content_type: String(fetched.contentType ?? ''),
      bytes: fetched.body.length,
      raw_sha: entry.raw_sha,
    };
    if (entry.text_sha) meta.text_sha = entry.text_sha;
    if (fetched.extractor) meta.extractor = fetched.extractor;
    if (entry.reason) meta.reason = entry.reason;
    try {
      lib.createExclusive(path.join(dirs.meta, `${entry.raw_sha}.json`), lib.canonicalize(meta));
    } catch (e) {
      // The meta of a raw sha describes the first retrieval of those bytes (CONTRACT §3.13).
      if (e?.code !== 'exists-different') throw e;
    }
  }
  const byUrlFile = path.join(dirs.byUrl, `${entry.url_key}.jsonl`);
  let earlier = [];
  if (fs.existsSync(byUrlFile)) earlier = lib.readJsonl(byUrlFile).records;
  const sourceChanged = Boolean(entry.raw_sha)
    && earlier.some((l) => l && typeof l.raw_sha === 'string' && l.raw_sha !== entry.raw_sha);
  const line = {
    schema_version: 1,
    raw_sha: entry.raw_sha ?? null,
    retrieved_at: retrievedAt,
    source_changed: sourceChanged,
  };
  if (entry.reason) line.reason = entry.reason;
  lib.appendJsonl(byUrlFile, line, handle);
  return { created, sourceChanged };
}

async function main(ctx) {
  const { flags } = lib.parseArgs(process.argv.slice(2), {
    flags: {
      root: { type: 'string', required: true },
      ce: { type: 'int', required: true },
      url: { type: 'string' },
      new: { type: 'bool' },
      now: { type: 'string' },
      'dry-run': { type: 'bool' },
    },
  });
  const hasUrl = typeof flags.url === 'string';
  const hasNew = flags.new === true;
  if (hasUrl === hasNew) throw usage({ flag: 'url|new', message: 'exactly one of --url and --new' });
  if (!path.isAbsolute(flags.root)) throw usage({ flag: 'root', message: 'must be absolute' });
  if (flags.now !== undefined && (!ISO_RE.test(flags.now) || Number.isNaN(Date.parse(flags.now)))) {
    throw usage({ flag: 'now', message: 'malformed iso time' });
  }
  const root = flags.root;
  const ce = flags.ce;
  const dryRun = flags['dry-run'] === true;
  const facts = lib.edgeFacts(flags);
  const now = facts.now;
  const retrievedAt = isoOf(now);

  // Step 1: thresholds and F5.
  const th = lib.thresholds(root);
  const f5 = th.get('f5_given');
  const maxBytes = th.get('fetch_max_bytes');
  const timeoutMs = th.get('fetch_timeout_ms');
  const allowLoopback = th.get('allow_loopback') === true;
  const maxRedirects = th.get('fetch_max_redirects');
  const dirs = snapDirs(root);

  if (f5 !== true) {
    let urls = [];
    if (hasUrl) urls = [{ url: flags.url, url_key: keyOf(flags.url) }];
    else {
      try {
        urls = newUrls(root, dirs);
      } catch (e) {
        process.stderr.write(`snap: could not list the urls (${e?.code ?? e?.message})\n`);
      }
    }
    process.stderr.write('snap: the owner has not given F5 (f5_given is not true); nothing fetched\n');
    return {
      exit: 2,
      dry_run: dryRun,
      result: { dry_run: dryRun, urls, n: urls.length, n_text: 0, n_unverifiable: 0 },
      reasons: [{ code: 'f5-not-given', detail: { urls: urls.length } }],
    };
  }

  // Step 2: the coordinator epoch, without the lock, before any network use.
  lib.checkCe(root, ce);

  const lockOpts = dryRun ? null : { retries: th.get('lock_retries'), exe: th.get('proc_exe') };
  const proc = dryRun ? null : lib.realProc({ exe: lockOpts.exe });
  const lockCtx = { ce, proc, now, retries: lockOpts?.retries };

  // Step 3: the URL list.
  let list;
  if (hasUrl) list = [{ url: flags.url, url_key: keyOf(flags.url) }];
  else {
    try {
      list = newUrls(root, dirs);
    } catch (e) {
      if (e?.exit === 3 && !dryRun) await tamperIncident(root, ctx, lockCtx, e.code);
      throw e;
    }
  }

  // Step 4: dry run.
  if (dryRun) {
    return {
      exit: 0,
      dry_run: true,
      result: { dry_run: true, urls: list, n: list.length, n_text: 0, n_unverifiable: 0 },
      reasons: [],
    };
  }

  // Steps 5-6: one URL at a time; fetch outside the lock, write inside it.
  const out = [];
  for (const item of list) {
    const entry = { url: item.url, url_key: item.url_key };
    let fetched;
    if (entry.url_key === null) {
      fetched = { reason: 'bad-scheme' };
    } else {
      fetched = await fetchUrl(item.url, { maxBytes, timeoutMs, maxRedirects, allowLoopback });
    }
    if (fetched.status !== undefined) entry.http_status = fetched.status;
    if (fetched.body) {
      entry.content_type = String(fetched.contentType ?? '');
      entry.raw_sha = lib.sha256hex(fetched.body);
      const cls = classifyBody(fetched.body, fetched.contentType);
      fetched.extractor = cls.extractor;
      if (cls.text !== undefined) {
        fetched.textBytes = Buffer.from(cls.text, 'utf8');
        entry.text_sha = lib.sha256hex(fetched.textBytes);
      } else {
        entry.reason = cls.reason;
      }
    } else {
      entry.reason = fetched.reason ?? 'http-error';
    }
    let created = false;
    let sourceChanged = false;
    if (entry.url_key !== null) {
      try {
        await lib.withRunLock(root, { script: SCRIPT, ...lockCtx }, (handle) => {
          const w = writeRetrieval(root, handle, dirs, entry, fetched, retrievedAt);
          created = w.created;
          sourceChanged = w.sourceChanged;
        });
      } catch (e) {
        if (e?.exit === 3 && e.code !== 'ledger-broken') await tamperIncident(root, ctx, lockCtx, e.code);
        throw e;
      }
    }
    entry.source_changed = sourceChanged;
    entry.created = created;
    out.push(entry);
    process.stderr.write(`snap: ${item.url} -> ${entry.text_sha ? 'text stored' : entry.reason}\n`);
  }

  // Step 7.
  const nText = out.filter((e) => e.text_sha).length;
  const unverifiable = out.filter((e) => !e.text_sha);
  const result = { urls: out, n: out.length, n_text: nText, n_unverifiable: unverifiable.length };
  if (unverifiable.length > 0) {
    return {
      exit: 2,
      dry_run: false,
      result,
      reasons: [{
        code: 'unverifiable',
        detail: { urls: unverifiable.map((e) => ({ url: e.url, url_key: e.url_key, reason: e.reason })) },
      }],
    };
  }
  return { exit: 0, dry_run: false, result, reasons: [] };
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    const run = fs.realpathSync(path.resolve(process.argv[1]));
    return process.platform === 'win32' ? self.toLowerCase() === run.toLowerCase() : self === run;
  } catch {
    return false;
  }
}

if (isMain()) lib.runMain(import.meta.url, SCRIPT, main);
