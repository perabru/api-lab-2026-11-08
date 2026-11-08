# Contribua com cenários de falha reproduzíveis

```bash
npm test
npm run demo
```

Os testes e a demo são locais, sem serviço externo. Adicione um cenário usando fetchImpl injetado e relógio controlado; preserve o limite de tempo durante corpo e cabeçalhos. Novas fixtures precisam ser declaradas sintéticas e manter source fixture_test ou fixture_demo.

Não transforme a suíte em consultas de CEPs em massa. O ViaCEP alerta sobre bloqueio por uso massivo. Não inclua endereços pessoais, segredos ou logs de usuários. Use o formulário de bug com rota, status, estado de cache e expectativa.

Melhoria desta entrega: demo sem rede e guia de falhas para reproduzir timeout/cache sem depender da internet. O executável padrão usa ViaCEP real e não ativa fixtures por variável de ambiente.

Código MIT, aberto e gratuito. Pix bruno.pera@unifesp.br é colaboração voluntária à continuidade, sem contrapartidas.
