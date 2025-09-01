const axios = require('axios');

class VindiAPIService {
  constructor() {
    this.apiKey = process.env.VINDI_API_KEY;
    this.baseURL = process.env.VINDI_API_URL || 'https://app.vindi.com.br/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request/response interceptors for logging and error handling
    this.client.interceptors.request.use(
      config => {
        console.log(`VINDI API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('VINDI API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('VINDI API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async getCustomers(page = 1, perPage = 50) {
    try {
      const response = await this.client.get('/customers', {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
  }

  async getCustomerByCPFCNPJ(cpfCnpj) {
    try {
      const response = await this.client.get('/customers', {
        params: { 
          query: `registry_code:${cpfCnpj}`,
          per_page: 1
        }
      });
      return response.data.customers?.[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch customer by CPF/CNPJ: ${error.message}`);
    }
  }

  async getCustomerBills(customerId, page = 1, perPage = 50) {
    try {
      const response = await this.client.get('/bills', {
        params: { 
          customer_id: customerId,
          page,
          per_page: perPage
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch customer bills: ${error.message}`);
    }
  }

  async getSubscriptions(customerId = null, page = 1, perPage = 50) {
    try {
      const params = { page, per_page: perPage };
      if (customerId) params.customer_id = customerId;
      
      const response = await this.client.get('/subscriptions', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
  }

  async getPaymentMethods(customerId) {
    try {
      const response = await this.client.get(`/customers/${customerId}/payment_methods`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch payment methods: ${error.message}`);
    }
  }

  async getCharges(billId) {
    try {
      const response = await this.client.get(`/bills/${billId}/charges`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch charges: ${error.message}`);
    }
  }

  async getAllCustomersWithPagination() {
    const customers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getCustomers(page, 100);
        customers.push(...(response.customers || []));
        
        hasMore = response.customers?.length === 100;
        page++;
        
        // Add a small delay to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        hasMore = false;
      }
    }

    return customers;
  }
}

module.exports = new VindiAPIService();