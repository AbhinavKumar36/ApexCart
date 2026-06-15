import { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle,
  Sun,
  Moon,
  Store,
  Users,
  UserPlus,
  AlertCircle,
  Info,
  Building2,
  Bell,
  BarChart3,
  Package,
  Activity,
  Search
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'framer-motion';

// Predefined vendor stall options
const VENDOR_OPTIONS = [
  { value: 'all', label: 'All Stalls (General)' },
  { value: 'Apex Grocery', label: 'Apex Grocery' },
  { value: 'Apex Fresh', label: 'Apex Fresh (Dairy)' },
  { value: 'Apex Electronics', label: 'Apex Electronics' },
  { value: 'Apex Apparel', label: 'Apex Apparel & Home' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'employee', label: 'Employee' },
];

export default function Settings({ 
  storeSettings, 
  setStoreSettings, 
  theme, 
  toggleTheme, 
  onResetData, 
  onClearData,
  onImportData,
  products,
  sales,
  activityLogs
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // Store Settings Form State
  const [storeName, setStoreName] = useState(storeSettings.storeName);
  const [storeAddress, setStoreAddress] = useState(storeSettings.storeAddress);
  const [storePhone, setStorePhone] = useState(storeSettings.storePhone);
  const [currencySymbol, setCurrencySymbol] = useState(storeSettings.currencySymbol);
  const [lowStockThreshold, setLowStockThreshold] = useState(storeSettings.lowStockThreshold);
  const [expiryWarningDays, setExpiryWarningDays] = useState(storeSettings.expiryWarningDays);
  const [geminiApiKey, setGeminiApiKey] = useState(storeSettings.geminiApiKey || '');

  // Status alerts
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  
  // Danger actions confirm states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // User Management state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newVendor, setNewVendor] = useState('all');
  const [userCreateLoading, setUserCreateLoading] = useState(false);
  const [userCreateError, setUserCreateError] = useState('');
  const [userCreateSuccess, setUserCreateSuccess] = useState('');

  // Active settings tab
  const [activeSection, setActiveSection] = useState('store');

  // Audit Logs filters
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logStoreFilter, setLogStoreFilter] = useState('all');

  const filteredLogs = (activityLogs || []).filter(log => {
    const detailsVal = log.details || '';
    const actionVal = log.action || '';
    const matchesSearch = detailsVal.toLowerCase().includes(logSearch.toLowerCase()) || 
                          actionVal.toLowerCase().includes(logSearch.toLowerCase());
    const matchesAction = logActionFilter === 'all' || log.action === logActionFilter;
    const matchesStore = logStoreFilter === 'all' || log.store === logStoreFilter;
    return matchesSearch && matchesAction && matchesStore;
  });

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
      expiryWarningDays: parseInt(expiryWarningDays, 10) || 30,
      geminiApiKey: geminiApiKey.trim()
    });

    setConfigSuccess('Store configuration updated successfully!');
    setTimeout(() => setConfigSuccess(''), 4000);
  };

  // Create new user account
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserCreateError('');
    setUserCreateSuccess('');

    if (!newEmail.trim() || !newPassword.trim()) {
      setUserCreateError('Email and password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setUserCreateError('Password must be at least 6 characters.');
      return;
    }
    if (!newEmail.includes('@')) {
      setUserCreateError('Please enter a valid email address.');
      return;
    }

    setUserCreateLoading(true);
    try {
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, newEmail.trim(), newPassword);
      // Store role + vendor in Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: newEmail.trim(),
        role: newRole,
        vendor: newVendor,
        createdAt: new Date().toISOString()
      });
      setUserCreateSuccess(`✅ Account created: ${newEmail.trim()} (${newRole} · ${newVendor})`);
      setNewEmail('');
      setNewPassword('');
      setNewRole('employee');
      setNewVendor('all');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setUserCreateError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setUserCreateError('Invalid email address format.');
      } else if (err.code === 'auth/network-request-failed') {
        setUserCreateError('Network error. Check your connection and try again.');
      } else {
        setUserCreateError(err.message || 'Failed to create account. Try again.');
      }
    } finally {
      setUserCreateLoading(false);
    }
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
      } catch {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Compute a quick overview
  const totalRevenue = sales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.quantity <= storeSettings.lowStockThreshold).length;

  const sections = [
    { id: 'store', label: 'Store Profile', icon: Store },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'theme', label: 'Theme & Display', icon: Sun },
    { id: 'data', label: 'Data Backup', icon: Database },
    { id: 'logs', label: 'Audit Logs', icon: Activity },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
  ];

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      style={styles.container}
    >
      <motion.div style={styles.headerRow} variants={itemVariants}>
        <div>
          <h1 style={styles.pageTitle}>System Control Settings</h1>
          <p style={styles.pageSubtitle}>
            Manage store configurations, user access, data backups, and system preferences.
          </p>
        </div>
        {/* Quick Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statPill}>
            <BarChart3 size={14} color="var(--color-success)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--color-success)' }} className="font-mono">
              {storeSettings.currencySymbol}{totalRevenue.toFixed(2)} Revenue
            </span>
          </div>
          <div style={styles.statPill}>
            <Package size={14} color="var(--color-primary)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--color-primary)' }} className="font-mono">
              {totalProducts} SKUs
            </span>
          </div>
          {lowStockCount > 0 && (
            <div style={{ ...styles.statPill, borderColor: 'rgba(245,158,11,0.3)' }}>
              <Bell size={14} color="var(--color-warning)" />
              <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--color-warning)' }} className="font-mono">
                {lowStockCount} Low Stock
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <div style={styles.layout}>
        {/* Sidebar Navigation */}
        <motion.div 
          style={styles.sectionNav} 
          className="glass-panel card"
          variants={itemVariants}
          whileHover={{ y: -2 }}
        >
          {sections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  ...styles.sectionNavBtn,
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-text-secondary)',
                  ...(sec.id === 'danger' && !isActive && { color: 'var(--color-danger)' })
                }}
                className="nav-btn-hover"
              >
                <Icon size={18} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Main Content Panel */}
        <div style={styles.mainPanel}>
          {/* === STORE PROFILE === */}
          {activeSection === 'store' && (
            <motion.div 
              className="glass-panel card" 
              style={styles.panel}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -2 }}
            >
              <div style={styles.panelHeader}>
                <Building2 size={22} color="var(--color-primary)" />
                <div>
                  <h2 style={styles.panelTitle}>Supermarket Configuration Profile</h2>
                  <p style={styles.panelSubtitle}>Update store identity, address, and system thresholds</p>
                </div>
              </div>

              {configError && (
                <div style={styles.alertError} className="animate-fade">
                  <AlertCircle size={16} />
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
                    <label style={styles.label}>Retail Store / Mall Name *</label>
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

                <div style={styles.divider} />

                <h3 style={styles.subHeading}>⚠️ System Warning Thresholds</h3>
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
                      className="input-field font-mono"
                    />
                    <span style={styles.inputHint}>Flag items with quantity ≤ this value</span>
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
                      className="input-field font-mono"
                    />
                    <span style={styles.inputHint}>Warn if item expires within this many days</span>
                  </div>
                </div>

                <div style={styles.divider} />

                <h3 style={{ ...styles.subHeading, color: 'var(--color-primary)' }}>🤖 Gemini AI Configuration</h3>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Gemini API Key</label>
                  <input
                    type="password"
                    placeholder="Enter your Gemini API Key (e.g. AIzaSy...)"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="input-field font-mono"
                  />
                  <span style={styles.inputHint}>Used to power AI procurement restocks and chatbot overlay assistant. Leaves Vite bundle clean of secrets.</span>
                </div>

                <button type="submit" style={styles.saveBtn} className="btn btn-primary">
                  <CheckCircle size={16} />
                  Save Store Configuration
                </button>
              </form>
            </motion.div>
          )}

          {/* === USER MANAGEMENT === */}
          {activeSection === 'users' && (
            <motion.div 
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Existing accounts overview */}
              <motion.div 
                className="glass-panel card" 
                style={styles.panel}
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <div style={styles.panelHeader}>
                  <Users size={22} color="var(--color-primary)" />
                  <div>
                    <h2 style={styles.panelTitle}>Demo Account Directory</h2>
                    <p style={styles.panelSubtitle}>Pre-configured access credentials for ApexCart</p>
                  </div>
                </div>

                <div style={styles.accountsGrid}>
                  {[
                    { email: 'admin@apexcart.com', pass: 'admin123', role: 'Admin', vendor: 'All Stalls', color: 'var(--color-danger)' },
                    { email: 'employee@apexcart.com', pass: 'emp123', role: 'Employee', vendor: 'All Stalls', color: 'var(--color-primary)' },
                  ].map(acc => (
                    <div key={acc.email} style={styles.accountCard}>
                      <div style={{ ...styles.accountAvatar, backgroundColor: `${acc.color}20`, color: acc.color }}>
                        {acc.email.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.accountInfo}>
                        <span style={styles.accountEmail}>{acc.email}</span>
                        <span style={styles.accountMeta}>
                          <span style={{ ...styles.roleBadge, backgroundColor: `${acc.color}20`, color: acc.color }}>
                            {acc.role}
                          </span>
                          <span style={styles.vendorTag}>· {acc.vendor}</span>
                        </span>
                        <span style={styles.accountPass}>Password: <strong className="font-mono">{acc.pass}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.infoBox}>
                  <Info size={14} />
                  <span>These accounts are auto-created on first login attempt with the listed credentials.</span>
                </div>
              </motion.div>

              {/* Create new account */}
              <motion.div 
                className="glass-panel card" 
                style={styles.panel}
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <div style={styles.panelHeader}>
                  <UserPlus size={22} color="var(--color-primary)" />
                  <div>
                    <h2 style={styles.panelTitle}>Create New Operator Account</h2>
                    <p style={styles.panelSubtitle}>Register a new employee or admin account with optional stall assignment</p>
                  </div>
                </div>

                {userCreateError && (
                  <div style={styles.alertError} className="animate-fade">
                    <AlertCircle size={16} />
                    <span>{userCreateError}</span>
                  </div>
                )}
                {userCreateSuccess && (
                  <div style={styles.alertSuccess} className="animate-fade">
                    <CheckCircle size={16} />
                    <span>{userCreateSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} style={styles.form}>
                  <div style={styles.formRowGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. john@apexcart.com"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div style={styles.formRowGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>System Role</label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="input-field"
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <span style={styles.inputHint}>Admin: full access. Employee: POS + Inventory (view) + History + Reports</span>
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Assigned Vendor Stall</label>
                      <select
                        value={newVendor}
                        onChange={e => setNewVendor(e.target.value)}
                        className="input-field"
                      >
                        {VENDOR_OPTIONS.map(v => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                      <span style={styles.inputHint}>Restricts POS & dashboard metrics to this stall</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={userCreateLoading}
                    className="btn btn-primary"
                    style={{ ...styles.saveBtn, opacity: userCreateLoading ? 0.7 : 1 }}
                  >
                    <UserPlus size={16} />
                    {userCreateLoading ? 'Creating Account...' : 'Create Operator Account'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* === THEME === */}
          {activeSection === 'theme' && (
            <motion.div 
              className="glass-panel card" 
              style={styles.panel}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -2 }}
            >
              <div style={styles.panelHeader}>
                {theme === 'dark' ? <Moon size={22} color="var(--color-primary)" /> : <Sun size={22} color="var(--color-warning)" />}
                <div>
                  <h2 style={styles.panelTitle}>Theme &amp; Interface</h2>
                  <p style={styles.panelSubtitle}>Choose lighting configuration for operator screens</p>
                </div>
              </div>
              <div style={styles.themeOptions}>
                <div
                  style={{
                    ...styles.themeOption,
                    borderColor: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-border)',
                    boxShadow: theme === 'dark' ? '0 0 0 2px var(--color-primary)' : 'none',
                  }}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                >
                  <div style={{ ...styles.themePreview, background: '#0f1117' }}>
                    <div style={{ width: '60%', height: '8px', borderRadius: '4px', background: '#7c3aed', marginBottom: '6px' }} />
                    <div style={{ width: '90%', height: '4px', borderRadius: '2px', background: '#374151', marginBottom: '4px' }} />
                    <div style={{ width: '70%', height: '4px', borderRadius: '2px', background: '#374151' }} />
                  </div>
                  <div style={styles.themeLabel}>
                    <Moon size={16} />
                    <span>Dark Glass Mode</span>
                    {theme === 'dark' && <CheckCircle size={14} color="var(--color-primary)" />}
                  </div>
                </div>
                <div
                  style={{
                    ...styles.themeOption,
                    borderColor: theme === 'light' ? 'var(--color-primary)' : 'var(--color-border)',
                    boxShadow: theme === 'light' ? '0 0 0 2px var(--color-primary)' : 'none',
                  }}
                  onClick={() => theme !== 'light' && toggleTheme()}
                >
                  <div style={{ ...styles.themePreview, background: '#f9fafb' }}>
                    <div style={{ width: '60%', height: '8px', borderRadius: '4px', background: '#7c3aed', marginBottom: '6px' }} />
                    <div style={{ width: '90%', height: '4px', borderRadius: '2px', background: '#d1d5db', marginBottom: '4px' }} />
                    <div style={{ width: '70%', height: '4px', borderRadius: '2px', background: '#d1d5db' }} />
                  </div>
                  <div style={styles.themeLabel}>
                    <Sun size={16} />
                    <span>Light Screen Mode</span>
                    {theme === 'light' && <CheckCircle size={14} color="var(--color-primary)" />}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* === DATA BACKUP === */}
          {activeSection === 'data' && (
            <motion.div 
              className="glass-panel card" 
              style={styles.panel}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -2 }}
            >
              <div style={styles.panelHeader}>
                <Database size={22} color="var(--color-primary)" />
                <div>
                  <h2 style={styles.panelTitle}>Data Backup &amp; Recovery</h2>
                  <p style={styles.panelSubtitle}>Export or import your complete inventory ledger as JSON</p>
                </div>
              </div>
              <div style={styles.dataStats}>
                <div style={styles.dataStat}>
                  <span style={styles.dataStatValue} className="font-mono">{products.length}</span>
                  <span style={styles.dataStatLabel}>Products</span>
                </div>
                <div style={styles.dataStat}>
                  <span style={styles.dataStatValue} className="font-mono">{sales.length}</span>
                  <span style={styles.dataStatLabel}>Sales Records</span>
                </div>
                <div style={styles.dataStat}>
                  <span style={styles.dataStatValue} className="font-mono">{new Date().toLocaleDateString()}</span>
                  <span style={styles.dataStatLabel}>Today's Date</span>
                </div>
              </div>
              <div style={styles.backupButtons}>
                <button onClick={handleExportData} style={styles.backupBtn} className="btn btn-secondary">
                  <Download size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>Export Ledger JSON</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Download full backup of products &amp; sales</div>
                  </div>
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  style={styles.backupBtn}
                  className="btn btn-secondary"
                >
                  <Upload size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>Import Ledger JSON</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Restore from a previous backup file</div>
                  </div>
                </button>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportData}
                  style={{ display: 'none' }}
                />
              </div>
              <div style={styles.infoBox}>
                <Info size={14} />
                <span>Backups include all product catalog, sales history, and store settings. Import will replace current data.</span>
              </div>
            </motion.div>
          )}

          {/* === AUDIT LOGS === */}
          {activeSection === 'logs' && (
            <motion.div 
              className="glass-panel card" 
              style={styles.panel}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -2 }}
            >
              <div style={styles.panelHeader}>
                <Activity size={22} color="var(--color-primary)" />
                <div>
                  <h2 style={styles.panelTitle}>System Audit &amp; Activity Logs</h2>
                  <p style={styles.panelSubtitle}>Trace user operations, POS billing transactions, and inventory changes.</p>
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search logs by action or details..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    className="input-field"
                  />
                </div>
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="input-field"
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">All Actions</option>
                  <option value="POS_SALE">POS Sale</option>
                  <option value="STOCK_TRANSFER">Stock Transfer</option>
                  <option value="PO_RECEIVE">PO Receive</option>
                  <option value="DATABASE_RESET">Database Reset</option>
                  <option value="USER_CREATION">User Creation</option>
                </select>
                <select
                  value={logStoreFilter}
                  onChange={(e) => setLogStoreFilter(e.target.value)}
                  className="input-field"
                  style={{ minWidth: '120px' }}
                >
                  <option value="all">All Stores</option>
                  <option value="Store A">Store A</option>
                  <option value="Store B">Store B</option>
                </select>
              </div>

              {/* Table */}
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Timestamp</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>Store</th>
                      <th style={styles.th}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }} className="font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ ...styles.td, fontWeight: '700' }}>{log.user?.split('@')[0]}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.marginBadge,
                            fontSize: '0.6875rem',
                            fontWeight: '800',
                            color: log.action.includes('RESET') || log.action.includes('PURGE') ? 'var(--color-danger)' : log.action.includes('SALE') ? 'var(--color-success)' : 'var(--color-primary)',
                            backgroundColor: log.action.includes('RESET') || log.action.includes('PURGE') ? 'var(--color-danger-light)' : log.action.includes('SALE') ? 'var(--color-success-light)' : 'var(--color-primary-light)'
                          }} className="font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td style={{ ...styles.td, fontWeight: '600' }}>{log.store || 'N/A'}</td>
                        <td style={styles.td}>{log.details}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No audit activity logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* === DANGER ZONE === */}
          {activeSection === 'danger' && (
            <motion.div 
              className="glass-panel card" 
              style={{ ...styles.panel, borderColor: 'rgba(239, 68, 68, 0.4)' }}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -2 }}
            >
              <div style={styles.panelHeader}>
                <ShieldAlert size={22} color="var(--color-danger)" />
                <div>
                  <h2 style={{ ...styles.panelTitle, color: 'var(--color-danger)' }}>Danger Zone</h2>
                  <p style={styles.panelSubtitle}>Destructive actions that cannot be undone. Proceed with extreme caution.</p>
                </div>
              </div>

              <div style={styles.dangerBox}>
                <div style={styles.dangerRow}>
                  <div style={styles.dangerInfo}>
                    <span style={styles.dangerActionName}>🔄 Reset Database to Mock Data</span>
                    <span style={styles.dangerActionDesc}>
                      Wipes active database tables and seeds mock groceries, beverages, electronics, and perishables catalog.
                    </span>
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
                    <span style={styles.dangerActionName}>🗑️ Purge All Database Ledgers</span>
                    <span style={styles.dangerActionDesc}>
                      Permanently deletes all stored products, categories, sales records, and settings from Firestore.
                    </span>
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
            </motion.div>
          )}
        </div>
      </div>

      <style>{`
        .nav-btn-hover { transition: all 0.18s ease; }
        .nav-btn-hover:hover { background-color: var(--color-primary-light) !important; color: var(--color-primary) !important; }
      `}</style>
    </motion.div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
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
    marginTop: '0.25rem',
  },
  statsRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '9999px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
  },
  layout: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  sectionNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    padding: '0.75rem',
    width: '210px',
    flexShrink: 0,
  },
  sectionNavBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.7rem 1rem',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    textAlign: 'left',
    transition: 'all 0.18s ease',
  },
  mainPanel: {
    flex: 1,
    minWidth: '0',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  panelTitle: {
    fontSize: '1.125rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  panelSubtitle: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.15rem',
    fontWeight: '500',
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
  inputHint: {
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
  },
  subHeading: {
    fontSize: '0.8125rem',
    fontWeight: '800',
    color: 'var(--color-warning)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  divider: {
    borderTop: '1px dashed var(--color-border)',
  },
  saveBtn: {
    padding: '0.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
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
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '0.75rem',
  },
  accountCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0.85rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
  },
  accountAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    minWidth: 0,
  },
  accountEmail: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  accountMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  roleBadge: {
    fontSize: '0.625rem',
    fontWeight: '800',
    padding: '0.15rem 0.5rem',
    borderRadius: '9999px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  vendorTag: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  accountPass: {
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'monospace',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-primary-light)',
    border: '1px solid var(--color-primary-glow)',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '500',
  },
  themeOptions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  themeOption: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flex: '1 1 160px',
    maxWidth: '220px',
  },
  themePreview: {
    borderRadius: '8px',
    height: '80px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  themeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: '700',
    fontSize: '0.875rem',
  },
  dataStats: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  dataStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    flex: 1,
    minWidth: '100px',
    textAlign: 'center',
  },
  dataStatValue: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    color: 'var(--color-primary)',
  },
  dataStatLabel: {
    fontSize: '0.6875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--color-text-muted)',
    marginTop: '0.2rem',
  },
  backupButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  backupBtn: {
    flex: '1 1 200px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    textAlign: 'left',
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
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
  dangerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
    minWidth: '220px',
  },
  dangerActionName: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
  },
  dangerActionDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  dangerBtn: {
    fontSize: '0.8125rem',
    padding: '0.5rem 1.2rem',
  },
  dangerDivider: {
    height: '1px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
