'use strict';
const crypto = require('crypto');
const { blake2b } = require('./blake2b.js');
const strs = ['', 'abc', '20261114|T1-0001|backend/app/core/config.py', 'x'.repeat(127), 'y'.repeat(128), 'z'.repeat(129), 'q'.repeat(256), 'ünïcødé|T1-0388|src/a/b.tsx', 'a'.repeat(1000)];
let ok = 0;
for (const s of strs) {
  const b = Buffer.from(s, 'utf8');
  const mine = blake2b(b, 64).toString('hex');
  const ref = crypto.createHash('blake2b512').update(b).digest('hex');
  const eq = mine === ref; if (eq) ok++;
  console.log(eq ? 'OK ' : 'BAD', b.length, mine.slice(0, 32));
}
console.log('match', ok, 'of', strs.length);
// RFC 7693 Appendix A: BLAKE2b-512("abc") begins ba80a53f981c4d0d
console.log('8-byte of "abc":', blake2b(Buffer.from('abc'), 8).toString('hex'));
process.exit(ok === strs.length ? 0 : 1);
