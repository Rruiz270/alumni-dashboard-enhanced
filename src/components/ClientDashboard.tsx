import { useEffect, useState } from 'react';

export default function ClientDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard-data-v2')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data</div>;

  const summary = (data as any).summary || {};
  const customers = (data as any).customers || [];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Client-Only Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>Total Clientes</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.totalCustomers || 0}</p>
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>Receita Bruta</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>R$ {(summary.grossRevenue || 0).toFixed(2)}</p>
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>MRR</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>R$ {(summary.mrr || 0).toFixed(2)}</p>
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3>Taxa de Churn</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.churnRate || 0}%</p>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3>Primeiros 10 Clientes</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>CPF</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Produto</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Valor</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.slice(0, 10).map((customer: any, index: number) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{customer.nome}</td>
                <td style={{ padding: '8px' }}>{customer.cpf_cnpj}</td>
                <td style={{ padding: '8px' }}>{customer.produto}</td>
                <td style={{ padding: '8px' }}>R$ {(customer.valor_total || 0).toFixed(2)}</td>
                <td style={{ padding: '8px' }}>{customer.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h3>Debug Info</h3>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(summary, null, 2)}
        </pre>
      </div>
    </div>
  );
}