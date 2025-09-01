import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Users, RefreshCw, Download } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useState } from 'react';

const Header = () => {
  const location = useLocation();
  const { syncData, downloadCSV, loading, getSyncStatus, setSyncStatus } = useApi();
  const [syncing, setSyncing] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncData();
      setSyncStatus(result.data);
      alert(`Sync completed successfully! ${result.data.totalCustomers} customers processed.`);
    } catch (error) {
      alert(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      await downloadCSV();
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <BarChart3 size={24} />
          <h1>Alumni by Better Dashboard</h1>
        </div>
        
        <nav className="nav">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            Dashboard
          </Link>
          <Link 
            to="/customers" 
            className={`nav-link ${isActive('/customers') ? 'active' : ''}`}
          >
            <Users size={18} />
            Customers
          </Link>
        </nav>

        <div className="header-actions">
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="action-button sync-button"
            title="Sync data from Google Sheets and VINDI"
          >
            <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
          
          <button
            onClick={handleExport}
            disabled={loading}
            className="action-button export-button"
            title="Download data as CSV"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;