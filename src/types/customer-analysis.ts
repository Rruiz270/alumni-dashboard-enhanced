import { Sale } from './sale';

export interface CustomerPaymentAnalysis {
  // Customer identification
  cpf_cnpj: string;
  nome: string;
  email: string;
  celular: string;
  endereco: string;
  
  // Payment analysis
  firstTransaction: Sale;
  allTransactions: Sale[];
  
  // Payment status
  totalContractValue: number;
  totalPaidAmount: number;
  delinquentAmount: number;
  futureRecurringAmount: number;
  
  // Payment structure
  paymentType: 'full' | 'partial_recurring';
  installments: number;
  
  // Status indicators
  isUpToDate: boolean;
  isDelinquent: boolean;
  hasInconsistencies: boolean;
  
  // Inconsistencies with spreadsheet
  spreadsheetData?: SpreadsheetRow;
  inconsistencies: string[];
  
  // Dates
  firstTransactionDate: string;
  lastPaymentDate: string;
  nextPaymentDue: string;
}

export interface SpreadsheetRow {
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

export interface PaymentSummary {
  totalCustomers: number;
  totalContractValue: number;
  totalPaidAmount: number;
  totalDelinquent: number;
  totalFutureRecurring: number;
  upToDateCustomers: number;
  delinquentCustomers: number;
  customersWithInconsistencies: number;
}