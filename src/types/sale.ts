export interface Sale {
  documento: string;
  cpf_cnpj: string;
  nome: string;
  cliente: string;
  celular: string;
  endereco: string;
  data_transacao: string;
  data_venda: string;
  ultima_parcela: string;
  forma: string;
  produto: string;
  bandeira: string;
  parcelas: number;
  valor_total: number;
  valor_produto: number;
  valor_servico: number;
}