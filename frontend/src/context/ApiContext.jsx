import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const ApiContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.origin.includes('vercel.app') 
    ? '/api' 
    : 'http://localhost:3001/api'
);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
  });

  const handleApiCall = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dashboard methods
  const getDashboardMetrics = useCallback(() => {
    return handleApiCall(() => apiClient.get('/dashboard/metrics'));
  }, [handleApiCall]);

  const getDashboardSummary = useCallback(() => {
    return handleApiCall(() => apiClient.get('/dashboard/summary'));
  }, [handleApiCall]);

  const getTopDiscrepancies = useCallback((limit = 10) => {
    return handleApiCall(() => apiClient.get(`/dashboard/discrepancies?limit=${limit}`));
  }, [handleApiCall]);

  // Customer methods
  const getCustomers = useCallback((params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return handleApiCall(() => apiClient.get(`/customers?${queryString}`));
  }, [handleApiCall]);

  const getCustomerDetails = useCallback((cpfCnpj) => {
    return handleApiCall(() => apiClient.get(`/customers/${cpfCnpj}`));
  }, [handleApiCall]);

  const getCustomerBills = useCallback((cpfCnpj, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return handleApiCall(() => apiClient.get(`/customers/${cpfCnpj}/bills?${queryString}`));
  }, [handleApiCall]);

  // Sync methods
  const syncData = useCallback(() => {
    return handleApiCall(() => apiClient.post('/sync/sync'));
  }, [handleApiCall]);

  const getSyncStatus = useCallback(() => {
    return handleApiCall(() => apiClient.get('/sync/status'));
  }, [handleApiCall]);

  const clearCache = useCallback(() => {
    return handleApiCall(() => apiClient.delete('/sync/cache'));
  }, [handleApiCall]);

  // Export methods
  const exportData = useCallback((format = 'json') => {
    return handleApiCall(() => apiClient.get(`/dashboard/export?format=${format}`));
  }, [handleApiCall]);

  const downloadCSV = useCallback(async () => {
    try {
      const response = await apiClient.get('/dashboard/export?format=csv', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vindi-sales-dashboard.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const value = {
    loading,
    error,
    syncStatus,
    setSyncStatus,
    setError,
    
    // Dashboard
    getDashboardMetrics,
    getDashboardSummary,
    getTopDiscrepancies,
    
    // Customers
    getCustomers,
    getCustomerDetails,
    getCustomerBills,
    
    // Sync
    syncData,
    getSyncStatus,
    clearCache,
    
    // Export
    exportData,
    downloadCSV
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};