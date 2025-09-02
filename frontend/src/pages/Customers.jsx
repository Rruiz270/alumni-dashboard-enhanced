import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Customers = () => {
  const { getCustomers, loading, error } = useApi();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    paymentStatus: '',
    flag: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [includeVindi, setIncludeVindi] = useState(true);

  const fetchCustomers = async (page = 1) => {
    try {
      const params = {
        ...filters,
        page,
        limit: 20,
        includeVindi: includeVindi
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await getCustomers(params);
      setCustomers(response.data);
      setPagination(response.pagination);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [filters, includeVindi]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      type: '',
      paymentStatus: '',
      flag: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle size={16} className="text-green" />;
      case 'CANCELLED': return <X size={16} className="text-red" />;
      case 'INACTIVE': return <Clock size={16} className="text-yellow" />;
      default: return <AlertTriangle size={16} className="text-gray" />;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'FULLY_PAID': return 'text-green';
      case 'PARTIALLY_PAID': return 'text-yellow';
      case 'NO_PAYMENT': return 'text-red';
      default: return 'text-gray';
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Customer Management</h1>
        <p>Manage and analyze customer payment data</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by CPF/CNPJ or name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="INACTIVE">Inactive</option>
            <option value="NO_VINDI_DATA">No VINDI Data</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="B2C">B2C (CPF)</option>
            <option value="B2B">B2B (CNPJ)</option>
          </select>

          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="NO_PAYMENT">No Payment</option>
            <option value="NOT_IN_SHEETS">Not in Sheets</option>
          </select>

          <select
            value={filters.flag}
            onChange={(e) => handleFilterChange('flag', e.target.value)}
          >
            <option value="">All Flags</option>
            <option value="DISCREPANCY">Discrepancy</option>
            <option value="100_SERVICE">100% Service</option>
            <option value="OVERPAYMENT">Overpayment</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="CANCELLED_NO_FOLLOWUP">Cancelled - No Follow Up</option>
          </select>

          <button onClick={clearFilters} className="clear-filters">
            <X size={16} />
            Clear
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <p>
          Showing {customers.length} of {pagination?.total || 0} customers
          {Object.values(filters).some(v => v) && ' (filtered)'}
        </p>
      </div>

      {/* Customer Table */}
      <div className="customers-table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>CPF/CNPJ</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th>Expected</th>
              <th>Collected</th>
              <th>Discrepancy</th>
              <th>Service %</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr key={customer.cpfCnpj || index}>
                <td className="mono">{customer.cpfCnpjFormatted}</td>
                <td>{customer.customerName || customer.sheetsData?.customerName || customer.vindiData?.name || '-'}</td>
                <td>
                  <span className={`type-badge ${customer.customerType.toLowerCase()}`}>
                    {customer.customerType}
                  </span>
                </td>
                <td>
                  <div className="status-cell">
                    {getStatusIcon(customer.status)}
                    <span>{customer.status}</span>
                  </div>
                </td>
                <td>
                  <span className={`payment-status ${getPaymentStatusColor(customer.paymentStatus)}`}>
                    {customer.paymentStatus}
                  </span>
                </td>
                <td>{formatCurrency(customer.expectedAmount)}</td>
                <td>{formatCurrency(customer.collectedAmount)}</td>
                <td className={customer.discrepancy > 0 ? 'positive' : customer.discrepancy < 0 ? 'negative' : ''}>
                  {formatCurrency(customer.discrepancy)}
                </td>
                <td>{customer.servicePaymentPercentage.toFixed(1)}%</td>
                <td>
                  <div className="flags-cell">
                    {customer.flags.map((flag, idx) => (
                      <span key={idx} className={`flag-badge ${flag.toLowerCase().replace('_', '-')}`}>
                        {flag}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <Link 
                    to={`/customers/${customer.cpfCnpj}`}
                    className="view-button"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination?.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => fetchCustomers(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {pagination.pages}
          </div>
          
          <button
            onClick={() => fetchCustomers(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            className="pagination-button"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* No Results */}
      {customers.length === 0 && !loading && (
        <div className="no-results">
          <AlertTriangle size={48} />
          <h3>No customers found</h3>
          <p>
            {Object.values(filters).some(v => v) 
              ? 'Try adjusting your filters or search terms'
              : 'No customer data available. Try syncing data first.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Customers;