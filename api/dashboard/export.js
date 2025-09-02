export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { format = 'json' } = req.query;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vindi-sales-dashboard.csv"');
    res.send('CPF/CNPJ,Nome,Tipo,Status\n');
  } else {
    res.json({
      success: true,
      data: [],
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: 0
      }
    });
  }
}