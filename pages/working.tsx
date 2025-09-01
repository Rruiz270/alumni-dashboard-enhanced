import { useEffect, useState } from 'react';

export default function Working() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard-data-v2')
      .then(res => res.json())
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  const customers = (data as any)?.customers || [];
  const summary = (data as any)?.summary || {};

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Working Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
          <strong>Total Clientes:</strong> {summary.totalCustomers || 0}
        </div>
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
          <strong>Receita:</strong> R$ {(summary.grossRevenue || 0).toFixed(2)}
        </div>
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
          <strong>MRR:</strong> R$ {(summary.mrr || 0).toFixed(2)}
        </div>
      </div>

      <h2>Primeiros 5 Clientes:</h2>
      <ul>
        {customers.slice(0, 5).map((customer: any, i: number) => (
          <li key={i} style={{ marginBottom: '10px' }}>
            <strong>{customer.nome}</strong> - {customer.produto} - R$ {(customer.valor_total || 0).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}