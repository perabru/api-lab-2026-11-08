import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createLookup } from '../src/lookup.js';
import { createApp } from '../src/app.js';
import { fixture, response } from './fixtures.js';
async function app(t, options = {}) {
  let calls = 0;
  const lookup = createLookup({ source: 'fixture_test', fetchImpl: async (...args) => { calls++; return options.fetchImpl ? options.fetchImpl(...args) : response(fixture); }, ...Object.fromEntries(Object.entries(options).filter(([k]) => k !== 'fetchImpl')) });
  const server = createApp({ lookup }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { calls: () => calls, lookup, get: async (path, opts) => { const r = await fetch(`http://127.0.0.1:${server.address().port}${path}`, opts); return { status: r.status, headers: r.headers, body: await r.json() }; } };
}
test('normalizes CEP and returns normalized address with explicit source and cache', async t => {
  const a = await app(t, { now: () => Date.parse('2026-01-01T00:00:00Z'), fetchImpl: async (url, opts) => { assert.equal(url, 'https://viacep.com.br/ws/12345678/json/'); assert.equal(opts.redirect, 'error'); return response(fixture); } });
  const r = await a.get('/ceps/12345-678'); assert.equal(r.status, 200); assert.equal(r.body.address.city, 'Cidade demonstrativa'); assert.equal(r.body.meta.source, 'fixture_test'); assert.equal(r.body.meta.cache, 'miss'); assert.equal(r.body.meta.expires_at, '2026-01-01T00:05:00.000Z');
  assert.equal((await a.get('/ceps/12345678')).body.meta.cache, 'hit'); assert.equal(a.calls(), 1);
});
test('invalid input rejected before outbound request', async t => {
  const a = await app(t);
  for (const cep of ['123', '123456789', '1234a678', '12345%20678', '1234-5678', '%31%32%33%34%35%36%37%38']) assert.equal((await a.get('/ceps/' + cep)).status, 400);
  assert.equal(a.calls(), 0);
});
test('positive cache expires at boundary and updates timestamp', async t => {
  let now = 0; const a = await app(t, { now: () => now, positiveTtlMs: 100 });
  await a.get('/ceps/12345678'); now = 99; assert.equal((await a.get('/ceps/12345678')).body.meta.cache, 'hit');
  now = 100; const r = await a.get('/ceps/12345678'); assert.equal(r.body.meta.cache, 'miss'); assert.equal(r.body.meta.fetched_at, new Date(100).toISOString()); assert.equal(a.calls(), 2);
});
test('not found uses short negative cache and expires', async t => {
  let now = 0; const a = await app(t, { now: () => now, negativeTtlMs: 60, fetchImpl: async () => response({ erro: 'true' }) });
  assert.equal((await a.get('/ceps/12345678')).body.error.code, 'cep_not_found');
  const hit = await a.get('/ceps/12345678'); assert.equal(hit.status, 404); assert.equal(hit.body.meta.cache, 'hit');
  now = 60; assert.equal((await a.get('/ceps/12345678')).body.meta.cache, 'miss'); assert.equal(a.calls(), 2);
});
test('bounded cache evicts oldest insertion', async t => {
  const a = await app(t, { maxEntries: 1, fetchImpl: async url => response({ ...fixture, cep: url.includes('87654321') ? '87654-321' : fixture.cep }) });
  await a.get('/ceps/12345678'); await a.get('/ceps/87654321'); assert.equal((await a.get('/ceps/12345678')).body.meta.cache, 'miss'); assert.equal(a.calls(), 3);
});
test('concurrent equal CEPs share request; different CEP saturation returns 503', async t => {
  let release, entered; const ready = new Promise(r => { entered = r; }); const gate = new Promise(r => { release = r; });
  const a = await app(t, { maxConcurrent: 1, fetchImpl: async () => { entered(); await gate; return response(fixture); } });
  const first = a.get('/ceps/12345678'); await ready;
  const shared = a.lookup('12345-678'); assert.equal((await a.get('/ceps/87654321')).status, 503);
  release(); assert.equal((await first).status, 200); assert.equal((await shared).cache, 'shared'); assert.equal(a.calls(), 1);
});
test('network and HTTP errors are 502, not cached; retry recovers', async t => {
  let mode = 'network'; const a = await app(t, { fetchImpl: async () => { if (mode === 'network') throw Error('private error details'); if (mode === 'http') return new Response('', { status: 429 }); return response(fixture); } });
  let r = await a.get('/ceps/12345678'); assert.equal(r.status, 502); assert.ok(!JSON.stringify(r.body).includes('private'));
  mode = 'http'; assert.equal((await a.get('/ceps/12345678')).status, 502);
  mode = 'ok'; assert.equal((await a.get('/ceps/12345678')).body.meta.cache, 'miss'); assert.equal(a.calls(), 3);
});
test('timeout aborts request and returns 504; next attempt allowed', async t => {
  let hang = true; const a = await app(t, { timeoutMs: 25, fetchImpl: async (_, { signal }) => hang ? new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })) : response(fixture) });
  assert.equal((await a.get('/ceps/12345678')).status, 504); hang = false; assert.equal((await a.get('/ceps/12345678')).status, 200); assert.equal(a.calls(), 2);
});
test('invalid JSON, wrong CEP/UF, missing fields and oversized body rejected', async t => {
  const values = [response({ ...fixture, cep: '87654-321' }), response({ ...fixture, uf: 'XX' }), response({ cep: fixture.cep }), response([]), response({ ...fixture, erro: 'unexpected' }), new Response('{', { headers: { 'Content-Type': 'application/json' } }), new Response('x'.repeat(32769), { headers: { 'Content-Type': 'application/json' } }), new Response('{}', { headers: { 'Content-Type': 'text/plain' } })];
  const a = await app(t, { fetchImpl: async () => values.shift() });
  for (let i = 0; i < 8; i++) { const r = await a.get('/ceps/12345678'); assert.equal(r.status, 502); assert.equal(r.body.error.code, 'invalid_upstream'); }
  assert.equal(a.calls(), 8);
});
test('deadline includes response body, not just response headers', async t => {
  const a = await app(t, { timeoutMs: 25, fetchImpl: async (_, { signal }) => new Response(new ReadableStream({ start(controller) { signal.addEventListener('abort', () => controller.error(Error('aborted')), { once: true }); } }), { headers: { 'Content-Type': 'application/json' } }) });
  assert.equal((await a.get('/ceps/12345678')).status, 504);
});
test('health avoids provider; route/query/method errors coherent', async t => {
  const a = await app(t);
  assert.deepEqual((await a.get('/health')).body, { status: 'ok', upstream_checked: false });
  assert.equal((await a.get('/ceps/12345678?q=a')).status, 400); assert.equal((await a.get('/unknown')).status, 404);
  const r = await a.get('/ceps/12345678', { method: 'POST' }); assert.equal(r.status, 405); assert.equal(r.headers.get('Allow'), 'GET');
  assert.equal((await a.get('/ceps/'+'x'.repeat(257))).status, 414); assert.equal(a.calls(), 0);
});
test('real process restart starts with empty in-memory cache, synthetic source', async () => {
  const code = `import {createApp} from './src/app.js'; import {createLookup} from './src/lookup.js'; import {fixture,response} from './test/fixtures.js'; const s=createApp({lookup:createLookup({source:'fixture_test',fetchImpl:async()=>response(fixture)})});s.listen(0,'127.0.0.1',()=>console.log(s.address().port));process.on('SIGTERM',()=>s.close());`;
  async function run() { const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] });
    try { const [chunk] = await once(child.stdout, 'data'); const url = `http://127.0.0.1:${Number(chunk.toString().trim())}/ceps/12345678`; const first = await (await fetch(url)).json(); const second = await (await fetch(url)).json(); assert.equal(first.meta.cache, 'miss'); assert.equal(second.meta.cache, 'hit'); assert.equal(first.meta.source, 'fixture_test'); return first.address; }
    finally { const ended = once(child, 'exit'); child.kill('SIGTERM'); await ended; } }
  assert.deepEqual(await run(), await run());
});
