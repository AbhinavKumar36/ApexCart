import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Store,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PackageCheck
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  username, 
  onLogout,
  role,
  vendor,
  currentStore,
  setCurrentStore
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory Manager', icon: Package },
    { id: 'suppliers', label: 'Suppliers & POs', icon: Store },
    { id: 'history', label: 'Billing History', icon: History },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Control Settings', icon: SettingsIcon }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (role !== 'admin') {
      return ['dashboard', 'pos', 'inventory', 'history', 'reports'].includes(item.id);
    }
    return true;
  });

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      <header style={styles.mobileHeader} className="glass">
        <div style={styles.logoRow}>
          <div style={styles.mobileLogoBox}>
            <PackageCheck size={20} color="var(--color-primary)" strokeWidth={2.5} />
          </div>
          <span style={styles.logoText}>ApexCart</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={styles.menuBtn}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileOpen && <div style={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <motion.aside 
        animate={{ width: isCollapsed ? '88px' : '280px' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          ...styles.sidebar,
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
        className={`glass-panel ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div style={{
          ...styles.sidebarContent,
          padding: isCollapsed ? '2rem 1rem' : '2rem 1.5rem',
        }}>
          {/* Logo Section */}
          <div style={{ 
            ...styles.logoSection, 
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: isCollapsed ? '0' : '1rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
              <div style={styles.logoContainer}>
                <PackageCheck size={24} color="var(--color-primary)" strokeWidth={2.5} />
              </div>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <h2 style={styles.brandName}>ApexCart</h2>
                  <span style={styles.brandTagline}>v2.0 Enterprise</span>
                </motion.div>
              )}
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              style={styles.collapseToggle} 
              className="desktop-only-btn"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Store Switcher */}
          {isCollapsed ? (
            <div 
              style={{ ...styles.storeSwitcherCollapsed, cursor: 'pointer' }}
              onClick={() => setCurrentStore(prev => prev === 'Store A' ? 'Store B' : 'Store A')}
              title={`Toggle Outlet (Current: ${currentStore})`}
              className="nav-item-container"
            >
              <Store size={20} color="var(--color-primary)" />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: currentStore === 'Store A' ? 'var(--color-primary)' : 'var(--color-success)',
                border: '2px solid var(--color-bg-base)'
              }} />
              <div className="sidebar-tooltip">Toggle Outlet: {currentStore}</div>
            </div>
          ) : (
            <div style={styles.storeSwitcher}>
              <Store size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <select
                value={currentStore}
                onChange={(e) => setCurrentStore(e.target.value)}
                style={styles.storeSelect}
              >
                <option value="Store A">Store A (Main Outlet)</option>
                <option value="Store B">Store B (Express)</option>
              </select>
            </div>
          )}

          {/* User profile capsule */}
          <div style={{ 
            ...styles.userBox, 
            justifyContent: isCollapsed ? 'center' : 'flex-start', 
            padding: isCollapsed ? '0' : '1rem',
            background: isCollapsed ? 'transparent' : 'var(--color-bg-surface)',
            border: isCollapsed ? 'none' : '1px solid var(--color-border)',
            marginBottom: '2rem'
          }}>
            <div style={styles.avatar} title={`${username} (${role === 'admin' ? 'Admin' : 'Employee'})`}>
              {username.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <motion.div 
                style={styles.userInfo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span style={styles.userRole}>
                  {role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
                </span>
                <span style={styles.userName}>{username}</span>
                {vendor && vendor !== 'all' && (
                  <span style={styles.vendorBadge}>
                    🏪 {vendor}
                  </span>
                )}
              </motion.div>
            )}
          </div>

          {/* Navigation Items */}
          <nav style={styles.nav}>
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    ...styles.navBtn,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    color: isActive ? 'var(--color-bg-base)' : 'var(--color-text-secondary)',
                    padding: isCollapsed ? '0.85rem 0' : '0.85rem 1rem',
                  }}
                  className="nav-item-container nav-btn-hover"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: 'var(--radius-md)',
                        zIndex: -1,
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={22} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ whiteSpace: 'nowrap', fontWeight: isActive ? '700' : '600' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                  
                  {isCollapsed && (
                    <div className="sidebar-tooltip">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Controls */}
          <div style={{ ...styles.footer, alignItems: isCollapsed ? 'center' : 'stretch', padding: isCollapsed ? '1.5rem 0 0 0' : '1.5rem 0' }}>
            <button 
              onClick={toggleTheme} 
              style={{ ...styles.footerBtn, justifyContent: isCollapsed ? 'center' : 'flex-start' }} 
              className="nav-item-container btn-secondary"
            >
              {theme === 'dark' ? <Sun size={20} color="var(--color-warning)" /> : <Moon size={20} color="var(--color-primary)" />}
              {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
              {isCollapsed && <div className="sidebar-tooltip">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</div>}
            </button>

            <button 
              onClick={onLogout} 
              style={{ ...styles.logoutBtn, justifyContent: isCollapsed ? 'center' : 'flex-start' }} 
              className="nav-item-container btn-secondary"
            >
              <LogOut size={20} color="var(--color-danger)" />
              {!isCollapsed && <span style={{ color: 'var(--color-danger)' }}>Sign Out</span>}
              {isCollapsed && <div className="sidebar-tooltip">Sign Out</div>}
            </button>
          </div>
        </div>
      </motion.aside>

      <style>{`
        .nav-btn-hover {
          transition: all 0.2s ease;
          position: relative;
          z-index: 1;
          background-color: transparent;
        }
        .nav-btn-hover:hover {
          color: var(--color-primary) !important;
        }
        .sidebar-tooltip {
          position: absolute;
          left: 80px;
          background-color: var(--color-bg-surface-glass);
          backdrop-filter: blur(8px);
          color: var(--color-text-primary);
          padding: 0.5rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-md);
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transform: translateX(-10px);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
        }
        .nav-item-container {
          position: relative;
        }
        .nav-item-container:hover .sidebar-tooltip {
          opacity: 1;
          transform: translateX(0);
        }
        @media (min-width: 1025px) {
          aside {
            transform: none !important;
            position: sticky !important;
          }
          header {
            display: none !important;
          }
          .overlay {
            display: none !important;
          }
        }
        @media (max-width: 1024px) {
          .desktop-only-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    height: '64px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    borderBottom: '1px solid var(--color-border)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  mobileLogoBox: {
    display: 'flex',
    padding: '0.5rem',
    borderRadius: '10px',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    fontSize: '1.25rem',
    letterSpacing: '-0.02em',
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 45,
    backdropFilter: 'blur(4px)',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    height: '100vh',
    zIndex: 50,
    borderRight: '1px solid var(--color-border)',
    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    borderRadius: '0', // Keep flush to the edge
    margin: 0,
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    padding: '0.5rem',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    width: '44px',
    height: '44px',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  brandName: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
    background: 'linear-gradient(90deg, var(--color-text-primary), var(--color-primary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  brandTagline: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    borderRadius: 'var(--radius-lg)',
  },
  storeSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    marginBottom: '1.5rem',
  },
  storeSwitcherCollapsed: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0.75rem 0',
    marginBottom: '1.5rem',
    position: 'relative',
  },
  storeSelect: {
    border: 'none',
    background: 'none',
    outline: 'none',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    width: '100%',
    padding: 0,
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-glow))',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.25rem',
    boxShadow: 'var(--shadow-md)',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userRole: {
    fontSize: '0.625rem',
    fontWeight: '800',
    color: 'var(--color-primary)',
    letterSpacing: '0.05em',
  },
  userName: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
    lineHeight: '1.3',
  },
  vendorBadge: {
    fontSize: '0.625rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-light)',
    padding: '0.1rem 0.4rem',
    borderRadius: '9999px',
    marginTop: '0.2rem',
    letterSpacing: '0.02em',
    display: 'inline-block',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: '0.5rem',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    alignSelf: 'stretch',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    borderTop: '1px solid rgba(150, 150, 150, 0.15)',
    marginTop: 'auto',
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    alignSelf: 'stretch',
    padding: '0.85rem 1rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '600',
    margin: 0,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    alignSelf: 'stretch',
    padding: '0.85rem 1rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '600',
    margin: 0,
  },
  collapseToggle: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease',
  }
};
