import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';
import { database, CachedData } from '../../src/lib/database';
import { vindiApi } from '../../src/lib/vindi-api';
import { reconciliationEngine, SheetsRow, DataNormalizer } from '../../src/lib/reconciliation';

interface APIResponse {
  success: boolean;
  data?: {
    metrics: any;
    customers: any[];
    cacheInfo: {
      lastUpdate: string;
      cacheAge: number;
      cacheSize: number;
      isIncremental: boolean;
    };
  };
  error?: string;
  debugInfo?: {
    sheetsRows: number;
    vindiCustomers: number;
    vindiBills: number;
    vindiSubscriptions: number;
    matchedCustomers: number;
    processingTimeMs: number;
  };
}

// Fetch Google Sheets data with improved parsing
async function fetchGoogleSheetsData(): Promise<SheetsRow[]> {
  const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
  
  console.log('🔄 Fetching Google Sheets data...');
  
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
  
  const csvData = await new Promise<string>((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout fetching sheets data'));
    });
    
    req.end();
  });
  
  if (csvData.includes('<HTML>') || csvData.includes('<!DOCTYPE')) {
    throw new Error('Invalid CSV response - received HTML instead');
  }
  
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    console.warn('⚠️ Empty or invalid sheet data');
    return [];
  }
  
  // Parse CSV with proper handling of quoted fields
  function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else if (char !== '"' || (char === '"' && inQuotes && line[i+1] === '"')) {
        current += char;
        if (char === '"' && inQuotes && line[i+1] === '"') i++; // Skip escaped quote
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  const headers = parseCSVLine(lines[0]);
  console.log(`📊 Found ${headers.length} columns: ${headers.slice(0, 10).join(', ')}...`);
  
  const rows: SheetsRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: SheetsRow = {};
    
    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/[""]/g, '').trim();
      row[cleanHeader] = values[index]?.replace(/[""]/g, '')?.trim() || '';
    });
    
    // Only include rows with CPF/CNPJ
    if (row['cpf/cnpj'] && DataNormalizer.normalizeCpfCnpj(row['cpf/cnpj'])) {
      rows.push(row);
    }
  }
  
  console.log(`✅ Parsed ${rows.length} valid sheet rows`);
  return rows;
}

