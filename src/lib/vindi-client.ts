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

  async fetchBills(startDate?: string, endDate?: string, limit: number = 200) {
    try {
      const allBills: any[] = [];
      let page = 1;
      const perPage = 100; // Vindi's max per page
      
      while (allBills.length < limit) {
        const params: any = {
          per_page: perPage,
          page: page,
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
        
        console.log(`Fetching bills page ${page} with params:`, params);

        const response = await axios.get(`${this.baseURL}/bills`, {
          headers: this.getHeaders(),
          params,
        });

        const bills = response.data.bills || [];
        allBills.push(...bills);
        
        // If we got fewer bills than requested per page, we've reached the end
        if (bills.length < perPage) {
          break;
        }
        
        page++;
        
        // Add delay between requests to avoid rate limiting
        if (page > 2) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      console.log(`Fetched ${allBills.length} bills total`);
      return allBills.slice(0, limit);
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
    // Busca CPF/CNPJ em vários locais possíveis
    const cpf_cnpj = this.extractCpfCnpj(customer, bill);
    
    return {
      documento: bill.code || '',
      cpf_cnpj: cpf_cnpj,
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
    if (!bill.bill_items) return parseFloat(bill.amount || 0) / 2; // Split evenly as fallback
    
    // Check if items have product_item_type
    const productItems = bill.bill_items.filter((item: any) => 
      item.product_item_type === 'product' || 
      item.product?.name?.includes('Material') ||
      item.description?.includes('material')
    );
    
    if (productItems.length > 0) {
      return productItems.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
    }
    
    // If no clear product items, assume half is product
    return parseFloat(bill.amount || 0) / 2;
  }

  private calculateServiceValue(bill: any): number {
    if (!bill.bill_items) return parseFloat(bill.amount || 0) / 2; // Split evenly as fallback
    
    // Check if items have product_item_type
    const serviceItems = bill.bill_items.filter((item: any) => 
      item.product_item_type === 'service' ||
      (!item.product?.name?.includes('Material') && !item.description?.includes('material'))
    );
    
    if (serviceItems.length > 0) {
      return serviceItems.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
    }
    
    // If no clear service items, assume half is service
    return parseFloat(bill.amount || 0) / 2;
  }

  /**
   * Extrai CPF/CNPJ de vários locais possíveis nos dados do Vindi
   */
  private extractCpfCnpj(customer: any, bill: any): string {
    // Lista de locais onde o CPF/CNPJ pode estar
    const possibleLocations = [
      { key: 'customer.registry_code', value: customer?.registry_code },
      { key: 'customer.document', value: customer?.document },
      { key: 'customer.cpf', value: customer?.cpf },
      { key: 'customer.cnpj', value: customer?.cnpj },
      { key: 'customer.cpf_cnpj', value: customer?.cpf_cnpj },
      { key: 'customer.tax_id', value: customer?.tax_id },
      { key: 'customer.metadata.cpf', value: customer?.metadata?.cpf },
      { key: 'customer.metadata.cnpj', value: customer?.metadata?.cnpj },
      { key: 'customer.metadata.document', value: customer?.metadata?.document },
      { key: 'bill.customer.registry_code', value: bill?.customer?.registry_code },
      { key: 'bill.customer.document', value: bill?.customer?.document },
      { key: 'bill.payment_profile.registry_code', value: bill?.payment_profile?.registry_code },
      { key: 'bill.charges[0].payment_profile.registry_code', value: bill?.charges?.[0]?.payment_profile?.registry_code }
    ];

    // Debug: log all possible locations for first few records
    if (Math.random() < 0.1) { // Only log 10% of records to avoid spam
      console.log('CPF/CNPJ search locations:', possibleLocations.map(loc => `${loc.key}: ${loc.value}`));
    }

    // Retorna o primeiro valor não vazio encontrado
    for (const location of possibleLocations) {
      if (location.value && typeof location.value === 'string' && location.value.trim()) {
        if (Math.random() < 0.1) {
          console.log(`CPF/CNPJ encontrado em: ${location.key} = ${location.value}`);
        }
        return location.value.trim();
      }
    }

    return '';
  }
}