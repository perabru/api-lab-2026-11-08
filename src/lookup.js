export class LookupError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
const fail = (status, code, message) => { throw new LookupError(status, code, message); };
export function normalizeCep(value) {
  if (typeof value !== 'string' || !/^(?:[0-9]{8}|[0-9]{5}-[0-9]{3})$/.test(value)) fail(400, 'invalid_cep', 'Use 8 dígitos ou 00000-000.');
  return value.replace('-', '');
}
const ufs = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
function normalizeResult(raw, cep) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(502, 'invalid_upstream', 'Resposta inválida do provedor.');
  if (raw.erro === true || raw.erro === 'true') return null;
  if ('erro' in raw && raw.erro !== false) fail(502, 'invalid_upstream', 'Resposta inválida do provedor.');
  const fields = ['cep', 'logradouro', 'complemento', 'bairro', 'localidade', 'uf', 'ibge', 'ddd'];
  if (!fields.every(key => typeof raw[key] === 'string' && raw[key].length <= 300 && !/[\u0000-\u001f\u007f]/.test(raw[key])) || !/^[0-9]{5}-[0-9]{3}$/.test(raw.cep) || raw.cep.replace('-', '') !== cep || !ufs.has(raw.uf) || !raw.localidade.trim()) fail(502, 'invalid_upstream', 'Resposta inválida do provedor.');
  return { cep: raw.cep, street: raw.logradouro, complement: raw.complemento, neighborhood: raw.bairro, city: raw.localidade, state: raw.uf, ibge: raw.ibge, area_code: raw.ddd };
}
export function createLookup({ fetchImpl = fetch, now = () => Date.now(), timeoutMs = 3000, positiveTtlMs = 300000, negativeTtlMs = 60000, maxEntries = 100, maxConcurrent = 4, source = 'viacep' } = {}) {
  const cache = new Map(), inFlight = new Map();
  async function request(cep) {
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new LookupError(504, 'upstream_timeout', 'Tempo limite de consulta excedido.')); }, timeoutMs); });
    try {
      const run = async () => {
        const res = await fetchImpl(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
        if (!res.ok) { await res.body?.cancel(); fail(502, 'upstream_unavailable', 'Provedor indisponível.'); }
        if (!res.headers.get('content-type')?.toLowerCase().includes('application/json')) { await res.body?.cancel(); fail(502, 'invalid_upstream', 'Provedor não retornou JSON.'); }
        let bytes = 0; const chunks = [];
        for await (const chunk of res.body) { bytes += chunk.byteLength; if (bytes > 32768) { controller.abort(); fail(502, 'invalid_upstream', 'Resposta do provedor acima do limite.'); } chunks.push(chunk); }
        let raw;
        try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { fail(502, 'invalid_upstream', 'JSON inválido do provedor.'); }
        return normalizeResult(raw, cep);
      };
      return await Promise.race([run(), deadline]);
    } catch (e) {
      if (e instanceof LookupError) throw e;
      if (controller.signal.aborted) fail(504, 'upstream_timeout', 'Tempo limite de consulta excedido.');
      fail(502, 'upstream_unavailable', 'Não foi possível consultar o provedor.');
    } finally { clearTimeout(timer); }
  }
  return async input => {
    const cep = normalizeCep(input);
    const cached = cache.get(cep);
    if (cached && now() < cached.expiresAt) return { ...structuredClone(cached), source, cache: 'hit' };
    if (cached) cache.delete(cep);
    if (inFlight.has(cep)) return { ...structuredClone(await inFlight.get(cep)), source, cache: 'shared' };
    if (inFlight.size >= maxConcurrent) fail(503, 'busy', 'Consultas simultâneas no limite; tente depois.');
    const work = (async () => {
      const address = await request(cep), fetchedAt = now();
      const entry = { address, fetchedAt, expiresAt: fetchedAt + (address ? positiveTtlMs : negativeTtlMs) };
      // Bounded insertion-order cache, not a persistent address database.
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
      cache.set(cep, entry); return entry;
    })();
    inFlight.set(cep, work);
    try { return { ...structuredClone(await work), source, cache: 'miss' }; } finally { inFlight.delete(cep); }
  };
}
