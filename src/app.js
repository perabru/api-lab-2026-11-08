import { createServer } from 'node:http';
import { createLookup, LookupError } from './lookup.js';
export function createApp({ lookup = createLookup() } = {}) {
  return createServer(async (req, res) => {
    const send = (status, data, headers = {}) => { const body = JSON.stringify(data); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(req.method === 'HEAD' ? undefined : body); };
    try {
      if (req.url.length > 256) throw new LookupError(414, 'uri_too_long', 'URL muito longa.');
      const url = new URL(req.url, 'http://localhost');
      const match = url.pathname.match(/^\/ceps\/([^/]+)$/);
      if (url.pathname !== '/health' && !match) throw new LookupError(404, 'not_found', 'Rota não encontrada.');
      if (req.method !== 'GET') return send(405, { error: { code: 'method_not_allowed', message: 'Use GET.' } }, { Allow: 'GET' });
      if (url.search) throw new LookupError(400, 'invalid_query', 'Não há parâmetros de consulta.');
      if (url.pathname === '/health') return send(200, { status: 'ok', upstream_checked: false });
      const result = await lookup(match[1]);
      const meta = { source: result.source, cache: result.cache, fetched_at: new Date(result.fetchedAt).toISOString(), expires_at: new Date(result.expiresAt).toISOString() };
      if (!result.address) return send(404, { error: { code: 'cep_not_found', message: 'CEP não encontrado pelo provedor.' }, meta });
      return send(200, { address: result.address, meta });
    } catch (e) { return send(e.status ?? 500, { error: { code: e.code ?? 'internal_error', message: e.status ? e.message : 'Erro interno.' } }); }
  });
}
