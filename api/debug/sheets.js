export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get spreadsheet info
    const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const infoResponse = await fetch(infoUrl);
    const info = await infoResponse.json();

    // Get first 10 rows from first sheet
    const firstSheetName = info.sheets?.[0]?.properties?.title || 'Sheet1';
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${firstSheetName}!A1:Z10?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const dataResponse = await fetch(dataUrl);
    const data = await dataResponse.json();

    res.json({
      success: true,
      data: {
        spreadsheetTitle: info.properties?.title,
        sheets: info.sheets?.map(sheet => ({
          title: sheet.properties.title,
          index: sheet.properties.index,
          rowCount: sheet.properties.gridProperties?.rowCount,
          columnCount: sheet.properties.gridProperties?.columnCount
        })),
        sampleData: data.values || [],
        firstSheetName
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}