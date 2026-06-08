import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  X, 
  AlertTriangle,
  PackageOpen,
  Sparkles,
  Building2
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useRef } from 'react';
import { motion } from 'framer-motion';

export default function Inventory({ products, setProducts, categories, storeSettings, role, currentStore, logActivity }) {
  const sym = storeSettings?.currencySymbol || '₹';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All'); // All, In Stock, Low Stock, Out of Stock
  const [expiryFilter, setExpiryFilter] = useState('All'); // All, Expired, Expiring Soon, Safe
 
  // Stock Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProduct, setTransferProduct] = useState('');
  const [transferQty, setTransferQty] = useState(1);
 
  // Barcode Modal state
  const [barcodeViewTarget, setBarcodeViewTarget] = useState(null);
  const barcodeSvgRef = useRef(null);

  // AI Procurement State
  const [recommendations, setRecommendations] = useState([]);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [showRecsPanel, setShowRecsPanel] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form inputs state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    quantity: 0,
    price: 0.0,
    costPrice: 0.0,
    gst: 5.0,
    discount: 0.0,
    minStock: 5,
    mfgDate: '',
    expiryDate: ''
  });

  // Open modal for add or edit
  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        mfgDate: '',
        expiryDate: '',
        ...product 
      });
    } else {
      setEditingProduct(null);
      // Generate a new temporary SKU
      const maxId = products
        .map(p => parseInt(p.id.replace('P', '').replace(/_[AB]$/, ''), 10))
        .filter(n => !isNaN(n))
        .reduce((max, current) => current > max ? current : max, 1000);
      setFormData({
        id: `P${maxId + 1}`,
        name: '',
        category: categories[0] || 'Grocery',
        quantity: 10,
        price: 4.99,
        costPrice: 3.00,
        gst: 5.0,
        discount: 0.0,
        minStock: 5,
        mfgDate: '',
        expiryDate: '',
        barcode: `890123400${maxId + 1}`
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Stock transfer action
  const handleStockTransfer = (e) => {
    e.preventDefault();
    if (!transferProduct || transferQty <= 0) return;
    
    const sourceProd = products.find(p => p.id === transferProduct && p.store === currentStore);
    if (!sourceProd || sourceProd.quantity < transferQty) {
      alert("Insufficient stock in source store.");
      return;
    }
    
    const destStore = currentStore === 'Store A' ? 'Store B' : 'Store A';
    const destSuffix = destStore === 'Store A' ? '_A' : '_B';
    const destId = sourceProd.id.replace(/_[AB]$/, '') + destSuffix;
    
    setProducts(prevProducts => {
      const destProdExists = prevProducts.some(p => p.id === destId);
      
      let nextProducts = prevProducts.map(p => {
        if (p.id === sourceProd.id) {
          return { ...p, quantity: Math.max(0, p.quantity - transferQty) };
        }
        if (p.id === destId) {
          return { ...p, quantity: p.quantity + transferQty };
        }
        return p;
      });
      
      if (!destProdExists) {
        const newDestProd = {
          ...sourceProd,
          id: destId,
          store: destStore,
          quantity: transferQty
        };
        nextProducts.push(newDestProd);
      }
      
      return nextProducts;
    });

    logActivity('STOCK_TRANSFER', `Transferred ${transferQty} units of "${sourceProd.name}" from ${currentStore} to ${destStore}`);
    setShowTransferModal(false);
    setTransferProduct('');
    setTransferQty(1);
    alert(`🎉 Transferred ${transferQty} units of "${sourceProd.name}" successfully!`);
  };

  // Handle CRUD submissions including category-to-vendor mappings
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const resolvedVendor = 
      (formData.category === 'Grocery' || formData.category === 'Beverages') ? 'Apex Grocery' :
      (formData.category === 'Dairy & Eggs') ? 'Apex Fresh' :
      (formData.category === 'Electronics') ? 'Apex Electronics' : 'Apex Apparel';

    const cleanId = formData.id.replace(/_[AB]$/, '');
    const finalProduct = {
      ...formData,
      id: cleanId + (currentStore === 'Store A' ? '_A' : '_B'),
      originalId: cleanId,
      store: currentStore,
      vendor: resolvedVendor
    };

    if (editingProduct) {
      // Edit
      setProducts(prev => 
        prev.map(p => p.id === editingProduct.id ? finalProduct : p)
      );
      logActivity('INVENTORY_EDIT', `Updated catalog details for product "${formData.name}" (${cleanId})`);
    } else {
      // Add
      setProducts(prev => [...prev, finalProduct]);
      logActivity('INVENTORY_ADD', `Added new product "${formData.name}" (${cleanId}) to ${currentStore}`);
    }
    closeModal();
  };

  // Confirm delete
  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Filter products
  const filteredProducts = products.filter(product => {
    if (product.store !== currentStore) {
      return false;
    }
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = 
      selectedCategory === 'All' || product.category === selectedCategory;
      
    let matchesStock = true;
    if (stockFilter === 'In Stock') {
      matchesStock = product.quantity > (storeSettings?.lowStockThreshold || product.minStock);
    } else if (stockFilter === 'Low Stock') {
      matchesStock = product.quantity > 0 && product.quantity <= (storeSettings?.lowStockThreshold || product.minStock);
    } else if (stockFilter === 'Out of Stock') {
      matchesStock = product.quantity === 0;
    }

    let matchesExpiry = true;
    if (product.expiryDate) {
      const isExp = product.expiryDate < today;
      const exp = new Date(product.expiryDate);
      const td = new Date(today);
      const diffDays = Math.ceil((exp - td) / (1000 * 60 * 60 * 24));
      const warningDays = storeSettings?.expiryWarningDays || 30;
      const isSoon = !isExp && diffDays <= warningDays;

      if (expiryFilter === 'Expired') {
        matchesExpiry = isExp;
      } else if (expiryFilter === 'Expiring Soon') {
        matchesExpiry = isSoon;
      } else if (expiryFilter === 'Safe') {
        matchesExpiry = !isExp && !isSoon;
      }
    } else {
      if (expiryFilter !== 'All' && expiryFilter !== 'Safe') {
        matchesExpiry = false; // non-perishable can only be safe or all
      }
    }

    return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
  });

  // AI Restock Recommendation via Gemini connection
  const handleGenerateAIProcurement = async () => {
    setIsGeneratingRecs(true);
    setShowRecsPanel(true);
    
    // Filter products that are low stock or out of stock
    const lowStockItems = products.filter(p => p.quantity <= (storeSettings?.lowStockThreshold || p.minStock));
    if (lowStockItems.length === 0) {
      alert("All products are sufficiently stocked! No AI Restock procurement needed.");
      setIsGeneratingRecs(false);
      setShowRecsPanel(false);
      return;
    }

    const lowStockData = lowStockItems.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      qty: p.quantity,
      minStock: p.minStock,
      vendor: p.vendor || 'General'
    }));

    const prompt = `
Analyze this list of low-stock supermarket products. Recommend standard replenishment restock order quantities (as integer values) to bring them safely back into stock (at least twice their minStock limit).
Return the results ONLY as a valid JSON array of objects. Do not include markdown code fences (like \`\`\`json) or any explanations, just raw JSON array.
Each object must have exactly these fields: "id", "name", "qty" (current quantity), and "recommendation" (restock quantity as integer).

Low Stock Products Data:
${JSON.stringify(lowStockData, null, 2)}
`;

    // Model chain — gemini-1.5-flash is deprecated
    const MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    // Offline fallback: generate rule-based restock recommendations locally
    const generateOfflineProcurement = () => {
      return lowStockItems.map(p => ({
        id: p.id,
        name: p.name,
        qty: p.quantity,
        recommendation: Math.max(p.minStock * 2 - p.quantity, p.minStock)
      }));
    };

    try {
      const apiKey = storeSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey || apiKey.includes('placeholder') || !navigator.onLine) {
        // Use offline fallback directly
        setRecommendations(generateOfflineProcurement());
        return;
      }

      let parsed = null;
      let lastErr = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
              }),
              signal: AbortSignal.timeout(15000)
            }
          );

          if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            const msg = errorJson?.error?.message || `HTTP ${response.status}`;
            console.warn(`[Inventory] Model ${modelName} failed: ${msg}`);
            lastErr = new Error(msg);
            continue;
          }

          const resData = await response.json();
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanJson);
          console.log(`[Inventory] ✅ AI procurement success with ${modelName}`);
          break;
        } catch (fetchErr) {
          console.warn(`[Inventory] ${modelName} error:`, fetchErr.message);
          lastErr = fetchErr;
          if (fetchErr.name === 'TypeError' || fetchErr.name === 'AbortError') break;
        }
      }

      if (parsed) {
        setRecommendations(parsed);
      } else {
        console.warn('[Inventory] All models failed, using offline fallback. Last error:', lastErr?.message);
        setRecommendations(generateOfflineProcurement());
      }
    } catch (err) {
      console.error('Gemini AI procurement error:', err);
      // Use offline fallback on any error
      setRecommendations(generateOfflineProcurement());
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={styles.container}
    >
      <motion.div variants={itemVariants} style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Inventory Catalog</h1>
          <p style={styles.pageSubtitle}>Manage items, stocks levels, and store retail values.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {role === 'admin' && (
            <>
              <button onClick={() => setShowTransferModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                <Building2 size={16} />
                <span>Transfer Stock</span>
              </button>
              <button onClick={handleGenerateAIProcurement} className="btn btn-success" style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                <Sparkles size={16} />
                <span>AI Restock Draft</span>
              </button>
              <button onClick={() => openModal()} style={styles.addBtn} className="btn btn-primary">
                <Plus size={18} />
                <span>Add New Product</span>
              </button>
            </>
          )}
          {role !== 'admin' && (
            <span style={styles.readOnlyBadge}>👁️ View Only</span>
          )}
        </div>
      </motion.div>

      {/* Filter Toolbar */}
      <motion.div variants={itemVariants} style={styles.filterRow} className="glass">
        {/* Search */}
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by SKU or Product Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            className="input-field"
          />
        </div>

        {/* Category Filter */}
        <div style={styles.filterGroup}>
          <Filter size={16} color="var(--color-text-muted)" />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.select}
            className="select-field"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Stock Level Filter */}
        <div style={styles.filterGroup}>
          <select 
            value={stockFilter} 
            onChange={(e) => setStockFilter(e.target.value)}
            style={styles.select}
            className="select-field"
          >
            <option value="All">All Stock Levels</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {/* Expiry Status Filter */}
        <div style={styles.filterGroup}>
          <select 
            value={expiryFilter} 
            onChange={(e) => setExpiryFilter(e.target.value)}
            style={styles.select}
            className="select-field"
          >
            <option value="All">All Expiry Status</option>
            <option value="Expired">Expired</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Safe">Safe / No Expiry</option>
          </select>
        </div>
      </motion.div>

      {/* Catalog Table */}
      <motion.div variants={itemVariants} style={styles.tableCard} className="card">
        {filteredProducts.length === 0 ? (
          <div style={styles.emptyCatalog}>
            <PackageOpen size={48} color="var(--color-text-muted)" />
            <p style={styles.emptyText}>No products match the selected criteria.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>SKU</th>
                  <th style={styles.th}>Barcode</th>
                  <th style={styles.th}>Product Details</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Stock Status</th>
                  <th style={styles.th}>Cost Price</th>
                  <th style={styles.th}>Selling Price</th>
                  <th style={styles.th}>GST/Discount</th>
                  <th style={styles.th}>Profit Margin</th>
                  <th style={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isLow = p.quantity <= (storeSettings?.lowStockThreshold || p.minStock) && p.quantity > 0;
                  const isOut = p.quantity === 0;
                  const margin = p.price - p.costPrice;
                  const marginPercent = p.costPrice > 0 ? Math.round((margin / p.costPrice) * 100) : 0;
                  
                  // Expiry calculations
                  let expiryBadge = null;
                  if (p.expiryDate) {
                    if (p.expiryDate < today) {
                      expiryBadge = <span className="badge badge-danger" style={{ marginTop: '0.2rem', fontSize: '0.65rem' }}>Expired</span>;
                    } else {
                      const exp = new Date(p.expiryDate);
                      const td = new Date(today);
                      const diffTime = exp - td;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      const warningDays = storeSettings?.expiryWarningDays || 30;
                      if (diffDays <= warningDays) {
                        expiryBadge = <span className="badge badge-warning" style={{ marginTop: '0.2rem', fontSize: '0.65rem' }}>Expiring (<span className="font-mono">{diffDays}d</span>)</span>;
                      }
                    }
                  }
                  
                  return (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.tdSku} className="font-mono">{p.id.replace(/_[AB]$/, '')}</td>
                      <td style={styles.tdSku}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem' }} className="font-mono">{p.barcode || 'N/A'}</span>
                          {p.barcode && (
                            <button 
                              onClick={() => {
                                setBarcodeViewTarget(p);
                                setTimeout(() => {
                                  if (barcodeSvgRef.current) {
                                    JsBarcode(barcodeSvgRef.current, p.barcode, {
                                      format: "CODE128",
                                      width: 1.5,
                                      height: 40,
                                      displayValue: true,
                                      fontSize: 10,
                                      background: "transparent",
                                      lineColor: "#000"
                                    });
                                  }
                                }, 100);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer' }}
                              title="View & Print Barcode"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={styles.tdDetails}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={styles.prodName}>{p.name}</span>
                          {p.expiryDate && (
                            <div style={styles.dateAlerts}>
                              <span style={styles.mfgLabel} className="font-mono">Mfg: {p.mfgDate || 'N/A'}</span>
                              <span style={styles.expiryLabel} className="font-mono"> • Exp: {p.expiryDate}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.tdCategory}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span>{p.category}</span>
                          {p.vendor && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                              {p.vendor}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.tdStock}>
                        <div style={styles.stockStatus}>
                          <span style={styles.stockNumber} className="font-mono">{p.quantity} units</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-start' }}>
                            {isOut ? (
                              <span className="badge badge-danger">Out of Stock</span>
                            ) : isLow ? (
                              <span className="badge badge-warning">Low Stock</span>
                            ) : (
                              <span className="badge badge-success">In Stock</span>
                            )}
                            {expiryBadge}
                          </div>
                        </div>
                      </td>
                      <td style={styles.tdPrice} className="font-mono">{sym}{p.costPrice.toFixed(2)}</td>
                      <td style={styles.tdPrice} className="font-mono">{sym}{p.price.toFixed(2)}</td>
                      <td style={styles.tdTax}>
                        <div style={styles.taxCapsules}>
                          <span style={styles.taxBadge} className="font-mono">GST: {p.gst}%</span>
                          {p.discount > 0 && <span style={styles.discBadge} className="font-mono">Disc: {p.discount}%</span>}
                        </div>
                      </td>
                      <td style={styles.tdMargin}>
                        <span style={{ 
                          ...styles.marginVal, 
                          color: marginPercent > 40 ? 'var(--color-success)' : marginPercent > 15 ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                        }} className="font-mono">
                          +{sym}{margin.toFixed(2)} ({marginPercent}%)
                        </span>
                      </td>
                      <td style={styles.tdActions}>
                        {role === 'admin' ? (
                          <div style={styles.actionButtons}>
                            <button 
                              onClick={() => openModal(p)} 
                              style={styles.editBtn} 
                              title="Edit details"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setDeleteTarget(p)} 
                              style={styles.deleteBtn} 
                              title="Delete product"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span style={styles.viewOnlyCell}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} className="glass animate-slide">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingProduct ? 'Update Inventory Item' : 'New Catalog Item'}</h2>
              <button onClick={closeModal} style={styles.modalClose}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                {/* SKU */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Product SKU</label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled
                    style={styles.disabledInput}
                    className="input-field"
                  />
                </div>

                {/* Name */}
                <div style={styles.formGroupFull}>
                  <label style={styles.formLabel}>Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name (e.g. Organic Strawberries)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={styles.formInput}
                    className="input-field"
                    autoFocus
                  />
                </div>

                {/* Category */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={styles.formSelect}
                    className="select-field"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Initial Quantity */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>

                {/* Cost Price */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Cost Price ({sym})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>

                {/* Selling Price */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Selling Price ({sym})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>

                {/* GST Rate */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Tax (GST %)</label>
                  <select
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: parseFloat(e.target.value) })}
                    style={styles.formSelect}
                    className="select-field"
                  >
                    <option value={0}>0% Tax (Exempt)</option>
                    <option value={5}>5% Tax (Grocery/Essentials)</option>
                    <option value={12}>12% Tax (Standard Foods)</option>
                    <option value={18}>18% Tax (Soft drinks/Electronics)</option>
                  </select>
                </div>

                {/* Discount Rate */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Default Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>

                {/* Min Stock Limit */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Low Stock Alert Limit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 1 })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>
 
                {/* Barcode / EAN */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Barcode / EAN</label>
                  <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 8901234..."
                      value={formData.barcode || ''}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      style={{ ...styles.formInput, flex: 1, minWidth: 0 }}
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = '8901234' + Math.floor(100000 + Math.random() * 900000);
                        setFormData({ ...formData, barcode: randomCode });
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0 0.5rem', fontSize: '0.75rem', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Auto-generate barcode"
                    >
                      Gen
                    </button>
                  </div>
                </div>

                {/* Mfg Date */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Mfg Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.mfgDate || ''}
                    onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>

                {/* Expiry Date */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    style={styles.formInput}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={closeModal} style={styles.modalCancelBtn} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" style={styles.modalSaveBtn} className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Overlay */}
      {deleteTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.alertCard} className="glass glow animate-slide">
            <div style={styles.alertHeader}>
              <AlertTriangle size={36} color="var(--color-danger)" />
              <h2 style={styles.alertTitle}>Remove Catalog Item?</h2>
            </div>
            <p style={styles.alertText}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.id})? This action cannot be undone and will delete all references from stock systems.
            </p>
            <div style={styles.alertFooter}>
              <button onClick={() => setDeleteTarget(null)} style={styles.modalCancelBtn} className="btn btn-secondary">
                No, Keep Product
              </button>
              <button onClick={handleDeleteConfirm} style={styles.deleteConfirmBtn} className="btn btn-danger">
                Yes, Delete SKU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Procurement Purchase Draft Modal Overlay */}
      {showRecsPanel && (
        <div style={styles.recsOverlay}>
          <div style={styles.recsCard} className="card glow animate-slide">
            <div style={styles.recsHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--color-success)" />
                <h3 style={styles.recsTitle}>AI Procurement Restock Order</h3>
              </div>
              <button onClick={() => setShowRecsPanel(false)} style={styles.closeRecsBtn}>×</button>
            </div>
            
            {isGeneratingRecs ? (
              <div style={styles.recsLoader}>
                <div style={{ ...styles.spinner, animation: 'spin 1s linear infinite' }} />
                <p style={{ fontWeight: '600' }}>Drafting restock guidelines with Gemini AI...</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', textAlign: 'left' }}>
                  Gemini analyzed low-stock SKUs against safety margins. Review the proposed replenishment plan:
                </p>
                <div style={styles.recsList}>
                  <table style={styles.recsTable}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)' }}>SKU</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)' }}>PRODUCT</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)', textAlign: 'center' }}>STOCK</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)', textAlign: 'right' }}>RESTOCK VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map(rec => (
                        <tr key={rec.id} style={{ borderBottom: '1px dashed var(--color-border)', fontSize: '0.8125rem' }}>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{rec.id}</td>
                          <td style={{ padding: '0.5rem', fontWeight: '600' }}>{rec.name}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '700' }}>{rec.qty}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--color-success)', fontWeight: '800' }}>+{rec.recommendation} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={styles.recsFooter}>
                  <button 
                    onClick={() => {
                      setProducts(prevProducts => 
                        prevProducts.map(p => {
                          const rec = recommendations.find(r => r.id === p.id);
                          if (rec) {
                            return {
                              ...p,
                              quantity: p.quantity + (parseInt(rec.recommendation, 10) || 0)
                            };
                          }
                          return p;
                        })
                      );
                      setShowRecsPanel(false);
                      alert("🎉 AI procurement restocks approved! Catalog items successfully replenished.");
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    Execute AI Procurement Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '440px' }} className="glass animate-slide">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Stock Transfer between Stores</h2>
              <button onClick={() => setShowTransferModal(false)} style={styles.modalClose}>×</button>
            </div>
            
            <form onSubmit={handleStockTransfer} style={styles.form}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Select Product to Transfer</label>
                  <select
                    value={transferProduct}
                    onChange={(e) => setTransferProduct(e.target.value)}
                    required
                    className="select-field"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">-- Select Product --</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Qty: {p.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.formLabel}>Source Store</label>
                    <input type="text" value={currentStore} disabled style={styles.disabledInput} className="input-field" />
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.formLabel}>Destination Store</label>
                    <input type="text" value={currentStore === 'Store A' ? 'Store B' : 'Store A'} disabled style={styles.disabledInput} className="input-field" />
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Transfer Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={transferProduct ? (products.find(p => p.id === transferProduct && p.store === currentStore)?.quantity || 1) : 1}
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value, 10) || 1)}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!transferProduct}>
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode View & Print Modal */}
      {barcodeViewTarget && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '380px', textAlign: 'center' }} className="glass animate-slide">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Product Barcode</h2>
              <button onClick={() => setBarcodeViewTarget(null)} style={styles.modalClose}>×</button>
            </div>
            <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
              <h4 style={{ color: '#000', margin: 0, fontWeight: '800', fontSize: '1rem' }}>{barcodeViewTarget.name}</h4>
              <svg ref={barcodeSvgRef}></svg>
              <span style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>SKU: {barcodeViewTarget.id.replace(/_[AB]$/, '')}</span>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>
                Print Barcode Label
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  addBtn: {
    padding: '0.65rem 1.25rem',
  },
  readOnlyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.85rem',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
  },
  viewOnlyCell: {
    display: 'block',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '1rem',
  },
  filterRow: {
    display: 'flex',
    gap: '1rem',
    padding: '1.25rem',
    borderRadius: 'var(--radius-lg)',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '260px',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '2.75rem',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '160px',
  },
  select: {
    padding: '0.5rem 1rem',
    height: '42px',
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    backgroundColor: 'var(--color-bg-base)',
    borderBottom: '1px solid var(--color-border)',
  },
  th: {
    padding: '1rem 1.25rem',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  thActions: {
    padding: '1rem 1.25rem',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'right',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
    transition: 'background-color 0.15s ease',
  },
  tdSku: {
    padding: '1rem 1.25rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  tdDetails: {
    padding: '1rem 1.25rem',
  },
  prodName: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
  },
  tdCategory: {
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
  },
  tdStock: {
    padding: '1rem 1.25rem',
  },
  stockStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  stockNumber: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  tdPrice: {
    padding: '1rem 1.25rem',
    fontWeight: '700',
    fontSize: '0.875rem',
  },
  tdTax: {
    padding: '1rem 1.25rem',
  },
  taxCapsules: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  taxBadge: {
    display: 'inline-flex',
    fontSize: '0.6875rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    width: 'fit-content',
  },
  discBadge: {
    display: 'inline-flex',
    fontSize: '0.6875rem',
    fontWeight: '700',
    color: 'var(--color-danger)',
    backgroundColor: 'var(--color-danger-light)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    width: 'fit-content',
  },
  tdMargin: {
    padding: '1rem 1.25rem',
  },
  marginVal: {
    fontSize: '0.8125rem',
    fontWeight: '700',
  },
  tdActions: {
    padding: '1rem 1.25rem',
    textAlign: 'right',
  },
  actionButtons: {
    display: 'inline-flex',
    gap: '0.5rem',
  },
  editBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '6px',
    backgroundColor: 'var(--color-primary-light)',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s ease',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '6px',
    backgroundColor: 'var(--color-danger-light)',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s ease',
  },
  emptyCatalog: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '4rem 0',
    color: 'var(--color-text-muted)',
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(5px)',
    padding: '1.5rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '680px',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid var(--color-border)',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  formGroupFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    gridColumn: 'span 2',
  },
  formLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  formInput: {
    width: '100%',
  },
  disabledInput: {
    width: '100%',
    cursor: 'not-allowed',
    opacity: 0.75,
  },
  formSelect: {
    width: '100%',
    height: '46px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1.5rem',
    marginTop: '0.5rem',
  },
  modalCancelBtn: {
    padding: '0.65rem 1.25rem',
  },
  modalSaveBtn: {
    padding: '0.65rem 1.5rem',
  },
  alertCard: {
    width: '100%',
    maxWidth: '440px',
    padding: '2rem',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1.25rem',
    boxShadow: 'var(--shadow-lg)',
  },
  alertHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  alertTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
  },
  alertText: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.6',
  },
  alertFooter: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
    justifyContent: 'center',
    marginTop: '0.5rem',
  },
  deleteConfirmBtn: {
    padding: '0.65rem 1.25rem',
  },
  dateAlerts: {
    display: 'flex',
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.15rem',
    fontWeight: '600',
  },
  mfgLabel: {
    fontStyle: 'normal',
  },
  expiryLabel: {
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
  },
  recsOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  recsCard: {
    width: '100%',
    maxWidth: '540px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  recsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  recsTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
  },
  closeRecsBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
  },
  recsLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 0',
    gap: '1rem',
    color: 'var(--color-text-secondary)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
  },
  recsList: {
    maxHeight: '320px',
    overflowY: 'auto',
    marginBottom: '1.5rem',
  },
  recsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  recsFooter: {
    marginTop: 'auto',
  }
};

