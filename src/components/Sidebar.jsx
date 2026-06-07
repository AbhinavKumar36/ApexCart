import React, { useState } from 'react';
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
  BarChart3
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  username, 
  onLogout,
  role,
  vendor
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory Manager', icon: Package },
    { id: 'history', label: 'Billing History', icon: History },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Control Settings', icon: SettingsIcon }
  ];

  // Filter items based on active role - employees see all except Settings
  const filteredMenuItems = menuItems.filter(item => {
    if (role !== 'admin') {
      return ['dashboard', 'pos', 'inventory', 'history', 'reports'].includes(item.id);
    }
    return true; // Admin has full access
  });

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header style={styles.mobileHeader} className="glass">
        <div style={styles.logoRow}>
          <Store size={24} color="var(--color-primary)" />
          <span style={styles.logoText}>ApexCart</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={styles.menuBtn}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && <div style={styles.overlay} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar Container */}
      <aside 
        style={{
          ...styles.sidebar,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
        className={`glass ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div style={styles.sidebarContent}>
          {/* Logo Section */}
          <div style={styles.logoSection}>
            <div style={styles.logoContainer}>
              <Store size={28} color="var(--color-primary)" />
            </div>
            <div>
              <h2 style={styles.brandName}>ApexCart</h2>
              <span style={styles.brandTagline}>v1.0 Enterprise</span>
            </div>
          </div>

          {/* User profile capsule */}
          <div style={styles.userBox}>
            <div style={styles.avatar}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userRole}>
                {role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
              </span>
              <span style={styles.userName}>{username}</span>
              {vendor && vendor !== 'all' && (
                <span style={styles.vendorBadge}>
                  🏪 {vendor}
                </span>
              )}
            </div>
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
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                  className="nav-btn-hover"
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer Controls */}
          <div style={styles.footer}>
            <button onClick={toggleTheme} style={styles.footerBtn} className="btn-secondary">
              {theme === 'dark' ? (
                <>
                  <Sun size={18} color="var(--color-warning)" />
                  <span>Switch Light</span>
                </>
              ) : (
                <>
                  <Moon size={18} color="var(--color-primary)" />
                  <span>Switch Dark</span>
                </>
              )}
            </button>

            <button onClick={onLogout} style={styles.logoutBtn} className="btn-secondary">
              <LogOut size={18} color="var(--color-danger)" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Global CSS for hover effects that are cleaner inline */}
      <style>{`
        .nav-btn-hover {
          transition: all 0.2s ease;
        }
        .nav-btn-hover:hover {
          background-color: var(--color-primary-light) !important;
          color: var(--color-primary) !important;
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
    height: '60px',
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
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    fontSize: '1.25rem',
    letterSpacing: '-0.5px',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 45,
    backdropFilter: 'blur(4px)',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '280px',
    height: '100vh',
    zIndex: 50,
    borderRight: '1px solid var(--color-border)',
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '2rem 1.5rem',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  logoContainer: {
    display: 'flex',
    padding: '0.5rem',
    borderRadius: '10px',
    backgroundColor: 'var(--color-primary-light)',
  },
  brandName: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    lineHeight: '1',
  },
  brandTagline: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    marginBottom: '2rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.25rem',
    boxShadow: 'var(--shadow-sm)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userRole: {
    fontSize: '0.625rem',
    fontWeight: '800',
    color: 'var(--color-primary)',
    letterSpacing: '0.5px',
  },
  userName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
    lineHeight: '1.2',
  },
  vendorBadge: {
    fontSize: '0.625rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-light)',
    padding: '0.1rem 0.4rem',
    borderRadius: '9999px',
    marginTop: '0.1rem',
    letterSpacing: '0.3px',
    display: 'inline-block',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    width: '100%',
    padding: '0.85rem 1rem',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '600',
    textAlign: 'left',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1.5rem',
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '600',
    background: 'none',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '600',
    background: 'none',
  }
};
