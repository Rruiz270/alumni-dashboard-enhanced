import fs from 'fs';
import path from 'path';

// Local database interface for caching processed data
export interface CachedData {
  lastUpdate: string;
  vindiData: {
    customers: any[];
    bills: any[];
    subscriptions: any[];
    lastFetchTime: string;
    totalCustomers: number;
    totalBills: number;
  };
  sheetsData: {
    rows: any[];
    lastFetchTime: string;
    totalRows: number;
    headers: string[];
  };
  processedData: {
    customers: ProcessedCustomer[];
    metrics: DashboardMetrics;
    lastProcessTime: string;
  };
  version: string;
}

export interface ProcessedCustomer {
  // Basic Info
  id: string;
  cpf_cnpj: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  
  // Product & Sales Info
  produto: string;
  nivel: string;
  valor_total_sheets: number;
  valor_produto_sheets: number;
  valor_servico_sheets: number;
  data_venda: string;
  forma_pagamento: string;
  parcelas: number;
  renovacao: boolean;
  vendedor: string;
  fonte: string;
  
  // Vindi Integration
  vindi_customer_id: number | null;
  vindi_status: string | null;
  vindi_total_paid: number;
  vindi_product_paid: number;
  vindi_service_paid: number;
  vindi_pending: number;
  vindi_overdue: number;
  has_subscription: boolean;
  subscription_status: string | null;
  subscription_next_billing: string | null;
  payment_method_vindi: string | null;
  
  // Payment History
  payment_history: PaymentRecord[];
  
  // Reconciliation Status
  status: 'FULLY_PAID' | 'PARTIALLY_PAID' | 'NO_PAYMENT' | 'OVERPAID' | 'MISSING_VINDI' | 'CANCELLED';
  discrepancy: number; // difference between sheets expected and vindi actual
  discrepancy_percentage: number;
  has_renewal: boolean;
  renewal_count: number;
  
  // Flags
  is_recurring: boolean;
  payment_ok: boolean; // for recurring customers
  missing_payments: number;
  last_payment_date: string | null;
  next_due_date: string | null;
  
  // Calculated fields
  ltv: number;
  days_as_customer: number;
  churn_risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PaymentRecord {
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  payment_method: string;
  source: 'VINDI' | 'SHEETS';
  type: 'PRODUCT' | 'SERVICE' | 'MIXED';
  bill_id?: number;
  subscription_id?: number;
}

export interface DashboardMetrics {
  // Student Metrics
  total_students: number;
  active_students: number;
  cancelled_students: number;
  recurring_students: number;
  one_time_students: number;
  
  // Financial Overview
  total_expected_sheets: number; // what sheets say should be paid
  total_paid_vindi: number; // what was actually paid in vindi
  total_product_expected: number;
  total_service_expected: number;
  total_product_paid: number;
  total_service_paid: number;
  
  // Payment Status
  students_fully_paid: number;
  students_partially_paid: number;
  students_no_payment: number;
  students_overpaid: number;
  students_missing_vindi: number;
  
  // Recurring Status
  recurring_ok: number; // recurring payments up to date
  recurring_missing: number; // recurring with missing payments
  recurring_overdue: number; // recurring with overdue payments
  
  // Discrepancies
  total_discrepancy: number;
  avg_discrepancy_percentage: number;
  high_discrepancy_count: number; // >R$1000 difference
  
  // Renewals
  customers_with_renewals: number;
  total_renewal_count: number;
  avg_renewals_per_customer: number;
  
  // Payment Methods
  payment_methods: Array<{
    method: string;
    count: number;
    total_amount: number;
    percentage: number;
  }>;
  
  // Last Update Info
  last_update: string;
  data_freshness_hours: number;
}

class LocalDatabase {
  private dataFile: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFile = path.join(dataDir, 'cached_data.json');
  }

  // Load cached data
  loadData(): CachedData | null {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return null;
      }
      
      const rawData = fs.readFileSync(this.dataFile, 'utf-8');
      const data = JSON.parse(rawData) as CachedData;
      
      // Validate data structure
      if (!data.version || !data.lastUpdate) {
        console.warn('Invalid cached data structure');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error loading cached data:', error);
      return null;
    }
  }

  // Save data to cache
  saveData(data: CachedData): void {
    try {
      data.lastUpdate = new Date().toISOString();
      data.version = '2.0';
      
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log(`✅ Data saved to cache at ${data.lastUpdate}`);
    } catch (error) {
      console.error('Error saving cached data:', error);
      throw error;
    }
  }

  // Check if cached data is fresh (less than X hours old)
  isCacheFresh(maxHours: number = 24): boolean {
    const data = this.loadData();
    if (!data) return false;
    
    const lastUpdate = new Date(data.lastUpdate);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff < maxHours;
  }

  // Get incremental update timestamp - returns the last fetch time for incremental updates
  getLastVindiFetch(): string | null {
    const data = this.loadData();
    return data?.vindiData?.lastFetchTime || null;
  }

  getLastSheetsFetch(): string | null {
    const data = this.loadData();
    return data?.sheetsData?.lastFetchTime || null;
  }

  // Clear cache
  clearCache(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        fs.unlinkSync(this.dataFile);
        console.log('✅ Cache cleared');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  // Get cache size in MB
  getCacheSize(): number {
    try {
      if (!fs.existsSync(this.dataFile)) return 0;
      const stats = fs.statSync(this.dataFile);
      return Math.round((stats.size / (1024 * 1024)) * 100) / 100;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  // Get cache age in hours
  getCacheAge(): number {
    const data = this.loadData();
    if (!data) return 0;
    
    const lastUpdate = new Date(data.lastUpdate);
    const now = new Date();
    return Math.round(((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)) * 10) / 10;
  }
}

export const database = new LocalDatabase();