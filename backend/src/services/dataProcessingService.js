const CPFCNPJUtils = require('../utils/cpfCnpjUtils');

class DataProcessingService {
  constructor() {
    this.cache = {
      customers: new Map(),
      lastSync: null
    };
  }

  processGoogleSheetsData(sheetsData) {
    return sheetsData.map(row => ({
      cpfCnpj: CPFCNPJUtils.normalize(row.cpf_cnpj || row.CPF_CNPJ || row['CPF/CNPJ'] || ''),
      customerName: row.nome || row.Nome || row.name || row.Name || '',
      expectedAmount: this.parseAmount(row.valor || row.Valor || row.amount || row.Amount || 0),
      serviceAmount: this.parseAmount(row.valor_servico || row['Valor Serviço'] || 0),
      productAmount: this.parseAmount(row.valor_produto || row['Valor Produto'] || 0),
      purchaseDate: row.data || row.Data || row.date || row.Date || '',
      status: row.status || row.Status || 'UNKNOWN',
      notes: row.observacoes || row.Observações || row.notes || row.Notes || ''
    })).filter(customer => customer.cpfCnpj); // Filter out entries without CPF/CNPJ
  }

  processVindiCustomer(vindiCustomer) {
    return {
      id: vindiCustomer.id,
      cpfCnpj: CPFCNPJUtils.normalize(vindiCustomer.registry_code || ''),
      name: vindiCustomer.name,
      email: vindiCustomer.email,
      status: vindiCustomer.status,
      createdAt: vindiCustomer.created_at,
      metadata: vindiCustomer.metadata || {}
    };
  }

  processBillData(bills) {
    const summary = {
      totalPaid: 0,
      totalPending: 0,
      totalCancelled: 0,
      paymentsByMethod: {},
      servicePayments: 0,
      productPayments: 0,
      bills: []
    };

    bills.forEach(bill => {
      const billData = {
        id: bill.id,
        amount: parseFloat(bill.amount || 0),
        status: bill.status,
        dueAt: bill.due_at,
        paidAt: bill.paid_at,
        paymentMethod: bill.payment_method_code,
        installments: bill.installments,
        charges: []
      };

      // Process bill items to separate service and product payments
      if (bill.bill_items) {
        bill.bill_items.forEach(item => {
          const itemAmount = parseFloat(item.amount || 0);
          if (item.product_item?.product?.metadata?.type === 'service') {
            summary.servicePayments += itemAmount;
          } else {
            summary.productPayments += itemAmount;
          }
        });
      }

      // Update totals based on status
      switch (bill.status) {
        case 'paid':
          summary.totalPaid += billData.amount;
          break;
        case 'pending':
        case 'review':
          summary.totalPending += billData.amount;
          break;
        case 'canceled':
          summary.totalCancelled += billData.amount;
          break;
      }

      // Track payment methods
      if (billData.paymentMethod) {
        if (!summary.paymentsByMethod[billData.paymentMethod]) {
          summary.paymentsByMethod[billData.paymentMethod] = 0;
        }
        summary.paymentsByMethod[billData.paymentMethod] += billData.amount;
      }

      summary.bills.push(billData);
    });

    return summary;
  }

