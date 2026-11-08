// Synthetic test data. This is not a verified postal address.
export const fixture = { cep: '12345-678', logradouro: 'Rua de teste', complemento: '', bairro: 'Bairro de teste', localidade: 'Cidade demonstrativa', uf: 'SP', ibge: '', ddd: '' };
export const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
