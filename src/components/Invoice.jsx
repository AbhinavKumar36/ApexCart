import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Invoice({ invoice, onClose, storeSettings }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 160] // receipt slip layout (80mm width)
    });
    
    const storeName = storeSettings?.storeName || 'APEXCART SUPERMARKET';
    const storeAddress = storeSettings?.storeAddress || 'Enterprise Logistics Center #4092';
    const storePhone = storeSettings?.storePhone || 'N/A';
    const sym = storeSettings?.currencySymbol || '$';
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(storeName.toUpperCase(), 40, 8, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(storeAddress, 40, 11, { align: 'center' });
    doc.text(`TEL: ${storePhone} | GSTIN: 29AAAAA0000A1Z5`, 40, 14, { align: 'center' });
    
    doc.line(5, 16, 75, 16);
    
    // Meta information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(`INVOICE NO: #${invoice.id}`, 5, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(`DATE / TIME: ${invoice.date} ${invoice.time}`, 5, 23);
    doc.text(`CUSTOMER: ${invoice.customerName}`, 5, 26);
    doc.text(`CONTACT: ${invoice.customerPhone}`, 5, 29);
    
    doc.line(5, 31, 75, 31);
    
    // Items table list
    const tableColumn = ["Item", "Qty", "Price", "Total"];
    const tableRows = invoice.items.map(item => [
      item.name,
      item.quantity.toString(),
      `${sym}${item.price.toFixed(1)}`,
      `${sym}${item.lineTotal.toFixed(1)}`
    ]);
    
    doc.autoTable({
      startY: 33,
      head: [tableColumn],
      body: tableRows,
      margin: { left: 5, right: 5 },
      styles: { fontSize: 5.5, cellPadding: 0.8 },
      headStyles: { fillColor: [99, 102, 241] },
      theme: 'grid'
    });
    
    const finalY = doc.lastAutoTable.finalY + 5;
    
    // Summary
    doc.setFontSize(6);
    doc.text(`Subtotal:`, 45, finalY, { align: 'right' });
    doc.text(`${sym}${invoice.subtotal.toFixed(2)}`, 75, finalY, { align: 'right' });
    
    doc.text(`Tax (GST):`, 45, finalY + 3, { align: 'right' });
    doc.text(`+${sym}${invoice.totalGST.toFixed(2)}`, 75, finalY + 3, { align: 'right' });
    
    doc.text(`Discount:`, 45, finalY + 6, { align: 'right' });
    doc.text(`-${sym}${invoice.totalDiscount.toFixed(2)}`, 75, finalY + 6, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text(`GRAND TOTAL:`, 45, finalY + 10, { align: 'right' });
    doc.text(`${sym}${invoice.totalPrice.toFixed(2)}`, 75, finalY + 10, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(`PAID VIA: ${invoice.paymentMethod || 'CASH'} • TXN SUCCESS`, 40, finalY + 15, { align: 'center' });
    doc.text(`Thank you for shopping at ApexCart!`, 40, finalY + 18, { align: 'center' });
    
    doc.save(`ApexCart_Invoice_${invoice.id}.pdf`);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard} className="glass animate-slide">
        {/* Modal Controls */}
        <div style={styles.modalHeader} className="no-print">
          <div style={styles.successHeading}>
            <CheckCircle2 size={22} color="var(--color-success)" />
            <span>Transaction Complete</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Invoice Scrollable Container */}
        <div style={styles.scrollArea}>
          {/* Printable Receipt Slip */}
          <div ref={printRef} style={styles.receipt} className="print-area">
            {/* Store Header */}
            <div style={styles.storeHeader}>
              <h2 style={styles.storeName}>{storeSettings?.storeName?.toUpperCase() || 'APEXCART SUPERMARKET'}</h2>
              <p style={styles.storeSub}>{storeSettings?.storeAddress || 'Enterprise Logistics Center #4092'}</p>
              <p style={styles.storeContact}>TEL: {storeSettings?.storePhone || 'N/A'} | GSTIN: 29AAAAA0000A1Z5</p>
            </div>

            <div style={styles.separator} />

            {/* Invoice Meta */}
            <div style={styles.metaGrid}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>INVOICE NO:</span>
                <span style={styles.metaValRed}>#{invoice.id}</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>DATE / TIME:</span>
                <span style={styles.metaVal}>{invoice.date} {invoice.time}</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>CUSTOMER:</span>
                <span style={styles.metaVal}>{invoice.customerName}</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>CONTACT:</span>
                <span style={styles.metaVal}>{invoice.customerPhone}</span>
              </div>
            </div>

            <div style={styles.separator} />

            {/* Table Items */}
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ ...styles.th, width: '40px' }}>#</th>
                  <th style={styles.th}>Item Description</th>
                  <th style={{ ...styles.th, textAlign: 'center', width: '50px' }}>Qty</th>
                  <th style={{ ...styles.th, textAlign: 'right', width: '80px' }}>Price</th>
                  <th style={{ ...styles.th, textAlign: 'center', width: '60px' }}>Tax</th>
                  <th style={{ ...styles.th, textAlign: 'center', width: '60px' }}>Disc</th>
                  <th style={{ ...styles.th, textAlign: 'right', width: '90px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} style={styles.tr}>
                    <td style={styles.tdIndex}>{index + 1}</td>
                    <td style={styles.tdName}>
                      <span style={styles.itemName}>{item.name}</span>
                      <span style={styles.itemSku}>{item.id}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700' }}>{item.quantity}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{storeSettings?.currencySymbol || '$'}{item.price.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{item.gst}%</td>
                    <td style={{ ...styles.td, textAlign: 'center', color: item.discount > 0 ? 'var(--color-danger)' : 'inherit' }}>
                      {item.discount}%
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800' }}>
                      {storeSettings?.currencySymbol || '$'}{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.separator} />

            {/* Calculations Balance */}
            <div style={styles.balanceContainer}>
              <div style={styles.balanceRow}>
                <span>Subtotal</span>
                <span>{storeSettings?.currencySymbol || '$'}{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div style={styles.balanceRow}>
                <span>Tax (GST)</span>
                <span>+{storeSettings?.currencySymbol || '$'}{invoice.totalGST.toFixed(2)}</span>
              </div>
              <div style={styles.balanceRow}>
                <span>Discount</span>
                <span style={{ color: 'var(--color-danger)' }}>-{storeSettings?.currencySymbol || '$'}{invoice.totalDiscount.toFixed(2)}</span>
              </div>
              <div style={styles.balanceDivider} />
              <div style={styles.grandTotalRow}>
                <span>GRAND TOTAL</span>
                <span>{storeSettings?.currencySymbol || '$'}{invoice.totalPrice.toFixed(2)}</span>
              </div>
              {invoice.paymentMethod && (
                <div style={{ ...styles.balanceRow, marginTop: '0.35rem', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', color: 'var(--color-primary)', border: '1px dashed var(--color-primary-glow)', padding: '0.25rem', textTransform: 'uppercase', borderRadius: '4px' }}>
                  <span>PAID VIA: {invoice.paymentMethod} • TXN SUCCESS</span>
                </div>
              )}
            </div>

            <div style={styles.separator} />

            {/* Invoice Footer Barcode */}
            <div style={styles.receiptFooter}>
              <div style={styles.barcodeBox}>
                <div style={styles.barcodeLines} />
                <span style={styles.barcodeText}>*TXN-{invoice.id}-{invoice.date.replace(/\//g, '')}*</span>
              </div>
              <div style={styles.secureBadge}>
                <ShieldCheck size={14} color="var(--color-success)" />
                <span>Digitally Verified Ledger Node</span>
              </div>
              <p style={styles.thankyou}>Thank you for shopping at ApexCart Malls! 🙂👍</p>
            </div>
          </div>
        </div>

        {/* Actions panel */}
        <div style={{ ...styles.actionsBar, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }} className="no-print">
          <button onClick={onClose} style={{ ...styles.doneBtn, margin: 0 }} className="btn btn-secondary">
            Done & Close
          </button>
          <button onClick={handleExportPDF} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button onClick={handlePrint} style={{ ...styles.printBtn, margin: 0 }} className="btn btn-primary animate-pulse">
            <Printer size={18} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
    backdropFilter: 'blur(4px)',
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '640px',
    backgroundColor: 'var(--color-bg-surface)',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.75rem',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
  },
  successHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: '700',
    fontSize: '0.9375rem',
    color: 'var(--color-success)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem',
    backgroundColor: 'var(--color-bg-base)',
    display: 'flex',
    justifyContent: 'center',
  },
  receipt: {
    width: '100%',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
    padding: '2rem 1.75rem',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
  },
  storeHeader: {
    textAlign: 'center',
    marginBottom: '1rem',
  },
  storeName: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    fontWeight: '800',
    letterSpacing: '0.5px',
    color: '#0f172a',
  },
  storeSub: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748b',
    marginTop: '0.15rem',
  },
  storeContact: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: '0.2rem',
  },
  separator: {
    borderTop: '2px dashed #cbd5e1',
    margin: '1.25rem 0',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    fontSize: '0.8125rem',
    color: '#334155',
    fontWeight: '600',
  },
  metaRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  metaLabel: {
    color: '#64748b',
    fontWeight: '700',
    width: '90px',
    flexShrink: 0,
  },
  metaVal: {
    color: '#0f172a',
    fontWeight: '600',
  },
  metaValRed: {
    color: '#ef4444',
    fontWeight: '800',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    marginTop: '0.5rem',
  },
  thRow: {
    borderBottom: '1px solid #cbd5e1',
  },
  th: {
    padding: '0.5rem 0.25rem',
    fontSize: '0.6875rem',
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '0.75rem 0.25rem',
    fontSize: '0.8125rem',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  tdIndex: {
    padding: '0.75rem 0.25rem',
    fontSize: '0.8125rem',
    color: '#64748b',
    fontWeight: '600',
  },
  tdName: {
    padding: '0.75rem 0.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
  },
  itemName: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSku: {
    fontSize: '0.625rem',
    fontFamily: 'monospace',
    color: '#94a3b8',
    fontWeight: '700',
  },
  balanceContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.4rem',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#334155',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '240px',
  },
  balanceDivider: {
    width: '240px',
    height: '1px',
    backgroundColor: '#cbd5e1',
    margin: '0.2rem 0',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '240px',
    fontSize: '1rem',
    fontWeight: '800',
    color: '#0f172a',
  },
  receiptFooter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  barcodeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  barcodeLines: {
    width: '240px',
    height: '35px',
    background: 'repeating-linear-gradient(90deg, #1e293b, #1e293b 2px, transparent 2px, transparent 6px, #1e293b 6px, #1e293b 9px, transparent 9px, transparent 11px)',
  },
  barcodeText: {
    fontSize: '0.625rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '1px',
  },
  secureBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.625rem',
    fontWeight: '800',
    color: 'var(--color-success)',
    textTransform: 'uppercase',
  },
  thankyou: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#475569',
  },
  actionsBar: {
    display: 'flex',
    padding: '1.25rem 2rem',
    justifyContent: 'flex-end',
    gap: '1rem',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
  },
  doneBtn: {
    padding: '0.65rem 1.25rem',
  },
  printBtn: {
    padding: '0.65rem 1.5rem',
  }
};
