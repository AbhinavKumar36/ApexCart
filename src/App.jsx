import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { INITIAL_PRODUCTS, CATEGORIES } from './data/mockData';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import History from './components/History';
import Settings from './components/Settings';
import Chatbot from './components/Chatbot';

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [role, setRole] = useState('staff'); // default role: staff
  
  // Database states
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  
  // Connection & loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Theme states (local to client device)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('apexcart_theme');
    return saved || 'dark';
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Monitor Authentication and Sync Database Collections
  useEffect(() => {
    let unsubProducts = () => {};
    let unsubSales = () => {};
    let connectionTimeout;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Clear timeout if user auth is evaluated
      clearTimeout(connectionTimeout);

      if (user) {
        setCurrentUser(user.email);
        setIsAuthenticated(true);
        setIsLoading(true);
        setIsOfflineMode(false);

        // 1. Fetch User Role from Firestore 'users' collection
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setRole(userDoc.data().role || 'staff');
          } else {
            // Seeding user document based on email prefix (admin@ vs staff@)
            const assignedRole = user.email.startsWith('admin') ? 'admin' : 'staff';
            await setDoc(userDocRef, {
              email: user.email,
              role: assignedRole,
              createdAt: new Date().toISOString()
            });
            setRole(assignedRole);
          }
        } catch (err) {
          console.warn("Failed fetching live user role. Defaulting based on email prefix:", err);
          setRole(user.email.startsWith('admin') ? 'admin' : 'staff');
        }

        // 2. Sync Products Collection via Firestore Snapshot
        unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          
          if (items.length > 0) {
            setProducts(items);
            localStorage.setItem('apexcart_products', JSON.stringify(items));
          } else {
            // Seed initial database products catalog to Firestore
            INITIAL_PRODUCTS.forEach(async (p) => {
              const { id, ...data } = p;
              await setDoc(doc(db, 'products', id), data);
            });
          }
        }, (error) => {
          console.error("Products Firestore sync error:", error);
        });

        // 3. Sync Sales Collection via Firestore Snapshot
        unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          setSales(items);
          localStorage.setItem('apexcart_sales', JSON.stringify(items));
          setIsLoading(false);
        }, (error) => {
          console.error("Sales Firestore sync error:", error);
          setIsLoading(false);
        });

      } else {
        // Logged out
        setIsAuthenticated(false);
        setCurrentUser('');
        setRole('staff');
        setIsLoading(false);
      }
    });

    // Timeout: if Firestore connection takes too long, fallback to LocalStorage
    connectionTimeout = setTimeout(() => {
      console.warn("Firebase Auth/Firestore connection timed out. Falling back to local offline mode.");
      setIsOfflineMode(true);
      
      const savedProducts = localStorage.getItem('apexcart_products');
      setProducts(savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS);

      const savedSales = localStorage.getItem('apexcart_sales');
      setSales(savedSales ? JSON.parse(savedSales) : []);

      setIsLoading(false);
    }, 4000);

    return () => {
      clearTimeout(connectionTimeout);
      unsubAuth();
      unsubProducts();
      unsubSales();
    };
  }, []);

  // Handle successful login (called when credentials resolve)
  const handleLoginSuccess = async (user) => {
    // If sign-in resolved locally in offline mode
    if (user.isOffline) {
      setCurrentUser(user.email);
      setRole(user.email.startsWith('admin') ? 'admin' : 'staff');
      setIsAuthenticated(true);
      setIsOfflineMode(true);

      const savedProducts = localStorage.getItem('apexcart_products');
      setProducts(savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS);

      const savedSales = localStorage.getItem('apexcart_sales');
      setSales(savedSales ? JSON.parse(savedSales) : []);
      
      setIsLoading(false);
      return;
    }

    setCurrentUser(user.email);
    setIsAuthenticated(true);
  };

  // Synchronize theme
  useEffect(() => {
    localStorage.setItem('apexcart_theme', theme);
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('theme-dark');
    } else {
      body.classList.remove('theme-dark');
    }
  }, [theme]);

  // Wrapper set state calls that sync to both LocalStorage and Cloud Firestore
  const handleSetProducts = (updater) => {
    setProducts(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('apexcart_products', JSON.stringify(next));
      
      if (!isOfflineMode) {
        // Additions/updates
        next.forEach(async (p) => {
          const { id, ...data } = p;
          await setDoc(doc(db, 'products', id), data);
        });
        // Deletions
        const nextIds = next.map(p => p.id);
        prev.forEach(async (p) => {
          if (!nextIds.includes(p.id)) {
            await deleteDoc(doc(db, 'products', p.id));
          }
        });
      }
      return next;
    });
  };

  const handleSetSales = (updater) => {
    setSales(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('apexcart_sales', JSON.stringify(next));
      
      if (!isOfflineMode) {
        // Additions/updates
        next.forEach(async (s) => {
          const { id, ...data } = s;
          await setDoc(doc(db, 'sales', id), data);
        });
        // Deletions
        const nextIds = next.map(s => s.id);
        prev.forEach(async (s) => {
          if (!nextIds.includes(s.id)) {
            await deleteDoc(doc(db, 'sales', s.id));
          }
        });
      }
      return next;
    });
  };

  const handleSetCredentials = () => {
    // Firebase Auth manages credentials, so we don't save credentials in Firestore collection for security.
    alert('Administrator account details managed via Firebase Auth console.');
  };

  // Handle logout
  const handleLogout = () => {
    signOut(auth).catch(err => console.error("Signout error:", err));
    setIsAuthenticated(false);
    setCurrentUser('');
    setRole('staff');
    setActiveTab('dashboard');
  };

  // Toggle light/dark mode
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Danger actions reset methods
  const handleResetData = () => {
    localStorage.setItem('apexcart_products', JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem('apexcart_sales', JSON.stringify([]));
    setProducts(INITIAL_PRODUCTS);
    setSales([]);

    if (!isOfflineMode) {
      // Delete all current sales documents
      sales.forEach(async (s) => {
        await deleteDoc(doc(db, 'sales', s.id));
      });
      // Seed default products
      INITIAL_PRODUCTS.forEach(async (p) => {
        const { id, ...data } = p;
        await setDoc(doc(db, 'products', id), data);
      });
    }
    alert('System catalog reset to default items.');
  };

  const handleClearData = () => {
    localStorage.setItem('apexcart_products', JSON.stringify([]));
    localStorage.setItem('apexcart_sales', JSON.stringify([]));
    setProducts([]);
    setSales([]);

    if (!isOfflineMode) {
      products.forEach(async (p) => {
        await deleteDoc(doc(db, 'products', p.id));
      });
      sales.forEach(async (s) => {
        await deleteDoc(doc(db, 'sales', s.id));
      });
    }
    alert('All catalog items and billing records deleted.');
  };

  const handleImportData = (newProducts, newSales) => {
    localStorage.setItem('apexcart_products', JSON.stringify(newProducts));
    localStorage.setItem('apexcart_sales', JSON.stringify(newSales));
    setProducts(newProducts);
    setSales(newSales);

    if (!isOfflineMode) {
      // Flush previous collections
      products.forEach(async (p) => {
        await deleteDoc(doc(db, 'products', p.id));
      });
      sales.forEach(async (s) => {
        await deleteDoc(doc(db, 'sales', s.id));
      });
      // Import new
      newProducts.forEach(async (p) => {
        const { id, ...data } = p;
        await setDoc(doc(db, 'products', id), data);
      });
      newSales.forEach(async (s) => {
        const { id, ...data } = s;
        await setDoc(doc(db, 'sales', id), data);
      });
    }
  };

  // Render proper subpage component
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            products={products} 
            sales={sales} 
            setProducts={handleSetProducts} 
            setActiveTab={setActiveTab} 
            role={role}
          />
        );
      case 'pos':
        return (
          <POS 
            products={products} 
            setProducts={handleSetProducts} 
            sales={sales} 
            setSales={handleSetSales} 
            categories={CATEGORIES} 
          />
        );
      case 'inventory':
        // Restrict page view if staff attempts to load it directly
        if (role === 'staff') {
          return <div style={styles.restrictedText}>Restricted Area. Admin privilege required.</div>;
        }
        return (
          <Inventory 
            products={products} 
            setProducts={handleSetProducts} 
            categories={CATEGORIES} 
          />
        );
      case 'history':
        return (
          <History 
            sales={sales} 
            setSales={handleSetSales} 
            products={products} 
            setProducts={handleSetProducts} 
            role={role}
          />
        );
      case 'settings':
        if (role === 'staff') {
          return <div style={styles.restrictedText}>Restricted Area. Admin privilege required.</div>;
        }
        return (
          <Settings 
            credentials={{ username: currentUser, password: 'Managed via Firebase Auth Console' }} 
            setCredentials={handleSetCredentials} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            onResetData={handleResetData} 
            onClearData={handleClearData} 
            onImportData={handleImportData}
            products={products}
            sales={sales}
          />
        );
      default:
        return <div style={{ padding: '2rem' }}>Section not found.</div>;
    }
  };

  // Show a loading screen with fallback notification support
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.loadingTitle}>Connecting to ApexCart</h2>
        <p style={styles.loadingText}>Synchronizing Auth Ledger and Cloud Firestore...</p>
        <p style={styles.fallbackNotice}>Automatically falling back to LocalStorage cache if offline.</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not authenticated, render login page
  if (!isAuthenticated) {
    return (
      <Login onLoginSuccess={handleLoginSuccess} />
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        username={currentUser} 
        onLogout={handleLogout} 
        role={role}
      />
      <main className="main-content" style={{ marginTop: '60px' /* offset mobile header height */ }}>
        {/* Sync Status Badge Indicator */}
        <div style={styles.statusRow}>
          {isOfflineMode ? (
            <div style={styles.offlineBadge}>
              <span style={styles.offlineDot} />
              <span>Offline Cache Mode (LocalStorage Active)</span>
            </div>
          ) : (
            <div style={styles.onlineBadge}>
              <span style={styles.onlineDot} />
              <span>Firebase Cloud Firestore Synced</span>
            </div>
          )}
        </div>
        <div style={styles.contentInner}>
          {renderActiveView()}
        </div>
      </main>

      <style>{`
        /* Adjust main layout margin on desktop when sidebar becomes sticky */
        @media (min-width: 1025px) {
          main {
            margin-top: 0 !important;
          }
        }
      `}</style>
      <Chatbot 
        products={products} 
        sales={sales} 
        role={role} 
        username={currentUser} 
      />
    </div>
  );
}

const styles = {
  contentInner: {
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
    paddingBottom: '3rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-primary)',
    gap: '0.75rem',
  },
  loadingTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    fontWeight: '800',
    marginTop: '1.5rem',
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '500',
  },
  fallbackNotice: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    marginTop: '0.5rem',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid var(--color-border)',
    borderTop: '4px solid var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto 1rem auto',
    padding: '0 0.5rem',
  },
  onlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-light)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-success)',
    boxShadow: '0 0 8px var(--color-success)',
    animation: 'pulseGlow 2s infinite',
  },
  offlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-warning)',
    backgroundColor: 'var(--color-warning-light)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  offlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-warning)',
    boxShadow: '0 0 8px var(--color-warning)',
    animation: 'pulseGlow 2s infinite',
  },
  restrictedText: {
    padding: '3rem',
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--color-danger)',
  }
};
