import { useEffect, useState } from 'react';

export default function Debug() {
  const [result, setResult] = useState('Testing...');

  useEffect(() => {
    fetch('/api/dashboard-data-v2')
      .then(res => res.json())
      .then(data => {
        setResult(`SUCCESS: Found ${data.customers?.length || 0} customers, Revenue: R$ ${data.summary?.grossRevenue || 0}`);
      })
      .catch(err => {
        setResult(`ERROR: ${err.message}`);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Page (No ErrorBoundary)</h1>
      <p>{result}</p>
    </div>
  );
}