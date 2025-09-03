import https from 'https';

export interface VindiApiClient {
  customers: VindiCustomer[];
  bills: VindiBill[];
  subscriptions: VindiSubscription[];
}

export interface VindiCustomer {
  id: number;
  name: string;
  email: string;
  registry_code: string; // CPF/CNPJ
  code: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  metadata?: any;
  phones?: string[];
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

export interface VindiBill {
  id: number;
  amount: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  due_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    name: string;
    email: string;
    registry_code: string;
  };
  subscription?: {
    id: number;
    plan: {
      id: number;
      name: string;
      interval: string;
      interval_count: number;
    };
  };
  payment_method?: {
    code: string;
    name: string;
  };
  charges: VindiCharge[];
  bill_items: VindiBillItem[];
}

export interface VindiCharge {
  id: number;
  amount: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  paid_at: string | null;
  created_at: string;
  payment_method: {
    code: string;
    name: string;
  };
  transaction?: {
    id: number;
    gateway_transaction_id: string;
  };
}

export interface VindiBillItem {
  id: number;
  amount: string;
  description: string;
  pricing_schema: {
    price: string;
    minimum_price: string | null;
  };
  product: {
    id: number;
    name: string;
    code: string;
    unit: string;
    pricing_schema: {
      schema_type: string;
    };
  };
}

export interface VindiSubscription {
  id: number;
  status: 'active' | 'suspended' | 'canceled' | 'future';
  start_at: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    name: string;
    email: string;
    registry_code: string;
  };
  plan: {
    id: number;
    name: string;
    code: string;
    interval: string;
    interval_count: number;
    billing_trigger_type: string;
  };
  payment_method?: {
    id: number;
    code: string;
    name: string;
  };
  next_billing_at?: string;
  current_period_start?: string;
  current_period_end?: string;
}

class VindiAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.VINDI_API_KEY || '';
    this.baseUrl = process.env.VINDI_API_URL || 'https://app.vindi.com.br/api/v1';
    
    if (!this.apiKey) {
      throw new Error('VINDI_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vindi-Dashboard/2.0'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } else {
              console.error(`Vindi API Error: ${res.statusCode}`, data);
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  // Fetch all customers with pagination
  async fetchAllCustomers(updatedSince?: string): Promise<VindiCustomer[]> {
    const allCustomers: VindiCustomer[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('🔄 Fetching Vindi customers...');
    
    while (hasMore) {
      try {
        const params: any = {
          page,
          per_page: 50, // Vindi's max per page
        };
        
        // Add incremental update filter if provided
        if (updatedSince) {
          params.query = `updated_at>=${updatedSince}`;
        }
        
        const response = await this.makeRequest('/customers', params);
        
        if (response.customers && Array.isArray(response.customers)) {
          allCustomers.push(...response.customers);
          
          console.log(`📊 Fetched page ${page}: ${response.customers.length} customers`);
          
          // Check if we have more pages
          hasMore = response.customers.length === 50;
          page++;
          
          // Rate limiting: wait 100ms between requests
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching customers page ${page}:`, error);
        hasMore = false;
      }
    }
    
    console.log(`✅ Total Vindi customers fetched: ${allCustomers.length}`);
    return allCustomers;
  }

  // Fetch all bills with pagination
  async fetchAllBills(updatedSince?: string): Promise<VindiBill[]> {
    const allBills: VindiBill[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('🔄 Fetching Vindi bills...');
    
    while (hasMore) {
      try {
        const params: any = {
          page,
          per_page: 50,
          sort: 'created_at:desc' // Get newest first
        };
        
        // Add incremental update filter if provided
        if (updatedSince) {
          params.query = `updated_at>=${updatedSince}`;
        }
        
        const response = await this.makeRequest('/bills', params);
        
        if (response.bills && Array.isArray(response.bills)) {
          allBills.push(...response.bills);
          
          console.log(`📊 Fetched page ${page}: ${response.bills.length} bills`);
          
          // Check if we have more pages
          hasMore = response.bills.length === 50;
          page++;
          
          // Rate limiting: wait 100ms between requests
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching bills page ${page}:`, error);
        hasMore = false;
      }
    }
    
    console.log(`✅ Total Vindi bills fetched: ${allBills.length}`);
    return allBills;
  }

  // Fetch all subscriptions with pagination
  async fetchAllSubscriptions(updatedSince?: string): Promise<VindiSubscription[]> {
    const allSubscriptions: VindiSubscription[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('🔄 Fetching Vindi subscriptions...');
    
    while (hasMore) {
      try {
        const params: any = {
          page,
          per_page: 50,
        };
        
        // Add incremental update filter if provided
        if (updatedSince) {
          params.query = `updated_at>=${updatedSince}`;
        }
        
        const response = await this.makeRequest('/subscriptions', params);
        
        if (response.subscriptions && Array.isArray(response.subscriptions)) {
          allSubscriptions.push(...response.subscriptions);
          
          console.log(`📊 Fetched page ${page}: ${response.subscriptions.length} subscriptions`);
          
          // Check if we have more pages
          hasMore = response.subscriptions.length === 50;
          page++;
          
          // Rate limiting: wait 100ms between requests
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching subscriptions page ${page}:`, error);
        hasMore = false;
      }
    }
    
    console.log(`✅ Total Vindi subscriptions fetched: ${allSubscriptions.length}`);
    return allSubscriptions;
  }

  // Fetch specific customer by ID
  async fetchCustomerById(customerId: number): Promise<VindiCustomer | null> {
    try {
      const response = await this.makeRequest(`/customers/${customerId}`);
      return response.customer || null;
    } catch (error) {
      console.error(`Error fetching customer ${customerId}:`, error);
      return null;
    }
  }

  // Fetch bills for specific customer
  async fetchCustomerBills(customerId: number): Promise<VindiBill[]> {
    try {
      const response = await this.makeRequest('/bills', {
        query: `customer_id=${customerId}`,
        per_page: 50
      });
      return response.bills || [];
    } catch (error) {
      console.error(`Error fetching bills for customer ${customerId}:`, error);
      return [];
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Vindi API connection...');
      const response = await this.makeRequest('/customers', { per_page: 1 });
      console.log('✅ Vindi API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Vindi API connection failed:', error);
      return false;
    }
  }

  // Get API usage stats (estimate based on requests made)
  getUsageStats(): { estimatedCallsToday: number; recommendedDelay: number } {
    // Vindi has a rate limit of ~1000 calls per hour
    // We'll implement a conservative approach
    return {
      estimatedCallsToday: 0, // Would track this in production
      recommendedDelay: 100 // 100ms between calls
    };
  }
}

export const vindiApi = new VindiAPI();