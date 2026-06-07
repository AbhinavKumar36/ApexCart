import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { INITIAL_PRODUCTS, CATEGORIES, DEFAULT_SUPPLIERS, generateMockSales } from './data/mockData';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import History from './components/History';
import Settings from './components/Settings';
import Chatbot from './components/Chatbot';
import Reports from './components/Reports';
import Suppliers from './components/Suppliers';

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [role, setRole] = useState('employee'); // default role: employee
  const [vendor, setVendor] = useState('all'); // default vendor stall: all
  
  // Database states
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [currentStore, setCurrentStore] = useState(() => {
    return localStorage.getItem('apexcart_current_store') || 'Store A';
  });

  useEffect(() => {
    localStorage.setItem('apexcart_current_store', currentStore);
  }, [currentStore]);

  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('apexcart_settings');
    return saved ? JSON.parse(saved) : {
      storeName: "ApexCart Supermarket",
      storeAddress: "123 Galleria Mall, Cyber City",
      storePhone: "+1 (555) 019-2834",
      currencySymbol: "$",
      lowStockThreshold: 10,
      expiryWarningDays: 30,
      geminiApiKey: ""
    };
  });
  
  // Connection & loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Offline Sync Queue State
  const [offlineSyncQueue, setOfflineSyncQueue] = useState(() => {
    const saved = localStorage.getItem('apexcart_sync_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // Theme states (local to client device)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apexcart_theme') || 'dark';
  });

  // Navigation states
  const [activeTab, setActiveTab] = useState('dashboard');

  // Reconnect & Sync offline queue function
  const processOfflineSyncQueue = async (currentQueue = offlineSyncQueue) => {
    if (currentQueue.length === 0) return;
    
    console.log("ApexCart Sync: Processing offline sync queue. Actions:", currentQueue.length);
    setIsLoading(true);

    try {
      for (const action of currentQueue) {
        if (action.type === 'ADD_SALE') {
          const { id, ...data } = action.data;
          await setDoc(doc(db, 'sales', id), data);
        } else if (action.type === 'SYNC_PRODUCTS') {
          for (const p of action.data) {
            const { id, ...data } = p;
            await setDoc(doc(db, 'products', id), data);
          }
        } else if (action.type === 'SYNC_SETTINGS') {
          await setDoc(doc(db, 'settings', 'general'), action.data);
        }
      }

      setOfflineSyncQueue([]);
      localStorage.removeItem('apexcart_sync_queue');
      alert(`🎉 Database Restored: Synchronized ${currentQueue.length} offline ledger actions back to Cloud Firestore!`);
    } catch (err) {
      console.error("ApexCart Sync: Firestore sync error:", err);
      alert("Failed syncing some offline records. They will remain in queue until connection completes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reconnection and online status listeners
  useEffect(() => {
    const handleOnlineStatus = () => {
      if (navigator.onLine) {
        setIsOfflineMode(false);
        // Delay slightly to let connection establish, then process
        setTimeout(() => {
          const savedQueue = localStorage.getItem('apexcart_sync_queue');
          const q = savedQueue ? JSON.parse(savedQueue) : [];
          if (q.length > 0) {
            processOfflineSyncQueue(q);
          }
        }, 1500);
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    return () => window.removeEventListener('online', handleOnlineStatus);
  }, [offlineSyncQueue]);

  // Auth observer and collection snapshots initialization
  useEffect(() => {
    let unsubProducts = () => {};
    let unsubSales = () => {};
    let unsubSettings = () => {};
    let unsubSuppliers = () => {};
    let unsubPOs = () => {};
    let unsubLogs = () => {};
    let connectionTimeout;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Clear timeout if user auth is evaluated
      clearTimeout(connectionTimeout);

      if (user) {
        setCurrentUser(user.email);
        setIsAuthenticated(true);
        setIsLoading(true);
        setIsOfflineMode(false);

        // 1. Fetch User Role & Stall Vendor from Firestore 'users' collection
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // Normalize legacy 'staff' → 'employee'
            const rawRole = userDoc.data().role || 'employee';
            setRole(rawRole === 'staff' ? 'employee' : rawRole);
            setVendor(userDoc.data().vendor || 'all');
          } else {
            // Seeding user document based on email prefix (admin@ vs employee@)
            const assignedRole = user.email.startsWith('admin') ? 'admin' : 'employee';
            let assignedVendor = 'all';
            if (user.email.startsWith('grocery_staff')) assignedVendor = 'Apex Grocery';
            else if (user.email.startsWith('fresh_staff')) assignedVendor = 'Apex Fresh';

            await setDoc(userDocRef, {
              email: user.email,
              role: assignedRole,
              vendor: assignedVendor,
              createdAt: new Date().toISOString()
            });
            setRole(assignedRole);
            setVendor(assignedVendor);
          }
        } catch (err) {
          console.warn("Failed fetching live user role. Defaulting based on email prefix:", err);
          const rawRole2 = user.email.startsWith('admin') ? 'admin' : 'employee';
          setRole(rawRole2);
          let assignedVendor = 'all';
          if (user.email.startsWith('grocery_staff')) assignedVendor = 'Apex Grocery';
          else if (user.email.startsWith('fresh_staff')) assignedVendor = 'Apex Fresh';
          setVendor(assignedVendor);
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
            // Seed initial database products catalog to Firestore for Store A and Store B
            const seededProducts = [];
            INITIAL_PRODUCTS.forEach(p => {
              const pA = {
                ...p,
                id: p.id + '_A',
                originalId: p.id,
                store: 'Store A'
              };
              const pB = {
                ...p,
                id: p.id + '_B',
                originalId: p.id,
                store: 'Store B',
                quantity: Math.max(1, Math.round(p.quantity * 0.7))
              };
              seededProducts.push(pA, pB);
            });
            
            seededProducts.forEach(async (p) => {
              await setDoc(doc(db, 'products', p.id), p);
            });

            // Seed dynamic daily transactions history
            const generatedSales = generateMockSales(seededProducts);
            generatedSales.forEach(async (s) => {
              await setDoc(doc(db, 'sales', s.id), s);
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

        // 4. Sync Settings Document via Firestore Snapshot
        unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
          if (docSnap.exists()) {
            const settingsData = docSnap.data();
            setStoreSettings(settingsData);
            localStorage.setItem('apexcart_settings', JSON.stringify(settingsData));
          } else {
            const defaultSettings = {
              storeName: "ApexCart Supermarket",
              storeAddress: "123 Galleria Mall, Cyber City",
              storePhone: "+1 (555) 019-2834",
              currencySymbol: "$",
              lowStockThreshold: 10,
              expiryWarningDays: 30,
              geminiApiKey: ""
            };
            setDoc(doc(db, 'settings', 'general'), defaultSettings);
          }
        }, (error) => {
          console.error("Settings Firestore sync error:", error);
        });

        // 5. Sync Suppliers
        unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
          const items = [];
          snapshot.forEach(docSnap => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          if (items.length > 0) {
            setSuppliers(items);
            localStorage.setItem('apexcart_suppliers', JSON.stringify(items));
          } else {
            DEFAULT_SUPPLIERS.forEach(async (s) => {
              await setDoc(doc(db, 'suppliers', s.id), s);
            });
          }
        }, (error) => {
          console.error("Suppliers sync error:", error);
        });

        // 6. Sync Purchase Orders
        unsubPOs = onSnapshot(collection(db, 'purchaseOrders'), (snapshot) => {
          const items = [];
          snapshot.forEach(docSnap => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          setPurchaseOrders(items);
          localStorage.setItem('apexcart_pos', JSON.stringify(items));
        }, (error) => {
          console.error("POs sync error:", error);
        });

        // 7. Sync Activity Logs
        unsubLogs = onSnapshot(collection(db, 'activityLogs'), (snapshot) => {
          const items = [];
          snapshot.forEach(docSnap => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setActivityLogs(items.slice(0, 100));
          localStorage.setItem('apexcart_activity_logs', JSON.stringify(items.slice(0, 100)));
        }, (error) => {
          console.error("Logs sync error:", error);
        });

      } else {
        // Logged out
        setIsAuthenticated(false);
        setCurrentUser('');
        setRole('employee');
        setVendor('all');
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

      const savedSuppliers = localStorage.getItem('apexcart_suppliers');
      setSuppliers(savedSuppliers ? JSON.parse(savedSuppliers) : DEFAULT_SUPPLIERS);

      const savedPOs = localStorage.getItem('apexcart_pos');
      setPurchaseOrders(savedPOs ? JSON.parse(savedPOs) : []);

      const savedLogs = localStorage.getItem('apexcart_activity_logs');
      setActivityLogs(savedLogs ? JSON.parse(savedLogs) : []);

      const savedSettings = localStorage.getItem('apexcart_settings');
      setStoreSettings(savedSettings ? JSON.parse(savedSettings) : {
        storeName: "ApexCart Supermarket",
        storeAddress: "123 Galleria Mall, Cyber City",
        storePhone: "+1 (555) 019-2834",
        currencySymbol: "$",
        lowStockThreshold: 10,
        expiryWarningDays: 30,
        geminiApiKey: ""
      });
      setVendor('all');

      setIsLoading(false);
    }, 4000);

    return () => {
      clearTimeout(connectionTimeout);
      unsubAuth();
      unsubProducts();
      unsubSales();
      unsubSettings();
      unsubSuppliers();
      unsubPOs();
      unsubLogs();
    };
  }, []);

  // Handle successful login (called when credentials resolve)
  const handleLoginSuccess = async (user) => {
    // If sign-in resolved locally in offline mode
    if (user.isOffline) {
      setCurrentUser(user.email);
      setRole(user.email.startsWith('admin') ? 'admin' : 'employee');
      let assignedVendor = 'all';
      if (user.email.startsWith('grocery_staff')) assignedVendor = 'Apex Grocery';
      else if (user.email.startsWith('fresh_staff')) assignedVendor = 'Apex Fresh';
      setVendor(assignedVendor);
      
      setIsAuthenticated(true);
      setIsOfflineMode(true);

      const savedProducts = localStorage.getItem('apexcart_products');
      let productsList = [];
      if (savedProducts) {
        productsList = JSON.parse(savedProducts);
      } else {
        INITIAL_PRODUCTS.forEach(p => {
          productsList.push({ ...p, id: p.id + '_A', originalId: p.id, store: 'Store A' });
          productsList.push({ ...p, id: p.id + '_B', originalId: p.id, store: 'Store B', quantity: Math.max(1, Math.round(p.quantity * 0.7)) });
        });
        localStorage.setItem('apexcart_products', JSON.stringify(productsList));
      }
      setProducts(productsList);

      const savedSales = localStorage.getItem('apexcart_sales');
      let salesList = [];
      if (savedSales) {
        salesList = JSON.parse(savedSales);
      } else {
        salesList = generateMockSales(productsList);
        localStorage.setItem('apexcart_sales', JSON.stringify(salesList));
      }
      setSales(salesList);
      
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

  const logActivity = async (action, details) => {
    const logId = 'L' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      user: currentUser || 'System',
      action,
      details,
      store: currentStore
    };
    if (!isOfflineMode) {
      try {
        await setDoc(doc(db, 'activityLogs', logId), newLog);
      } catch (err) {
        console.error("Failed writing audit log to Firestore:", err);
      }
    }
    setActivityLogs(prev => [newLog, ...prev].slice(0, 200));
    const saved = localStorage.getItem('apexcart_activity_logs');
    const logsList = saved ? JSON.parse(saved) : [];
    localStorage.setItem('apexcart_activity_logs', JSON.stringify([newLog, ...logsList].slice(0, 200)));
  };

  const handleSetSuppliers = (updater) => {
    setSuppliers(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('apexcart_suppliers', JSON.stringify(next));
      if (!isOfflineMode) {
        next.forEach(async (s) => {
          const { id, ...data } = s;
          await setDoc(doc(db, 'suppliers', id), data);
        });
        const nextIds = next.map(s => s.id);
        prev.forEach(async (s) => {
          if (!nextIds.includes(s.id)) {
            await deleteDoc(doc(db, 'suppliers', s.id));
          }
        });
      }
      return next;
    });
  };

  const handleSetPurchaseOrders = (updater) => {
    setPurchaseOrders(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('apexcart_pos', JSON.stringify(next));
      if (!isOfflineMode) {
        next.forEach(async (po) => {
          const { id, ...data } = po;
          await setDoc(doc(db, 'purchaseOrders', id), data);
        });
        const nextIds = next.map(po => po.id);
        prev.forEach(async (po) => {
          if (!nextIds.includes(po.id)) {
            await deleteDoc(doc(db, 'purchaseOrders', po.id));
          }
        });
      }
      return next;
    });
  };

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
      } else {
        // Queue sync products
        setOfflineSyncQueue(prevQueue => {
          const filtered = prevQueue.filter(item => item.type !== 'SYNC_PRODUCTS');
          const nextQueue = [...filtered, { type: 'SYNC_PRODUCTS', data: next }];
          localStorage.setItem('apexcart_sync_queue', JSON.stringify(nextQueue));
          return nextQueue;
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
      } else {
        // Queue add sale
        setOfflineSyncQueue(prevQueue => {
          const nextQueue = [...prevQueue, { type: 'ADD_SALE', data: next[next.length - 1] }];
          localStorage.setItem('apexcart_sync_queue', JSON.stringify(nextQueue));
          return nextQueue;
        });
      }
      return next;
    });
  };

  const handleSetStoreSettings = (nextSettings) => {
    setStoreSettings(nextSettings);
    localStorage.setItem('apexcart_settings', JSON.stringify(nextSettings));
    
    if (!isOfflineMode) {
      setDoc(doc(db, 'settings', 'general'), nextSettings).catch(err => 
        console.error("Settings Firestore sync error:", err)
      );
    } else {
      // Queue settings change
      setOfflineSyncQueue(prevQueue => {
        const filtered = prevQueue.filter(item => item.type !== 'SYNC_SETTINGS');
        const nextQueue = [...filtered, { type: 'SYNC_SETTINGS', data: nextSettings }];
        localStorage.setItem('apexcart_sync_queue', JSON.stringify(nextQueue));
        return nextQueue;
      });
    }
  };

  // Handle logout
  const handleLogout = () => {
    signOut(auth).catch(err => console.error("Signout error:", err));
    setIsAuthenticated(false);
    setCurrentUser('');
    setRole('employee');
    setVendor('all');
    setActiveTab('dashboard');
  };

  // Toggle light/dark mode
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Danger actions reset methods
  const handleResetData = async () => {
    const doubledProducts = [];
    INITIAL_PRODUCTS.forEach(p => {
      doubledProducts.push({ ...p, id: p.id + '_A', originalId: p.id, store: 'Store A' });
      doubledProducts.push({ ...p, id: p.id + '_B', originalId: p.id, store: 'Store B', quantity: Math.max(1, Math.round(p.quantity * 0.7)) });
    });

    const generatedSales = generateMockSales(doubledProducts);

    localStorage.setItem('apexcart_products', JSON.stringify(doubledProducts));
    localStorage.setItem('apexcart_sales', JSON.stringify(generatedSales));
    localStorage.setItem('apexcart_suppliers', JSON.stringify(DEFAULT_SUPPLIERS));
    localStorage.setItem('apexcart_pos', JSON.stringify([]));
    localStorage.setItem('apexcart_activity_logs', JSON.stringify([]));

    setProducts(doubledProducts);
    setSales(generatedSales);
    setSuppliers(DEFAULT_SUPPLIERS);
    setPurchaseOrders([]);
    setActivityLogs([]);

    if (!isOfflineMode) {
      products.forEach(async (p) => {
        await deleteDoc(doc(db, 'products', p.id));
      });
      for (const p of doubledProducts) {
        await setDoc(doc(db, 'products', p.id), p);
      }
      sales.forEach(async (s) => {
        await deleteDoc(doc(db, 'sales', s.id));
      });
      for (const s of generatedSales) {
        await setDoc(doc(db, 'sales', s.id), s);
      }
      suppliers.forEach(async (s) => {
        await deleteDoc(doc(db, 'suppliers', s.id));
      });
      DEFAULT_SUPPLIERS.forEach(async (s) => {
        await setDoc(doc(db, 'suppliers', s.id), s);
      });
      purchaseOrders.forEach(async (po) => {
        await deleteDoc(doc(db, 'purchaseOrders', po.id));
      });
      activityLogs.forEach(async (log) => {
        await deleteDoc(doc(db, 'activityLogs', log.id));
      });
    }
    
    await logActivity('DATABASE_RESET', 'Database was reset to default mock items for Store A & B');
    alert('System catalog and suppliers reset to default items.');
  };

  const handleClearData = async () => {
    localStorage.setItem('apexcart_products', JSON.stringify([]));
    localStorage.setItem('apexcart_sales', JSON.stringify([]));
    localStorage.setItem('apexcart_suppliers', JSON.stringify([]));
    localStorage.setItem('apexcart_pos', JSON.stringify([]));
    localStorage.setItem('apexcart_activity_logs', JSON.stringify([]));

    setProducts([]);
    setSales([]);
    setSuppliers([]);
    setPurchaseOrders([]);
    setActivityLogs([]);

    if (!isOfflineMode) {
      products.forEach(async (p) => {
        await deleteDoc(doc(db, 'products', p.id));
      });
      sales.forEach(async (s) => {
        await deleteDoc(doc(db, 'sales', s.id));
      });
      suppliers.forEach(async (s) => {
        await deleteDoc(doc(db, 'suppliers', s.id));
      });
      purchaseOrders.forEach(async (po) => {
        await deleteDoc(doc(db, 'purchaseOrders', po.id));
      });
      activityLogs.forEach(async (log) => {
        await deleteDoc(doc(db, 'activityLogs', log.id));
      });
    }
    
    alert('All database catalogs, ledgers, and logs have been purged.');
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
            storeSettings={storeSettings}
            vendor={vendor}
            currentStore={currentStore}
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
            storeSettings={storeSettings}
            vendor={vendor}
            currentStore={currentStore}
            logActivity={logActivity}
          />
        );
      case 'inventory':
        return (
          <Inventory 
            products={products} 
            setProducts={handleSetProducts} 
            categories={CATEGORIES} 
            storeSettings={storeSettings}
            vendor={vendor}
            role={role}
            currentStore={currentStore}
            logActivity={logActivity}
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
            vendor={vendor}
            currentStore={currentStore}
            logActivity={logActivity}
          />
        );
      case 'suppliers':
        return (
          <Suppliers
            products={products}
            setProducts={handleSetProducts}
            suppliers={suppliers}
            setSuppliers={handleSetSuppliers}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={handleSetPurchaseOrders}
            currentStore={currentStore}
            logActivity={logActivity}
            role={role}
            storeSettings={storeSettings}
          />
        );
      case 'reports':
        return (
          <Reports
            products={products}
            sales={sales}
            storeSettings={storeSettings}
            vendor={vendor}
            currentStore={currentStore}
          />
        );
      case 'settings':
        if (role !== 'admin') {
          return <div style={styles.restrictedText}>Restricted Area. Admin privilege required.</div>;
        }
        return (
          <Settings 
            storeSettings={storeSettings} 
            setStoreSettings={handleSetStoreSettings} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            onResetData={handleResetData} 
            onClearData={handleClearData} 
            onImportData={handleImportData}
            products={products}
            sales={sales}
            activityLogs={activityLogs}
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
        vendor={vendor}
        currentStore={currentStore}
        setCurrentStore={setCurrentStore}
      />
      <main className="main-content" style={{ marginTop: '60px' /* offset mobile header height */ }}>
        {/* Sync Status Badge Indicator */}
        <div style={styles.statusRow}>
          {isOfflineMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={styles.offlineBadge}>
                <span style={styles.offlineDot} />
                <span>Offline Cache Mode (LocalStorage Active)</span>
              </div>
              {offlineSyncQueue.length > 0 && (
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>
                  ({offlineSyncQueue.length} pending updates)
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={styles.onlineBadge}>
                <span style={styles.onlineDot} />
                <span>Firebase Cloud Firestore Synced</span>
              </div>
              {offlineSyncQueue.length > 0 && (
                <button 
                  onClick={() => processOfflineSyncQueue()}
                  className="btn btn-warning" 
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                >
                  Sync Queue ({offlineSyncQueue.length} items)
                </button>
              )}
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
        vendor={vendor}
        storeSettings={storeSettings}
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
