import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  RotateCcw, 
  Calendar,
  AlertTriangle,
  Receipt,
  Download
} from 'lucide-react';
import Invoice from './Invoice';

export default function History({ sales, setSales, products, setProducts, role, vendor }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Active viewing invoice
  const [viewingInvoice, setViewingInvoice] = useState(null);
  
  // Refund prompt state
  const [refundTarget, setRefundTarget] = useState(null);

  // Filter sales list
  const filteredSales = sales.filter(sale => {
    // Vendor isolation check: only show sales containing items belonging to this vendor
    if (vendor !== 'all') {
      const hasVendorItem = sale.items.some(item => {
        const prod = products.find(p => p.id === item.id);
        return prod && prod.vendor === vendor;
      });
      if (!hasVendorItem) return false;
    }

    const matchesSearch = 
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerPhone.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesDate = 
      !selectedDate || 
      // Reformat selectedDate (YYYY-MM-DD) to compare with sale.date (DD/MM/YYYY)
      (() => {
        const [y, m, d] = selectedDate.split('-');
        const formattedSelect = `${d}/${m}/${y}`;
        return sale.date === formattedSelect;
      })();

    return matchesSearch && matchesDate;
  });

  // Handle return/refund confirmation
  const handleRefundConfirm = () => {
    if (!refundTarget) return;

    // Restore stock quantities in global state
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const refundedItem = refundTarget.items.find(item => item.id === product.id);
        if (refundedItem) {
          return {
            ...product,
            quantity: product.quantity + refundedItem.quantity
          };
        }
        return product;
      })
    );

    // Remove sale record
    setSales(prev => prev.filter(s => s.id !== refundTarget.id));
    setRefundTarget(null);
  };

  return (
    <div style={styles.container} className="animate-fade">
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Transaction Invoices</h1>
          <p style={styles.pageSubtitle}>Search printed store bills, reprint receipts, and process refunds.</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={styles.filterRow} className="glass">
        {/* Search */}
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Bill Number, Name, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            className="input-field"
          />
        </div>

        {/* Date Filter */}
        <div style={styles.filterGroup}>
          <Calendar size={16} color="var(--color-text-muted)" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
            className="input-field"
          />
        </div>
      </div>

      {/* Sales Invoices List */}
      <div style={styles.tableCard} className="card">
        {filteredSales.length === 0 ? (
          <div style={styles.emptyFeed}>
            <Receipt size={48} color="var(--color-text-muted)" />
            <p style={styles.emptyText}>No matching transaction sales invoices found.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Invoice ID</th>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Customer Details</th>
                  <th style={styles.th}>Items Count</th>
                  <th style={styles.th}>Grand Total</th>
                  <th style={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} style={styles.tr}>
                    <td style={styles.tdId}>#{sale.id}</td>
                    <td style={styles.tdTime}>
                      <div style={styles.timeCapsules}>
                        <span>{sale.date}</span>
                        <span style={styles.timeSub}>{sale.time}</span>
                      </div>
                    </td>
                    <td style={styles.tdCust}>
                      <span style={styles.custName}>{sale.customerName}</span>
                      <span style={styles.custPhone}>{sale.customerPhone}</span>
                    </td>
                    <td style={styles.tdItems}>{sale.items.reduce((acc, i) => acc + i.quantity, 0)} units ({sale.items.length} unique)</td>
                    <td style={styles.tdPrice}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem' }}>
                        <span>${sale.totalPrice.toFixed(2)}</span>
                        {sale.paymentMethod ? (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: '800', 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: '4px',
                            backgroundColor: sale.paymentMethod === 'UPI' ? 'var(--color-primary-light)' : sale.paymentMethod === 'Card' ? 'var(--color-success-light)' : 'var(--color-border)',
                            color: sale.paymentMethod === 'UPI' ? 'var(--color-primary)' : sale.paymentMethod === 'Card' ? 'var(--color-success)' : 'var(--color-text-secondary)',
                            textTransform: 'uppercase'
                          }}>
                            {sale.paymentMethod}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>CASH</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.tdActions}>
                      <div style={styles.actionButtons}>
                        <button 
                          onClick={() => setViewingInvoice(sale)} 
                          style={styles.viewBtn}
                          title="View Invoice Receipt"
                        >
                          <Eye size={16} />
                          <span>Lookup</span>
                        </button>
                        {role !== 'staff' && (
                          <button 
                            onClick={() => setRefundTarget(sale)} 
                            style={styles.refundBtn}
                            title="Refund Transaction"
                          >
                            <RotateCcw size={14} />
                            <span>Refund</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Viewer Overlay */}
      {viewingInvoice && (
        <Invoice 
          invoice={viewingInvoice} 
          onClose={() => setViewingInvoice(null)} 
        />
      )}

      {/* Refund Prompt Overlay */}
      {refundTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.alertCard} className="glass glow animate-slide">
            <div style={styles.alertHeader}>
              <AlertTriangle size={36} color="var(--color-danger)" />
              <h2 style={styles.alertTitle}>Refund Transaction?</h2>
            </div>
            <p style={styles.alertText}>
              Are you sure you want to refund Invoice <strong>#{refundTarget.id}</strong> for <strong>{refundTarget.customerName}</strong>? 
              This will remove the transaction record and return all <strong>{refundTarget.items.reduce((acc, i) => acc + i.quantity, 0)} items</strong> back into inventory stock levels.
            </p>
            <div style={styles.alertFooter}>
              <button onClick={() => setRefundTarget(null)} style={styles.modalCancelBtn} className="btn btn-secondary">
                No, Keep Invoice
              </button>
              <button onClick={handleRefundConfirm} style={styles.refundConfirmBtn} className="btn btn-danger">
                Yes, Void & Replenish Stock
              </button>
            </div>
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
    minWidth: '180px',
  },
  dateInput: {
    padding: '0.5rem 1rem',
    height: '42px',
    cursor: 'pointer',
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
  tdId: {
    padding: '1rem 1.25rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: '0.9375rem',
    color: 'var(--color-primary)',
  },
  tdTime: {
    padding: '1rem 1.25rem',
  },
  timeCapsules: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  timeSub: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
    marginTop: '0.1rem',
  },
  tdCust: {
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
  },
  custName: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  custPhone: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    marginTop: '0.1rem',
  },
  tdItems: {
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  tdPrice: {
    padding: '1rem 1.25rem',
    fontWeight: '800',
    fontSize: '0.9375rem',
    color: 'var(--color-text-primary)',
  },
  tdActions: {
    padding: '1rem 1.25rem',
    textAlign: 'right',
  },
  actionButtons: {
    display: 'inline-flex',
    gap: '0.5rem',
  },
  viewBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    padding: '0.45rem 0.85rem',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary-light)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '700',
    fontSize: '0.75rem',
    transition: 'all 0.15s ease',
  },
  refundBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    padding: '0.45rem 0.85rem',
    borderRadius: '8px',
    backgroundColor: 'var(--color-danger-light)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '700',
    fontSize: '0.75rem',
    transition: 'all 0.15s ease',
  },
  emptyFeed: {
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
    zIndex: 200,
    backdropFilter: 'blur(5px)',
    padding: '1.5rem',
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
  modalCancelBtn: {
    padding: '0.65rem 1.25rem',
  },
  refundConfirmBtn: {
    padding: '0.65rem 1.25rem',
  }
};
