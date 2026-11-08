# LinkedIn — CEP Guard API

Entrega: 08/11/2026. Estado: pendente, após confirmar código e ausência de duplicata no perfil Bruno Pera. Texto PT/EN, 2104 caracteres. A limitação da consulta real está explícita no texto.

## Texto

🇧🇷 CEP inválido, CEP não encontrado e serviço indisponível precisam de respostas diferentes.

No dia 6 de “10 APIs em 10 dias”, publiquei a CEP Guard API: uma camada local de consulta ao ViaCEP com validação de formato, resposta normalizada e cache em memória.

Implementei cache de 5 minutos para resultados encontrados, 1 minuto para não encontrados, compartilhamento de consultas simultâneas ao mesmo CEP e timeout de 3 segundos, incluindo a leitura do corpo da resposta.

Aprendizado: limitar apenas o tempo até receber os cabeçalhos deixa uma resposta lenta continuar bloqueando a consulta.

12 testes determinísticos passaram por HTTP, com cenários de falha, expiração e reinício real. Node.js, sem dependências externas.

Transparência: a tentativa direta ao ViaCEP excedeu 3 segundos neste ambiente. A integração está implementada, mas a consulta real não foi confirmada nesta entrega. A demo usa dados sintéticos, identificados como fixture_demo. Código para execução local, sem endpoint hospedado.

🇬🇧 Invalid postal codes, missing codes and an unavailable provider need different responses.

For day 6 of “10 APIs in 10 days”, I built CEP Guard API: a local ViaCEP lookup layer with format validation, normalized responses and an in-memory cache.

It implements a 5-minute positive cache, a 1-minute negative cache, shared requests for the same code and a 3-second timeout covering response-body reading too.

My takeaway: timing out only the response headers still leaves slow response bodies unbounded.

All 12 deterministic tests passed, using HTTP and covering failures, expiration and real process restart. Node.js, no external dependencies.

Transparency: the direct ViaCEP request exceeded 3 seconds in this environment. The integration is implemented, but a live lookup was not confirmed. The demo uses clearly labeled synthetic fixtures. Local execution; no hosted endpoint.

Código / Code:
https://github.com/perabru/api-lab-2026-11-08

Que cenário de indisponibilidade você acrescentaria?
What failure scenario would you add? Feedback welcome!

#API #NodeJS #OpenSource #Backend
