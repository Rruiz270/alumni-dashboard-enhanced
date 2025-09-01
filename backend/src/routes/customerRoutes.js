const express = require('express');
const router = express.Router();
const googleSheetsService = require('../config/googleSheets');
const vindiApiService = require('../config/vindiApi');
const dataProcessingService = require('../services/dataProcessingService');

// Get all customers with matched data
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      type, 
      paymentStatus, 
      hasDiscrepancy, 
      search,
      flag,
      page = 1,
      limit = 50 
    } = req.query;

    // Get data from cache if available and recent
    let matchedCustomers = dataProcessingService.cache.customers.get('all');
    
    if (!matchedCustomers || !dataProcessingService.cache.lastSync || 
        (Date.now() - dataProcessingService.cache.lastSync > 5 * 60 * 1000)) { // 5 minutes cache
      
      // Fetch fresh data
      const [sheetsData, vindiCustomers] = await Promise.all([
        googleSheetsService.getSpreadsheetData(),
        vindiApiService.getAllCustomersWithPagination()
      ]);

      // Parse and process sheets data
      const parsedSheetsData = googleSheetsService.parseSheetData(sheetsData);
      const processedSheetsData = dataProcessingService.processGoogleSheetsData(parsedSheetsData);

      // Process VINDI customers and their bills
      const processedVindiCustomers = vindiCustomers.map(customer => 
        dataProcessingService.processVindiCustomer(customer)
      );

      // Fetch bills for each VINDI customer
      const billsDataMap = new Map();
      for (const vindiCustomer of processedVindiCustomers) {
        try {
          const billsResponse = await vindiApiService.getCustomerBills(vindiCustomer.id);
          const billsSummary = dataProcessingService.processBillData(billsResponse.bills || []);
          billsDataMap.set(vindiCustomer.id, billsSummary);
        } catch (error) {
          console.error(`Error fetching bills for customer ${vindiCustomer.id}:`, error);
        }
      }

      // Match all data
      matchedCustomers = dataProcessingService.matchCustomerData(
        processedSheetsData,
        processedVindiCustomers,
        billsDataMap
      );

      // Update cache
      dataProcessingService.cache.customers.set('all', matchedCustomers);
      dataProcessingService.cache.lastSync = Date.now();
    }

    // Apply filters
    let filteredCustomers = [...matchedCustomers];

    if (status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === status);
    }

    if (type) {
      filteredCustomers = filteredCustomers.filter(c => c.customerType === type);
    }

    if (paymentStatus) {
      filteredCustomers = filteredCustomers.filter(c => c.paymentStatus === paymentStatus);
    }

    if (hasDiscrepancy === 'true') {
      filteredCustomers = filteredCustomers.filter(c => c.flags.includes('DISCREPANCY'));
    }

    if (flag) {
      filteredCustomers = filteredCustomers.filter(c => c.flags.includes(flag));
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(c => 
        c.cpfCnpj.includes(searchTerm) ||
        c.cpfCnpjFormatted.includes(searchTerm) ||
        (c.sheetsData?.customerName?.toLowerCase().includes(searchTerm)) ||
        (c.vindiData?.name?.toLowerCase().includes(searchTerm))
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredCustomers.length,
        pages: Math.ceil(filteredCustomers.length / limit)
      }
    });

  } catch (error) {
    console.error('Error in GET /customers:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get specific customer by CPF/CNPJ
router.get('/:cpfCnpj', async (req, res) => {
  try {
    const { cpfCnpj } = req.params;
    
    // Try to get from cache first
    let matchedCustomers = dataProcessingService.cache.customers.get('all');
    
    if (matchedCustomers) {
      const customer = matchedCustomers.find(c => 
        c.cpfCnpj === cpfCnpj || c.cpfCnpjFormatted === cpfCnpj
      );
      
      if (customer) {
        return res.json({ success: true, data: customer });
      }
    }

    // If not in cache or not found, fetch from VINDI
    const vindiCustomer = await vindiApiService.getCustomerByCPFCNPJ(cpfCnpj);
    
    if (!vindiCustomer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Get bills for the customer
    const billsResponse = await vindiApiService.getCustomerBills(vindiCustomer.id);
    const billsSummary = dataProcessingService.processBillData(billsResponse.bills || []);

    res.json({
      success: true,
      data: {
        vindiData: dataProcessingService.processVindiCustomer(vindiCustomer),
        billsSummary
      }
    });

  } catch (error) {
    console.error('Error in GET /customers/:cpfCnpj:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get customer bills
router.get('/:cpfCnpj/bills', async (req, res) => {
  try {
    const { cpfCnpj } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Find customer in VINDI
    const vindiCustomer = await vindiApiService.getCustomerByCPFCNPJ(cpfCnpj);
    
    if (!vindiCustomer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Get bills
    const billsResponse = await vindiApiService.getCustomerBills(
      vindiCustomer.id, 
      page, 
      limit
    );

    res.json({
      success: true,
      data: billsResponse.bills || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: billsResponse.metadata?.total || 0,
        pages: billsResponse.metadata?.total_pages || 1
      }
    });

  } catch (error) {
    console.error('Error in GET /customers/:cpfCnpj/bills:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;