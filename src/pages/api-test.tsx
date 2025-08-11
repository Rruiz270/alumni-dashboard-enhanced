import { useState } from 'react';
import Link from 'next/link';

export default function ApiTest() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2025-08-11');
  const [sheetId, setSheetId] = useState('1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (endpoint: string, params: Record<string, string> = {}) => {
    setLoading(true);
    setResult(null);
    
    try {
      const urlParams = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
        sheetId,
        gid: '0',
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

  const downloadExcel = (endpoint = 'export-excel') => {
    const params = new URLSearchParams({
      startDate: startDate,
      endDate: endDate,
      sheetId,
      gid: '0',
      format: 'excel'
    });
    
    window.open(`/api/${endpoint}?${params}`, '_blank');
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label>
                <strong>Data Venda Início:</strong>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ marginLeft: '10px', padding: '5px', width: '100%' }}
                />
              </label>
              <label>
                <strong>Data Venda Fim:</strong>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ marginLeft: '10px', padding: '5px', width: '100%' }}
                />
              </label>
            </div>
            
            <label>
              <strong>Google Sheets ID:</strong>
              <input 
                type="text" 
                value={sheetId} 
                onChange={(e) => setSheetId(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px', width: '100%' }}
              />
            </label>
          </div>
        </div>

        <div>
          <h3>Testes de API</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => testEndpoint('debug-cpf')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#8b00ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🆔 Debug CPF/CNPJ
            </button>
            <button 
              onClick={() => testEndpoint('raw-data')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#ff006e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🔍 Dados Brutos Vindi
            </button>
            <button 
              onClick={() => testEndpoint('debug-crossmatch')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🐛 Debug Crossmatch
            </button>
            <button 
              onClick={() => testEndpoint('export-advanced')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              📊 Dados Avançados JSON
            </button>
            <button 
              onClick={() => downloadExcel('export-advanced')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              📁 Excel com Parcelas
            </button>
            <button 
              onClick={() => testEndpoint('google-sheets')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              📋 Testar Google Sheets
            </button>
            <button 
              onClick={() => testEndpoint('compare-data')} 
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🔄 Comparar Dados
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
          
          {/* Special display for customer data with installment dropdown */}
          {result.success && result.data && result.data.customers && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Clientes com Detalhes de Parcelas:</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
                {result.data.customers.slice(0, 10).map((customer: any, index: number) => (
                  <details key={index} style={{ marginBottom: '10px', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0070f3' }}>
                      {customer.nome} ({customer.cpf_cnpj}) - {customer.allTransactions.length} transação(ões)
                    </summary>
                    <div style={{ marginTop: '10px', fontSize: '12px' }}>
                      <p><strong>Status:</strong> {customer.isUpToDate ? '✅ Em Dia' : customer.isDelinquent ? '❌ Inadimplente' : '⚠️ Pendente'}</p>
                      <p><strong>Encontrado na Planilha:</strong> {customer.spreadsheetData ? '✅ Sim' : '❌ Não'}</p>
                      {customer.inconsistencies.length > 0 && (
                        <p><strong>Inconsistências:</strong> {customer.inconsistencies.join(', ')}</p>
                      )}
                      <h5>Todas as Transações:</h5>
                      <ul>
                        {customer.allTransactions.map((transaction: any, tIndex: number) => (
                          <li key={tIndex} style={{ marginBottom: '5px' }}>
                            📅 {transaction.data_transacao} | 
                            💰 R$ {transaction.valor_total.toFixed(2)} | 
                            🔢 {transaction.parcelas}x | 
                            🏷️ {transaction.produto}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
          
          <pre style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '5px', 
            overflow: 'auto',
            maxHeight: '400px',
            fontSize: '11px'
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