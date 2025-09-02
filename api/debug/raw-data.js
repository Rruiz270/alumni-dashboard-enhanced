export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get spreadsheet metadata first
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const metadataResponse = await fetch(metadataUrl);
    const metadata = await metadataResponse.json();

    const sheets = metadata.sheets || [];
    const sheetData = {};

    // Get first 5 rows from each sheet to identify structure
    for (const sheet of sheets.slice(0, 5)) { // Limit to first 5 sheets
      const sheetName = sheet.properties.title;
      try {
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:Z5?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
        const dataResponse = await fetch(dataUrl);
        
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          sheetData[sheetName] = {
            rows: data.values || [],
            rowCount: sheet.properties.gridProperties?.rowCount,
            columnCount: sheet.properties.gridProperties?.columnCount
          };
        }
      } catch (error) {
        console.log(`Error fetching ${sheetName}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        spreadsheetTitle: metadata.properties?.title,
        totalSheets: sheets.length,
        sheets: sheets.map(s => ({
          title: s.properties.title,
          sheetId: s.properties.sheetId,
          index: s.properties.index,
          rowCount: s.properties.gridProperties?.rowCount,
          columnCount: s.properties.gridProperties?.columnCount
        })),
        sampleData: sheetData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}