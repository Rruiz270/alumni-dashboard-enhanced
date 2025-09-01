# VINDI Dashboard V2 - Alumni by Better

A comprehensive dashboard application that cross-matches Google Sheets sales data with VINDI payment API data to track payment status, identify discrepancies, and analyze customer payment patterns.

## Features

- **Data Integration**: Combines Google Sheets sales data with VINDI payment API
- **Customer Analysis**: Tracks B2C vs B2B customers with detailed payment breakdowns
- **Discrepancy Detection**: Identifies differences between expected and collected amounts
- **Payment Tracking**: Monitors service vs product payment allocations
- **Export Functionality**: Download reports in CSV format
- **Real-time Sync**: Refresh data from both sources with one click

## Tech Stack

### Backend
- Node.js with Express
- Google Sheets API integration
- VINDI API client
- Comprehensive data processing and matching

### Frontend
- React with Vite
- React Router for navigation
- Lucide React icons
- Responsive design

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Google Cloud Project with Sheets API enabled
- VINDI API credentials

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with:
   - Google Sheets API credentials
   - VINDI API key
   - Other configuration options

5. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with the backend API URL

5. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

### Google Sheets API
1. Create a service account in Google Cloud Console
2. Enable the Google Sheets API
3. Download the service account key
4. Add the client email and private key to your `.env` file
5. Share your Google Sheet with the service account email

### VINDI API
1. Obtain your VINDI API key from the VINDI dashboard
2. Add the API key to your `.env` file

## Usage

1. **Initial Data Sync**: Click "Sync Data" to fetch and process data from both sources
2. **Dashboard Overview**: View key metrics and financial summaries
3. **Customer Management**: Browse, filter, and search through customer records
4. **Customer Details**: View detailed payment history for individual customers
5. **Export Data**: Download comprehensive reports in CSV format

## API Endpoints

### Dashboard
- `GET /api/dashboard/metrics` - Key dashboard metrics
- `GET /api/dashboard/summary` - Detailed summary statistics
- `GET /api/dashboard/discrepancies` - Top discrepancies report
- `GET /api/dashboard/export` - Export data (JSON/CSV)

### Customers
- `GET /api/customers` - List customers with filtering
- `GET /api/customers/:cpfCnpj` - Customer details
- `GET /api/customers/:cpfCnpj/bills` - Customer payment history

### Sync
- `POST /api/sync/sync` - Sync data from all sources
- `GET /api/sync/status` - Check sync status
- `DELETE /api/sync/cache` - Clear data cache

## Customer Classification

### Status Types
- **ACTIVE**: Customer with active VINDI subscription
- **CANCELLED**: Customer with cancelled subscription
- **INACTIVE**: Customer with inactive subscription
- **NO_VINDI_DATA**: Customer exists in sheets but not in VINDI

### Payment Status
- **FULLY_PAID**: Collected amount ≥ expected amount
- **PARTIALLY_PAID**: Some payment but less than expected
- **NO_PAYMENT**: No payments recorded
- **NOT_IN_SHEETS**: Customer exists in VINDI but not in sheets

### Special Flags
- **DISCREPANCY**: Difference between expected and collected amounts
- **100_SERVICE**: Customer paid 100% for services only
- **OVERPAYMENT**: Customer paid more than expected
- **PENDING_PAYMENT**: Customer has pending bills
- **CANCELLED_NO_FOLLOWUP**: Cancelled customer with outstanding balance

## Data Processing

The system performs sophisticated matching using CPF/CNPJ as the primary key:
- Normalizes different CPF/CNPJ formats
- Validates CPF/CNPJ checksums
- Handles discrepancies in formatting between systems
- Calculates payment breakdowns and percentages
- Generates comprehensive analytics

## Future Enhancements (Phase 2)

- OMIE API integration for invoice reconciliation
- Advanced analytics and reporting
- Automated alerts for discrepancies
- Payment prediction models
- Enhanced customer segmentation

## Support

For issues or questions, please check the application logs and ensure all API credentials are properly configured.