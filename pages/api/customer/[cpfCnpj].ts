import type { NextApiRequest, NextApiResponse } from 'next';
import { database } from '../../../src/lib/database';

interface CustomerDetailsResponse {
  success: boolean;
  data?: {
    customer: any;
    paymentComparison: {
      sheets: {
        total: number;
        product: number;
        service: number;
        date: string;
        method: string;
      };
      vindi: {
        total: number;
        product: number;
        service: number;
        pending: number;
        overdue: number;
        paymentHistory: any[];
      };
      reconciliation: {
        status: string;
        discrepancy: number;
        discrepancyPercentage: number;
        isRecurring: boolean;
        paymentOk: boolean;
        missingPayments: number;
      };
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CustomerDetailsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { cpfCnpj } = req.query;

  if (!cpfCnpj || typeof cpfCnpj !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'CPF/CNPJ parameter is required'
    });
  }

  try {
    console.log(`🔍 Fetching customer details for: ${cpfCnpj}`);
    
    // Load cached data
    const cachedData = database.loadData();
    
    if (!cachedData?.processedData?.customers) {
      return res.status(404).json({
        success: false,
        error: 'No processed data available. Please run data sync first.'
      });
    }

    // Find customer by CPF/CNPJ
    const customer = cachedData.processedData.customers.find(
      c => c.cpf_cnpj === cpfCnpj || c.id === cpfCnpj
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Build detailed payment comparison
    const paymentComparison = {
      sheets: {
        total: customer.valor_total_sheets,
        product: customer.valor_produto_sheets,
        service: customer.valor_servico_sheets,
        date: customer.data_venda,
        method: customer.forma_pagamento
      },
      vindi: {
        total: customer.vindi_total_paid,
        product: customer.vindi_product_paid,
        service: customer.vindi_service_paid,
        pending: customer.vindi_pending,
        overdue: customer.vindi_overdue,
        paymentHistory: customer.payment_history.map(payment => ({
          date: payment.date,
          amount: payment.amount,
          status: payment.status,
          method: payment.payment_method,
          type: payment.type,
          source: payment.source
        }))
      },
      reconciliation: {
        status: customer.status,
        discrepancy: customer.discrepancy,
        discrepancyPercentage: customer.discrepancy_percentage,
        isRecurring: customer.is_recurring,
        paymentOk: customer.payment_ok,
        missingPayments: customer.missing_payments
      }
    };

    console.log(`✅ Customer details retrieved for ${customer.nome}`);

    res.status(200).json({
      success: true,
      data: {
        customer: {
          ...customer,
          // Add computed fields for UI
          statusColor: getStatusColor(customer.status),
          churnRiskColor: getChurnRiskColor(customer.churn_risk),
          discrepancyFormatted: formatCurrency(customer.discrepancy),
          totalPaidFormatted: formatCurrency(customer.vindi_total_paid),
          totalExpectedFormatted: formatCurrency(customer.valor_total_sheets),
          lastPaymentFormatted: customer.last_payment_date ? 
            new Date(customer.last_payment_date).toLocaleDateString('pt-BR') : 'Nunca',
          daysSinceLastPayment: customer.last_payment_date ? 
            Math.floor((Date.now() - new Date(customer.last_payment_date).getTime()) / (1000 * 60 * 60 * 24)) : null
        },
        paymentComparison
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

// Helper functions
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'FULLY_PAID': 'green',
    'PARTIALLY_PAID': 'yellow',
    'NO_PAYMENT': 'red',
    'OVERPAID': 'blue',
    'MISSING_VINDI': 'gray',
    'CANCELLED': 'red'
  };
  return colors[status] || 'gray';
}

function getChurnRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    'LOW': 'green',
    'MEDIUM': 'yellow',
    'HIGH': 'red'
  };
  return colors[risk] || 'gray';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}