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
  ShoppingBag, Briefcase, AlertTriangle, X, RefreshCw,
  UserX, Clock, Filter, Download, Eye, EyeOff,
  BarChart3, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { useDashboardData, useCustomerSearch, useFilterOptions } from '@/hooks/useDashboardData';
import { DashboardView, DashboardFilters, CustomerMetrics } from '@/types/dashboard';

const SalesDashboard = () => {
  const [activeView, setActiveView] = useState<DashboardView>('executive');
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hooks for data
  const { data, loading, error, refreshData } = useDashboardData(filters);
  const { results: searchResults, loading: searchLoading, searchCustomers } = useCustomerSearch();
  const filterOptions = useFilterOptions(data);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Format percentage
  const formatPercent = (value: string | number) => {
    return `${value}%`;
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em dia': return 'text-green-600';
      case 'Inadimplente': return 'text-red-600';
      case 'Pendente': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };
  
  // Get churn risk color
  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // KPI Card Component
  const KPICard = ({ title, value, icon: Icon, trend, color = "blue", subtitle }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    trend?: number;
    color?: string;
    subtitle?: string;
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
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

  // Alert Component
  const AlertCard = ({ alert }: { alert: any }) => (
    <Alert className={`mb-4 ${
      alert.severity === 'high' ? 'border-red-500 bg-red-50' :
      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
      'border-blue-500 bg-blue-50'
    }`}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{alert.message}</AlertDescription>
    </Alert>
  );

  // Executive View
  const ExecutiveView = () => (
    <div className="space-y-6">
      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Alertas</h3>
          {data.alerts.map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
        </div>
      )}
      
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Bruta"
          value={formatCurrency(data?.summary.grossRevenue || 0)}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Receita Líquida"
          value={formatCurrency(data?.summary.netRevenue || 0)}
          subtitle={`Margem: ${data?.summary.margin || 0}%`}
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="MRR"
          value={formatCurrency(data?.summary.mrr || 0)}
          subtitle={`ARR: ${formatCurrency(data?.summary.arr || 0)}`}
          icon={Activity}
          color="purple"
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(data?.summary.avgTicket || 0)}
          icon={CreditCard}
          color="indigo"
        />
      </div>

      {/* Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Clientes"
          value={data?.summary.totalCustomers || 0}
          subtitle={`Ativos: ${data?.summary.activeCustomers || 0}`}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Novos vs Renovações"
          value={`${data?.summary.newCustomers || 0} / ${data?.summary.renewals || 0}`}
          subtitle={`Taxa renovação: ${data?.summary.renewalRate || 0}%`}
          icon={ShoppingBag}
          color="green"
        />
        <KPICard
          title="Taxa de Churn"
          value={`${data?.summary.churnRate || 0}%`}
          subtitle={`Cancelados: ${data?.summary.canceledCustomers || 0}`}
          icon={UserX}
          color="red"
        />
        <KPICard
          title="Match Vindi"
          value={`${data?.summary.vindiMatchRate || 0}%`}
          subtitle={`${data?.summary.customersWithVindiMatch || 0} clientes`}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  name="Receita"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="newCustomers" 
                  stroke="#10b981" 
                  name="Novos Clientes"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Mix Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Mix de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.productMix || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ product, count }) => `${product}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {data?.productMix?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cancellation Reasons */}
      {data?.cancellationReasons && data.cancellationReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Motivos de Cancelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.cancellationReasons}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reason" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Commercial View
  const CommercialView = () => (
    <div className="space-y-6">
      {/* Seller Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Médio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Novos/Renovações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxa Churn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desc. Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.sellerPerformance?.map((seller, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {seller.seller}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seller.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(seller.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(seller.avgTicket)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seller.newSales}/{seller.renewals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={parseFloat(seller.churnRate) > 10 ? 'text-red-600' : 'text-green-600'}>
                        {seller.churnRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seller.avgDiscount}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Source Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análise por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.sourceAnalysis || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => 
                name === 'revenue' ? formatCurrency(Number(value)) : value
              } />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Receita" />
              <Bar yAxisId="right" dataKey="count" fill="#10b981" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cohort Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Retenção de Cohort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(data?.cohortRetention || {}).map(([period, retention]) => (
              <div key={period} className="text-center">
                <p className="text-sm text-gray-600">{period}</p>
                <p className="text-2xl font-bold mt-1">{retention}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Finance View
  const FinanceView = () => (
    <div className="space-y-6">
      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Receita Bruta"
          value={formatCurrency(data?.summary.grossRevenue || 0)}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Total de Taxas"
          value={formatCurrency(data?.summary.totalFees || 0)}
          icon={CreditCard}
          color="red"
        />
        <KPICard
          title="Total de Descontos"
          value={formatCurrency(data?.summary.totalDiscounts || 0)}
          icon={AlertTriangle}
          color="yellow"
        />
        <KPICard
          title="Receita Líquida"
          value={formatCurrency(data?.summary.netRevenue || 0)}
          subtitle={`Margem: ${data?.summary.margin || 0}%`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Acquirer Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Análise por Adquirente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adquirente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxa Média
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.acquirerStats?.map((acquirer, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {acquirer.acquirer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {acquirer.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(acquirer.volume)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {acquirer.avgFee}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(acquirer.volume * (parseFloat(acquirer.avgFee) / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Formas de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.paymentMethods || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data?.paymentMethods?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  // Operations View
  const OperationsView = () => (
    <div className="space-y-6">
      {/* Operations KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Acessos Pendentes"
          value={data?.summary.pendingAccess || 0}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Tempo Médio p/ Acesso"
          value={`${data?.summary.avgDaysToAccess || 0} dias`}
          icon={Activity}
          color="blue"
        />
        <KPICard
          title="Cancelamentos Precoces"
          value={data?.summary.earlyCancellations || 0}
          subtitle="Primeiros 7 dias"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Pending Access List */}
      <Card>
        <CardHeader>
          <CardTitle>Alunos Aguardando Acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Venda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dias Aguardando
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risco Churn
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.customers
                  ?.filter(c => !c.acesso_enviado && !c.cancelado)
                  .sort((a, b) => (b.diasAteAcesso || 0) - (a.diasAteAcesso || 0))
                  .slice(0, 10)
                  .map((customer, index) => (
                    <tr key={index} className={(customer.diasAteAcesso || 0) > 2 ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.produto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.data_venda).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={(customer.diasAteAcesso || 0) > 2 ? 'text-red-600 font-bold' : ''}>
                          {customer.diasAteAcesso || 0} dias
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.vendedor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getChurnRiskColor(customer.churnRisk || 'low')}`}>
                          {customer.churnRisk === 'high' ? 'Alto' : 
                           customer.churnRisk === 'medium' ? 'Médio' : 'Baixo'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* High Churn Risk Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes com Alto Risco de Churn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {data?.customers
              ?.filter(c => c.churnRisk === 'high' && !c.cancelado)
              .slice(0, 5)
              .map((customer, index) => (
                <div key={index} className="p-4 border rounded-lg bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{customer.nome}</h4>
                      <p className="text-sm text-gray-600">{customer.produto} - {customer.nivel}</p>
                      <p className="text-sm text-gray-500">
                        Vendido em: {new Date(customer.data_venda).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        Fatores de Risco:
                      </p>
                      {!customer.acesso_enviado && (
                        <p className="text-xs text-red-600">• Sem acesso há {customer.diasAteAcesso || 0} dias</p>
                      )}
                      {customer.desconto > 0.3 && (
                        <p className="text-xs text-red-600">• Desconto alto ({(customer.desconto * 100).toFixed(0)}%)</p>
                      )}
                      {(customer.vindiPendingAmount || 0) > 0 && (
                        <p className="text-xs text-red-600">• Pagamento pendente</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Cancellations View
  const CancellationsView = () => (
    <div className="space-y-6">
      {/* Cancellation KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Taxa de Churn"
          value={`${data?.summary.churnRate || 0}%`}
          icon={UserX}
          color="red"
        />
        <KPICard
          title="Total Cancelamentos"
          value={data?.summary.canceledCustomers || 0}
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Cancelamentos Precoces"
          value={data?.summary.earlyCancellations || 0}
          subtitle="≤ 7 dias"
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Perda de Receita"
          value={formatCurrency(
            data?.customers
              ?.filter(c => c.cancelado)
              .reduce((sum, c) => sum + (c.perda || 0), 0) || 0
          )}
          icon={DollarSign}
          color="red"
        />
      </div>

      {/* Cancellation Reasons Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Cancelamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.cancellationReasons || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Cancellations */}
      <Card>
        <CardHeader>
          <CardTitle>Cancelamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Venda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Cancelamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Janela
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.customers
                  ?.filter(c => c.cancelado)
                  .sort((a, b) => new Date(b.data_cancelamento!).getTime() - new Date(a.data_cancelamento!).getTime())
                  .slice(0, 10)
                  .map((customer, index) => {
                    const daysBetween = Math.floor(
                      (new Date(customer.data_cancelamento!).getTime() - new Date(customer.data_venda).getTime()) / 
                      (1000 * 60 * 60 * 24)
                    );
                    
                    return (
                      <tr key={index} className={daysBetween <= 7 ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.data_venda).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.data_cancelamento!).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={daysBetween <= 7 ? 'text-yellow-600 font-bold' : ''}>
                            {daysBetween} dias
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.razao_cancelamento || 'Não informado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.tipo_cancelamento || 'Não informado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(customer.perda || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.vendedor}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render view based on selection
  const renderView = () => {
    switch (activeView) {
      case 'executive':
        return <ExecutiveView />;
      case 'commercial':
        return <CommercialView />;
      case 'finance':
        return <FinanceView />;
      case 'operations':
        return <OperationsView />;
      case 'cancellations':
        return <CancellationsView />;
      default:
        return <ExecutiveView />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados: {error}
            </AlertDescription>
          </Alert>
          <button
            onClick={refreshData}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Better Education - Dashboard de Vendas
              </h1>
              <p className="text-sm text-gray-500">
                Última atualização: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={refreshData}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'executive', label: 'Visão Executiva', icon: BarChart3 },
              { id: 'commercial', label: 'Comercial', icon: ShoppingBag },
              { id: 'finance', label: 'Finanças', icon: DollarSign },
              { id: 'operations', label: 'Operações', icon: Activity },
              { id: 'cancellations', label: 'Cancelamentos', icon: UserX }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as DashboardView)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium ${
                  activeView === view.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <view.icon className="w-4 h-4 mr-2" />
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
    </div>
  );
};

export default SalesDashboard;