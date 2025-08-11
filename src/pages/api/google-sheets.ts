import { NextApiRequest, NextApiResponse } from 'next';

// Simple Google Sheets CSV export reader
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheetId, gid } = req.query;

  if (!sheetId) {
    return res.status(400).json({ 
      error: 'sheetId é obrigatório. Use: /api/google-sheets?sheetId=YOUR_SHEET_ID&gid=0' 
    });
  }

  try {
    // Google Sheets CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || '0'}`;
    
    console.log('Fetching Google Sheets data from:', csvUrl);
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets data: ${response.statusText}`);
    }
    
    const csvData = await response.text();
    
    // Simple CSV parsing
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      }
    }
    
    res.status(200).json({
      data,
      headers,
      total: data.length,
      source: 'Google Sheets',
      sheetId,
      gid: gid || '0'
    });
    
  } catch (error: any) {
    console.error('Google Sheets Error:', error);
    
    res.status(500).json({ 
      error: 'Falha ao acessar Google Sheets. Verifique se a planilha está pública.',
      details: error.message,
      help: 'Para tornar a planilha pública: Arquivo > Compartilhar > Alterar para "Qualquer pessoa com o link"'
    });
  }
}