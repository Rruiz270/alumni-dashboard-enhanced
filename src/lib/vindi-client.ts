import axios from 'axios';
import { Sale } from '../types/sale';

export class VindiClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.VINDI_API_KEY || '';
    this.baseURL = process.env.VINDI_API_URL || 'https://app.vindi.com.br/api/v1';
    
    if (!this.apiKey) {
      throw new Error('VINDI_API_KEY is not configured');
    }
  }

  private getHeaders() {
    // Vindi uses the API key as username with empty password
    const auth = Buffer.from(`${this.apiKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async fetchBills(startDate?: string, endDate?: string) {
    try {
      const params: any = {
        per_page: 100,
        page: 1,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      // Build query for date filtering
      let queryParts: string[] = [];
      
      if (startDate) {
        queryParts.push(`created_at:>=${startDate}`);
      }
      if (endDate) {
        queryParts.push(`created_at:<=${endDate}`);
      }
      
      if (queryParts.length > 0) {
        params.query = queryParts.join(' AND ');
      }
      
      console.log('Fetching bills with params:', params);

      const response = await axios.get(`${this.baseURL}/bills`, {
        headers: this.getHeaders(),
        params,
      });

      return response.data.bills || [];
    } catch (error) {
      console.error('Error fetching bills:', error);
      throw error;
    }
  }

  async fetchCustomer(customerId: number) {
    try {
      const response = await axios.get(`${this.baseURL}/customers/${customerId}`, {
        headers: this.getHeaders(),
      });
      return response.data.customer;
    } catch (error) {
      console.error(`Error fetching customer ${customerId}:`, error);
      return null;
    }
  }

  async fetchSubscriptions() {
    try {
      const response = await axios.get(`${this.baseURL}/subscriptions`, {
        headers: this.getHeaders(),
        params: { per_page: 100 },
      });
      return response.data.subscriptions || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  async fetchCharges() {
    try {
      const response = await axios.get(`${this.baseURL}/charges`, {
        headers: this.getHeaders(),
        params: { per_page: 100 },
      });
      return response.data.charges || [];
    } catch (error) {
      console.error('Error fetching charges:', error);
      return [];
    }
  }

  transformToSale(bill: any, customer: any, charge?: any): Sale {
    return {
      documento: bill.code || '',
      cpf_cnpj: customer?.registry_code || '',
      nome: customer?.name || '',
      cliente: customer?.name || '',
      celular: customer?.phones?.[0]?.number || '',
      endereco: this.formatAddress(customer?.address),
      data_transacao: charge?.paid_at || bill.created_at,
      data_venda: bill.created_at,
      ultima_parcela: this.calculateLastInstallment(bill),
      forma: charge?.payment_method?.name || bill.payment_method_code || '',
      produto: this.extractProducts(bill),
      bandeira: charge?.last_transaction?.gateway_response_fields?.card_brand || '',
      parcelas: bill.installments || 1,
      valor_total: parseFloat(bill.amount) || 0,
      valor_produto: this.calculateProductValue(bill),
      valor_servico: this.calculateServiceValue(bill),
    };
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    return `${address.street || ''} ${address.number || ''}, ${address.neighborhood || ''}, ${address.city || ''} - ${address.state || ''}, ${address.zipcode || ''}`.trim();
  }

  private calculateLastInstallment(bill: any): string {
    if (!bill.installments || bill.installments <= 1) return bill.due_at || '';
    const dueDate = new Date(bill.due_at);
    dueDate.setMonth(dueDate.getMonth() + bill.installments - 1);
    return dueDate.toISOString().split('T')[0];
  }

  private extractProducts(bill: any): string {
    if (!bill.bill_items) return '';
    return bill.bill_items.map((item: any) => item.product?.name || item.description).join(', ');
  }

  private calculateProductValue(bill: any): number {
    if (!bill.bill_items) return 0;
    return bill.bill_items
      .filter((item: any) => item.product_item_type === 'product')
      .reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
  }

  private calculateServiceValue(bill: any): number {
    if (!bill.bill_items) return 0;
    return bill.bill_items
      .filter((item: any) => item.product_item_type === 'service')
      .reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
  }
}