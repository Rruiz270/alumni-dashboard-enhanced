import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, Users, AlertCircle, CheckCircle, 
  CreditCard, FileText, TrendingUp, Calendar,
  ShoppingBag, Briefcase, AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { useDashboardData, useCustomerSearch, useInconsistencyResolver } from '@/hooks/useDashboardData';

const SalesDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [dateRange, setDateRange] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  
  // Hooks para dados
  const { data, loading, error, refreshData } = useDashboardData();
  const { results: searchResults, loading: searchLoading, searchCustomers } = useCustomerSearch();
  const { resolveInconsistency, loading: resolveLoading } = useInconsistencyResolver();
  
  // Dados dos hooks
  const salesData = data?.summary || {
    totalRevenue: 0,
    totalCustomers: 0,
    pendingPayments: 0,
    inconsistencies: 0,
    totalPaidAmount: 0,
    upToDateCustomers: 0,
    delinquentCustomers: 0
  };
  
  const paymentMethods = data?.paymentMethods || [];
  const monthlyRevenue = data?.monthlyRevenue || [];
  const inconsistenciesData = data?.inconsistencies || [];
  const customerDetails = searchQuery ? searchResults : (filteredCustomers.length > 0 ? filteredCustomers : data?.customers || []);
  
  const salesByType = [
    { name: 'Produto', value: 50, color: '#8b5cf6' },
    { name: 'Serviço', value: 50, color: '#ec4899' }
  ];
  
  // Calcular taxa de cancelamento
  const cancellationRate = salesData.totalCustomers > 0 
    ? ((salesData.delinquentCustomers / salesData.totalCustomers) * 100).toFixed(1)
    : '0';

  const KPICard = ({ title, value, icon: Icon, trend, color = "blue" }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    trend?: number;
    color?: string;
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </p>
            )}
          </div>
          <Icon className={`w-8 h-8 text-${color}-500`} />
        </div>
      </CardContent>
    </Card>
  );

  // Função para buscar clientes
  const handleCustomerSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchCustomers(query);
    }
  };
  
  // Função para resolver inconsistência
  const handleResolveInconsistency = async (inconsistencyId: number) => {
    try {
      await resolveInconsistency(inconsistencyId);
      // Recarregar dados após resolver
      refreshData();
      alert('Inconsistência resolvida com sucesso!');
    } catch (error) {
      alert('Erro ao resolver inconsistência. Tente novamente.');
    }
  };
  
  // Atualizar lista de clientes filtrados quando os dados carregarem
  useEffect(() => {
    if (data?.customers && !searchQuery) {
      setFilteredCustomers(data.customers);
    }
  }, [data, searchQuery]);
  
  const InconsistencyAlert = ({ inconsistency }: { inconsistency: any }) => (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="ml-2">
        <div className="flex justify-between items-start">
          <div>
            <strong>{inconsistency.cliente}</strong> - CPF: {inconsistency.cpf}
            <p className="text-sm mt-1">{inconsistency.tipo}</p>
            {inconsistency.diferenca && (
              <p className="text-sm text-orange-600 font-semibold">
                Diferença: R$ {inconsistency.diferenca.toFixed(2)}
              </p>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            inconsistency.status === 'pendente' ? 'bg-red-100 text-red-800' :
            inconsistency.status === 'analisando' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {inconsistency.status}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );

  // Estados de loading e error
  if (loading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Carregando Dashboard</h2>
          <p className="text-gray-600">Buscando dados da Vindi e planilha...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Vendas - VINDI</h1>
            <p className="text-gray-600 mt-2">Controle integrado de vendas e inconsistências</p>
          </div>
          <button
            onClick={refreshData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar Dados'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="ml-2">
            <strong>Aviso:</strong> {error}
            <br />
            <small>Usando dados de fallback. Clique em "Atualizar Dados" para tentar novamente.</small>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          className={`pb-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('overview')}
        >
          Visão Geral
        </button>
        <button
          className={`pb-2 px-4 ${activeTab === 'inconsistencies' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('inconsistencies')}
        >
          Inconsistências ({inconsistenciesData.length})
        </button>
        <button
          className={`pb-2 px-4 ${activeTab === 'customers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('customers')}
        >
          Clientes
        </button>
        <button
          className={`pb-2 px-4 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('reports')}
        >
          Relatórios
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard 
              title="Receita Total" 
              value={`R$ ${salesData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              trend={12.5}
              color="green"
            />
            <KPICard 
              title="Total de Clientes" 
              value={salesData.totalCustomers}
              icon={Users}
              trend={8.3}
              color="blue"
            />
            <KPICard 
              title="Pagamentos Pendentes" 
              value={`R$ ${salesData.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={AlertCircle}
              color="orange"
            />
            <KPICard 
              title="Inconsistências" 
              value={salesData.inconsistencies}
              icon={AlertTriangle}
              color="red"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparativo VINDI vs Planilha</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend />
                    <Line type="monotone" dataKey="vindi" stroke="#3b82f6" name="VINDI" />
                    <Line type="monotone" dataKey="planilha" stroke="#10b981" name="Planilha" />
                    <Line type="monotone" dataKey="diferenca" stroke="#ef4444" name="Diferença" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Inconsistencies Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                Inconsistências Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inconsistenciesData.slice(0, 3).map((item) => (
                <InconsistencyAlert key={item.id} inconsistency={item} />
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Inconsistencies Tab */}
      {activeTab === 'inconsistencies' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Inconsistências</CardTitle>
              <p className="text-sm text-gray-600">
                Diferenças identificadas entre VINDI e Planilha de Controle
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">CPF/CNPJ</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">VINDI</th>
                      <th className="text-left p-2">Planilha</th>
                      <th className="text-left p-2">Diferença</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inconsistenciesData.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{item.cpf}</td>
                        <td className="p-2">{item.cliente}</td>
                        <td className="p-2">{item.tipo}</td>
                        <td className="p-2">
                          {item.vindiValor ? `R$ ${item.vindiValor.toFixed(2)}` : item.vindiForma || '-'}
                        </td>
                        <td className="p-2">
                          {item.planilhaValor ? `R$ ${item.planilhaValor.toFixed(2)}` : item.planilhaForma || '-'}
                        </td>
                        <td className="p-2 text-red-600 font-semibold">
                          {item.diferenca ? `R$ ${item.diferenca.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'pendente' ? 'bg-red-100 text-red-800' :
                            item.status === 'analisando' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                            onClick={() => handleResolveInconsistency(item.id)}
                            disabled={resolveLoading}
                          >
                            {resolveLoading ? 'Resolvendo...' : 'Resolver'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Resumo de Inconsistências */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Por Tipo</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Valor divergente</span>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Forma pagamento</span>
                    <span className="font-semibold">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Sinal PIX pendente</span>
                    <span className="font-semibold">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Impacto Financeiro</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total divergente</span>
                    <span className="font-semibold text-red-600">R$ 3.450,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Sinais pendentes</span>
                    <span className="font-semibold text-orange-600">R$ 1.500,00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Status de Resolução</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Resolvidas hoje</span>
                    <span className="font-semibold text-green-600">5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Em análise</span>
                    <span className="font-semibold text-yellow-600">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pendentes</span>
                    <span className="font-semibold text-red-600">10</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes dos Clientes</CardTitle>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Buscar por CPF/CNPJ ou nome..."
                value={searchQuery}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                className="w-full md:w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchLoading && (
                <div className="mt-2 text-sm text-gray-600">
                  <RefreshCw className="inline w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">CPF/CNPJ</th>
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Produto/Serviço</th>
                    <th className="text-left p-2">Valor Total</th>
                    <th className="text-left p-2">Valor Pago</th>
                    <th className="text-left p-2">Pendente</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {customerDetails.map((customer, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{customer.cpf}</td>
                      <td className="p-2">{customer.nome}</td>
                      <td className="p-2">{customer.produto}</td>
                      <td className="p-2">R$ {customer.valorTotal.toFixed(2)}</td>
                      <td className="p-2 text-green-600">R$ {customer.valorPago.toFixed(2)}</td>
                      <td className="p-2 text-orange-600">R$ {customer.valorPendente.toFixed(2)}</td>
                      <td className="p-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          {customer.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Vendas por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <select className="px-4 py-2 border rounded-lg">
                  <option>Últimos 30 dias</option>
                  <option>Últimos 90 dias</option>
                  <option>Este ano</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                  <Legend />
                  <Bar dataKey="vindi" fill="#3b82f6" name="VINDI" />
                  <Bar dataKey="planilha" fill="#10b981" name="Planilha" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Cancelamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-600">{cancellationRate}%</p>
                  <p className="text-gray-600 mt-2">Taxa média dos últimos 6 meses</p>
                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Cancelamentos este mês</span>
                      <span className="font-semibold">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor perdido</span>
                      <span className="font-semibold text-red-600">R$ 18.500,00</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição Produto vs Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={salesByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {salesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Detalhes do Cliente</h2>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="font-semibold">{selectedCustomer.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CPF/CNPJ</p>
                  <p className="font-semibold">{selectedCustomer.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Produto/Serviço</p>
                  <p className="font-semibold">{selectedCustomer.produto}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data da Venda</p>
                  <p className="font-semibold">{selectedCustomer.dataVenda}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Informações Financeiras</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="font-semibold">R$ {selectedCustomer.valorTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor Pago</p>
                    <p className="font-semibold text-green-600">R$ {selectedCustomer.valorPago.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor Pendente</p>
                    <p className="font-semibold text-orange-600">R$ {selectedCustomer.valorPendente.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Forma de Pagamento</p>
                    <p className="font-semibold">{selectedCustomer.formaPagamento} - {selectedCustomer.parcelas}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Histórico de Pagamentos</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Parcela 1/6</span>
                    <span className="text-green-600">Pago - R$ 250,00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Parcela 2/6</span>
                    <span className="text-green-600">Pago - R$ 250,00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Parcela 3/6</span>
                    <span className="text-orange-600">Pendente - R$ 250,00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDashboard;