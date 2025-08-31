import { useEffect, useState } from 'react';

export default function SimpleTest() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    fetch('/api/dashboard-data-v2')
      .then(res => res.json())
      .then(data => {
        console.log('Data loaded:', data);
        setData(data);
      })
      .catch(err => {
        console.error('Error:', err);
        setError(err.message);
      });
  }, [mounted]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>Loading data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Test Dashboard</h1>
      <p>API Status: Working</p>
      <p>Customers: {(data as any)?.customers?.length || 0}</p>
      <p>Revenue: R$ {(data as any)?.summary?.grossRevenue || 0}</p>
    </div>
  );
}