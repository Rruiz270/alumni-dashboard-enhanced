# Vindi Sales Dashboard

Dashboard para visualizar vendas do Better Education através da API Vindi.

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env`
   - Adicione sua chave de API Vindi

4. Execute o projeto:
   ```bash
   npm run dev
   ```

## Deploy no Vercel

1. Faça fork deste repositório
2. Conecte ao Vercel
3. Configure a variável de ambiente `VINDI_API_KEY`
4. Deploy!

## Estrutura de Dados

O dashboard exibe as seguintes informações:
- Documento
- CPF/CNPJ
- Nome
- Cliente
- Celular
- Endereço
- Data Transação
- Data Venda
- Última Parcela
- Forma de Pagamento
- Produto
- Bandeira
- Parcelas
- Valor Total
- Valor Produto
- Valor Serviço