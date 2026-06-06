import React, { useState, useRef } from 'react';
import { 
  KeyRound, 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import { DEFAULT_CREDENTIALS, INITIAL_PRODUCTS } from '../data/mockData';

export default function Settings({ 
  credentials, 
  setCredentials, 
  theme, 
  toggleTheme, 
  onResetData, 
  onClearData,
  onImportData,
  products,
  sales
}) {
  // Credentials Form State
  const [usernameInput, setUsernameInput] = useState(credentials.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Status alerts
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  
  // Danger actions confirm states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputRef = useRef(null);

  // Handle password/username change
  const handleUpdateCredentials = (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    // Verification
    if (currentPassword !== credentials.password) {
      setCredError('Incorrect current password.');
      return;
    }

    if (!usernameInput.trim()) {
      setCredError('Username cannot be empty.');
      return;
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setCredError('New passwords do not match.');
        return;
      }
      // Save credentials with new password
      setCredentials({
        username: usernameInput.trim(),
        password: newPassword
      });
    } else {
      // Save credentials with new username only
      setCredentials(prev => ({
        ...prev,
        username: usernameInput.trim()
      }));
    }

    setCredSuccess('Credentials updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Export Data to JSON
  const handleExportData = () => {
    const dataBackup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      credentials,
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
        if (parsed.version && parsed.products && parsed.sales && parsed.credentials) {
          onImportData(parsed.products, parsed.sales, parsed.credentials);
          alert('Data backup imported and restored successfully!');
        } else {
          alert('Invalid backup file format. Missing essential fields.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  return (
    <div style={styles.container} className="animate-fade">
      <div>
        <h1 style={styles.pageTitle}>System Administration</h1>
        <p style={styles.pageSubtitle}>Update passwords, manage local backups, and toggle visual display themes.</p>
      </div>

      <div style={styles.grid}>
        {/* Change Credentials Form */}
        <div style={styles.sectionCard} className="card">
          <div style={styles.cardHeader}>
            <KeyRound size={20} color="var(--color-primary)" />
            <h2 style={styles.cardTitle}>Change Credentials</h2>
          </div>
          
          {credError && (
            <div style={styles.alertError} className="animate-fade">
              <ShieldAlert size={16} />
              <span>{credError}</span>
            </div>
          )}

          {credSuccess && (
            <div style={styles.alertSuccess} className="animate-fade">
              <CheckCircle size={16} />
              <span>{credSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateCredentials} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>System Operator Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Current Password</label>
              <div style={styles.passWrapper}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Verify identity password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={styles.separator} />

            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password (Optional)</label>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
              />
            </div>

            {newPassword && (
              <div style={styles.inputGroup} className="animate-fade">
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                />
              </div>
            )}

            <button type="submit" style={styles.saveBtn} className="btn btn-primary">
              Update Admin Profile
            </button>
          </form>
        </div>

        {/* Visual Settings card */}
        <div style={styles.sectionCard} className="card">
          <div style={styles.cardHeader}>
            {theme === 'dark' ? <Moon size={20} color="var(--color-primary)" /> : <Sun size={20} color="var(--color-warning)" />}
            <h2 style={styles.cardTitle}>Theme & Interface</h2>
          </div>
          <div style={styles.themeControls}>
            <p style={styles.themeText}>Choose standard lighting for store screen configurations.</p>
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

        {/* Database & Backups card */}
        <div style={styles.sectionCard} className="card">
          <div style={styles.cardHeader}>
            <Database size={20} color="var(--color-primary)" />
            <h2 style={styles.cardTitle}>Data Backup & recovery</h2>
          </div>
          <div style={styles.backupBox}>
            <p style={styles.backupText}>Export current local storage ledger or import a previous system dump file.</p>
            
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

        {/* Danger Zone */}
        <div style={{ ...styles.sectionCard, borderColor: 'rgba(239, 68, 68, 0.3)' }} className="card">
          <div style={styles.cardHeader}>
            <ShieldAlert size={20} color="var(--color-danger)" />
            <h2 style={{ ...styles.cardTitle, color: 'var(--color-danger)' }}>Danger Zone</h2>
          </div>
          <div style={styles.dangerBox}>
            <div style={styles.dangerRow}>
              <div style={styles.dangerInfo}>
                <span style={styles.dangerActionName}>Reset Database to Mock Data</span>
                <span style={styles.dangerActionDesc}>Wipes active inventory and sales logs to seed the original supermarket items catalog.</span>
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
                <span style={styles.dangerActionName}>Clear All Databases</span>
                <span style={styles.dangerActionDesc}>Wipes out all stored products, categories, and past billing histories entirely.</span>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
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
    gap: '1rem',
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
  passWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  separator: {
    borderTop: '1px dashed var(--color-border)',
    margin: '0.5rem 0',
  },
  saveBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
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
