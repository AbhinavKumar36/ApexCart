import React, { useState } from 'react';
import { 
  Truck, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Calendar, 
  DollarSign, 
  ClipboardList, 
  X,
  AlertTriangle
} from 'lucide-react';

export default function Suppliers({ 
  products, 
  setProducts, 
  suppliers, 
  setSuppliers, 
  purchaseOrders, 
  setPurchaseOrders, 
  currentStore, 
  logActivity, 
  role,
  storeSettings
}) {
  const [activeTab, setActiveTab] = useState('directory'); // directory, pos, create_po
  const sym = storeSettings?.currencySymbol || '$';

  // Supplier Form State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierFormData, setSupplierFormData] = useState({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  // Create PO Form State
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState([]); // [{ id, name, qty, costPrice }]
  const [tempProduct, setTempProduct] = useState('');
  const [tempQty, setTempQty] = useState(10);
  const [tempCostPrice, setTempCostPrice] = useState(0.0);

  // Modal open helpers
  const openSupplierModal = (sup = null) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupplierFormData(sup);
    } else {
      setEditingSupplier(null);
      const nextId = 'S' + (suppliers.length > 0 
        ? Math.max(...suppliers.map(s => parseInt(s.id.replace('S', ''), 10))) + 1 
        : 2001);
      setSupplierFormData({
        id: nextId,
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    setShowSupplierModal(true);
  };

  // Supplier CRUD Submit
  const handleSupplierSubmit = (e) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) return;

    if (editingSupplier) {
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? supplierFormData : s));
      logActivity('SUPPLIER_EDIT', `Updated contact info for supplier: ${supplierFormData.name}`);
    } else {
      setSuppliers(prev => [...prev, supplierFormData]);
      logActivity('SUPPLIER_ADD', `Added new supplier: ${supplierFormData.name}`);
    }
    setShowSupplierModal(false);
  };

  // Add Product to PO draft
  const handleAddProductToPo = () => {
    if (!tempProduct) return;
    const prod = products.find(p => p.id === tempProduct);
    if (!prod) return;

    const existing = poItems.find(item => item.id === prod.id);
    if (existing) {
      setPoItems(prev => prev.map(item => 
        item.id === prod.id ? { ...item, qty: item.qty + tempQty } : item
      ));
    } else {
      setPoItems(prev => [...prev, {
        id: prod.id,
        name: prod.name,
        qty: tempQty,
        costPrice: tempCostPrice > 0 ? tempCostPrice : prod.costPrice
      }]);
    }
    setTempProduct('');
    setTempQty(10);
    setTempCostPrice(0.0);
  };

  // Submit Purchase Order
  const handleCreatePO = (status = 'Draft') => {
    if (!poSupplierId || poItems.length === 0) {
      alert('Please select a supplier and add at least one product.');
      return;
    }

    const supplier = suppliers.find(s => s.id === poSupplierId);
    const nextPoId = 'PO' + (purchaseOrders.length > 0 
      ? Math.max(...purchaseOrders.map(p => parseInt(p.id.replace('PO', ''), 10))) + 1 
      : 5001);

    const totalAmount = poItems.reduce((acc, item) => acc + (item.qty * item.costPrice), 0);

    const newPO = {
      id: nextPoId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString().split('T')[0],
      items: poItems,
      totalAmount,
      status,
      store: currentStore
    };

    setPurchaseOrders(prev => [...prev, newPO]);
    logActivity('PO_CREATE', `Created Purchase Order ${nextPoId} (${status}) for ${supplier.name}`);
    
    // Reset wizard
    setPoSupplierId('');
    setPoItems([]);
    setActiveTab('pos');
    alert(`Purchase Order ${nextPoId} drafted successfully!`);
  };

  // Place draft order
  const handlePlaceOrder = (poId) => {
    setPurchaseOrders(prev => 
      prev.map(po => po.id === poId ? { ...po, status: 'Ordered' } : po)
    );
    const po = purchaseOrders.find(p => p.id === poId);
    logActivity('PO_PLACE', `Placed order ${poId} with supplier ${po.supplierName}`);
    alert(`Purchase Order ${poId} marked as ORDERED.`);
  };

  // Receive Purchase Order (sync to inventory)
  const handleReceiveOrder = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    // Increment quantities and update costPrice in global products array
    setProducts(prevProducts => 
      prevProducts.map(p => {
        const orderItem = po.items.find(item => item.id === p.id);
        if (orderItem) {
          return {
            ...p,
            quantity: p.quantity + orderItem.qty,
            costPrice: orderItem.costPrice // update to latest wholesale purchase price
          };
        }
        return p;
      })
    );

    // Update PO status to Received
    setPurchaseOrders(prev => 
      prev.map(p => p.id === poId ? { ...p, status: 'Received' } : p)
    );

    logActivity('PO_RECEIVE', `Received shipment for PO ${poId} in ${currentStore}. Inventory updated.`);
    alert(`Shipment received! Stock quantities automatically updated in ${currentStore}.`);
  };

  const currentStoreProducts = products.filter(p => p.store === currentStore);

  return (
    <div style={styles.container} className="animate-fade">
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Suppliers &amp; POs</h1>
          <p style={styles.pageSubtitle}>Log wholesale distributors, draft purchase orders, and stock delivery shipments.</p>
        </div>
        <div style={styles.tabSelectors}>
          <button 
            onClick={() => setActiveTab('directory')}
            style={{
              ...styles.tabBtn,
              backgroundColor: activeTab === 'directory' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
              color: activeTab === 'directory' ? '#fff' : 'var(--color-text-secondary)'
            }}
          >
            <Truck size={14} />
            <span>Supplier Directory</span>
          </button>
          <button 
            onClick={() => setActiveTab('pos')}
            style={{
              ...styles.tabBtn,
              backgroundColor: activeTab === 'pos' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
              color: activeTab === 'pos' ? '#fff' : 'var(--color-text-secondary)'
            }}
          >
            <ClipboardList size={14} />
            <span>Purchase Orders</span>
          </button>
          <button 
            onClick={() => setActiveTab('create_po')}
            style={{
              ...styles.tabBtn,
              backgroundColor: activeTab === 'create_po' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
              color: activeTab === 'create_po' ? '#fff' : 'var(--color-text-secondary)'
            }}
          >
            <Plus size={14} />
            <span>Create PO</span>
          </button>
        </div>
      </div>

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.titleRow}>
              <Truck size={20} color="var(--color-primary)" />
              <h2 style={styles.cardTitle}>Registered Suppliers</h2>
            </div>
            <button onClick={() => openSupplierModal()} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              Add Supplier
            </button>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Supplier Name</th>
                  <th style={styles.th}>Contact Person</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(sup => (
                  <tr key={sup.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '700' }}>{sup.id}</td>
                    <td style={{ ...styles.td, fontWeight: '800' }}>{sup.name}</td>
                    <td style={styles.td}>{sup.contactPerson}</td>
                    <td style={styles.td}>{sup.phone}</td>
                    <td style={styles.td}>{sup.email}</td>
                    <td style={styles.td}>{sup.address}</td>
                    <td style={styles.tdActions}>
                      <div style={styles.actionRow}>
                        <button onClick={() => openSupplierModal(sup)} style={styles.miniBtn} title="Edit Supplier">
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'pos' && (
        <div className="card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.titleRow}>
              <ClipboardList size={20} color="var(--color-primary)" />
              <h2 style={styles.cardTitle}>Purchase Orders Ledger ({currentStore})</h2>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>PO ID</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Total Value</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.thActions}>Operations</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.filter(po => po.store === currentStore).map(po => {
                  const statusColors = {
                    Draft: { bg: 'rgba(59, 130, 246, 0.1)', fg: 'var(--color-primary)' },
                    Ordered: { bg: 'rgba(245, 158, 11, 0.1)', fg: 'var(--color-warning)' },
                    Received: { bg: 'rgba(16, 185, 129, 0.1)', fg: 'var(--color-success)' }
                  };
                  const colors = statusColors[po.status] || { bg: 'gray', fg: 'white' };
                  return (
                    <tr key={po.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{po.id}</td>
                      <td style={{ ...styles.td, fontWeight: '800' }}>{po.supplierName}</td>
                      <td style={styles.td}>{po.date}</td>
                      <td style={styles.td}>
                        <div style={styles.itemsList}>
                          {po.items.map(item => (
                            <span key={item.id} style={styles.itemBadge}>
                              {item.name} (x{item.qty})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{sym}{po.totalAmount.toFixed(2)}</td>
                      <td style={styles.td}>
                        <span style={{ 
                          ...styles.statusBadge, 
                          backgroundColor: colors.bg, 
                          color: colors.fg 
                        }}>
                          {po.status}
                        </span>
                      </td>
                      <td style={styles.tdActions}>
                        <div style={styles.poOps}>
                          {po.status === 'Draft' && (
                            <button 
                              onClick={() => handlePlaceOrder(po.id)} 
                              className="btn btn-warning" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Send PO
                            </button>
                          )}
                          {po.status === 'Ordered' && (
                            <button 
                              onClick={() => handleReceiveOrder(po.id)} 
                              className="btn btn-success" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                            >
                              Receive Stock
                            </button>
                          )}
                          {po.status === 'Received' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                              Fulfilled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {purchaseOrders.filter(po => po.store === currentStore).length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                      No Purchase Orders recorded for {currentStore}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Tab */}
      {activeTab === 'create_po' && (
        <div style={styles.poWizardGrid}>
          {/* Draft Items List */}
          <div className="card" style={{ ...styles.card, flex: 3 }}>
            <div style={styles.cardHeader}>
              <div style={styles.titleRow}>
                <Plus size={20} color="var(--color-primary)" />
                <h2 style={styles.cardTitle}>Draft Purchase Items</h2>
              </div>
            </div>

            <div style={{ padding: '1rem 0' }}>
              {poItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '2rem' }}>
                  No items added to this draft yet. Use the item selection panel on the right.
                </p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>SKU</th>
                        <th style={styles.th}>Product</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Unit Cost</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Restock Quantity</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Subtotal</th>
                        <th style={styles.thActions}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map(item => (
                        <tr key={item.id} style={styles.tr}>
                          <td style={styles.td}>{item.id}</td>
                          <td style={{ ...styles.td, fontWeight: '700' }}>{item.name}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{sym}{item.costPrice.toFixed(2)}</td>
                          <td style={{ ...styles.td, textAlign: 'center', fontWeight: '800' }}>{item.qty} units</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }}>{sym}{(item.qty * item.costPrice).toFixed(2)}</td>
                          <td style={styles.tdActions}>
                            <button 
                              onClick={() => setPoItems(prev => prev.filter(x => x.id !== item.id))} 
                              style={styles.deleteBtn}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Add Item Panel & Wizard Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 2 }}>
            <div className="card" style={styles.card}>
              <h3 style={styles.subTitle}>Select Supplier &amp; Store</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Supplier</label>
                  <select
                    value={poSupplierId}
                    onChange={e => setPoSupplierId(e.target.value)}
                    className="select-field"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.contactPerson})</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Receiving Store</label>
                  <input type="text" value={currentStore} disabled style={styles.disabledInput} className="input-field" />
                </div>
              </div>
            </div>

            <div className="card" style={styles.card}>
              <h3 style={styles.subTitle}>Add Wholesale Item</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Catalog Product</label>
                  <select
                    value={tempProduct}
                    onChange={e => {
                      setTempProduct(e.target.value);
                      const matched = products.find(p => p.id === e.target.value);
                      if (matched) setTempCostPrice(matched.costPrice);
                    }}
                    className="select-field"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">-- Choose Product --</option>
                    {currentStoreProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Restock Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={tempQty}
                      onChange={e => setTempQty(parseInt(e.target.value, 10) || 10)}
                      className="input-field"
                    />
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Unit Cost ({sym})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={tempCostPrice}
                      onChange={e => setTempCostPrice(parseFloat(e.target.value) || 0.0)}
                      className="input-field"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddProductToPo} 
                  disabled={!tempProduct}
                  className="btn btn-secondary" 
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  Add to PO Draft
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => handleCreatePO('Draft')}
                className="btn btn-secondary"
                disabled={!poSupplierId || poItems.length === 0}
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Save Draft
              </button>
              <button 
                onClick={() => handleCreatePO('Ordered')}
                className="btn btn-primary"
                disabled={!poSupplierId || poItems.length === 0}
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} className="glass animate-slide">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingSupplier ? 'Update Supplier Profile' : 'Register Wholesale Supplier'}
              </h2>
              <button onClick={() => setShowSupplierModal(false)} style={styles.modalClose}>×</button>
            </div>
            
            <form onSubmit={handleSupplierSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Supplier ID</label>
                  <input type="text" value={supplierFormData.id} disabled style={styles.disabledInput} className="input-field" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Supplier / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.name}
                    onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Agri-Food Distributors"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.contactPerson}
                    onChange={e => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Frank Cooper"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="text"
                    value={supplierFormData.phone}
                    onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="input-field"
                    placeholder="e.g. +1 (555) 012-4433"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={supplierFormData.email}
                    onChange={e => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="input-field"
                    placeholder="e.g. info@agrifood.com"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Street Address</label>
                  <input
                    type="text"
                    value={supplierFormData.address}
                    onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 700 Distro Lane"
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Save Changes' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
  tabSelectors: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
  },
  subTitle: {
    fontSize: '0.9375rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.5rem',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem',
  },
  th: {
    padding: '0.75rem 1rem',
    fontSize: '0.6875rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '0.85rem 1rem',
    verticalAlign: 'middle',
  },
  tdActions: {
    padding: '0.85rem 1rem',
    width: '80px',
    textAlign: 'center',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  miniBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.25rem',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    fontSize: '0.71875rem',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  itemBadge: {
    fontSize: '0.75rem',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontWeight: '600',
  },
  poOps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poWizardGrid: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    padding: '1rem 0',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
  },
  disabledInput: {
    opacity: 0.7,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-danger)',
    padding: '0.25rem',
  },
  // Modal layout
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    backdropFilter: 'blur(4px)',
  },
  modalCard: {
    width: '100%',
    maxWidth: '540px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  form: {
    padding: '1.25rem 1.5rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '1.25rem',
    marginTop: '1rem',
  }
};
