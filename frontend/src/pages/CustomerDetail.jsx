import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { 
  ArrowLeft, 
  User, 
  Building, 
  Mail, 
  Calendar, 
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

const CustomerDetail = () => {
  const { cpfCnpj } = useParams();
  const { getCustomerDetails, getCustomerBills, loading, error } = useApi();
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [billsPagination, setBillsPagination] = useState({});

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const [customerData, billsData] = await Promise.all([
          getCustomerDetails(cpfCnpj),
          getCustomerBills(cpfCnpj, { limit: 50 })
        ]);
        
        setCustomer(customerData.data);
        setBills(billsData.data);
        setBillsPagination(billsData.pagination);
      } catch (err) {
        console.error('Error fetching customer details:', err);
      }
    };

    if (cpfCnpj) {
      fetchCustomerData();
    }
  }, [cpfCnpj, getCustomerDetails, getCustomerBills]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getBillStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-green" />;
      case 'pending': return <Clock size={16} className="text-yellow" />;
      case 'canceled': return <AlertTriangle size={16} className="text-red" />;
      default: return <Clock size={16} className="text-gray" />;
    }
  };

  const getBillStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'canceled': return 'status-canceled';
      default: return 'status-unknown';
    }
  };

  if (loading && !customer) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading customer details...</p>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="error-container">
        <AlertTriangle size={48} />
        <h2>Customer Not Found</h2>
        <p>{error}</p>
        <Link to="/customers" className="back-link">
          <ArrowLeft size={16} />
          Back to Customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="error-container">
        <AlertTriangle size={48} />
        <h2>Customer Not Found</h2>
        <p>Unable to load customer details</p>
        <Link to="/customers" className="back-link">
          <ArrowLeft size={16} />
          Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="customer-detail">
      <div className="detail-header">
        <Link to="/customers" className="back-link">
          <ArrowLeft size={20} />
          Back to Customers
        </Link>
        <h1>Customer Details</h1>
      </div>

      {/* Customer Overview */}
      <div className="customer-overview">
        <div className="customer-card">
          <div className="customer-info">
            <div className="customer-avatar">
              {customer.vindiData?.name?.charAt(0) || 
               customer.sheetsData?.customerName?.charAt(0) || 
               (customer.type === 'CPF' ? <User size={24} /> : <Building size={24} />)}
            </div>
            <div className="customer-details">
              <h2>{customer.vindiData?.name || customer.sheetsData?.customerName || 'Unknown Customer'}</h2>
              <p className="customer-id">{customer.cpfCnpjFormatted}</p>
              <div className="customer-meta">
                <span className={`type-badge ${customer.customerType?.toLowerCase()}`}>
                  {customer.customerType}
                </span>
                <span className={`status-badge ${customer.status?.toLowerCase()}`}>
                  {customer.status}
                </span>
                {customer.vindiData?.email && (
                  <span className="email">
                    <Mail size={14} />
                    {customer.vindiData.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="payment-summary">
          <h3>Payment Summary</h3>
          <div className="payment-metrics">
            <div className="payment-metric">
              <span>Expected Amount</span>
              <span className="value">{formatCurrency(customer.expectedAmount || 0)}</span>
            </div>
            <div className="payment-metric">
              <span>Collected Amount</span>
              <span className="value">{formatCurrency(customer.collectedAmount || 0)}</span>
            </div>
            <div className="payment-metric">
              <span>Discrepancy</span>
              <span className={`value ${customer.discrepancy > 0 ? 'positive' : customer.discrepancy < 0 ? 'negative' : ''}`}>
                {formatCurrency(customer.discrepancy || 0)}
              </span>
            </div>
            <div className="payment-metric">
              <span>Service Payment</span>
              <span className="value">{(customer.servicePaymentPercentage || 0).toFixed(1)}%</span>
            </div>
            <div className="payment-metric">
              <span>Product Payment</span>
              <span className="value">{(customer.productPaymentPercentage || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Flags */}
        {customer.flags?.length > 0 && (
          <div className="customer-flags">
            <h3>Flags</h3>
            <div className="flags-list">
              {customer.flags.map((flag, index) => (
                <span key={index} className={`flag-badge ${flag.toLowerCase().replace('_', '-')}`}>
                  {flag.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="payment-history">
        <h3>Payment History</h3>
        {bills.length > 0 ? (
          <div className="bills-table-container">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Paid Date</th>
                  <th>Payment Method</th>
                  <th>Installments</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="mono">#{bill.id}</td>
                    <td>
                      <div className={`bill-status ${getBillStatusClass(bill.status)}`}>
                        {getBillStatusIcon(bill.status)}
                        <span>{bill.status}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(bill.amount)}</td>
                    <td>{formatDate(bill.dueAt)}</td>
                    <td>{formatDate(bill.paidAt)}</td>
                    <td>
                      {bill.paymentMethod ? (
                        <div className="payment-method">
                          <CreditCard size={14} />
                          {bill.paymentMethod}
                        </div>
                      ) : '-'}
                    </td>
                    <td>{bill.installments || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-bills">
            <DollarSign size={48} />
            <h4>No Payment History</h4>
            <p>No bills found for this customer in VINDI</p>
          </div>
        )}
      </div>

      {/* Payment Methods Summary */}
      {customer.billsSummary?.paymentsByMethod && 
       Object.keys(customer.billsSummary.paymentsByMethod).length > 0 && (
        <div className="payment-methods">
          <h3>Payment Methods Used</h3>
          <div className="payment-methods-grid">
            {Object.entries(customer.billsSummary.paymentsByMethod).map(([method, amount]) => (
              <div key={method} className="payment-method-card">
                <div className="payment-method-info">
                  <CreditCard size={20} />
                  <span>{method}</span>
                </div>
                <span className="payment-method-amount">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data (for debugging) */}
      <details className="raw-data">
        <summary>Raw Data (Debug)</summary>
        <div className="raw-data-content">
          <div className="raw-section">
            <h4>Google Sheets Data</h4>
            <pre>{JSON.stringify(customer.sheetsData, null, 2)}</pre>
          </div>
          <div className="raw-section">
            <h4>VINDI Data</h4>
            <pre>{JSON.stringify(customer.vindiData, null, 2)}</pre>
          </div>
          <div className="raw-section">
            <h4>Bills Summary</h4>
            <pre>{JSON.stringify(customer.billsSummary, null, 2)}</pre>
          </div>
        </div>
      </details>
    </div>
  );
};

export default CustomerDetail;