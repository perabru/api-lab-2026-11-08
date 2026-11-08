import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createLookup } from '../src/lookup.js';
import { fixture, response } from '../test/fixtures.js';
let calls = 0;
const lookup = createLookup({ source: 'fixture_demo', now: () => Date.parse('2026-01-01T00:00:00Z'), fetchImpl: async () => { calls++; return response(fixture); } });
const server = createApp({ lookup }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const first = await (await fetch(base + '/ceps/12345-678')).json();
  const second = await (await fetch(base + '/ceps/12345678')).json();
  assert.equal(first.meta.cache, 'miss'); assert.equal(second.meta.cache, 'hit'); assert.equal(calls, 1);
  console.log('DEMONSTRAÇÃO SINTÉTICA: não representa endereço postal real. Sem acesso ao ViaCEP.');
  console.log(JSON.stringify(first, null, 2)); console.log('Segunda consulta: cache=hit; chamadas ao dublê=1.');
} finally { await new Promise(resolve => server.close(resolve)); }
