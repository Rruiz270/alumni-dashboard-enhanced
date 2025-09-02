import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Building,
  User,
  CreditCard,
  RefreshCw,
  Database
} from 'lucide-react';

const Dashboard = () => {
  const { getDashboardMetrics, getDashboardSummary, getTopDiscrepancies, loading, error } = useApi();
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchData = async () => {
    try {
      // Fetch metrics first as it's the most important
      const metricsData = await getDashboardMetrics();
      setMetrics(metricsData.data);
      
      // Then try to fetch summary and discrepancies
      try {
        const summaryData = await getDashboardSummary();
        setSummary(summaryData.data);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setSummary(null);
      }
      
      try {
        const discrepanciesData = await getTopDiscrepancies(5);
        setDiscrepancies(discrepanciesData.data);
      } catch (err) {
        console.error('Error fetching discrepancies:', err);
        setDiscrepancies([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Don't crash - just show the error state
    }
  };

  const syncVindiData = async () => {
    setSyncing(true);
    setSyncMessage('Loading VINDI data...');
    
    try {
      // Force refresh customers with VINDI data
      window.location.href = '/customers';
    } catch (err) {
      setSyncMessage('Failed to load VINDI data: ' + err.message);
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getDashboardMetrics, getDashboardSummary, getTopDiscrepancies]);

  if (loading && !metrics) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="error-container">
        <AlertTriangle size={48} />
        <h2>Error Loading Dashboard</h2>
        <p>{typeof error === 'string' ? error : error?.message || 'An error occurred'}</p>
        <p>Make sure to sync data first using the "Sync Data" button.</p>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard Overview</h1>
          {metrics?.lastSync && (
            <p className="last-sync">
              Last sync: {formatDate(metrics.lastSync)} 
              ({Math.round((metrics.dataAge || 0) / 60000)} minutes ago)
            </p>
          )}
        </div>
        <div className="dashboard-actions">
          <button 
            onClick={syncVindiData} 
            disabled={syncing}
            className={`sync-button ${syncing ? 'syncing' : ''}`}
          >
            {syncing ? (
              <>
                <RefreshCw size={16} className="spin" />
                Syncing...
              </>
            ) : (
              <>
                <Database size={16} />
                Load VINDI Data
              </>
            )}
          </button>
        </div>
      </div>
      
      {syncMessage && (
        <div className={`sync-message ${syncMessage.includes('Error') || syncMessage.includes('Failed') ? 'error' : 'success'}`}>
          {syncMessage}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <Users size={24} />
          </div>
          <div className="metric-content">
            <h3>Total Customers</h3>
            <p className="metric-value">{metrics?.totalCustomers || 0}</p>
            <div className="metric-breakdown">
              <span><User size={14} /> B2C: {metrics?.totalB2C || 0}</span>
              <span><Building size={14} /> B2B: {metrics?.totalB2B || 0}</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <h3>Revenue Overview</h3>
            <p className="metric-value">{formatCurrency(summary?.financial?.totalCollected || 0)}</p>
            <div className="metric-breakdown">
              <span>Expected: {formatCurrency(summary?.financial?.totalExpected || 0)}</span>
              <span>Collection Rate: {summary?.financial?.totalExpected > 0 ? 
                ((summary?.financial?.totalCollected / summary?.financial?.totalExpected) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="metric-content">
            <h3>Fully Paid</h3>
            <p className="metric-value">{metrics?.fullyPaidCount || 0}</p>
            <div className="metric-breakdown">
              <span>Partially Paid: {metrics?.partiallyPaidCount || 0}</span>
              <span>No Payment: {metrics?.noPaymentCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon warning">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-content">
            <h3>Issues</h3>
            <p className="metric-value">{metrics?.discrepancyCount || 0}</p>
            <div className="metric-breakdown">
              <span>Discrepancies: {metrics?.discrepancyCount || 0}</span>
              <span>Delinquent: {metrics?.delinquentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="dashboard-section">
        <h2>Customer Status Breakdown</h2>
        <div className="status-grid">
          <div className="status-card active">
            <h4>Active</h4>
            <p>{summary?.statuses?.ACTIVE || 0}</p>
          </div>
          <div className="status-card cancelled">
            <h4>Cancelled</h4>
            <p>{summary?.statuses?.CANCELLED || 0}</p>
          </div>
          <div className="status-card inactive">
            <h4>Inactive</h4>
            <p>{summary?.statuses?.INACTIVE || 0}</p>
          </div>
          <div className="status-card no-data">
            <h4>No VINDI Data</h4>
            <p>{summary?.statuses?.NO_VINDI_DATA || 0}</p>
          </div>
        </div>
      </div>

      {/* Special Flags */}
      <div className="dashboard-section">
        <h2>Special Cases</h2>
        <div className="flags-grid">
          <div className="flag-card service">
            <h4>100% Service Payment</h4>
            <p>{summary?.flags?.['100_SERVICE'] || 0} customers</p>
          </div>
          <div className="flag-card overpayment">
            <h4>Overpayments</h4>
            <p>{summary?.flags?.OVERPAYMENT || 0} customers</p>
          </div>
          <div className="flag-card cancelled-unpaid">
            <h4>Cancelled - No Follow Up</h4>
            <p>{summary?.flags?.CANCELLED_NO_FOLLOWUP || 0} customers</p>
          </div>
          <div className="flag-card pending">
            <h4>Pending Payments</h4>
            <p>{summary?.flags?.PENDING_PAYMENT || 0} customers</p>
          </div>
        </div>
      </div>

      {/* Top Discrepancies */}
      {discrepancies.length > 0 && (
        <div className="dashboard-section">
          <h2>Top Discrepancies</h2>
          <div className="discrepancies-table">
            <table>
              <thead>
                <tr>
                  <th>CPF/CNPJ</th>
                  <th>Customer</th>
                  <th>Expected</th>
                  <th>Collected</th>
                  <th>Discrepancy</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((disc, index) => (
                  <tr key={index}>
                    <td className="mono">{disc.cpfCnpj}</td>
                    <td>{disc.customerName}</td>
                    <td>{formatCurrency(disc.expectedAmount)}</td>
                    <td>{formatCurrency(disc.collectedAmount)}</td>
                    <td className={disc.discrepancy > 0 ? 'positive' : 'negative'}>
                      {formatCurrency(disc.discrepancy)}
                    </td>
                    <td className={disc.discrepancy > 0 ? 'positive' : 'negative'}>
                      {disc.discrepancyPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="dashboard-section">
        <h2>Financial Overview</h2>
        <div className="financial-summary">
          <div className="financial-item">
            <span>Total Expected:</span>
            <span className="value">{formatCurrency(summary?.financial?.totalExpected || 0)}</span>
          </div>
          <div className="financial-item">
            <span>Total Collected:</span>
            <span className="value">{formatCurrency(summary?.financial?.totalCollected || 0)}</span>
          </div>
          <div className="financial-item">
            <span>Total Discrepancy:</span>
            <span className="value warning">{formatCurrency(summary?.financial?.totalDiscrepancy || 0)}</span>
          </div>
          <div className="financial-item">
            <span>Largest Discrepancy:</span>
            <span className="value warning">{formatCurrency(summary?.financial?.largestDiscrepancy || 0)}</span>
          </div>
          <div className="financial-item">
            <span>Average Discrepancy:</span>
            <span className="value">{formatCurrency(summary?.financial?.averageDiscrepancy || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;