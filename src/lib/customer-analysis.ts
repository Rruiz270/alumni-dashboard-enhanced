import { Sale } from '../types/sale';
import { CustomerPaymentAnalysis, SpreadsheetRow, PaymentSummary } from '../types/customer-analysis';

export class CustomerAnalysisService {
  
  /**
   * Groups sales by CPF/CNPJ and analyzes payment patterns
   */
  analyzeCustomerPayments(sales: Sale[], spreadsheetData: SpreadsheetRow[] = []): CustomerPaymentAnalysis[] {
    // Group sales by CPF/CNPJ
    const customerGroups = this.groupSalesByCustomer(sales);
    
    const analyses: CustomerPaymentAnalysis[] = [];
    
    customerGroups.forEach((customerSales, cpfCnpj) => {
      const analysis = this.analyzeCustomer(cpfCnpj, customerSales, spreadsheetData);
      analyses.push(analysis);
    });
    
    return analyses.sort((a, b) => 
      new Date(b.firstTransactionDate).getTime() - new Date(a.firstTransactionDate).getTime()
    );
  }
  
  /**
   * Groups sales by CPF/CNPJ, handling empty values
   */
  private groupSalesByCustomer(sales: Sale[]): Map<string, Sale[]> {
    const groups = new Map<string, Sale[]>();
    
    for (const sale of sales) {
      // Priorize CPF/CNPJ como chave principal para agrupamento
      let key = '';
      
      if (sale.cpf_cnpj && sale.cpf_cnpj.trim()) {
        // Remove formatação do CPF/CNPJ para padronizar
        key = sale.cpf_cnpj.replace(/[.\-\/\s]/g, '');
      } else if (sale.nome && sale.nome.trim()) {
        key = `nome_${sale.nome.trim()}`;
      } else {
        key = `unknown_${sale.cliente || 'sem_identificacao'}`;
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(sale);
    }
    
    return groups;
  }
  
  /**
   * Analyzes a single customer's payment history
   */
  private analyzeCustomer(
    cpfCnpj: string, 
    sales: Sale[], 
    spreadsheetData: SpreadsheetRow[]
  ): CustomerPaymentAnalysis {
    // Sort by transaction date to find first transaction
    const sortedSales = sales.sort((a, b) => 
      new Date(a.data_transacao).getTime() - new Date(b.data_transacao).getTime()
    );
    
    const firstTransaction = sortedSales[0];
    const lastTransaction = sortedSales[sortedSales.length - 1];
    
    // Find corresponding spreadsheet data
    const spreadsheetRow = this.findSpreadsheetMatch(cpfCnpj, firstTransaction, spreadsheetData);
    
    // Calculate payment analysis
    const totalPaidAmount = sales.reduce((sum, sale) => sum + sale.valor_total, 0);
    const totalContractValue = this.estimateContractValue(sales, firstTransaction);
    
    // Determine payment type
    const paymentType = this.determinePaymentType(sales);
    
    // Calculate delinquent and future amounts
    const { delinquentAmount, futureRecurringAmount } = this.calculateOutstandingAmounts(
      sales, totalContractValue
    );
    
    // Find inconsistencies
    const inconsistencies = this.findInconsistencies(sales, spreadsheetRow);
    
    // Extract real CPF/CNPJ for display
    const realCpfCnpj = firstTransaction.cpf_cnpj || '';
    
    return {
      cpf_cnpj: realCpfCnpj,
      nome: firstTransaction.nome,
      email: firstTransaction.cliente, // Using cliente as email placeholder
      celular: firstTransaction.celular,
      endereco: firstTransaction.endereco,
      
      firstTransaction,
      allTransactions: sales,
      
      totalContractValue,
      totalPaidAmount,
      delinquentAmount,
      futureRecurringAmount,
      
      paymentType,
      installments: Math.max(...sales.map(s => s.parcelas)),
      
      isUpToDate: delinquentAmount === 0,
      isDelinquent: delinquentAmount > 0,
      hasInconsistencies: inconsistencies.length > 0,
      
      spreadsheetData: spreadsheetRow,
      inconsistencies,
      
      firstTransactionDate: firstTransaction.data_transacao,
      lastPaymentDate: lastTransaction.data_transacao,
      nextPaymentDue: this.calculateNextPaymentDue(sales)
    };
  }
  
  /**
   * Estimates the total contract value based on payment history
   */
  private estimateContractValue(sales: Sale[], firstTransaction: Sale): number {
    // If we have installment info, use it
    const maxInstallments = Math.max(...sales.map(s => s.parcelas));
    
    if (maxInstallments > 1) {
      return firstTransaction.valor_total * maxInstallments;
    }
    
    // For recurring payments, estimate based on payment pattern
    if (sales.length > 1) {
      const avgPayment = sales.reduce((sum, s) => sum + s.valor_total, 0) / sales.length;
      return avgPayment * 12; // Assume 12-month contract
    }
    
    return firstTransaction.valor_total;
  }
  
  /**
   * Determines if customer uses full payment or partial + recurring
   */
  private determinePaymentType(sales: Sale[]): 'full' | 'partial_recurring' {
    if (sales.length === 1) {
      return sales[0].parcelas > 1 ? 'full' : 'partial_recurring';
    }
    
    return 'partial_recurring';
  }
  
  /**
   * Calculates delinquent and future recurring amounts
   */
  private calculateOutstandingAmounts(sales: Sale[], totalContractValue: number) {
    const totalPaid = sales.reduce((sum, sale) => sum + sale.valor_total, 0);
    const outstanding = totalContractValue - totalPaid;
    
    // Simple logic: assume overdue if more than 30 days since last payment
    const lastPayment = new Date(Math.max(...sales.map(s => new Date(s.data_transacao).getTime())));
    const daysSinceLastPayment = (Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24);
    
    if (outstanding <= 0) {
      return { delinquentAmount: 0, futureRecurringAmount: 0 };
    }
    
    if (daysSinceLastPayment > 30) {
      return { delinquentAmount: outstanding, futureRecurringAmount: 0 };
    }
    
    return { delinquentAmount: 0, futureRecurringAmount: outstanding };
  }
  
  /**
   * Calculates next payment due date
   */
  private calculateNextPaymentDue(sales: Sale[]): string {
    if (sales.length === 1) {
      const sale = sales[0];
      if (sale.ultima_parcela) {
        return sale.ultima_parcela;
      }
    }
    
    // Estimate next payment based on last payment + 30 days
    const lastPayment = new Date(Math.max(...sales.map(s => new Date(s.data_transacao).getTime())));
    lastPayment.setDate(lastPayment.getDate() + 30);
    return lastPayment.toISOString().split('T')[0];
  }
  
  /**
   * Finds matching spreadsheet row based on CPF/CNPJ primarily
   */
  private findSpreadsheetMatch(
    cpfCnpj: string, 
    transaction: Sale, 
    spreadsheetData: SpreadsheetRow[]
  ): SpreadsheetRow | undefined {
    // Se o cpfCnpj for uma chave baseada em nome, extraia o nome
    if (cpfCnpj.startsWith('nome_')) {
      const nome = cpfCnpj.replace('nome_', '');
      return spreadsheetData.find(row => 
        row.nome?.toLowerCase().trim() === nome.toLowerCase().trim() ||
        row.cliente?.toLowerCase().trim() === nome.toLowerCase().trim()
      );
    }
    
    // Para CPF/CNPJ, normalize removendo formatação
    const normalizedKey = cpfCnpj.replace(/[.\-\/\s]/g, '');
    
    return spreadsheetData.find(row => {
      // Normaliza CPF/CNPJ da planilha
      const rowCpfCnpj = (row.cpf_cnpj || '').replace(/[.\-\/\s]/g, '');
      
      // Busca por CPF/CNPJ primeiro
      if (rowCpfCnpj && normalizedKey && rowCpfCnpj === normalizedKey) {
        return true;
      }
      
      // Fallback: busca por nome se CPF/CNPJ não encontrado
      const vindiNome = transaction.nome?.toLowerCase().trim();
      const sheetNome = (row.nome || row.cliente || '').toLowerCase().trim();
      
      return vindiNome && sheetNome && vindiNome === sheetNome;
    });
  }

  /**
   * Finds inconsistencies between Vindi data and spreadsheet
   */
  private findInconsistencies(sales: Sale[], spreadsheetRow?: SpreadsheetRow): string[] {
    const inconsistencies: string[] = [];
    
    if (!spreadsheetRow) {
      inconsistencies.push('Cliente não encontrado na planilha');
      return inconsistencies;
    }
    
    const vindiTotal = sales.reduce((sum, s) => sum + s.valor_total, 0);
    const spreadsheetTotal = spreadsheetRow.valor_total;
    
    if (Math.abs(vindiTotal - spreadsheetTotal) > 1) {
      inconsistencies.push(`Diferença no valor total: Vindi R$ ${vindiTotal.toFixed(2)} vs Planilha R$ ${spreadsheetTotal.toFixed(2)}`);
    }
    
    const firstSale = sales[0];
    if (firstSale.nome !== spreadsheetRow.nome) {
      inconsistencies.push(`Nome diferente: Vindi "${firstSale.nome}" vs Planilha "${spreadsheetRow.nome}"`);
    }
    
    return inconsistencies;
  }
  
  /**
   * Generates summary statistics
   */
  generateSummary(analyses: CustomerPaymentAnalysis[]): PaymentSummary {
    return {
      totalCustomers: analyses.length,
      totalContractValue: analyses.reduce((sum, a) => sum + a.totalContractValue, 0),
      totalPaidAmount: analyses.reduce((sum, a) => sum + a.totalPaidAmount, 0),
      totalDelinquent: analyses.reduce((sum, a) => sum + a.delinquentAmount, 0),
      totalFutureRecurring: analyses.reduce((sum, a) => sum + a.futureRecurringAmount, 0),
      upToDateCustomers: analyses.filter(a => a.isUpToDate).length,
      delinquentCustomers: analyses.filter(a => a.isDelinquent).length,
      customersWithInconsistencies: analyses.filter(a => a.hasInconsistencies).length
    };
  }
}