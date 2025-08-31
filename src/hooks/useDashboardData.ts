import { useState, useEffect, useCallback } from 'react';
import { DashboardData, DashboardFilters, CustomerMetrics } from '@/types/dashboard';

// Main dashboard data hook
export function useDashboardData(filters?: DashboardFilters) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new v2 API endpoint
      const response = await fetch('/api/dashboard-data-v2');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Apply filters if provided
      if (filters) {
        result.customers = applyFilters(result.customers, filters);
        // Recalculate summary based on filtered data
        result.summary = recalculateSummary(result.customers);
      }
      
      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refreshData };
}

// Customer search hook
export function useCustomerSearch() {
  const [results, setResults] = useState<CustomerMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const searchCustomers = useCallback(async (query: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/dashboard-data-v2');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DashboardData = await response.json();
      
      // Search logic - search by name, CPF, email, or phone
      const searchTerm = query.toLowerCase();
      const filtered = data.customers.filter(customer => 
        customer.nome.toLowerCase().includes(searchTerm) ||
        customer.cpf_cnpj.includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm) ||
        customer.telefone.includes(searchTerm)
      );
      
      setResults(filtered);
    } catch (err) {
      console.error('Error searching customers:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, searchCustomers };
}

// Apply filters to customer data
function applyFilters(customers: CustomerMetrics[], filters: DashboardFilters): CustomerMetrics[] {
  return customers.filter(customer => {
    // Period filter
    if (filters.period) {
      const saleDate = new Date(customer.data_venda);
      if (saleDate < filters.period.start || saleDate > filters.period.end) {
        return false;
      }
    }
    
    // Seller filter
    if (filters.vendedor && customer.vendedor !== filters.vendedor) {
      return false;
    }
    
    // Level filter
    if (filters.nivel && customer.nivel !== filters.nivel) {
      return false;
    }
    
    // Source filter
    if (filters.fonte && customer.fonte !== filters.fonte) {
      return false;
    }
    
    // Renewal filter
    if (filters.renovacao !== undefined && customer.renovacao !== filters.renovacao) {
      return false;
    }
    
    // Payment method filter
    if (filters.formaPagamento && customer.forma_pagamento !== filters.formaPagamento) {
      return false;
    }
    
    // Card brand filter
    if (filters.bandeira && customer.bandeira !== filters.bandeira) {
      return false;
    }
    
    // Acquirer filter
    if (filters.adquirente && customer.adquirente !== filters.adquirente) {
      return false;
    }
    
    // Product filter
    if (filters.produto && customer.produto !== filters.produto) {
      return false;
    }
    
    // Duration filter
    if (filters.duracao && customer.duracao_curso !== filters.duracao) {
      return false;
    }
    
    // Discount filter
    if (filters.desconto) {
      const discountPercent = customer.desconto * 100;
      if (discountPercent < filters.desconto.min || discountPercent > filters.desconto.max) {
        return false;
      }
    }
    
    // Cancellation filter
    if (filters.cancelado !== undefined && customer.cancelado !== filters.cancelado) {
      return false;
    }
    
    // Cancellation window filter
    if (filters.janelaCancelamento && customer.cancelado) {
      const daysBetween = Math.floor(
        (new Date(customer.data_cancelamento!).getTime() - new Date(customer.data_venda).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (filters.janelaCancelamento === '7days' && daysBetween > 7) {
        return false;
      }
      if (filters.janelaCancelamento === 'after7days' && daysBetween <= 7) {
        return false;
      }
    }
    
    // Access sent filter
    if (filters.acessoEnviado !== undefined && customer.acesso_enviado !== filters.acessoEnviado) {
      return false;
    }
    
    // Status filter
    if (filters.status && customer.status !== filters.status) {
      return false;
    }
    
    return true;
  });
}

// Recalculate summary based on filtered data
function recalculateSummary(customers: CustomerMetrics[]): any {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => !c.cancelado).length;
  const canceledCustomers = customers.filter(c => c.cancelado).length;
  const newCustomers = customers.filter(c => !c.renovacao).length;
  const renewals = customers.filter(c => c.renovacao).length;
  
  const grossRevenue = customers.reduce((sum, c) => sum + c.valor_total, 0);
  const netRevenue = customers.reduce((sum, c) => sum + c.valor_liquido, 0);
  const totalFees = customers.reduce((sum, c) => sum + (c.valor_total * c.taxa), 0);
  const totalDiscounts = customers.reduce((sum, c) => sum + (c.valor_total * c.desconto), 0);
  
  const activeMRR = customers
    .filter(c => !c.cancelado)
    .reduce((sum, c) => sum + (c.mrr || 0), 0);
    
  const pendingAccess = customers.filter(c => !c.acesso_enviado && !c.cancelado).length;
  const customersWithVindiMatch = customers.filter(c => c.hasVindiMatch).length;
  
  return {
    grossRevenue,
    netRevenue,
    totalFees,
    totalDiscounts,
    margin: totalCustomers > 0 ? ((netRevenue / grossRevenue) * 100).toFixed(2) : '0',
    totalCustomers,
    activeCustomers,
    newCustomers,
    renewals,
    renewalRate: totalCustomers > 0 ? ((renewals / totalCustomers) * 100).toFixed(2) : '0',
    mrr: activeMRR,
    arr: activeMRR * 12,
    avgTicket: totalCustomers > 0 ? grossRevenue / totalCustomers : 0,
    churnRate: totalCustomers > 0 ? ((canceledCustomers / totalCustomers) * 100).toFixed(2) : '0',
    canceledCustomers,
    pendingAccess,
    customersWithVindiMatch,
    vindiMatchRate: totalCustomers > 0 ? ((customersWithVindiMatch / totalCustomers) * 100).toFixed(2) : '0'
  };
}

// Export filter options based on data
export function useFilterOptions(data: DashboardData | null) {
  const [options, setOptions] = useState({
    vendedores: [] as string[],
    niveis: [] as string[],
    fontes: [] as string[],
    formasPagamento: [] as string[],
    bandeiras: [] as string[],
    adquirentes: [] as string[],
    produtos: [] as string[]
  });

  useEffect(() => {
    if (!data) return;

    const uniqueValues = {
      vendedores: Array.from(new Set(data.customers.map(c => c.vendedor).filter(Boolean))),
      niveis: Array.from(new Set(data.customers.map(c => c.nivel).filter(Boolean))),
      fontes: Array.from(new Set(data.customers.map(c => c.fonte).filter(Boolean))),
      formasPagamento: Array.from(new Set(data.customers.map(c => c.forma_pagamento).filter(Boolean))),
      bandeiras: Array.from(new Set(data.customers.map(c => c.bandeira).filter(Boolean))),
      adquirentes: Array.from(new Set(data.customers.map(c => c.adquirente).filter(Boolean))),
      produtos: Array.from(new Set(data.customers.map(c => c.produto).filter(Boolean)))
    };

    setOptions(uniqueValues);
  }, [data]);

  return options;
}