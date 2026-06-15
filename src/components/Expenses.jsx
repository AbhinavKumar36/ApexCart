import { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Edit,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Expenses({ 
  expenses, 
  setExpenses, 
  currentStore, 
  logActivity, 
  storeSettings 
}) {
  const sym = storeSettings?.currencySymbol || '₹';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Rent',
    amount: 0,
    description: ''
  });

  const categories = ['Rent', 'Utilities', 'Payroll', 'Marketing', 'Maintenance', 'Miscellaneous'];

  const openModal = (exp = null) => {
    if (exp) {
      setEditingExpense(exp);
      setFormData(exp);
    } else {
      setEditingExpense(null);
      const nextId = 'EX' + (expenses.length > 0 
        ? Math.max(...expenses.map(e => parseInt(e.id.replace('EX', ''), 10))) + 1 
        : 1001);
      setFormData({
        id: nextId,
        date: new Date().toISOString().split('T')[0],
        category: 'Rent',
        amount: 0,
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }

    const payload = {
      ...formData,
      store: currentStore
    };

    if (editingExpense) {
      setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? payload : exp));
      logActivity('EXPENSE_EDIT', `Updated expense: ${formData.category} - ${sym}${formData.amount}`);
    } else {
      setExpenses(prev => [...prev, payload]);
      logActivity('EXPENSE_ADD', `Added expense: ${formData.category} - ${sym}${formData.amount}`);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      logActivity('EXPENSE_DELETE', `Deleted expense record ${id}`);
    }
  };

  const storeExpenses = expenses.filter(e => e.store === currentStore).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalOverhead = storeExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={styles.container}>
      <motion.div style={styles.headerRow} variants={itemVariants}>
        <div>
          <h1 style={styles.pageTitle}>Expenses & Overhead</h1>
          <p style={styles.pageSubtitle}>Log operational costs like rent, payroll, and utilities for P&L reporting.</p>
        </div>
        <div>
          <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Expense
          </button>
        </div>
      </motion.div>

      <motion.div className="card" style={styles.card} variants={itemVariants} whileHover={{ y: -2 }}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            <TrendingDown size={20} color="var(--color-danger)" />
            <h2 style={styles.cardTitle}>Expense Ledger ({currentStore})</h2>
          </div>
          <div style={styles.totalBadge}>
            Total Logged Overhead: <span className="font-mono">{sym}{totalOverhead.toFixed(2)}</span>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Description</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                <th style={styles.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {storeExpenses.map(exp => (
                <tr key={exp.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '700' }} className="font-mono">{exp.id}</td>
                  <td style={styles.td} className="font-mono">{exp.date}</td>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{exp.category}</td>
                  <td style={styles.td}>{exp.description}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800' }} className="font-mono">
                    {sym}{parseFloat(exp.amount).toFixed(2)}
                  </td>
                  <td style={styles.tdActions}>
                    <div style={styles.actionRow}>
                      <button onClick={() => openModal(exp)} style={styles.miniBtn} title="Edit Expense">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} style={{ ...styles.miniBtn, color: 'var(--color-danger)' }} title="Delete Expense">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {storeExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                    No expenses recorded for {currentStore}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Expense Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} className="glass animate-slide">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingExpense ? 'Edit Expense Record' : 'Log New Expense'}
              </h2>
              <button onClick={() => setShowModal(false)} style={styles.modalClose}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="input-field font-mono"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="select-field"
                    style={styles.selectStyle}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount ({sym}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="input-field font-mono"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Electric bill for June"
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' },
  pageSubtitle: { color: 'var(--color-text-secondary)', fontSize: '0.9375rem' },
  card: { display: 'flex', flexDirection: 'column', width: '100%' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  cardTitle: { fontSize: '1.125rem', fontFamily: 'var(--font-heading)', fontWeight: '800' },
  totalBadge: { fontWeight: '700', fontSize: '0.9375rem', color: 'var(--color-text-primary)' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' },
  th: { padding: '0.75rem 1rem', fontSize: '0.6875rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '0.85rem 1rem', verticalAlign: 'middle' },
  tdActions: { padding: '0.85rem 1rem', width: '80px', textAlign: 'center' },
  actionRow: { display: 'flex', justifyContent: 'center', gap: '0.5rem' },
  miniBtn: { background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  modalCard: { backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  modalHeader: { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '1.25rem', fontWeight: '800', fontFamily: 'var(--font-heading)' },
  modalClose: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', padding: 0 },
  form: { padding: '1.5rem', overflowY: 'auto' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  selectStyle: { width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-primary)' },
  modalFooter: { padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: 'var(--color-bg-surface)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' },
};
