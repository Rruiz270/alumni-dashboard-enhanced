import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, Users, AlertCircle, CheckCircle, 
  CreditCard, FileText, TrendingUp, Calendar,
  ShoppingBag, Briefcase, AlertTriangle, X
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [customerAnalysis, setCustomerAnalysis] = useState<any[]>([]);
  const [inconsistencies, setInconsistencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurações de data
  const [startDate] = useState('2024-01-01');
  const [endDate] = useState('2025-08-11');
  const [sheetId] = useState('1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
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
    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg">Carregando dados da Vindi...</p>
            <p className="text-sm text-gray-600">Isso pode demorar alguns segundos</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">
            <strong>Erro ao carregar dados:</strong> {error}
            <button 
              onClick={fetchData} 
              className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Vendas - VINDI</h1>
        <p className="text-gray-600 mt-2">Controle integrado de vendas e inconsistências - v1.0</p>
        <button 
          onClick={fetchData} 
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          🔄 Atualizar Dados
        </button>
      </div>

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
          Inconsistências ({inconsistencies.length})
        </button>
        <button
          className={`pb-2 px-4 ${activeTab === 'customers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('customers')}
        >
          Clientes ({customerAnalysis.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && salesData && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard 
              title="Receita Total" 
              value={`R$ ${salesData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="green"
            />
            <KPICard 
              title="Total de Clientes" 
              value={salesData.totalCustomers}
              icon={Users}
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
              value={inconsistencies.length}
              icon={AlertTriangle}
              color="red"
            />
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-green-600">Clientes em Dia</h3>
                <p className="text-3xl font-bold">{salesData.upToDateCustomers}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {((salesData.upToDateCustomers / salesData.totalCustomers) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-red-600">Inadimplentes</h3>
                <p className="text-3xl font-bold">{salesData.delinquentCustomers}</p>
                <p className="text-sm text-gray-600 mt-1">
                  R$ {salesData.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-blue-600">Valor Pago</h3>
                <p className="text-3xl font-bold">R$ {salesData.totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {((salesData.totalPaidAmount / salesData.totalRevenue) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Inconsistencies Tab */}
      {activeTab === 'inconsistencies' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inconsistências Encontradas</CardTitle>
              <p className="text-sm text-gray-600">
                Clientes com problemas ou não encontrados na planilha
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inconsistencies.slice(0, 10).map((customer, index) => (
                  <Alert key={index} className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="ml-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong>{customer.nome}</strong> - CPF: {customer.cpf_cnpj || 'Não informado'}
                          <p className="text-sm mt-1">
                            {!customer.spreadsheetData ? 'Não encontrado na planilha' : 'Dados divergentes'}
                          </p>
                          {customer.inconsistencies && customer.inconsistencies.length > 0 && (
                            <p className="text-sm text-orange-600">
                              {customer.inconsistencies.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                          {customer.isDelinquent ? 'Inadimplente' : 'Pendente'}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">CPF/CNPJ</th>
                    <th className="text-left p-2">Valor Total</th>
                    <th className="text-left p-2">Valor Pago</th>
                    <th className="text-left p-2">Pendente</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerAnalysis.slice(0, 20).map((customer, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{customer.nome}</td>
                      <td className="p-2">{customer.cpf_cnpj || 'N/A'}</td>
                      <td className="p-2">R$ {customer.totalContractValue.toFixed(2)}</td>
                      <td className="p-2 text-green-600">R$ {customer.totalPaidAmount.toFixed(2)}</td>
                      <td className="p-2 text-orange-600">R$ {customer.delinquentAmount.toFixed(2)}</td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          customer.isUpToDate ? 'bg-green-100 text-green-800' :
                          customer.isDelinquent ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {customer.isUpToDate ? 'Em dia' : customer.isDelinquent ? 'Inadimplente' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}