import { useState, useEffect } from 'react';

interface VindiDataHook {
  salesData: any;
  customerAnalysis: any[];
  inconsistencies: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useVindiData = (startDate: string, endDate: string, sheetId: string): VindiDataHook => {
  const [salesData, setSalesData] = useState<any>(null);
  const [customerAnalysis, setCustomerAnalysis] = useState<any[]>([]);
  const [inconsistencies, setInconsistencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar dados da API export-advanced
      const params = new URLSearchParams({
        startDate,
        endDate,
        sheetId,
        gid: '0'
      });

      const response = await fetch(`/api/export-advanced?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }

      const data = await response.json();

      // Processar dados para o dashboard
      if (data.customers) {
        setCustomerAnalysis(data.customers);
        
        // Filtrar inconsistências
        const inconsistentCustomers = data.customers.filter((customer: any) => 
          customer.hasInconsistencies || !customer.spreadsheetData
        );
        setInconsistencies(inconsistentCustomers);
      }

      if (data.summary) {
        setSalesData({
          totalRevenue: data.summary.totalContractValue || 0,
          totalCustomers: data.summary.totalCustomers || 0,
          pendingPayments: data.summary.totalDelinquent || 0,
          inconsistencies: data.summary.customersWithInconsistencies || 0,
          totalPaidAmount: data.summary.totalPaidAmount || 0,
          futureRecurring: data.summary.totalFutureRecurring || 0,
          upToDateCustomers: data.summary.upToDateCustomers || 0,
          delinquentCustomers: data.summary.delinquentCustomers || 0
        });
      }

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, sheetId]);

  return { 
    salesData, 
    customerAnalysis, 
    inconsistencies, 
    loading, 
    error,
    refetch: fetchData
  };
};