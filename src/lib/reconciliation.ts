import { VindiCustomer, VindiBill, VindiSubscription } from './vindi-api';
import { ProcessedCustomer, PaymentRecord, DashboardMetrics } from './database';

// Google Sheets row interface
export interface SheetsRow {
  'cpf/cnpj'?: string;
  'Nome'?: string;
  'Cliente'?: string;
  'Celular'?: string;
  'Endereco'?: string;
  'data_venda'?: string;
  'valor_total'?: string;
  'valor_produto'?: string;
  'valor_servico'?: string;
  'forma'?: string;
  'produto'?: string;
  'nivel'?: string;
  'renovacao'?: string;
  'parcelas'?: string;
  'vendedor'?: string;
  'fonte'?: string;
  'bandeira'?: string;
  [key: string]: string | undefined;
}

// Utility functions for data normalization
export class DataNormalizer {
  
  // Normalize CPF/CNPJ for consistent matching
  static normalizeCpfCnpj(value: string | undefined): string {
    if (!value) return '';
    
    // Remove all non-numeric characters
    const cleaned = value.replace(/[^\d]/g, '');
    
    // Validate length
    if (cleaned.length !== 11 && cleaned.length !== 14) {
      return cleaned; // Return as-is if invalid length
    }
    
    return cleaned;
  }

  // Normalize email for matching
  static normalizeEmail(email: string | undefined): string {
    if (!email) return '';
    return email.toLowerCase().trim();
  }

  // Normalize name for fuzzy matching
  static normalizeName(name: string | undefined): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize spaces
  }

  // Parse monetary values from sheets
  static parseMoneyValue(value: string | undefined): number {
    if (!value) return 0;
    
    // Handle different formats: "1.234,56", "1,234.56", "1234.56", etc.
    const cleanValue = value
      .replace(/[^\d,.-]/g, '') // Remove currency symbols and spaces
      .trim();
    
    if (!cleanValue) return 0;
    
    // If contains comma as decimal separator
    if (cleanValue.includes(',') && cleanValue.lastIndexOf(',') > cleanValue.lastIndexOf('.')) {
      return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    // If contains dot as decimal separator
    return parseFloat(cleanValue.replace(/,/g, '')) || 0;
  }

  // Parse date values
  static parseDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    
    try {
      // Handle different date formats: DD/MM/YYYY, YYYY-MM-DD, etc.
      const normalizedDate = dateStr.replace(/[^\d\/\-]/g, '');
      
      if (normalizedDate.includes('/')) {
        const [day, month, year] = normalizedDate.split('/');
        if (year && month && day) {
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
        }
      } else if (normalizedDate.includes('-')) {
        return new Date(normalizedDate).toISOString();
      }
      
      return new Date(dateStr).toISOString();
    } catch {
      return null;
    }
  }

  // Calculate name similarity score (0-1)
  static calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);
    
    if (!normalized1 || !normalized2) return 0;
    
    // Simple word overlap algorithm
    const words1 = normalized1.split(' ').filter(w => w.length > 2);
    const words2 = normalized2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        matches++;
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }
}

// Main reconciliation engine
export class ReconciliationEngine {
  
