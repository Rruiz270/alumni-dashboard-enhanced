export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test VINDI API authentication
    const testUrl = 'https://app.vindi.com.br/api/v1/customers?per_page=1';
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`VINDI API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    // Also test search by CPF
    const testCpf = req.query.cpf || '81206895004';
    const searchUrl = `https://app.vindi.com.br/api/v1/customers?query=registry_code:${testCpf}&per_page=1`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const searchData = await searchResponse.json();

    res.json({
      success: true,
      message: 'VINDI API connection successful',
      authTest: {
        status: response.status,
        hasCustomers: data.customers?.length > 0,
        customerCount: data.customers?.length || 0
      },
      searchTest: {
        cpfSearched: testCpf,
        status: searchResponse.status,
        found: searchData.customers?.length > 0,
        customerData: searchData.customers?.[0] || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}