import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Database,
  Search,
  Eye,
  FileText,
  Calendar
} from 'lucide-react';

interface DashboardMetrics {
  total_students: number;
  active_students: number;
  cancelled_students: number;
  recurring_students: number;
  one_time_students: number;
  total_expected_sheets: number;
  total_paid_vindi: number;
  total_product_expected: number;
  total_service_expected: number;
  total_product_paid: number;
  total_service_paid: number;
  students_fully_paid: number;
  students_partially_paid: number;
  students_no_payment: number;
  students_overpaid: number;
  students_missing_vindi: number;
  recurring_ok: number;
  recurring_missing: number;
  recurring_overdue: number;
  total_discrepancy: number;
  avg_discrepancy_percentage: number;
  high_discrepancy_count: number;
  customers_with_renewals: number;
  total_renewal_count: number;
  payment_methods: Array<{
    method: string;
    count: number;
    total_amount: number;
    percentage: number;
  }>;
  last_update: string;
  data_freshness_hours: number;
}

interface ProcessedCustomer {
  id: string;
  cpf_cnpj: string;
  nome: string;
  email: string;
  valor_total_sheets: number;
  vindi_total_paid: number;
  status: string;
  discrepancy: number;
  is_recurring: boolean;
  payment_ok: boolean;
  missing_payments: number;
  churn_risk: string;
  has_renewal: boolean;
  renewal_count: number;
  last_payment_date: string | null;
  next_due_date: string | null;
}

interface CacheInfo {
  lastUpdate: string;
  cacheAge: number;
  cacheSize: number;
  isIncremental: boolean;
}

