import { useState, useEffect } from 'react';
import { Sale } from '../types/sale';

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSales = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setSales(data.sales);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
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

  return (
    <div className="container">
      <h1>Dashboard de Vendas - Better Education</h1>
      
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
        
        <button onClick={fetchSales} disabled={loading}>
          {loading ? 'Carregando...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="summary">
            <h2>Resumo</h2>
            <p>Total de vendas: {sales.length}</p>
            <p>
              Valor total: {formatCurrency(
                sales.reduce((sum, sale) => sum + sale.valor_total, 0)
              )}
            </p>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>CPF/CNPJ</th>
                  <th>Nome</th>
                  <th>Cliente</th>
                  <th>Celular</th>
                  <th>Endereço</th>
                  <th>Data Transação</th>
                  <th>Data Venda</th>
                  <th>Última Parcela</th>
                  <th>Forma</th>
                  <th>Produto</th>
                  <th>Bandeira</th>
                  <th>Parcelas</th>
                  <th>Valor Total</th>
                  <th>Valor Produto</th>
                  <th>Valor Serviço</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, index) => (
                  <tr key={index}>
                    <td>{sale.documento}</td>
                    <td>{sale.cpf_cnpj}</td>
                    <td>{sale.nome}</td>
                    <td>{sale.cliente}</td>
                    <td>{sale.celular}</td>
                    <td>{sale.endereco}</td>
                    <td>{formatDate(sale.data_transacao)}</td>
                    <td>{formatDate(sale.data_venda)}</td>
                    <td>{formatDate(sale.ultima_parcela)}</td>
                    <td>{sale.forma}</td>
                    <td>{sale.produto}</td>
                    <td>{sale.bandeira}</td>
                    <td>{sale.parcelas}</td>
                    <td>{formatCurrency(sale.valor_total)}</td>
                    <td>{formatCurrency(sale.valor_produto)}</td>
                    <td>{formatCurrency(sale.valor_servico)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 100%;
        }

        h1 {
          color: #333;
          margin-bottom: 30px;
        }

        .filters {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
          align-items: flex-end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          margin-bottom: 5px;
          font-weight: bold;
        }

        input[type="date"] {
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

        .summary {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .summary h2 {
          margin-top: 0;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th, td {
          padding: 10px;
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
      `}</style>
    </div>
  );
}