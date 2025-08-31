// Dashboard type definitions

export interface CustomerMetrics {
  id: string;
  // Basic info
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  vendedor: string;
  
  // Product info
  produto: string;
  nivel: string;
  duracao_curso: number;
  renovacao: boolean;
  fonte: string;
  
  // Financial data
  valor_total: number;
  valor_produto: number;
  valor_servico: number;
  valor_liquido: number;
  taxa: number;
  desconto: number;
  
  // Payment info
  forma_pagamento: string;
  bandeira: string;
  adquirente: string;
  parcelas: number;
  ultima_parcela: string;
  
  // Status
  status: string;
  acesso_enviado: boolean;
  data_venda: string;
  data_transacao: string;
  
  // Cancellation data
  cancelado: boolean;
  data_cancelamento?: string;
  tipo_cancelamento?: string;
  razao_cancelamento?: string;
  multa?: number;
  pago_ate_cancelamento?: number;
  perda?: number;
  
  // Vindi match data
  hasVindiMatch: boolean;
  vindiCustomerId?: number;
  vindiStatus?: string;
  vindiTotalAmount?: number;
  vindiPaidAmount?: number;
  vindiPendingAmount?: number;
  
  // Calculated metrics
  mrr?: number;
  ltv?: number;
  churnRisk?: 'low' | 'medium' | 'high';
  diasAteAcesso?: number;
}

export interface DashboardSummary {
  // Executive KPIs
  grossRevenue: number;
  netRevenue: number;
  totalFees: number;
  totalDiscounts: number;
  margin: string;
  
  // Customer metrics
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  renewals: number;
  renewalRate: string;
  
  // MRR/ARR
  mrr: number;
  arr: number;
  avgTicket: number;
  
  // Churn
  churnRate: string;
  canceledCustomers: number;
  earlyCancellations: number;
  
  // Operations
  pendingAccess: number;
  avgDaysToAccess: string;
  
  // Vindi match
  customersWithVindiMatch: number;
  vindiMatchRate: string;
}

export interface CancellationReason {
  reason: string;
  count: number;
}

export interface PaymentMethod {
  name: string;
  value: number;
  percentage: string;
}

export interface AcquirerStats {
  acquirer: string;
  count: number;
  volume: number;
  avgFee: string;
}

export interface ProductStats {
  product: string;
  count: number;
  revenue: number;
  avgTicket: number;
}

export interface SourceStats {
  source: string;
  count: number;
  revenue: number;
  churnRate: string;
  avgTicket: number;
}

export interface SellerStats {
  seller: string;
  count: number;
  revenue: number;
  newSales: number;
  renewals: number;
  churnCount: number;
  churnRate: string;
  avgTicket: number;
  avgDiscount: string;
}

export interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  newCustomers: number;
  renewals: number;
}

export interface CohortRetention {
  '30days': number;
  '60days': number;
  '90days': number;
  '180days': number;
}

export interface DashboardData {
  customers: CustomerMetrics[];
  summary: DashboardSummary;
  cancellationReasons: CancellationReason[];
  paymentMethods: PaymentMethod[];
  acquirerStats: AcquirerStats[];
  productMix: ProductStats[];
  sourceAnalysis: SourceStats[];
  sellerPerformance: SellerStats[];
  alerts: Alert[];
  monthlyRevenue: MonthlyRevenue[];
  cohortRetention: CohortRetention;
  // Legacy compatibility
  inconsistencies?: any[];
}

// Filter options
export interface DashboardFilters {
  period?: {
    start: Date;
    end: Date;
  };
  vendedor?: string;
  nivel?: string;
  fonte?: string;
  renovacao?: boolean;
  formaPagamento?: string;
  bandeira?: string;
  adquirente?: string;
  produto?: string;
  duracao?: number;
  desconto?: {
    min: number;
    max: number;
  };
  cancelado?: boolean;
  janelaCancelamento?: '7days' | 'after7days';
  acessoEnviado?: boolean;
  status?: string;
}

// View types
export type DashboardView = 'executive' | 'commercial' | 'finance' | 'operations' | 'cancellations';