import { useState } from 'react';
import Link from 'next/link';

export default function ApiTest() {
  const [startDate, setStartDate] = useState('2025-08-01');
  const [endDate, setEndDate] = useState('2025-08-11');
  const [sheetId, setSheetId] = useState('1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (endpoint: string, params: Record<string, string> = {}) => {
    setLoading(true);
    setResult(null);
    
    try {
      const urlParams = new URLSearchParams({
        startDate,
        endDate,
        sheetId,
        ...params
      });
      
      const response = await fetch(`/api/${endpoint}?${urlParams}`);
      const data = await response.json();
      
      setResult({ 
        endpoint, 
        success: response.ok, 
        status: response.status, 
        data 
      });
    } catch (error) {
      setResult({ 
        endpoint, 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      format: 'excel'
    });
    
    window.open(`/api/export-excel?${params}`, '_blank');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Teste de APIs - Better Education</h1>
        <Link href="/" style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          ← Voltar
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div>
          <h3>Configurações</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>
              Data Início:
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
            <label>
              Data Fim:
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
            <label>
              Google Sheets ID:
              <input 
                type="text" 
                value={sheetId} 
                onChange={(e) => setSheetId(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              />
            </label>
          </div>
        </div>

        <div>
          <h3>Testes de API</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => testEndpoint('export-excel')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Testar Dados JSON
            </button>
            <button 
              onClick={downloadExcel} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Baixar Excel
            </button>
            <button 
              onClick={() => testEndpoint('google-sheets')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Testar Google Sheets
            </button>
            <button 
              onClick={() => testEndpoint('compare-data')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Comparar Vindi vs Sheets
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Carregando...</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '30px' }}>
          <h3>Resultado: {result.endpoint}</h3>
          <div style={{ 
            backgroundColor: result.success ? '#d4edda' : '#f8d7da', 
            color: result.success ? '#155724' : '#721c24',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            Status: {result.status} - {result.success ? 'Sucesso' : 'Erro'}
          </div>
          
          <pre style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '5px', 
            overflow: 'auto',
            maxHeight: '500px',
            fontSize: '12px'
          }}>
            {JSON.stringify(result.data || result.error, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h3>URLs dos Endpoints</h3>
        <ul style={{ fontSize: '12px' }}>
          <li><code>/api/export-excel?startDate=2025-08-01&endDate=2025-08-11</code> - Dados JSON</li>
          <li><code>/api/export-excel?startDate=2025-08-01&endDate=2025-08-11&format=excel</code> - Download Excel</li>
          <li><code>/api/google-sheets?sheetId=1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8</code> - Ler Google Sheets</li>
          <li><code>/api/compare-data?startDate=2025-08-01&endDate=2025-08-11&sheetId=1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8</code> - Comparar dados</li>
        </ul>
      </div>
    </div>
  );
}