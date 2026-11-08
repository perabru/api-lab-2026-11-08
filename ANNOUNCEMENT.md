# Valide a entrada. Limite a espera.

**CEP Guard API · Dia 06/10 · 08/11/2026**

Uma API local para consultar CEPs via ViaCEP, distinguir formato inválido, não encontrado e falhas externas. Resposta normalizada, cache positivo/negativo, compartilhamento de chamadas iguais e timeout que inclui o corpo.

**Node.js 22+ · sem dependências externas · 12 testes determinísticos aprovados**

```bash
git clone https://github.com/perabru/api-lab-2026-11-08.git
cd api-lab-2026-11-08
npm run demo
npm test
npm start
```

[README e contrato](README.md) · [Código](src/lookup.js) · [Evidências](VERIFICATION.md) · [Contribuir](CONTRIBUTING.md) · [Post bilíngue](LINKEDIN.md)

**Integração real não confirmada nesta execução:** uma tentativa direta ao ViaCEP excedeu 3 s. Não inventamos endereço para substituir esse resultado. A demo e os testes usam dados sintéticos identificados como fixture_demo/fixture_test e não acessam o serviço. O executável padrão implementa a consulta real, sujeita à rede e ao provedor.

A melhoria de contribuição é uma demo sem rede com asserções e guia de cenários de falha. Teste expiração/timeout sem depender da internet; envie um caso reproduzível por issue.

Referência oficial [ViaCEP](https://viacep.com.br/), consultada em 08/11/2026. Uso moderado, sem validação massiva, sem afiliação ou endpoint hospedado.

O README destaca Pix voluntário bruno.pera@unifesp.br como incentivo à continuidade. Código aberto e gratuito, sem contrapartidas.

**English:** A local ViaCEP lookup layer with bounded cache, request sharing and full-response timeout. Twelve deterministic tests passed. The direct live request timed out and remains unverified; demos use labeled synthetic fixtures. Explore the offline demo and contribute a failure scenario.

[Post bilíngue publicado e verificado no LinkedIn em 08/11/2026](https://www.linkedin.com/feed/update/urn:li:activity:7525137869502525440/).
