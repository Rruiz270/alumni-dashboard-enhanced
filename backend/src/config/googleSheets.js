const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.initialize();
  }

  initialize() {
    try {
      // Check if we have API key or service account credentials
      if (process.env.GOOGLE_SHEETS_API_KEY) {
        // Use API key for public sheets
        this.sheets = google.sheets({ 
          version: 'v4', 
          auth: process.env.GOOGLE_SHEETS_API_KEY 
        });
      } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        // Use service account for private sheets
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      } else {
        throw new Error('No Google Sheets authentication configured. Set either GOOGLE_SHEETS_API_KEY or service account credentials.');
      }
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
    }
  }

  async getSpreadsheetData(range = 'A:Z') {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error fetching spreadsheet data:', error);
      throw new Error('Failed to fetch Google Sheets data');
    }
  }

  async getAllSheets() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
      });

      return response.data.sheets.map(sheet => ({
        sheetId: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index,
      }));
    } catch (error) {
      console.error('Error fetching sheets:', error);
      throw new Error('Failed to fetch sheet information');
    }
  }

  parseSheetData(data) {
    if (!data || data.length === 0) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }
}

module.exports = new GoogleSheetsService();