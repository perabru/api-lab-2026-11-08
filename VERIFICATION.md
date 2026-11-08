# Verificação — 08/11/2026

Ambiente: Linux, Node.js v24.22.1. Nenhuma dependência externa instalada.

Comandos na raiz:
```bash
npm test
npm run demo
```

**12 testes de comportamento aprovados, 0 falhas, 0 cancelados, 0 ignorados; exit code 0.** Runner final: 684.077053 ms (variável por execução). O primeiro run por descoberta automática contou também fixtures.js como arquivo de teste (13 itens, sem falhas); o script foi ajustado para executar somente api.test.js e a rodada final teve 12 testes efetivos.

1. CEP normalizado, URL fixa, resposta e origem explícitas.
2. Entradas inválidas não fazem chamada externa.
3. Cache positivo e expiração exata com relógio controlado.
4. Cache negativo de CEP não encontrado e expiração.
5. Evicção da entrada mais antiga na capacidade configurada.
6. Consultas simultâneas iguais compartilham chamada; limite para CEPs distintos.
7. Falha de rede/HTTP retorna 502, não é cacheada; próxima tentativa recupera.
8. Timeout aborta requisição, retorna 504 e permite nova consulta.
9. CEP/UF incorretos, campos ausentes, JSON inválido, mídia e resposta grande rejeitados.
10. Timeout abrange leitura de corpo, não apenas cabeçalhos.
11. Health sem consulta, rotas, filtros, métodos e URL longa.
12. Dois processos Node reais com provedor dublê: miss/hit e cache vazio após reinício.

Os testes exercitam HTTP local real e substituem somente o provedor por respostas sintéticas controladas. Não fazem chamadas ao ViaCEP.

Demo: exit code 0. Source fixture_demo, endereço sintético “Rua de teste / Cidade demonstrativa”, primeira consulta miss, segunda hit, uma chamada ao dublê. Datas fixas da simulação não são horário de consulta real. Nenhum arquivo de execução criado.

## Tentativa de integração real

Uma única tentativa direta, em 08/11/2026:
```js
const r = await fetch('https://viacep.com.br/ws/01001000/json/', {
  signal: AbortSignal.timeout(3000), redirect: 'error'
});
// apenas se houver resposta: await r.json()
```

Resultado real: TimeoutError, “The operation was aborted due to timeout”. Nenhum endereço real foi obtido/validado por essa tentativa. Isso não demonstra indisponibilidade geral do ViaCEP; apenas o impedimento desta consulta neste ambiente. Documentação primária acessada via pesquisa web, separadamente. **live_integration_verified=false**. Código de integração implementado e API verificada localmente com testes determinísticos; não confundir essas evidências.

Limites: cache volátil, sem banco; após reinício a consulta é refeita. Sem teste de carga, Windows, hospedagem ou promessa de disponibilidade. TTL/capacidade/concurrency/timeout testados com parâmetros reduzidos e relógio controlado. Não realiza validação massiva de CEPs.

O npm emitiu aviso da configuração ambiental http-proxy, que não foi adicionada pelo projeto.
