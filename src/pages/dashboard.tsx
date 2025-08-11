import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerPaymentAnalysis, PaymentSummary } from '../types/customer-analysis';

export default function CustomerDashboard() {
  const [customers, setCustomers] = useState<CustomerPaymentAnalysis[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/customer-analysis-simple?${params}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setCustomers(data.customers);
      setSummary(data.summary);
      setMessage(data.message || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getFilteredCustomers = () => {
    switch (filter) {
      case 'delinquent':
        return customers.filter(c => c.isDelinquent);
      case 'uptodate':
        return customers.filter(c => c.isUpToDate);
      case 'inconsistencies':
        return customers.filter(c => c.hasInconsistencies);
      default:
        return customers;
    }
  };

  const getStatusBadge = (customer: CustomerPaymentAnalysis) => {
    if (customer.isDelinquent) {
      return <span className="status-badge delinquent">Inadimplente</span>;
    }
    if (customer.isUpToDate) {
      return <span className="status-badge uptodate">Em Dia</span>;
    }
    return <span className="status-badge pending">Pendente</span>;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Dashboard de Clientes - Better Education</h1>
        <Link href="/" className="link-button">
          ← Voltar para Vendas
        </Link>
      </div>
      
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="startDate">Data Início:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="endDate">Data Fim:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter">Filtro:</label>
          <select 
            id="filter" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos os Clientes</option>
            <option value="delinquent">Inadimplentes</option>
            <option value="uptodate">Em Dia</option>
            <option value="inconsistencies">Com Inconsistências</option>
          </select>
        </div>
        
        <button onClick={fetchAnalysis} disabled={loading}>
          {loading ? 'Carregando...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="info">{message}</div>}

      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Total de Clientes</h3>
            <div className="summary-value">{summary.totalCustomers}</div>
          </div>
          <div className="summary-card">
            <h3>Valor Total Contratado</h3>
            <div className="summary-value">{formatCurrency(summary.totalContractValue)}</div>
          </div>
          <div className="summary-card">
            <h3>Valor Pago</h3>
            <div className="summary-value success">{formatCurrency(summary.totalPaidAmount)}</div>
          </div>
          <div className="summary-card">
            <h3>Inadimplência</h3>
            <div className="summary-value danger">{formatCurrency(summary.totalDelinquent)}</div>
          </div>
          <div className="summary-card">
            <h3>A Receber</h3>
            <div className="summary-value warning">{formatCurrency(summary.totalFutureRecurring)}</div>
          </div>
          <div className="summary-card">
            <h3>Clientes em Dia</h3>
            <div className="summary-value">{summary.upToDateCustomers}</div>
          </div>
          <div className="summary-card">
            <h3>Clientes Inadimplentes</h3>
            <div className="summary-value danger">{summary.delinquentCustomers}</div>
          </div>
          <div className="summary-card">
            <h3>Com Inconsistências</h3>
            <div className="summary-value warning">{summary.customersWithInconsistencies}</div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>CPF/CNPJ</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Tipo Pagamento</th>
                <th>Valor Contrato</th>
                <th>Valor Pago</th>
                <th>Inadimplência</th>
                <th>A Receber</th>
                <th>Primeira Transação</th>
                <th>Último Pagamento</th>
                <th>Próximo Vencimento</th>
                <th>Transações</th>
                <th>Inconsistências</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredCustomers().map((customer, index) => (
                <tr key={index} className={customer.isDelinquent ? 'delinquent-row' : ''}>
                  <td>{customer.cpf_cnpj}</td>
                  <td>{customer.nome}</td>
                  <td>{getStatusBadge(customer)}</td>
                  <td className="payment-type">
                    {customer.paymentType === 'full' ? 'Integral' : 'Parcial + Recorrente'}
                  </td>
                  <td>{formatCurrency(customer.totalContractValue)}</td>
                  <td className="success">{formatCurrency(customer.totalPaidAmount)}</td>
                  <td className={customer.delinquentAmount > 0 ? 'danger' : ''}>
                    {formatCurrency(customer.delinquentAmount)}
                  </td>
                  <td className="warning">{formatCurrency(customer.futureRecurringAmount)}</td>
                  <td>{formatDate(customer.firstTransactionDate)}</td>
                  <td>{formatDate(customer.lastPaymentDate)}</td>
                  <td>{formatDate(customer.nextPaymentDue)}</td>
                  <td className="transaction-count">{customer.allTransactions.length}</td>
                  <td className="inconsistencies">
                    {customer.inconsistencies.length > 0 ? (
                      <details>
                        <summary>{customer.inconsistencies.length} problema(s)</summary>
                        <ul>
                          {customer.inconsistencies.map((inc, i) => (
                            <li key={i}>{inc}</li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      '✓'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 100%;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .header h1 {
          color: #333;
          margin: 0;
        }

        .link-button {
          padding: 8px 16px;
          background-color: #6c757d;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        }

        .link-button:hover {
          background-color: #5a6268;
        }

        .filters {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          margin-bottom: 5px;
          font-weight: bold;
        }

        input[type="date"], select {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        button {
          padding: 8px 20px;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button:hover {
          background-color: #0051cc;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .error {
          background-color: #fee;
          color: #c00;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .info {
          background-color: #e7f3ff;
          color: #0070f3;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .summary-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #666;
        }

        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .summary-value.success {
          color: #28a745;
        }

        .summary-value.danger {
          color: #dc3545;
        }

        .summary-value.warning {
          color: #ffc107;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th, td {
          padding: 8px;
          text-align: left;
          border: 1px solid #ddd;
        }

        th {
          background-color: #f5f5f5;
          font-weight: bold;
          position: sticky;
          top: 0;
        }

        tbody tr:hover {
          background-color: #f9f9f9;
        }

        .delinquent-row {
          background-color: #fff2f2;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status-badge.uptodate {
          background-color: #d4edda;
          color: #155724;
        }

        .status-badge.delinquent {
          background-color: #f8d7da;
          color: #721c24;
        }

        .status-badge.pending {
          background-color: #fff3cd;
          color: #856404;
        }

        .payment-type {
          font-size: 10px;
        }

        .success {
          color: #28a745;
        }

        .danger {
          color: #dc3545;
        }

        .warning {
          color: #ffc107;
        }

        .transaction-count {
          text-align: center;
          font-weight: bold;
        }

        .inconsistencies summary {
          cursor: pointer;
          font-weight: bold;
          color: #ffc107;
        }

        .inconsistencies ul {
          margin: 5px 0;
          padding-left: 15px;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}