  // Match customers between sheets and Vindi
  static matchCustomers(
    sheetsData: SheetsRow[], 
    vindiCustomers: VindiCustomer[]
  ): Map<string, { vindiCustomer: VindiCustomer; confidence: number; matchType: string }> {
    
    const matches = new Map<string, { vindiCustomer: VindiCustomer; confidence: number; matchType: string }>();
    
    console.log(`🔍 Starting customer matching: ${sheetsData.length} sheets rows vs ${vindiCustomers.length} Vindi customers`);
    
    for (const sheetRow of sheetsData) {
      const sheetCpf = DataNormalizer.normalizeCpfCnpj(sheetRow['cpf/cnpj']);
      const sheetEmail = DataNormalizer.normalizeEmail(sheetRow['Cliente'] || sheetRow['Nome']);
      const sheetName = DataNormalizer.normalizeName(sheetRow['Nome'] || sheetRow['Cliente']);
      
      if (!sheetCpf) continue; // Skip rows without CPF/CNPJ
      
      let bestMatch: { customer: VindiCustomer; confidence: number; matchType: string } | null = null;
      
      // 1. Try exact CPF/CNPJ match (highest priority)
      for (const vindiCustomer of vindiCustomers) {
        const vindiCpf = DataNormalizer.normalizeCpfCnpj(vindiCustomer.registry_code);
        
        if (vindiCpf && sheetCpf === vindiCpf) {
          bestMatch = {
            customer: vindiCustomer,
            confidence: 1.0,
            matchType: 'CPF_EXACT'
          };
          break;
        }
      }
      
      // 2. Try email match if no CPF match
      if (!bestMatch && sheetEmail) {
        for (const vindiCustomer of vindiCustomers) {
          const vindiEmail = DataNormalizer.normalizeEmail(vindiCustomer.email);
          
          if (vindiEmail && sheetEmail === vindiEmail) {
            // Verify CPF similarity if available
            const vindiCpf = DataNormalizer.normalizeCpfCnpj(vindiCustomer.registry_code);
            const confidence = vindiCpf && sheetCpf ? (vindiCpf === sheetCpf ? 1.0 : 0.7) : 0.8;
            
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = {
                customer: vindiCustomer,
                confidence,
                matchType: 'EMAIL_EXACT'
              };
            }
          }
        }
      }
      
      // 3. Try fuzzy name match with CPF validation (lowest priority)
      if (!bestMatch && sheetName) {
        for (const vindiCustomer of vindiCustomers) {
          const vindiName = DataNormalizer.normalizeName(vindiCustomer.name);
          const nameSimilarity = DataNormalizer.calculateNameSimilarity(sheetName, vindiName);
          
          if (nameSimilarity > 0.7) { // 70% name similarity threshold
            // Must have some CPF correlation
            const vindiCpf = DataNormalizer.normalizeCpfCnpj(vindiCustomer.registry_code);
            
            if (vindiCpf && sheetCpf) {
              // Check if at least part of CPF matches
              const cpfSimilarity = vindiCpf === sheetCpf ? 1.0 : 
                vindiCpf.substring(0, 6) === sheetCpf.substring(0, 6) ? 0.6 : 0;
              
              const confidence = (nameSimilarity * 0.6) + (cpfSimilarity * 0.4);
              
              if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
                bestMatch = {
                  customer: vindiCustomer,
                  confidence,
                  matchType: 'NAME_FUZZY'
                };
              }
            }
          }
        }
      }
      
