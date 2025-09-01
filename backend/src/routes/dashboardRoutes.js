const express = require('express');
const router = express.Router();
const dataProcessingService = require('../services/dataProcessingService');

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    // Get cached matched customers data
    let matchedCustomers = dataProcessingService.cache.customers.get('all');
    
    if (!matchedCustomers) {
      return res.status(404).json({
        success: false,
        error: 'No data available. Please sync data first.'
      });
    }

    const metrics = dataProcessingService.generateDashboardMetrics(matchedCustomers);
    
    res.json({
      success: true,
      data: {
        ...metrics,
        lastSync: dataProcessingService.cache.lastSync,
        dataAge: Date.now() - dataProcessingService.cache.lastSync
      }
    });

  } catch (error) {
    console.error('Error in GET /dashboard/metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get summary statistics by category
router.get('/summary', async (req, res) => {
  try {
    let matchedCustomers = dataProcessingService.cache.customers.get('all');
    
    if (!matchedCustomers) {
      return res.status(404).json({
        success: false,
        error: 'No data available. Please sync data first.'
      });
    }

    const summary = {
      customerTypes: {
        B2C: matchedCustomers.filter(c => c.customerType === 'B2C').length,
        B2B: matchedCustomers.filter(c => c.customerType === 'B2B').length
      },
      statuses: {
        ACTIVE: matchedCustomers.filter(c => c.status === 'ACTIVE').length,
        CANCELLED: matchedCustomers.filter(c => c.status === 'CANCELLED').length,
        INACTIVE: matchedCustomers.filter(c => c.status === 'INACTIVE').length,
        NO_VINDI_DATA: matchedCustomers.filter(c => c.status === 'NO_VINDI_DATA').length
      },
      paymentStatuses: {
        FULLY_PAID: matchedCustomers.filter(c => c.paymentStatus === 'FULLY_PAID').length,
        PARTIALLY_PAID: matchedCustomers.filter(c => c.paymentStatus === 'PARTIALLY_PAID').length,
        NO_PAYMENT: matchedCustomers.filter(c => c.paymentStatus === 'NO_PAYMENT').length,
        NOT_IN_SHEETS: matchedCustomers.filter(c => c.paymentStatus === 'NOT_IN_SHEETS').length
      },
      flags: {
        DISCREPANCY: matchedCustomers.filter(c => c.flags.includes('DISCREPANCY')).length,
        '100_SERVICE': matchedCustomers.filter(c => c.flags.includes('100_SERVICE')).length,
        CANCELLED_NO_FOLLOWUP: matchedCustomers.filter(c => c.flags.includes('CANCELLED_NO_FOLLOWUP')).length,
        OVERPAYMENT: matchedCustomers.filter(c => c.flags.includes('OVERPAYMENT')).length,
        PENDING_PAYMENT: matchedCustomers.filter(c => c.flags.includes('PENDING_PAYMENT')).length
      },
      financial: {
        totalExpected: matchedCustomers.reduce((sum, c) => sum + c.expectedAmount, 0),
        totalCollected: matchedCustomers.reduce((sum, c) => sum + c.collectedAmount, 0),
        totalDiscrepancy: matchedCustomers.reduce((sum, c) => sum + Math.abs(c.discrepancy), 0),
        largestDiscrepancy: Math.max(...matchedCustomers.map(c => Math.abs(c.discrepancy))),
        averageDiscrepancy: matchedCustomers.reduce((sum, c) => sum + Math.abs(c.discrepancy), 0) / matchedCustomers.length
      }
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error in GET /dashboard/summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get top discrepancies
router.get('/discrepancies', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    let matchedCustomers = dataProcessingService.cache.customers.get('all');
    
    if (!matchedCustomers) {
      return res.status(404).json({
        success: false,
        error: 'No data available. Please sync data first.'
      });
    }

    const discrepancies = matchedCustomers
      .filter(c => c.flags.includes('DISCREPANCY'))
      .sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy))
      .slice(0, parseInt(limit))
      .map(customer => ({
        cpfCnpj: customer.cpfCnpjFormatted,
        customerName: customer.sheetsData?.customerName || customer.vindiData?.name,
        expectedAmount: customer.expectedAmount,
        collectedAmount: customer.collectedAmount,
        discrepancy: customer.discrepancy,
        discrepancyPercentage: ((customer.discrepancy / customer.expectedAmount) * 100).toFixed(2),
        status: customer.status,
        type: customer.customerType
      }));

    res.json({
      success: true,
      data: discrepancies
    });

  } catch (error) {
    console.error('Error in GET /dashboard/discrepancies:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Export data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    let matchedCustomers = dataProcessingService.cache.customers.get('all');
    
    if (!matchedCustomers) {
      return res.status(404).json({
        success: false,
        error: 'No data available. Please sync data first.'
      });
    }

    // Prepare export data
    const exportData = matchedCustomers.map(customer => ({
      'CPF/CNPJ': customer.cpfCnpjFormatted,
      'Nome': customer.sheetsData?.customerName || customer.vindiData?.name || '',
      'Tipo': customer.customerType,
      'Status': customer.status,
      'Status Pagamento': customer.paymentStatus,
      'Valor Esperado': customer.expectedAmount,
      'Valor Coletado': customer.collectedAmount,
      'Discrepância': customer.discrepancy,
      'Pagamento Serviço %': customer.servicePaymentPercentage.toFixed(2),
      'Pagamento Produto %': customer.productPaymentPercentage.toFixed(2),
      'Flags': customer.flags.join(', '),
      'Email VINDI': customer.vindiData?.email || '',
      'Data Criação VINDI': customer.vindiData?.createdAt || '',
      'Método Pagamento': customer.billsSummary?.paymentsByMethod ? 
        Object.keys(customer.billsSummary.paymentsByMethod).join(', ') : ''
    }));

    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="vindi-sales-dashboard.csv"');
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          totalRecords: exportData.length,
          lastSync: dataProcessingService.cache.lastSync
        }
      });
    }

  } catch (error) {
    console.error('Error in GET /dashboard/export:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;