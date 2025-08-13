import { useState, useEffect } from 'react'

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalCustomers: number;
    pendingPayments: number;
    inconsistencies: number;
    totalPaidAmount: number;
    upToDateCustomers: number;
    delinquentCustomers: number;
  };
  customers: any[];
  inconsistencies: any[];
  monthlyRevenue: any[];
  paymentMethods: any[];
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard-data');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Fallback para dados mockados em caso de erro
      setData({
        summary: {
          totalRevenue: 245680.50,
          totalCustomers: 156,
          pendingPayments: 45320.00,
          inconsistencies: 23,
          totalPaidAmount: 200360.50,
          upToDateCustomers: 133,
          delinquentCustomers: 23
        },
        customers: [
          {
            cpf: '123.456.789-00',
            nome: 'João Silva',
            produto: 'Curso Completo',
            valorTotal: 3000.00,
            valorPago: 1500.00,
            valorPendente: 1500.00,
            parcelas: '6x',
            formaPagamento: 'Cartão Parcelado',
            dataVenda: '15/06/2024',
            status: 'Ativo'
          }
        ],
        inconsistencies: [
          {
            id: 1,
            cpf: '123.456.789-00',
            cliente: 'João Silva',
            tipo: 'Valor divergente',
            vindiValor: 1500.00,
            planilhaValor: 1450.00,
            diferenca: 50.00,
            status: 'pendente'
          }
        ],
        monthlyRevenue: [
          { month: 'Jan', vindi: 45000, planilha: 44500, diferenca: 500 },
          { month: 'Fev', vindi: 52000, planilha: 51800, diferenca: 200 },
          { month: 'Mar', vindi: 48000, planilha: 48500, diferenca: -500 },
          { month: 'Abr', vindi: 58000, planilha: 57000, diferenca: 1000 },
          { month: 'Mai', vindi: 62000, planilha: 61500, diferenca: 500 },
          { month: 'Jun', vindi: 65000, planilha: 64800, diferenca: 200 }
        ],
        paymentMethods: [
          { name: 'Cartão Parcelado', value: 45, color: '#3b82f6' },
          { name: 'Cartão Recorrente', value: 30, color: '#10b981' },
          { name: 'PIX', value: 15, color: '#f59e0b' },
          { name: 'Boleto', value: 10, color: '#6366f1' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refreshData
  };
}

export function useCustomerSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search-customers?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.customers || []);
    } catch (err) {
      console.error('Erro na busca:', err);
      setError(err instanceof Error ? err.message : 'Erro na busca');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    results,
    loading,
    error,
    searchCustomers
  };
}

export function useInconsistencyResolver() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveInconsistency = async (inconsistencyId: number, action?: string, notes?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/resolve-inconsistency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inconsistencyId,
          action,
          notes
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Erro ao resolver inconsistência:', err);
      setError(err instanceof Error ? err.message : 'Erro ao resolver inconsistência');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    resolveInconsistency,
    loading,
    error
  };
}