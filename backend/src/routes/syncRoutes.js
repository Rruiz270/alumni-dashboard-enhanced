const express = require('express');
const router = express.Router();
const googleSheetsService = require('../config/googleSheets');
const vindiApiService = require('../config/vindiApi');
const dataProcessingService = require('../services/dataProcessingService');

// Sync data from all sources
router.post('/sync', async (req, res) => {
  try {
    console.log('Starting data sync...');
    
    // Clear cache
    dataProcessingService.cache.customers.clear();
    
    const startTime = Date.now();
    
    // Fetch data from both sources in parallel
    console.log('Fetching Google Sheets data...');
    const [sheetsResponse, vindiCustomers] = await Promise.all([
      googleSheetsService.getSpreadsheetData(),
      vindiApiService.getAllCustomersWithPagination()
    ]);

    console.log(`Fetched ${sheetsResponse.length} rows from Google Sheets`);
    console.log(`Fetched ${vindiCustomers.length} customers from VINDI`);

    // Process Google Sheets data
    const parsedSheetsData = googleSheetsService.parseSheetData(sheetsResponse);
    const processedSheetsData = dataProcessingService.processGoogleSheetsData(parsedSheetsData);
    
    console.log(`Processed ${processedSheetsData.length} valid customers from Google Sheets`);

    // Process VINDI customers
    const processedVindiCustomers = vindiCustomers.map(customer => 
      dataProcessingService.processVindiCustomer(customer)
    );

    // Fetch bills for each VINDI customer (with progress tracking)
    console.log('Fetching bills for VINDI customers...');
    const billsDataMap = new Map();
    let processedCount = 0;
    
    for (const vindiCustomer of processedVindiCustomers) {
      try {
        const billsResponse = await vindiApiService.getCustomerBills(vindiCustomer.id);
        const billsSummary = dataProcessingService.processBillData(billsResponse.bills || []);
        billsDataMap.set(vindiCustomer.id, billsSummary);
        
        processedCount++;
        if (processedCount % 10 === 0) {
          console.log(`Processed bills for ${processedCount}/${processedVindiCustomers.length} customers`);
        }
      } catch (error) {
        console.error(`Error fetching bills for customer ${vindiCustomer.id}:`, error);
      }
    }

    // Match all data
    console.log('Matching customer data...');
    const matchedCustomers = dataProcessingService.matchCustomerData(
      processedSheetsData,
      processedVindiCustomers,
      billsDataMap
    );

    // Cache the results
    dataProcessingService.cache.customers.set('all', matchedCustomers);
    dataProcessingService.cache.lastSync = Date.now();

    const syncDuration = Date.now() - startTime;
    console.log(`Data sync completed in ${syncDuration}ms`);

    // Generate metrics for response
    const metrics = dataProcessingService.generateDashboardMetrics(matchedCustomers);

    res.json({
      success: true,
      message: 'Data sync completed successfully',
      data: {
        syncDuration,
        totalCustomers: matchedCustomers.length,
        metrics,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in POST /sync/sync:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check sync status
router.get('/status', (req, res) => {
  try {
    const lastSync = dataProcessingService.cache.lastSync;
    const hasData = dataProcessingService.cache.customers.has('all');
    
    res.json({
      success: true,
      data: {
        lastSync: lastSync ? new Date(lastSync).toISOString() : null,
        hasData,
        dataAge: lastSync ? Date.now() - lastSync : null,
        cacheSize: dataProcessingService.cache.customers.size
      }
    });
  } catch (error) {
    console.error('Error in GET /sync/status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear cache and force re-sync
router.delete('/cache', (req, res) => {
  try {
    dataProcessingService.cache.customers.clear();
    dataProcessingService.cache.lastSync = null;
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /sync/cache:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;