  matchCustomerData(sheetsData, vindiData, billsData) {
    const matchedData = new Map();

    // First, process all sheets data
    sheetsData.forEach(sheetCustomer => {
      const normalizedCpfCnpj = sheetCustomer.cpfCnpj;
      
      matchedData.set(normalizedCpfCnpj, {
        cpfCnpj: normalizedCpfCnpj,
        cpfCnpjFormatted: CPFCNPJUtils.format(normalizedCpfCnpj),
        type: CPFCNPJUtils.getType(normalizedCpfCnpj),
        customerType: CPFCNPJUtils.isCPF(normalizedCpfCnpj) ? 'B2C' : 'B2B',
        
        // Google Sheets data
        sheetsData: sheetCustomer,
        
        // Initialize VINDI data as null
        vindiData: null,
        billsSummary: null,
        
        // Analysis fields
        expectedAmount: sheetCustomer.expectedAmount,
        collectedAmount: 0,
        discrepancy: 0,
        servicePaymentPercentage: 0,
        productPaymentPercentage: 0,
        
        // Status flags
        status: 'NO_VINDI_DATA',
        paymentStatus: 'UNKNOWN',
        flags: []
      });
    });

    // Then, match with VINDI data
    vindiData.forEach(vindiCustomer => {
      const normalizedCpfCnpj = vindiCustomer.cpfCnpj;
      const billsSummary = billsData.get(vindiCustomer.id);
      
      if (matchedData.has(normalizedCpfCnpj)) {
        const customer = matchedData.get(normalizedCpfCnpj);
        
        // Update with VINDI data
        customer.vindiData = vindiCustomer;
        customer.billsSummary = billsSummary;
        customer.collectedAmount = billsSummary?.totalPaid || 0;
        customer.discrepancy = customer.expectedAmount - customer.collectedAmount;
        
        // Calculate payment percentages
        const totalCollected = customer.collectedAmount;
        if (totalCollected > 0) {
          customer.servicePaymentPercentage = 
            ((billsSummary?.servicePayments || 0) / totalCollected) * 100;
          customer.productPaymentPercentage = 
            ((billsSummary?.productPayments || 0) / totalCollected) * 100;
        }
        
        // Update status
        customer.status = vindiCustomer.status === 'active' ? 'ACTIVE' : 
                         vindiCustomer.status === 'archived' ? 'CANCELLED' : 'INACTIVE';
        
        // Determine payment status
        if (customer.collectedAmount >= customer.expectedAmount) {
          customer.paymentStatus = 'FULLY_PAID';
        } else if (customer.collectedAmount > 0) {
          customer.paymentStatus = 'PARTIALLY_PAID';
        } else {
          customer.paymentStatus = 'NO_PAYMENT';
        }
        
        // Set flags
        customer.flags = this.generateFlags(customer);
        
      } else {
        // VINDI customer not in sheets - add anyway for completeness
        const customer = {
          cpfCnpj: normalizedCpfCnpj,
          cpfCnpjFormatted: CPFCNPJUtils.format(normalizedCpfCnpj),
          type: CPFCNPJUtils.getType(normalizedCpfCnpj),
          customerType: CPFCNPJUtils.isCPF(normalizedCpfCnpj) ? 'B2C' : 'B2B',
          
          sheetsData: null,
          vindiData: vindiCustomer,
          billsSummary: billsSummary,
          
          expectedAmount: 0,
          collectedAmount: billsSummary?.totalPaid || 0,
          discrepancy: -(billsSummary?.totalPaid || 0),
          servicePaymentPercentage: 0,
          productPaymentPercentage: 0,
          
          status: vindiCustomer.status === 'active' ? 'ACTIVE' : 
                  vindiCustomer.status === 'archived' ? 'CANCELLED' : 'INACTIVE',
          paymentStatus: 'NOT_IN_SHEETS',
          flags: ['NOT_IN_SHEETS']
        };
        
        // Calculate payment percentages for VINDI-only customers
        const totalCollected = customer.collectedAmount;
        if (totalCollected > 0) {
          customer.servicePaymentPercentage = 
            ((billsSummary?.servicePayments || 0) / totalCollected) * 100;
          customer.productPaymentPercentage = 
            ((billsSummary?.productPayments || 0) / totalCollected) * 100;
        }
        
        matchedData.set(normalizedCpfCnpj, customer);
      }
    });

    return Array.from(matchedData.values());
  }

  generateFlags(customer) {
    const flags = [];
    
    // Check for 100% service payment
    if (customer.servicePaymentPercentage === 100) {
      flags.push('100_SERVICE');
    }
    
    // Check for discrepancies
    if (Math.abs(customer.discrepancy) > 0.01) {
      flags.push('DISCREPANCY');
    }
    
    // Check for cancelled with unpaid balance
    if (customer.status === 'CANCELLED' && customer.collectedAmount < customer.expectedAmount) {
      flags.push('CANCELLED_NO_FOLLOWUP');
    }
    
    // Check for overpayment
    if (customer.collectedAmount > customer.expectedAmount) {
      flags.push('OVERPAYMENT');
    }
    
    // Check for delinquent payments
    if (customer.billsSummary?.totalPending > 0) {
      flags.push('PENDING_PAYMENT');
    }
    
    return flags;
  }

  parseAmount(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and convert comma to dot
      const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  generateDashboardMetrics(matchedCustomers) {
    const metrics = {
      totalCustomers: matchedCustomers.length,
      totalB2C: 0,
      totalB2B: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalDiscrepancy: 0,
      fullyPaidCount: 0,
      partiallyPaidCount: 0,
      noPaymentCount: 0,
      delinquentCount: 0,
      cancelledCount: 0,
      discrepancyCount: 0,
      serviceOnly100Count: 0
    };

    matchedCustomers.forEach(customer => {
      // Customer type counts
      if (customer.customerType === 'B2C') {
        metrics.totalB2C++;
      } else {
        metrics.totalB2B++;
      }

      // Financial totals
      metrics.totalExpected += customer.expectedAmount;
      metrics.totalCollected += customer.collectedAmount;
      metrics.totalDiscrepancy += Math.abs(customer.discrepancy);

      // Payment status counts
      switch (customer.paymentStatus) {
        case 'FULLY_PAID':
          metrics.fullyPaidCount++;
          break;
        case 'PARTIALLY_PAID':
          metrics.partiallyPaidCount++;
          break;
        case 'NO_PAYMENT':
          metrics.noPaymentCount++;
          break;
      }

      // Status counts
      if (customer.status === 'CANCELLED') {
        metrics.cancelledCount++;
      }

      // Flag counts
      if (customer.flags.includes('DISCREPANCY')) {
        metrics.discrepancyCount++;
      }
      if (customer.flags.includes('100_SERVICE')) {
        metrics.serviceOnly100Count++;
      }
      if (customer.flags.includes('PENDING_PAYMENT')) {
        metrics.delinquentCount++;
      }
    });

    return metrics;
  }
}

module.exports = new DataProcessingService();