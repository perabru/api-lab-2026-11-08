![CEP Guard — valide a entrada, limite a espera](brand/banner.svg)

# CEP Guard API

Uma camada local de consulta por CEP para formulários e estudos de integração. Normaliza o formato, distingue erros e reduz chamadas repetidas com cache em memória.

**Dia 06/10 · 08/11/2026 · Node.js 22+ · sem dependências externas · 12 testes aprovados**

[Contrato](#rotas-e-contrato) · [Demo sem rede](#experimente-sem-rede) · [Verificação](VERIFICATION.md) · [Anúncio](ANNOUNCEMENT.md) · [LinkedIn](LINKEDIN.md) · [Contribuir](CONTRIBUTING.md)

**Estado da integração:** código implementado para consultar o ViaCEP real, testes locais concluídos. A única tentativa direta ao ViaCEP nesta execução excedeu 3 s (TimeoutError); **consulta real ainda não confirmada neste ambiente**. Nenhum endereço foi inventado para substituir o resultado. Os exemplos sintéticos abaixo são explicitamente identificados.

Código publicado no GitHub para execução local; não há endpoint público hospedado ou interface gráfica.

## Início rápido

Requisito Node.js 22 ou superior; verificado com **v24.22.1**. Não precisa npm install.

```bash
git clone https://github.com/perabru/api-lab-2026-11-08.git
cd api-lab-2026-11-08
npm start
```

Em outro terminal:
```bash
curl http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3000/ceps/01001-000
```

O segundo comando usa o CEP do exemplo oficial e **faz uma consulta real pela sua conexão**. Não há resposta de endereço real verificada desta execução para reproduzir aqui. O resultado pode ser sucesso, CEP não encontrado ou erro externo. Health retorna 200:
```json
{"status":"ok","upstream_checked":false}
```

Health apenas confirma o processo; não testa a rede ou a disponibilidade do ViaCEP.

## Rotas e contrato

| Método | Rota | Uso |
|---|---|---|
| GET | /health | Estado local |
| GET | /ceps/:cep | Consulta validada com cache |

Aceita somente 8 dígitos ou 5 dígitos + hífen + 3 dígitos. Remove o hífen e usa URL fixa HTTPS do ViaCEP; não aceita URL fornecida pelo cliente. Não há filtros, query strings, barra final, pesquisa por rua, lote ou escrita.

Exemplo de validação exercitado nos testes:
```bash
curl -i http://127.0.0.1:3000/ceps/123
```
400:
```json
{"error":{"code":"invalid_cep","message":"Use 8 dígitos ou 00000-000."}}
```

Sucesso: `{address,meta}`. address contém cep formatado, street, complement, neighborhood, city, state, ibge e area_code. Strings vazias de logradouro/bairro/complemento são permitidas; um CEP genérico pode não identificar rua. Não valida residência, número, destinatário ou entregabilidade.

meta contém:
- source: viacep no executável padrão; fixture_demo/fixture_test somente em exemplos/testes com dublê.
- cache: miss (nova chamada), hit (cache válido), shared (aguardou chamada em curso para o mesmo CEP).
- fetched_at e expires_at: ISO UTC calculados localmente, não a data de atualização da base postal.

## Experimente sem rede

```bash
npm run demo
npm test
```

A demo cria um servidor temporário usando um provedor dublê; não acessa ViaCEP nem grava arquivos. **Dados sintéticos, sem validade postal.** Saída verificada da primeira consulta:

```json
{
  "address": {
    "cep": "12345-678",
    "street": "Rua de teste",
    "complement": "",
    "neighborhood": "Bairro de teste",
    "city": "Cidade demonstrativa",
    "state": "SP",
    "ibge": "",
    "area_code": ""
  },
  "meta": {
    "source": "fixture_demo",
    "cache": "miss",
    "fetched_at": "2026-01-01T00:00:00.000Z",
    "expires_at": "2026-01-01T00:05:00.000Z"
  }
}
```

A segunda consulta retorna cache=hit; apenas uma chamada ao dublê. Datas são fixas da simulação. **npm start nunca retorna essas fixtures como se fossem endereços reais.**

## Cache, tempo e limites

- Cache positivo: **5 minutos**; CEP não encontrado: **1 minuto**, contado ao terminar a consulta.
- Até **100 entradas**, evicção da inserção mais antiga. Não é LRU.
- Cache somente em memória, sem persistência ou base de endereços. Reiniciar limpa tudo; expirado não é servido como fallback.
- Consultas iguais em curso compartilham uma chamada. No máximo **4 CEPs distintos** em consulta simultânea; excedente retorna 503.
- Timeout de **3 segundos para cabeçalhos e corpo**; cancela via AbortController. Sem retry automático.
- Corpo do provedor até **32 KiB**. Rejeita conteúdo não JSON, CEP diferente do pedido, UF inválida e campos esperados ausentes. Redirecionamentos externos são recusados.
- Erros de rede, timeout e resposta inválida não entram no cache.
- Respostas HTTP usam Cache-Control: no-store; o cache interno é independente do navegador.
- URLs de entrada até 256 caracteres. PORT padrão 3000 e HOST padrão 127.0.0.1. Exemplo Bash: `PORT=3100 npm start`.

Não há autenticação, limite de requisições por usuário, quota por minuto ou proteção de produção. O limite de concorrência não impede um cliente de fazer muitas consultas sequenciais. **Uso local e moderado; não use para validar bases em massa.** O ViaCEP alerta que uso massivo pode causar bloqueio. O provedor não oferece nesta página uma quota numérica contratada ou SLA; este projeto não promete disponibilidade.

## Erros coerentes

| Status | Código | Significado |
|---|---|---|
| 400 | invalid_cep / invalid_query | Entrada rejeitada antes de chamar o provedor |
| 404 | cep_not_found | Provedor informou erro=true; inclui meta/cache |
| 404 | not_found | Rota ausente |
| 405 | method_not_allowed | Use GET; Allow: GET |
| 414 | uri_too_long | URL acima de 256 caracteres |
| 502 | upstream_unavailable / invalid_upstream | Rede, HTTP externo ou contrato inválido |
| 503 | busy | Limite de consultas distintas simultâneas |
| 504 | upstream_timeout | Consulta externa excedeu 3 s |
| 500 | internal_error | Falha interna inesperada |

Formato: `{"error":{"code":"...","message":"..."}}`. Um CEP com oito dígitos pode ser inexistente: formato e existência são validações diferentes. A consulta não cobra nem realiza pagamentos; não exige credenciais.

## Testes e contribuição

**08/11/2026: 12 testes aprovados, 0 falhas**, com HTTP real local e provedor substituído por dublês determinísticos. Cobrem TTL positivo/negativo, limites, compartilhamento, respostas inválidas, timeout durante corpo e reinício de processo. [Resultados e impedimento da consulta real](VERIFICATION.md).

Melhoria concreta: demo isolada sem rede e [guia de cenários de falha](CONTRIBUTING.md), permitindo contribuir mesmo sem acesso ao provedor. [Relatar bug](https://github.com/perabru/api-lab-2026-11-08/issues/new?template=bug_report.yml) com rota, status e estado do cache. Evite compartilhar endereços pessoais.

## Referência oficial — 08/11/2026

[ViaCEP](https://viacep.com.br/): formato de consulta, JSON, diferença entre entrada inválida e CEP não encontrado, aviso contra uso massivo. O endpoint de integração é `https://viacep.com.br/ws/{cep}/json/`. O projeto normaliza campos e adiciona cache/limites, sem afiliação ao provedor. Não mantém cópia da base postal.

## 💛 Incentive a continuidade

![Apoio voluntário por Pix](https://raw.githubusercontent.com/perabru/peradev-apis/main/brand/pix-support.svg)

Se este exemplo ajudou você a aprender ou construir, uma colaboração voluntária incentiva a continuidade e novas APIs.

### Chave Pix — copie e cole
```text
bruno.pera@unifesp.br
```

**O apoio é opcional. O código permanece aberto e gratuito para todos**, sem promessa de contrapartidas.

## English summary

Local ViaCEP lookup layer with validation, normalized responses, bounded positive/negative cache, shared requests and a full-response timeout. Twelve deterministic tests passed using synthetic provider fixtures. The live request timed out in this environment and remains unverified. No hosted endpoint.

**Licença MIT · Bruno Michel Pera** · [Calendário](https://github.com/perabru/peradev-apis/blob/main/docs/10-days.md)

[Post bilíngue publicado e verificado no LinkedIn em 08/11/2026](https://www.linkedin.com/feed/update/urn:li:activity:7525137869502525440/).