export default function EnhancedDashboard() {
  const [dashboardData, setDashboardData] = useState<{
    metrics: DashboardMetrics | null;
    customers: ProcessedCustomer[];
    cacheInfo: CacheInfo | null;
  }>({
    metrics: null,
    customers: [],
    cacheInfo: null
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<ProcessedCustomer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [recurringFilter, setRecurringFilter] = useState('all');

  // Load dashboard data
  const loadDashboard = async (forceRefresh = false) => {
    try {
      setLoading(!forceRefresh);
      if (forceRefresh) setUpdating(true);
      
      const url = `/api/dashboard-data-v3${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  // Load customer details
  const loadCustomerDetails = async (cpfCnpj: string) => {
    try {
      const response = await fetch(`/api/customer/${encodeURIComponent(cpfCnpj)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load customer details: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCustomerDetails(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Customer details error:', err);
      alert(err instanceof Error ? err.message : 'Failed to load customer details');
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, []);

  // Filter customers
  const filteredCustomers = dashboardData.customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.cpf_cnpj.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    
    const matchesRecurring = recurringFilter === 'all' || 
      (recurringFilter === 'recurring' && customer.is_recurring) ||
      (recurringFilter === 'one-time' && !customer.is_recurring);
    
    return matchesSearch && matchesStatus && matchesRecurring;
  });

  // Utility functions
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'FULLY_PAID': 'text-green-600 bg-green-100',
      'PARTIALLY_PAID': 'text-yellow-600 bg-yellow-100',
      'NO_PAYMENT': 'text-red-600 bg-red-100',
      'OVERPAID': 'text-blue-600 bg-blue-100',
      'MISSING_VINDI': 'text-gray-600 bg-gray-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'FULLY_PAID': 'Pago',
      'PARTIALLY_PAID': 'Parcial',
      'NO_PAYMENT': 'Não Pago',
      'OVERPAID': 'Pago a Mais',
      'MISSING_VINDI': 'Sem Vindi'
    };
    return labels[status] || status;
  };

  const getChurnRiskColor = (risk: string): string => {
    const colors: Record<string, string> = {
      'LOW': 'text-green-600',
      'MEDIUM': 'text-yellow-600',
      'HIGH': 'text-red-600'
    };
    return colors[risk] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Carregando Dashboard...</h2>
          <p className="text-gray-600 mt-2">Processando dados do Vindi e planilhas</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro no Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadDashboard()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const { metrics, cacheInfo } = dashboardData;

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Sem dados disponíveis</h2>
          <p className="text-gray-600 mt-2">Execute uma sincronização para carregar os dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Alumni Dashboard V2</h1>
              <p className="text-sm text-gray-600 mt-1">
                Reconciliação Vindi × Planilhas • Alumni by Better
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Cache Status */}
              {cacheInfo && (
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <Database className="w-3 h-3" />
                  <span>Cache: {cacheInfo.cacheAge.toFixed(1)}h • {cacheInfo.cacheSize}MB</span>
                </div>
              )}
              
              {/* Update Button */}
              <button
                onClick={() => loadDashboard(true)}
                disabled={updating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                <span>{updating ? 'Atualizando...' : 'Atualizar Dados'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Students */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Alunos</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.total_students.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.active_students} ativos • {metrics.cancelled_students} cancelados
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Expected vs Paid */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Esperado × Pago</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics.total_paid_vindi)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  de {formatCurrency(metrics.total_expected_sheets)} esperado
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min((metrics.total_paid_vindi / metrics.total_expected_sheets) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Product vs Service Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <p className="text-sm font-medium text-gray-600">Produto × Serviço</p>
                <div className="flex justify-between mt-2">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">Produto</p>
                    <p className="text-lg font-bold">{formatCurrency(metrics.total_product_paid)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-600">Serviço</p>
                    <p className="text-lg font-bold">{formatCurrency(metrics.total_service_paid)}</p>
                  </div>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Recurring Status */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagamentos Recorrentes</p>
                <p className="text-2xl font-bold text-green-600">{metrics.recurring_ok}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.recurring_missing} em atraso • {metrics.recurring_overdue} vencidos
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Payment Status Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Status de Pagamentos</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.students_fully_paid}</div>
                <div className="text-sm text-gray-600">Pago Completo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{metrics.students_partially_paid}</div>
                <div className="text-sm text-gray-600">Parcialmente Pago</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{metrics.students_no_payment}</div>
                <div className="text-sm text-gray-600">Não Pago</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.students_overpaid}</div>
                <div className="text-sm text-gray-600">Pago a Mais</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{metrics.students_missing_vindi}</div>
                <div className="text-sm text-gray-600">Sem Vindi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Discrepancy Alerts */}
        {metrics.high_discrepancy_count > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-800">Discrepâncias Altas</h3>
            </div>
            <p className="text-red-700 mt-2">
              {metrics.high_discrepancy_count} alunos com discrepância superior a R$ 1.000,00
            </p>
            <p className="text-sm text-red-600 mt-1">
              Discrepância média: {formatPercentage(metrics.avg_discrepancy_percentage)} • 
              Total: {formatCurrency(metrics.total_discrepancy)}
            </p>
          </div>
        )}

        {/* Renewals Info */}
        {metrics.customers_with_renewals > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-800">Renovações</h3>
            </div>
            <p className="text-blue-700 mt-2">
              {metrics.customers_with_renewals} alunos com renovações • 
              Total de {metrics.total_renewal_count} renovações
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Média de {metrics.avg_renewals_per_customer.toFixed(1)} renovações por aluno
            </p>
          </div>
        )}

        {/* Customer Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Alunos ({filteredCustomers.length.toLocaleString()})
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status de Pagamento
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="FULLY_PAID">Pago Completo</option>
                    <option value="PARTIALLY_PAID">Parcialmente Pago</option>
                    <option value="NO_PAYMENT">Não Pago</option>
                    <option value="OVERPAID">Pago a Mais</option>
                    <option value="MISSING_VINDI">Sem Vindi</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Pagamento
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={recurringFilter}
                    onChange={(e) => setRecurringFilter(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="recurring">Recorrente</option>
                    <option value="one-time">Único</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aluno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financeiro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorrente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.slice(0, 50).map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.nome}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.cpf_cnpj}
                        </div>
                        {customer.has_renewal && (
                          <div className="text-xs text-blue-600 mt-1">
                            {customer.renewal_count} renovações
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.vindi_total_paid)}
                        </div>
                        <div className="text-sm text-gray-500">
                          de {formatCurrency(customer.valor_total_sheets)}
                        </div>
                        {Math.abs(customer.discrepancy) > 100 && (
                          <div className={`text-xs mt-1 ${customer.discrepancy > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {customer.discrepancy > 0 ? '+' : ''}{formatCurrency(customer.discrepancy)}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                        {getStatusLabel(customer.status)}
                      </span>
                      <div className={`text-xs mt-1 ${getChurnRiskColor(customer.churn_risk)}`}>
                        Risco: {customer.churn_risk}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.is_recurring ? (
                        <div>
                          <div className={`text-sm font-medium ${customer.payment_ok ? 'text-green-600' : 'text-red-600'}`}>
                            {customer.payment_ok ? 'Em dia' : 'Pendente'}
                          </div>
                          {customer.missing_payments > 0 && (
                            <div className="text-xs text-red-600">
                              {customer.missing_payments} pagamentos em atraso
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Único</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          loadCustomerDetails(customer.cpf_cnpj);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCustomers.length > 50 && (
            <div className="px-6 py-4 bg-gray-50 border-t text-sm text-gray-600 text-center">
              Mostrando 50 de {filteredCustomers.length.toLocaleString()} resultados
            </div>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && customerDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalhes do Aluno
                </h3>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Customer Basic Info */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Informações Básicas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <div className="mt-1 text-sm text-gray-900">{customerDetails.customer.nome}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
                    <div className="mt-1 text-sm text-gray-900">{customerDetails.customer.cpf_cnpj}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 text-sm text-gray-900">{customerDetails.customer.email || 'Não informado'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customerDetails.customer.status)}`}>
                        {getStatusLabel(customerDetails.customer.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Comparison */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Comparação de Pagamentos</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sheets Data */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="font-medium text-blue-800 mb-3">Dados da Planilha</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Total:</span>
                        <span className="text-sm font-semibold text-blue-900">
                          {formatCurrency(customerDetails.paymentComparison.sheets.total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Produto:</span>
                        <span className="text-sm font-semibold text-blue-900">
                          {formatCurrency(customerDetails.paymentComparison.sheets.product)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Serviço:</span>
                        <span className="text-sm font-semibold text-blue-900">
                          {formatCurrency(customerDetails.paymentComparison.sheets.service)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Data:</span>
                        <span className="text-sm font-semibold text-blue-900">
                          {customerDetails.paymentComparison.sheets.date || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vindi Data */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h5 className="font-medium text-green-800 mb-3">Dados do Vindi</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">Pago:</span>
                        <span className="text-sm font-semibold text-green-900">
                          {formatCurrency(customerDetails.paymentComparison.vindi.total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">Produto:</span>
                        <span className="text-sm font-semibold text-green-900">
                          {formatCurrency(customerDetails.paymentComparison.vindi.product)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">Serviço:</span>
                        <span className="text-sm font-semibold text-green-900">
                          {formatCurrency(customerDetails.paymentComparison.vindi.service)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">Pendente:</span>
                        <span className="text-sm font-semibold text-green-900">
                          {formatCurrency(customerDetails.paymentComparison.vindi.pending)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {customerDetails.paymentComparison.vindi.paymentHistory.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Histórico de Pagamentos</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customerDetails.paymentComparison.vindi.paymentHistory.slice(0, 10).map((payment, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {new Date(payment.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                payment.status === 'PAID' ? 'text-green-800 bg-green-100' :
                                payment.status === 'PENDING' ? 'text-yellow-800 bg-yellow-100' :
                                'text-red-800 bg-red-100'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {payment.method}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {payment.type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reconciliation Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Resumo da Reconciliação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Discrepância</label>
                    <div className={`mt-1 text-lg font-semibold ${customerDetails.paymentComparison.reconciliation.discrepancy > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(customerDetails.paymentComparison.reconciliation.discrepancy))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {customerDetails.paymentComparison.reconciliation.isRecurring ? 'Recorrente' : 'Único'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status Pagamento</label>
                    <div className={`mt-1 text-sm font-medium ${customerDetails.paymentComparison.reconciliation.paymentOk ? 'text-green-600' : 'text-red-600'}`}>
                      {customerDetails.paymentComparison.reconciliation.paymentOk ? 'Em dia' : 'Pendente'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}