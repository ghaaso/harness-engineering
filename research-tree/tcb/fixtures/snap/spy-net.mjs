// Test-only preload for snap.mjs tests (node --import <this file>).
// Records, into the file named by the environment variable SNAP_SPY_OUT, every http(s) request
// call, every dns lookup and every global fetch the script under test makes, and probes the
// `lookup` function of the agent each request is given. Changes no behaviour.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const out = process.env.SNAP_SPY_OUT;
function log(o) {
  if (out) fs.appendFileSync(out, JSON.stringify(o) + '\n');
}

function optionsOf(args) {
  const isObj = (a) => a && typeof a === 'object' && !(a instanceof URL);
  if (isObj(args[0])) return args[0];
  if (isObj(args[1])) return args[1];
  return null;
}

function probe(lookup, rec, mod, opts) {
  // ask the request's own lookup for an unrelated name: it must answer only the address the
  // script already checked
  for (const o of [{}, { all: true }]) {
    try {
      lookup('spy-probe.invalid', o, (err, address, family) => {
        log({ kind: 'lookup-answer', req: rec.req, all: !!o.all, err: err ? String(err.code || err) : null, address: address ?? null, family: family ?? null });
      });
    } catch (e) {
      log({ kind: 'lookup-throw', req: rec.req, message: String(e && e.message) });
    }
  }
}

let counter = 0;
function wrap(mod, proto, name) {
  const orig = mod[name];
  mod[name] = function (...args) {
    const opts = optionsOf(args);
    const agent = opts ? opts.agent : undefined;
    const lookup = (agent && agent.options && agent.options.lookup) || (opts && opts.lookup) || null;
    const rec = {
      kind: 'request',
      req: ++counter,
      proto,
      call: name,
      agentPresent: !!agent,
      agentIsGlobal: agent === mod.globalAgent,
      agentIsInstance: !!agent && agent instanceof mod.Agent,
      keepAlive: agent ? !!agent.keepAlive : null,
      hasLookup: typeof lookup === 'function',
    };
    log(rec);
    if (typeof lookup === 'function') probe(lookup, rec, mod, opts);
    return orig.apply(this, args);
  };
}

wrap(http, 'http', 'request');
wrap(http, 'http', 'get');
wrap(https, 'https', 'request');
wrap(https, 'https', 'get');

for (const holder of [dns, dns.promises]) {
  const orig = holder.lookup;
  holder.lookup = function (host, ...rest) {
    log({ kind: 'dns', host: String(host) });
    return orig.call(this, host, ...rest);
  };
}

if (typeof globalThis.fetch === 'function') {
  const origFetch = globalThis.fetch;
  globalThis.fetch = function (...a) {
    log({ kind: 'fetch' });
    return origFetch.apply(this, a);
  };
}

syncBuiltinESMExports();