// Main data processing function
async function processAllData(forceRefresh = false): Promise<APIResponse> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting data processing...', { forceRefresh });
    
    // Check if we can use cached data
    if (!forceRefresh && database.isCacheFresh(2)) { // 2 hours cache
      console.log('📦 Using cached data');
      const cachedData = database.loadData();
      
      if (cachedData?.processedData?.customers) {
        return {
          success: true,
          data: {
            metrics: cachedData.processedData.metrics,
            customers: cachedData.processedData.customers,
            cacheInfo: {
              lastUpdate: cachedData.lastUpdate,
              cacheAge: database.getCacheAge(),
              cacheSize: database.getCacheSize(),
              isIncremental: false
            }
          }
        };
      }
    }
    
    // Determine if we can do incremental updates
    const cachedData = database.loadData();
    const lastVindiFetch = database.getLastVindiFetch();
    const lastSheetsFetch = database.getLastSheetsFetch();
    
    const isIncremental = !forceRefresh && cachedData && lastVindiFetch && lastSheetsFetch;
    
    console.log('📊 Data source strategy:', {
      isIncremental,
      lastVindiFetch: lastVindiFetch ? new Date(lastVindiFetch).toLocaleString() : 'Never',
      lastSheetsFetch: lastSheetsFetch ? new Date(lastSheetsFetch).toLocaleString() : 'Never'
    });
    
    // Fetch Google Sheets data (always fresh for now - could be optimized)
    const sheetsData = await fetchGoogleSheetsData();
    
    // Fetch Vindi data (incremental if possible)
    let vindiCustomers, vindiBills, vindiSubscriptions;
    
    if (isIncremental) {
      console.log('🔄 Performing incremental Vindi data fetch');
      
      // Load existing data
      const existingCustomers = cachedData!.vindiData.customers;
      const existingBills = cachedData!.vindiData.bills;
      const existingSubscriptions = cachedData!.vindiData.subscriptions;
      
      // Fetch only updated records
      const updatedCustomers = await vindiApi.fetchAllCustomers(lastVindiFetch);
      const updatedBills = await vindiApi.fetchAllBills(lastVindiFetch);
      const updatedSubscriptions = await vindiApi.fetchAllSubscriptions(lastVindiFetch);
      
      // Merge with existing data
      vindiCustomers = [...existingCustomers];
      updatedCustomers.forEach(updatedCustomer => {
        const index = vindiCustomers.findIndex(c => c.id === updatedCustomer.id);
        if (index >= 0) {
          vindiCustomers[index] = updatedCustomer; // Update existing
        } else {
          vindiCustomers.push(updatedCustomer); // Add new
        }
      });
      
      vindiBills = [...existingBills];
      updatedBills.forEach(updatedBill => {
        const index = vindiBills.findIndex(b => b.id === updatedBill.id);
        if (index >= 0) {
          vindiBills[index] = updatedBill; // Update existing
        } else {
          vindiBills.push(updatedBill); // Add new
        }
      });
      
      vindiSubscriptions = [...existingSubscriptions];
      updatedSubscriptions.forEach(updatedSub => {
        const index = vindiSubscriptions.findIndex(s => s.id === updatedSub.id);
        if (index >= 0) {
          vindiSubscriptions[index] = updatedSub; // Update existing
        } else {
          vindiSubscriptions.push(updatedSub); // Add new
        }
      });
      
      console.log('✅ Incremental update complete:', {
        totalCustomers: vindiCustomers.length,
        updatedCustomers: updatedCustomers.length,
        totalBills: vindiBills.length,
        updatedBills: updatedBills.length,
        totalSubscriptions: vindiSubscriptions.length,
        updatedSubscriptions: updatedSubscriptions.length
      });
      
    } else {
      console.log('🔄 Performing full Vindi data fetch');
      
      // Full refresh
      [vindiCustomers, vindiBills, vindiSubscriptions] = await Promise.all([
        vindiApi.fetchAllCustomers(),
        vindiApi.fetchAllBills(),
        vindiApi.fetchAllSubscriptions()
      ]);
    }
    
    // Match customers between systems
    const customerMatches = reconciliationEngine.matchCustomers(sheetsData, vindiCustomers);
    
    // Consolidate all customer data
    const processedCustomers = reconciliationEngine.consolidateCustomerData(
      sheetsData,
      customerMatches,
      vindiBills,
      vindiSubscriptions
    );
    
    // Generate dashboard metrics
    const dashboardMetrics = reconciliationEngine.generateDashboardMetrics(processedCustomers);
    
    // Save to cache
    const newCachedData: CachedData = {
      lastUpdate: new Date().toISOString(),
      vindiData: {
        customers: vindiCustomers,
        bills: vindiBills,
        subscriptions: vindiSubscriptions,
        lastFetchTime: new Date().toISOString(),
        totalCustomers: vindiCustomers.length,
        totalBills: vindiBills.length
      },
      sheetsData: {
        rows: sheetsData,
        lastFetchTime: new Date().toISOString(),
        totalRows: sheetsData.length,
        headers: Object.keys(sheetsData[0] || {})
      },
      processedData: {
        customers: processedCustomers,
        metrics: dashboardMetrics,
        lastProcessTime: new Date().toISOString()
      },
      version: '2.0'
    };
    
    database.saveData(newCachedData);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Data processing complete in ${processingTime}ms`);
    
    return {
      success: true,
      data: {
        metrics: dashboardMetrics,
        customers: processedCustomers,
        cacheInfo: {
          lastUpdate: new Date().toISOString(),
          cacheAge: 0,
          cacheSize: database.getCacheSize(),
          isIncremental
        }
      },
      debugInfo: {
        sheetsRows: sheetsData.length,
        vindiCustomers: vindiCustomers.length,
        vindiBills: vindiBills.length,
        vindiSubscriptions: vindiSubscriptions.length,
        matchedCustomers: customerMatches.size,
        processingTimeMs: processingTime
      }
    };
    
  } catch (error) {
    console.error('❌ Data processing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  console.log(`📡 API Request: ${req.method} ${req.url}`);
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  try {
    // Check for force refresh parameter
    const forceRefresh = req.query.refresh === 'true';
    
    const result = await processAllData(forceRefresh);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
    
  } catch (error) {
    console.error('❌ API Handler Error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}