export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if VINDI API key is configured
    if (!process.env.VINDI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'VINDI API key not configured'
      });
    }

    // Get limit from query params (default 50)
    const limit = parseInt(req.query.limit) || 50;
    
    // First, get all CPF/CNPJs from Google Sheets - specifically from Vendas sheet
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/Vendas!A:Z?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const sheetsResponse = await fetch(sheetsUrl);
    
    if (!sheetsResponse.ok) {
      throw new Error('Failed to fetch Google Sheets data');
    }
    
    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];
    const headers = rows[0] || [];
    const dataRows = rows.slice(1).filter(row => row && row.some(cell => cell && cell.toString().trim()));
    
    // Find CPF/CNPJ column index - look for the actual column with numbers
    // The "Vendas" sheet has column names: 'Documento' (index 3) contains "CPF"/"CNPJ"
    // and 'cpf/cnpj' (index 4) contains the actual numbers
    let cpfCnpjIndex = headers.findIndex(h => 
      h && h.toString().toLowerCase() === 'cpf/cnpj'
    );
    
    // If not found, try other common names
    if (cpfCnpjIndex === -1) {
      cpfCnpjIndex = headers.findIndex(h => 
        h && ['CPF/CNPJ', 'Registry Code', 'registry_code'].some(term => 
          h.toString() === term
        )
      );
    }
    
    if (cpfCnpjIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'CPF/CNPJ column not found in spreadsheet',
        debug: {
          headers: headers.slice(0, 10),
          totalRows: rows.length
        }
      });
    }

    // Process customers and fetch VINDI data
    const results = [];
    const processedCpfs = new Set();
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < Math.min(dataRows.length, limit); i++) {
      const row = dataRows[i];
      const cpfCnpj = row[cpfCnpjIndex]?.toString().replace(/\D/g, '') || '';
      
      if (!cpfCnpj || cpfCnpj.length < 11 || processedCpfs.has(cpfCnpj)) {
        continue;
      }
      
      processedCpfs.add(cpfCnpj);
      
      try {
        // Search for customer by CPF/CNPJ in VINDI
        const searchUrl = `https://app.vindi.com.br/api/v1/customers?query=registry_code:${cpfCnpj}&per_page=1`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!searchResponse.ok) {
          throw new Error(`VINDI API error: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        if (searchData.customers && searchData.customers.length > 0) {
          const customer = searchData.customers[0];
          
          // Get customer bills
          const billsUrl = `https://app.vindi.com.br/api/v1/bills?customer_id=${customer.id}&per_page=100`;
          const billsResponse = await fetch(billsUrl, {
            headers: {
              'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
              'Content-Type': 'application/json'
            }
          });
          
          let bills = [];
          let totalPaid = 0;
          let totalPending = 0;
          
          if (billsResponse.ok) {
            const billsData = await billsResponse.json();
            bills = billsData.bills || [];
            
            // Calculate payment totals
            bills.forEach(bill => {
              const amount = (bill.amount || 0) / 100; // Convert from cents
              if (bill.status === 'paid') {
                totalPaid += amount;
              } else if (['pending', 'review'].includes(bill.status)) {
                totalPending += amount;
              }
            });
          }
          
          results.push({
            cpfCnpj,
            vindiCustomerId: customer.id,
            vindiStatus: customer.status,
            customerName: customer.name,
            totalPaid,
            totalPending,
            billCount: bills.length,
            lastPaymentDate: bills
              .filter(b => b.status === 'paid')
              .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))[0]?.paid_at || null
          });
          
          successCount++;
        } else {
          results.push({
            cpfCnpj,
            vindiCustomerId: null,
            vindiStatus: 'NOT_FOUND',
            totalPaid: 0,
            totalPending: 0,
            billCount: 0
          });
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing ${cpfCnpj}:`, error.message);
        errorCount++;
        
        results.push({
          cpfCnpj,
          error: error.message,
          vindiStatus: 'ERROR'
        });
      }
    }

    // Store results in a simple cache (in production, use a database)
    global.vindiCache = {
      data: results,
      timestamp: new Date().toISOString(),
      stats: {
        total: processedCpfs.size,
        success: successCount,
        errors: errorCount,
        notFound: results.filter(r => r.vindiStatus === 'NOT_FOUND').length
      }
    };

    res.json({
      success: true,
      message: `Synced ${successCount} customers with VINDI`,
      stats: global.vindiCache.stats,
      timestamp: global.vindiCache.timestamp,
      debug: {
        totalRows: rows.length,
        dataRows: dataRows.length,
        cpfCnpjIndex,
        processedCount: processedCpfs.size,
        firstFewCpfs: Array.from(processedCpfs).slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}