      // Store the best match
      if (bestMatch) {
        matches.set(sheetCpf, {
          vindiCustomer: bestMatch.customer,
          confidence: bestMatch.confidence,
          matchType: bestMatch.matchType
        });
      }
    }
    
    console.log(`✅ Customer matching complete: ${matches.size} matches found`);
    return matches;
  }

  // Process payment records from Vindi bills
  static processPaymentRecords(bills: VindiBill[], customerId: number): PaymentRecord[] {
    const records: PaymentRecord[] = [];
    
    const customerBills = bills.filter(bill => bill.customer.id === customerId);
    
    for (const bill of customerBills) {
      // Determine payment type based on bill items
      let type: 'PRODUCT' | 'SERVICE' | 'MIXED' = 'MIXED';
      if (bill.bill_items) {
        const hasProduct = bill.bill_items.some(item => 
          item.product.name.toLowerCase().includes('produto') ||
          item.product.name.toLowerCase().includes('course') ||
          item.product.name.toLowerCase().includes('curso')
        );
        const hasService = bill.bill_items.some(item => 
          item.product.name.toLowerCase().includes('serviço') ||
          item.product.name.toLowerCase().includes('service') ||
          item.product.name.toLowerCase().includes('mentoria')
        );
        
        if (hasProduct && !hasService) type = 'PRODUCT';
        else if (hasService && !hasProduct) type = 'SERVICE';
      }
      
      // Process charges for this bill
      for (const charge of bill.charges || []) {
        records.push({
          date: charge.paid_at || bill.due_at,
          amount: parseFloat(charge.amount),
          status: charge.status === 'paid' ? 'PAID' : 
                  charge.status === 'pending' ? 'PENDING' :
                  charge.status === 'failed' ? 'OVERDUE' : 'CANCELLED',
          payment_method: charge.payment_method?.name || 'Unknown',
          source: 'VINDI',
          type,
          bill_id: bill.id,
          subscription_id: bill.subscription?.id
        });
      }
      
      // If no charges, create record for the bill itself
      if (!bill.charges || bill.charges.length === 0) {
        records.push({
          date: bill.paid_at || bill.due_at,
          amount: parseFloat(bill.amount),
          status: bill.status === 'paid' ? 'PAID' :
                  bill.status === 'pending' ? 'PENDING' :
                  bill.status === 'overdue' ? 'OVERDUE' : 'CANCELLED',
          payment_method: bill.payment_method?.name || 'Unknown',
          source: 'VINDI',
          type,
          bill_id: bill.id,
          subscription_id: bill.subscription?.id
        });
      }
    }
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Consolidate customer data from multiple sources
  static consolidateCustomerData(
    sheetsRows: SheetsRow[],
    vindiMatches: Map<string, { vindiCustomer: VindiCustomer; confidence: number; matchType: string }>,
    allVindiBills: VindiBill[],
    allVindiSubscriptions: VindiSubscription[]
  ): ProcessedCustomer[] {
    
    const customers: ProcessedCustomer[] = [];
    const processedCpfs = new Set<string>();
    
    console.log('🔄 Consolidating customer data...');
    
    for (const sheetRow of sheetsRows) {
      const cpfCnpj = DataNormalizer.normalizeCpfCnpj(sheetRow['cpf/cnpj']);
      
      if (!cpfCnpj || processedCpfs.has(cpfCnpj)) continue;
      processedCpfs.add(cpfCnpj);
      
      // Find all sheet rows for this customer (handle renewals)
      const customerSheetRows = sheetsRows.filter(row => 
        DataNormalizer.normalizeCpfCnpj(row['cpf/cnpj']) === cpfCnpj
      );
      
      // Get Vindi match data
      const vindiMatch = vindiMatches.get(cpfCnpj);
      const vindiCustomer = vindiMatch?.vindiCustomer;
      
      // Calculate sheet totals (sum all rows for renewals)
      const totalValueSheets = customerSheetRows.reduce((sum, row) => 
        sum + DataNormalizer.parseMoneyValue(row['valor_total']), 0
      );
      const totalProductSheets = customerSheetRows.reduce((sum, row) => 
        sum + DataNormalizer.parseMoneyValue(row['valor_produto']), 0
      );
      const totalServiceSheets = customerSheetRows.reduce((sum, row) => 
        sum + DataNormalizer.parseMoneyValue(row['valor_servico']), 0
      );
      
      // Process Vindi data if matched
      let vindiTotalPaid = 0;
      let vindiProductPaid = 0;
      let vindiServicePaid = 0;
      let vindiPending = 0;
      let vindiOverdue = 0;
      let paymentHistory: PaymentRecord[] = [];
      let hasSubscription = false;
      let subscriptionStatus: string | null = null;
      let subscriptionNextBilling: string | null = null;
      let paymentMethodVindi: string | null = null;
      let lastPaymentDate: string | null = null;
      let nextDueDate: string | null = null;
      
      if (vindiCustomer) {
        // Process payment history
        paymentHistory = this.processPaymentRecords(allVindiBills, vindiCustomer.id);
        
        // Calculate totals
        for (const record of paymentHistory) {
          if (record.status === 'PAID') {
            vindiTotalPaid += record.amount;
            if (record.type === 'PRODUCT') vindiProductPaid += record.amount;
            if (record.type === 'SERVICE') vindiServicePaid += record.amount;
            if (record.type === 'MIXED') {
              // Distribute proportionally based on sheets data
              const productRatio = totalProductSheets / (totalProductSheets + totalServiceSheets) || 0.5;
              vindiProductPaid += record.amount * productRatio;
              vindiServicePaid += record.amount * (1 - productRatio);
            }
            lastPaymentDate = record.date;
          } else if (record.status === 'PENDING') {
            vindiPending += record.amount;
          } else if (record.status === 'OVERDUE') {
            vindiOverdue += record.amount;
          }
        }
        
        // Check subscription status
        const customerSubscriptions = allVindiSubscriptions.filter(sub => 
          sub.customer.id === vindiCustomer.id
        );
        
        if (customerSubscriptions.length > 0) {
          hasSubscription = true;
          const activeSub = customerSubscriptions.find(sub => sub.status === 'active') || 
                          customerSubscriptions[0];
          subscriptionStatus = activeSub.status;
          subscriptionNextBilling = activeSub.next_billing_at;
          paymentMethodVindi = activeSub.payment_method?.name;
          
          // Calculate next due date for overdue checking
          if (activeSub.next_billing_at) {
            nextDueDate = activeSub.next_billing_at;
          }
        }
        
        // Get payment method from recent bills if not from subscription
        if (!paymentMethodVindi && paymentHistory.length > 0) {
          paymentMethodVindi = paymentHistory[0].payment_method;
        }
      }
      
      // Calculate reconciliation status
      const discrepancy = totalValueSheets - vindiTotalPaid;
      const discrepancyPercentage = totalValueSheets > 0 ? (discrepancy / totalValueSheets) * 100 : 0;
      
      let status: ProcessedCustomer['status'];
      if (!vindiCustomer) {
        status = 'MISSING_VINDI';
      } else if (discrepancy <= -50) { // Allow small tolerance
        status = 'OVERPAID';
      } else if (Math.abs(discrepancy) <= 50) { // Within R$50 tolerance
        status = 'FULLY_PAID';
      } else if (vindiTotalPaid > 0) {
        status = 'PARTIALLY_PAID';
      } else {
        status = 'NO_PAYMENT';
      }
      
      // Check recurring payment status
      let paymentOk = true;
      let missingPayments = 0;
      
      if (hasSubscription && subscriptionStatus === 'active') {
        // Check if there are overdue payments
        if (vindiOverdue > 0) {
          paymentOk = false;
        }
        
        // Count missing payments based on subscription schedule
        const now = new Date();
        const nextBilling = nextDueDate ? new Date(nextDueDate) : null;
        
        if (nextBilling && nextBilling < now) {
          missingPayments = Math.floor((now.getTime() - nextBilling.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1;
          paymentOk = missingPayments === 0;
        }
      }
      
      // Get primary sheet row data (most recent or first)
      const primaryRow = customerSheetRows.sort((a, b) => {
        const dateA = DataNormalizer.parseDate(a['data_venda']);
        const dateB = DataNormalizer.parseDate(b['data_venda']);
        if (dateA && dateB) {
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }
        return 0;
      })[0];
      
      // Calculate customer metrics
      const daysSinceSale = primaryRow['data_venda'] ? 
        Math.floor((Date.now() - new Date(primaryRow['data_venda']).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const ltv = vindiTotalPaid + (hasSubscription ? vindiTotalPaid * 12 : 0); // Simple LTV calculation
      
      let churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (missingPayments > 2) churnRisk = 'HIGH';
      else if (missingPayments > 0 || discrepancyPercentage > 50) churnRisk = 'MEDIUM';
      
      // Create processed customer record
      const customer: ProcessedCustomer = {
        id: cpfCnpj,
        cpf_cnpj: cpfCnpj,
        nome: primaryRow['Nome'] || primaryRow['Cliente'] || vindiCustomer?.name || 'Unknown',
        email: vindiCustomer?.email || '',
        telefone: primaryRow['Celular'] || '',
        endereco: primaryRow['Endereco'] || '',
        
        // Product & Sales Info
        produto: primaryRow['produto'] || '',
        nivel: primaryRow['nivel'] || '',
        valor_total_sheets: totalValueSheets,
        valor_produto_sheets: totalProductSheets,
        valor_servico_sheets: totalServiceSheets,
        data_venda: primaryRow['data_venda'] || '',
        forma_pagamento: primaryRow['forma'] || '',
        parcelas: parseInt(primaryRow['parcelas'] || '1'),
        renovacao: customerSheetRows.some(row => row['renovacao']?.toLowerCase() === 'sim'),
        vendedor: primaryRow['vendedor'] || '',
        fonte: primaryRow['fonte'] || '',
        
        // Vindi Integration
        vindi_customer_id: vindiCustomer?.id || null,
        vindi_status: vindiCustomer?.status || null,
        vindi_total_paid: vindiTotalPaid,
        vindi_product_paid: vindiProductPaid,
        vindi_service_paid: vindiServicePaid,
        vindi_pending: vindiPending,
        vindi_overdue: vindiOverdue,
        has_subscription: hasSubscription,
        subscription_status: subscriptionStatus,
        subscription_next_billing: subscriptionNextBilling,
        payment_method_vindi: paymentMethodVindi,
        
        // Payment History
        payment_history: paymentHistory,
        
        // Reconciliation Status
        status,
        discrepancy,
        discrepancy_percentage: discrepancyPercentage,
        has_renewal: customerSheetRows.length > 1,
        renewal_count: customerSheetRows.length - 1,
        
        // Flags
        is_recurring: hasSubscription,
        payment_ok: paymentOk,
        missing_payments: missingPayments,
        last_payment_date: lastPaymentDate,
        next_due_date: nextDueDate,
        
        // Calculated fields
        ltv,
        days_as_customer: daysSinceSale,
        churn_risk: churnRisk
      };
      
      customers.push(customer);
    }
    
    console.log(`✅ Consolidated ${customers.length} customers`);
    return customers;
  }

  // Generate dashboard metrics
  static generateDashboardMetrics(customers: ProcessedCustomer[]): DashboardMetrics {
    console.log('📊 Generating dashboard metrics...');
    
    const totalStudents = customers.length;
    const activeStudents = customers.filter(c => c.status !== 'MISSING_VINDI' && c.vindi_status === 'active').length;
    const cancelledStudents = customers.filter(c => c.vindi_status === 'inactive' || c.vindi_status === 'archived').length;
    const recurringStudents = customers.filter(c => c.is_recurring).length;
    const oneTimeStudents = totalStudents - recurringStudents;
    
    // Financial metrics
    const totalExpectedSheets = customers.reduce((sum, c) => sum + c.valor_total_sheets, 0);
    const totalPaidVindi = customers.reduce((sum, c) => sum + c.vindi_total_paid, 0);
    const totalProductExpected = customers.reduce((sum, c) => sum + c.valor_produto_sheets, 0);
    const totalServiceExpected = customers.reduce((sum, c) => sum + c.valor_servico_sheets, 0);
    const totalProductPaid = customers.reduce((sum, c) => sum + c.vindi_product_paid, 0);
    const totalServicePaid = customers.reduce((sum, c) => sum + c.vindi_service_paid, 0);
    
    // Status counts
    const studentsFullyPaid = customers.filter(c => c.status === 'FULLY_PAID').length;
    const studentsPartiallyPaid = customers.filter(c => c.status === 'PARTIALLY_PAID').length;
    const studentsNoPayment = customers.filter(c => c.status === 'NO_PAYMENT').length;
    const studentsOverpaid = customers.filter(c => c.status === 'OVERPAID').length;
    const studentsMissingVindi = customers.filter(c => c.status === 'MISSING_VINDI').length;
    
    // Recurring status
    const recurringCustomers = customers.filter(c => c.is_recurring);
    const recurringOk = recurringCustomers.filter(c => c.payment_ok).length;
    const recurringMissing = recurringCustomers.filter(c => !c.payment_ok && c.missing_payments > 0).length;
    const recurringOverdue = recurringCustomers.filter(c => c.vindi_overdue > 0).length;
    
    // Discrepancies
    const totalDiscrepancy = customers.reduce((sum, c) => sum + Math.abs(c.discrepancy), 0);
    const discrepancyPercentages = customers
      .filter(c => c.valor_total_sheets > 0)
      .map(c => Math.abs(c.discrepancy_percentage));
    const avgDiscrepancyPercentage = discrepancyPercentages.length > 0 ? 
      discrepancyPercentages.reduce((sum, p) => sum + p, 0) / discrepancyPercentages.length : 0;
    const highDiscrepancyCount = customers.filter(c => Math.abs(c.discrepancy) > 1000).length;
    
    // Renewals
    const customersWithRenewals = customers.filter(c => c.has_renewal).length;
    const totalRenewalCount = customers.reduce((sum, c) => sum + c.renewal_count, 0);
    const avgRenewalsPerCustomer = customersWithRenewals > 0 ? totalRenewalCount / customersWithRenewals : 0;
    
    // Payment methods analysis
    const paymentMethodMap = new Map<string, { count: number; amount: number }>();
    
    customers.forEach(customer => {
      const method = customer.payment_method_vindi || customer.forma_pagamento || 'Unknown';
      const existing = paymentMethodMap.get(method) || { count: 0, amount: 0 };
      paymentMethodMap.set(method, {
        count: existing.count + 1,
        amount: existing.amount + customer.vindi_total_paid
      });
    });
    
    const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total_amount: data.amount,
      percentage: (data.count / totalStudents) * 100
    }));
    
    return {
      // Student Metrics
      total_students: totalStudents,
      active_students: activeStudents,
      cancelled_students: cancelledStudents,
      recurring_students: recurringStudents,
      one_time_students: oneTimeStudents,
      
      // Financial Overview
      total_expected_sheets: totalExpectedSheets,
      total_paid_vindi: totalPaidVindi,
      total_product_expected: totalProductExpected,
      total_service_expected: totalServiceExpected,
      total_product_paid: totalProductPaid,
      total_service_paid: totalServicePaid,
      
      // Payment Status
      students_fully_paid: studentsFullyPaid,
      students_partially_paid: studentsPartiallyPaid,
      students_no_payment: studentsNoPayment,
      students_overpaid: studentsOverpaid,
      students_missing_vindi: studentsMissingVindi,
      
      // Recurring Status
      recurring_ok: recurringOk,
      recurring_missing: recurringMissing,
      recurring_overdue: recurringOverdue,
      
      // Discrepancies
      total_discrepancy: totalDiscrepancy,
      avg_discrepancy_percentage: avgDiscrepancyPercentage,
      high_discrepancy_count: highDiscrepancyCount,
      
      // Renewals
      customers_with_renewals: customersWithRenewals,
      total_renewal_count: totalRenewalCount,
      avg_renewals_per_customer: avgRenewalsPerCustomer,
      
      // Payment Methods
      payment_methods: paymentMethods,
      
      // Last Update Info
      last_update: new Date().toISOString(),
      data_freshness_hours: 0
    };
  }
}

export const reconciliationEngine = ReconciliationEngine;