import React, { useState, useRef } from 'react';
import { 
  Sliders, 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle,
  Sun,
  Moon,
  Store,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export default function Settings({ 
  storeSettings, 
  setStoreSettings, 
  theme, 
  toggleTheme, 
  onResetData, 
  onClearData,
  onImportData,
  products,
  sales
}) {
  // Store Settings Form State
  const [storeName, setStoreName] = useState(storeSettings.storeName);
  const [storeAddress, setStoreAddress] = useState(storeSettings.storeAddress);
  const [storePhone, setStorePhone] = useState(storeSettings.storePhone);
  const [currencySymbol, setCurrencySymbol] = useState(storeSettings.currencySymbol);
  const [lowStockThreshold, setLowStockThreshold] = useState(storeSettings.lowStockThreshold);
  const [expiryWarningDays, setExpiryWarningDays] = useState(storeSettings.expiryWarningDays);

  // Status alerts
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  
  // Danger actions confirm states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputRef = useRef(null);

  // Handle configuration update
  const handleSaveConfig = (e) => {
    e.preventDefault();
    setConfigError('');
    setConfigSuccess('');

    if (!storeName.trim()) {
      setConfigError('Store Name cannot be empty.');
      return;
    }

    setStoreSettings({
      storeName: storeName.trim(),
      storeAddress: storeAddress.trim(),
      storePhone: storePhone.trim(),
      currencySymbol: currencySymbol.trim(),
      lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
      expiryWarningDays: parseInt(expiryWarningDays, 10) || 30
    });

    setConfigSuccess('Store configuration updated successfully!');
  };

  // Export Data to JSON
  const handleExportData = () => {
    const dataBackup = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      storeSettings,
      products,
      sales
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ApexCart_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Data from JSON
  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.products && parsed.sales && parsed.storeSettings) {
          onImportData(parsed.products, parsed.sales);
          setStoreSettings(parsed.storeSettings);
          alert('Data backup imported and restored successfully!');
        } else if (parsed.products && parsed.sales) {
          onImportData(parsed.products, parsed.sales);
          alert('Data backup (partial) imported successfully!');
        } else {
          alert('Invalid backup file format. Missing products/sales fields.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={styles.container} className="animate-fade">
      <div>
        <h1 style={styles.pageTitle}>System Control Settings</h1>
        <p style={styles.pageSubtitle}>Update store headers, set stock warning alerts, manage database dumps, and toggle theme modes.</p>
      </div>

      <div style={styles.grid}>
        {/* Store Profile & Configuration form */}
        <div style={{ ...styles.sectionCard, gridColumn: 'span 2' }} className="card">
          <div style={styles.cardHeader}>
            <Store size={20} color="var(--color-primary)" />
            <h2 style={styles.cardTitle}>Supermarket Configuration Profile</h2>
          </div>
          
          {configError && (
            <div style={styles.alertError} className="animate-fade">
              <ShieldAlert size={16} />
              <span>{configError}</span>
            </div>
          )}

          {configSuccess && (
            <div style={styles.alertSuccess} className="animate-fade">
              <CheckCircle size={16} />
              <span>{configSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} style={styles.form}>
            <div style={styles.formRowGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Retail Store / Mall Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ApexCart Superstore"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Retail Outlet Street Address</label>
              <input
                type="text"
                placeholder="e.g. 123 Galleria Mall, Cyber City, Tech Zone"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={styles.separator} />

            <h3 style={styles.subHeading}>System Warning Thresholds & Rules</h3>
            <div style={styles.formRowGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Currency Symbol</label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="input-field"
                  style={{ maxWidth: '80px', textAlign: 'center' }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Global Low Stock Threshold</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 5)}
                  className="input-field"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Expiry Warning Window (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={expiryWarningDays}
                  onChange={(e) => setExpiryWarningDays(parseInt(e.target.value, 10) || 30)}
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" style={styles.saveBtn} className="btn btn-primary">
              Save Store Configurations
            </button>
          </form>
        </div>

        {/* Theme Toggling card */}
        <div style={styles.sectionCard} className="card">
          <div style={styles.cardHeader}>
            {theme === 'dark' ? <Moon size={20} color="var(--color-primary)" /> : <Sun size={20} color="var(--color-warning)" />}
            <h2 style={styles.cardTitle}>Theme & Interface</h2>
          </div>
          <div style={styles.themeControls}>
            <p style={styles.themeText}>Choose lighting configurations for supermarket operator screens.</p>
            <button onClick={toggleTheme} style={styles.themeToggleBtn} className="btn btn-secondary">
              {theme === 'dark' ? (
                <>
                  <Sun size={18} color="var(--color-warning)" />
                  <span>Light Screen Mode</span>
                </>
              ) : (
                <>
                  <Moon size={18} color="var(--color-primary)" />
                  <span>Dark Glass Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Database backup card */}
        <div style={styles.sectionCard} className="card">
          <div style={styles.cardHeader}>
            <Database size={20} color="var(--color-primary)" />
            <h2 style={styles.cardTitle}>Data Backup & recovery</h2>
          </div>
          <div style={styles.backupBox}>
            <p style={styles.backupText}>Export current store inventory ledger or restore from previous system backup.</p>
            
            <div style={styles.backupButtons}>
              <button onClick={handleExportData} style={styles.backupBtn} className="btn btn-secondary">
                <Download size={16} />
                <span>Export Ledger JSON</span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current.click()} 
                style={styles.backupBtn} 
                className="btn btn-secondary"
              >
                <Upload size={16} />
                <span>Import Ledger JSON</span>
              </button>
              
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Danger Zone card */}
        <div style={{ ...styles.sectionCard, gridColumn: 'span 2', borderColor: 'rgba(239, 68, 68, 0.3)' }} className="card">
          <div style={styles.cardHeader}>
            <ShieldAlert size={20} color="var(--color-danger)" />
            <h2 style={{ ...styles.cardTitle, color: 'var(--color-danger)' }}>Danger Zone</h2>
          </div>
          <div style={styles.dangerBox}>
            <div style={styles.dangerRow}>
              <div style={styles.dangerInfo}>
                <span style={styles.dangerActionName}>Reset Database to Mock Data</span>
                <span style={styles.dangerActionDesc}>Wipes active database tables and seeds mock groceries, beverages, electronics, and perishables.</span>
              </div>
              {showResetConfirm ? (
                <div style={styles.confirmButtons}>
                  <button onClick={() => setShowResetConfirm(false)} style={styles.miniBtnSec} className="btn btn-secondary">Cancel</button>
                  <button 
                    onClick={() => { onResetData(); setShowResetConfirm(false); }} 
                    style={styles.miniBtnDanger} 
                    className="btn btn-danger"
                  >
                    Confirm Reset
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowResetConfirm(true)} style={styles.dangerBtn} className="btn btn-danger">
                  Reset System
                </button>
              )}
            </div>

            <div style={styles.dangerDivider} />

            <div style={styles.dangerRow}>
              <div style={styles.dangerInfo}>
                <span style={styles.dangerActionName}>Clear All Database Ledgers</span>
                <span style={styles.dangerActionDesc}>Wipes out all stored products, categories, sales records, and settings completely.</span>
              </div>
              {showClearConfirm ? (
                <div style={styles.confirmButtons}>
                  <button onClick={() => setShowClearConfirm(false)} style={styles.miniBtnSec} className="btn btn-secondary">Cancel</button>
                  <button 
                    onClick={() => { onClearData(); setShowClearConfirm(false); }} 
                    style={styles.miniBtnDanger} 
                    className="btn btn-danger"
                  >
                    Confirm Purge
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowClearConfirm(true)} style={styles.dangerBtn} className="btn btn-danger">
                  Purge Storage
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  pageTitle: {
    fontSize: '2rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
  },
  pageSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
  },
  sectionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.75rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formRowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  subHeading: {
    fontSize: '0.875rem',
    fontWeight: '800',
    color: 'var(--color-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '0.5rem',
  },
  separator: {
    borderTop: '1px dashed var(--color-border)',
    margin: '0.25rem 0',
  },
  saveBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    fontWeight: '700',
  },
  alertError: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: '600',
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--color-success-light)',
    color: 'var(--color-success)',
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: '600',
    border: '1px solid rgba(16, 185, 129, 0.15)',
  },
  themeControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  themeText: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  themeToggleBtn: {
    width: 'fit-content',
    padding: '0.6rem 1.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  backupBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  backupText: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  backupButtons: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  backupBtn: {
    fontSize: '0.8125rem',
    padding: '0.6rem 1.1rem',
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
  },
  dangerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  dangerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  dangerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    flex: 1,
    minWidth: '220px',
  },
  dangerActionName: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
  },
  dangerActionDesc: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  dangerBtn: {
    fontSize: '0.8125rem',
    padding: '0.5rem 1rem',
  },
  dangerDivider: {
    height: '1px',
    backgroundColor: 'var(--color-border)',
  },
  confirmButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  miniBtnSec: {
    padding: '0.45rem 0.85rem',
    fontSize: '0.75rem',
  },
  miniBtnDanger: {
    padding: '0.45rem 0.85rem',
    fontSize: '0.75rem',
  }
};
