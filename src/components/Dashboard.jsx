import React from 'react';
import { 
  DollarSign, 
  Receipt, 
  PackageCheck, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  PlusCircle, 
  ShoppingBag,
  Inbox
} from 'lucide-react';

export default function Dashboard({ products, sales, setProducts, setActiveTab, role, storeSettings }) {
  // Calculations
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalPrice, 0);
  const totalBills = sales.length;
  const totalProducts = products.length;
  
  const lowStockItems = products.filter(p => p.quantity <= (storeSettings?.lowStockThreshold || p.minStock));
  const lowStockCount = lowStockItems.length;

  const today = '2026-06-06';
  const expiredProducts = products.filter(p => p.expiryDate && p.expiryDate < today);
  const expiringSoonProducts = products.filter(p => {
    if (!p.expiryDate || p.expiryDate < today) return false;
    const exp = new Date(p.expiryDate);
    const td = new Date(today);
    const diffDays = Math.ceil((exp - td) / (1000 * 60 * 60 * 24));
    const warningDays = storeSettings?.expiryWarningDays || 30;
    return diffDays <= warningDays;
  });

  const expiredCount = expiredProducts.length;
  const expiringSoonCount = expiringSoonProducts.length;
  const totalPerishablesAlerts = expiredCount + expiringSoonCount;

  // Restock handler directly from dashboard
  const handleQuickRestock = (productId, amount) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId ? { ...p, quantity: p.quantity + amount } : p
      )
    );
  };

  // Clearance markdown discount handler
  const handleClearanceDiscount = (productId, discountAmount) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId ? { ...p, discount: discountAmount } : p
      )
    );
  };

  // Group products by category to show distribution
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const totalCategoriesCount = Object.keys(categoryCounts).length;
  const categoriesList = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / totalProducts) * 100)
  })).sort((a, b) => b.count - a.count);

  // Sparkline sales calculations for last 7 days
  const dailySales = [
    { day: 'Mon', amount: 120 },
    { day: 'Tue', amount: 340 },
    { day: 'Wed', amount: 210 },
    { day: 'Thu', amount: 480 },
    { day: 'Fri', amount: 620 },
    { day: 'Sat', amount: 890 },
    { day: 'Sun', amount: totalRevenue > 0 ? Math.round(totalRevenue) : 510 }
  ];

  // SVG Chart helper calculations
  const chartHeight = 140;
  const chartWidth = 500;
  const padding = 30;
  const maxAmount = Math.max(...dailySales.map(d => d.amount), 1000);
  const points = dailySales.map((d, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (dailySales.length - 1);
    const y = chartHeight - padding - (d.amount / maxAmount) * (chartHeight - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z` 
    : '';

  return (
    <div style={styles.container} className="animate-fade">
      {/* Top Welcome Title */}
      <div style={styles.welcomeRow}>
        <div>
          <h1 style={styles.pageTitle}>{storeSettings?.storeName || 'Logistics Dashboard'}</h1>
          <p style={styles.pageSubtitle}>{storeSettings?.storeAddress || 'Real-time metrics and store inventory operations control.'}</p>
        </div>
        <button onClick={() => setActiveTab('pos')} className="btn btn-primary" style={styles.posShortcut}>
          <ShoppingBag size={18} />
          <span>Launch POS Register</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        {/* KPI 1 */}
        <div style={styles.kpiCard} className="card glow">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Revenue</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'var(--color-success-light)' }}>
              <DollarSign size={20} color="var(--color-success)" />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={styles.kpiValue}>
              {storeSettings?.currencySymbol || '$'}{totalRevenue.toFixed(2)}
            </span>
            <span style={styles.kpiChange}>
              <TrendingUp size={14} /> +12.4%
            </span>
          </div>
          <span style={styles.kpiSubtext}>Calculated from {totalBills} sales invoices</span>
        </div>

        {/* KPI 2 */}
        <div style={styles.kpiCard} className="card">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Invoices Printed</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'var(--color-primary-light)' }}>
              <Receipt size={20} color="var(--color-primary)" />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={styles.kpiValue}>{totalBills}</span>
            <span style={styles.kpiSubtext2}>Active sales records</span>
          </div>
          <span style={styles.kpiSubtext}>Stock values auto-deducted</span>
        </div>

        {/* KPI 3 */}
        <div style={styles.kpiCard} className="card">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Product SKUs</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'var(--color-primary-light)' }}>
              <PackageCheck size={20} color="var(--color-primary)" />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={styles.kpiValue}>{totalProducts}</span>
            <span style={styles.kpiSubtext2}>Across {totalCategoriesCount} categories</span>
          </div>
          <span style={styles.kpiSubtext}>Check catalog status in real-time</span>
        </div>

        {/* KPI 4 - Combined Alerts */}
        <div style={{
          ...styles.kpiCard,
          borderColor: (lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger)' : 'var(--color-border)',
        }} className="card">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Security & Alerts</span>
            <div style={{ 
              ...styles.kpiIconBox, 
              backgroundColor: (lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger-light)' : 'var(--color-success-light)' 
            }}>
              <AlertTriangle size={20} color={(lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger)' : 'var(--color-success)'} />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={{ 
              ...styles.kpiValue,
              color: (lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger)' : 'var(--color-text-primary)'
            }}>
              Low: {lowStockCount} | Exp: {expiredCount}
            </span>
          </div>
          <span style={styles.kpiSubtext}>
            {expiringSoonCount} items expiring in {storeSettings?.expiryWarningDays || 30} days
          </span>
        </div>
      </div>

      {/* Main Charts & Lists Grid */}
      <div style={styles.mainGrid}>
        {/* Sales Trend Chart Card */}
        <div style={styles.chartCard} className="card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Sales Velocity (Weekly Trend)</h2>
            <span style={styles.cardInfo}>$ USD Daily sales turnover</span>
          </div>
          <div style={styles.chartWrapper}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={styles.svgChart}>
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--color-border)" strokeDasharray="4" />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--color-border)" />
              
              {/* Area path */}
              <path d={areaPath} fill="url(#chartGradient)" />

              {/* Line path */}
              <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="3" />

              {/* Points */}
              {points.map((p, index) => (
                <g key={index}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="4" 
                    fill="var(--color-bg-surface)" 
                    stroke="var(--color-primary)" 
                    strokeWidth="2.5" 
                  />
                  <text 
                    x={p.x} 
                    y={chartHeight - 8} 
                    fontSize="10" 
                    fill="var(--color-text-secondary)" 
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {p.day}
                  </text>
                  <text 
                    x={p.x} 
                    y={p.y - 10} 
                    fontSize="9" 
                    fill="var(--color-text-primary)" 
                    textAnchor="middle" 
                    fontWeight="700"
                  >
                    ${p.amount}
                  </text>
                </g>
              ))}

              {/* Gradients */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Categories Share Card */}
        <div style={styles.categoriesCard} className="card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Inventory Categories</h2>
            <span style={styles.cardInfo}>Distribution of items in warehouse</span>
          </div>
          <div style={styles.categoriesList}>
            {categoriesList.map((cat, idx) => (
              <div key={idx} style={styles.catItem}>
                <div style={styles.catHeader}>
                  <span style={styles.catName}>{cat.name}</span>
                  <span style={styles.catStat}>{cat.count} items ({cat.percentage}%)</span>
                </div>
                <div style={styles.progressContainer}>
                  <div 
                    style={{ 
                      ...styles.progressBar, 
                      width: `${cat.percentage}%`,
                      backgroundColor: idx === 0 ? 'var(--color-primary)' : idx === 1 ? 'var(--color-success)' : 'var(--color-text-muted)'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts Replenishment Console */}
        <div style={styles.alertsCard} className="card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Replenishment Alerts</h2>
            <span style={styles.cardInfo}>Low stock items requiring updates</span>
          </div>
          
          {lowStockItems.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Inbox size={40} color="var(--color-text-muted)" />
              <p style={styles.emptyAlertsText}>All inventory items are healthy.</p>
            </div>
          ) : (
            <div style={styles.alertsList}>
              {lowStockItems.map((item) => (
                <div key={item.id} style={styles.alertItem}>
                  <div style={styles.alertInfo}>
                    <span style={styles.alertName}>{item.name}</span>
                    <div style={styles.alertSub}>
                      <span style={styles.alertSku}>{item.id}</span>
                      <span style={styles.divider}>•</span>
                      <span style={{ 
                        color: item.quantity === 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                        fontWeight: '700'
                      }}>
                        {item.quantity === 0 ? 'OUT OF STOCK' : `${item.quantity} units left`}
                      </span>
                      <span style={styles.divider}>•</span>
                      <span style={styles.alertMin}>Limit: {storeSettings?.lowStockThreshold || item.minStock}</span>
                    </div>
                  </div>
                  {role !== 'staff' && (
                    <div style={styles.alertActions}>
                      <button 
                        onClick={() => handleQuickRestock(item.id, 10)} 
                        style={styles.actionBtn} 
                        title="Add 10 units"
                      >
                        <PlusCircle size={14} />
                        <span>+10</span>
                      </button>
                      <button 
                        onClick={() => handleQuickRestock(item.id, 50)} 
                        style={styles.actionBtn} 
                        title="Add 50 units"
                      >
                        <PlusCircle size={14} />
                        <span>+50</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perishables Expiry Console */}
        <div style={styles.alertsCard} className="card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Perishables Expiry Console</h2>
            <span style={styles.cardInfo}>Perishable goods status & markdown clearance</span>
          </div>
          
          {expiredProducts.length === 0 && expiringSoonProducts.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Inbox size={40} color="var(--color-text-muted)" />
              <p style={styles.emptyAlertsText}>No perishable expiration alerts.</p>
            </div>
          ) : (
            <div style={styles.alertsList}>
              {/* Expired Products */}
              {expiredProducts.map((item) => (
                <div key={item.id} style={{ ...styles.alertItem, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div style={styles.alertInfo}>
                    <span style={{ ...styles.alertName, color: 'var(--color-danger)' }}>{item.name}</span>
                    <div style={styles.alertSub}>
                      <span style={styles.alertSku}>{item.id}</span>
                      <span style={styles.divider}>•</span>
                      <span style={{ color: 'var(--color-danger)', fontWeight: '700' }}>EXPIRED: {item.expiryDate}</span>
                    </div>
                  </div>
                  <span className="badge badge-danger">Dispose</span>
                </div>
              ))}
              
              {/* Expiring Soon Products */}
              {expiringSoonProducts.map((item) => {
                const exp = new Date(item.expiryDate);
                const td = new Date(today);
                const diffDays = Math.ceil((exp - td) / (1000 * 60 * 60 * 24));
                return (
                  <div key={item.id} style={{ ...styles.alertItem, borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                    <div style={styles.alertInfo}>
                      <span style={styles.alertName}>{item.name}</span>
                      <div style={styles.alertSub}>
                        <span style={styles.alertSku}>{item.id}</span>
                        <span style={styles.divider}>•</span>
                        <span style={{ color: 'var(--color-warning)', fontWeight: '700' }}>Expires: {item.expiryDate} ({diffDays}d left)</span>
                        {item.discount > 0 && (
                          <>
                            <span style={styles.divider}>•</span>
                            <span style={{ color: 'var(--color-success)', fontWeight: '700' }}>Markdown: {item.discount}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    {role !== 'staff' && (
                      <div style={styles.alertActions}>
                        <button 
                          onClick={() => { handleClearanceDiscount(item.id, 30); alert(`Applied 30% markdown to ${item.name}`); }} 
                          style={styles.actionBtn} 
                          title="Apply 30% discount"
                          className="dashboard-action-btn"
                        >
                          <span>Disc 30%</span>
                        </button>
                        <button 
                          onClick={() => { handleClearanceDiscount(item.id, 50); alert(`Applied 50% markdown to ${item.name}`); }} 
                          style={styles.actionBtn} 
                          title="Apply 50% discount"
                          className="dashboard-action-btn"
                        >
                          <span>Disc 50%</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices Feed */}
        <div style={styles.recentFeedCard} className="card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Recent Store Sales</h2>
            <span style={styles.cardInfo}>Latest billing checkout actions</span>
          </div>
          
          {sales.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Receipt size={40} color="var(--color-text-muted)" />
              <p style={styles.emptyAlertsText}>No orders recorded today yet.</p>
            </div>
          ) : (
            <div style={styles.feedList}>
              {sales.slice(-4).reverse().map((sale) => (
                <div key={sale.id} style={styles.feedItem}>
                  <div style={styles.feedIcon}>
                    <ArrowUpRight size={16} color="var(--color-success)" />
                  </div>
                  <div style={styles.feedInfo}>
                    <span style={styles.feedTitle}>Invoice #{sale.id}</span>
                    <span style={styles.feedSubtitle}>{sale.customerName || 'Walk-in Customer'} • {sale.items.length} items</span>
                  </div>
                  <div style={styles.feedValue}>
                    <span>+{storeSettings?.currencySymbol || '$'}{sale.totalPrice.toFixed(2)}</span>
                    <span style={styles.feedTime}>{sale.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  welcomeRow: {
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
  posShortcut: {
    padding: '0.6rem 1.2rem',
    fontSize: '0.875rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiIconBox: {
    display: 'flex',
    padding: '0.5rem',
    borderRadius: '10px',
  },
  kpiValRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.5px',
  },
  kpiChange: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.15rem',
  },
  kpiSubtext: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  kpiSubtext2: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '600',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: '1.5rem',
  },
  chartCard: {
    gridColumn: 'span 1',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  categoriesCard: {
    gridColumn: 'span 1',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  alertsCard: {
    gridColumn: 'span 1',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    maxHeight: '380px',
    overflowY: 'auto',
  },
  recentFeedCard: {
    gridColumn: 'span 1',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.75rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
  },
  cardInfo: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  chartWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgChart: {
    width: '100%',
    maxHeight: '160px',
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  catItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  catHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
  },
  catName: {
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  catStat: {
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
  },
  progressContainer: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  alertInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  alertName: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  alertSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  alertSku: {
    fontFamily: 'monospace',
  },
  divider: {
    color: 'var(--color-border)',
  },
  alertMin: {
    fontStyle: 'italic',
  },
  alertActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.35rem 0.6rem',
    fontSize: '0.75rem',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    transition: 'all 0.15s ease',
  },
  emptyAlerts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '2rem 0',
    color: 'var(--color-text-muted)',
  },
  emptyAlertsText: {
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  feedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0',
    borderBottom: '1px solid var(--color-border)',
  },
  feedIcon: {
    display: 'flex',
    padding: '0.4rem',
    borderRadius: '8px',
    backgroundColor: 'var(--color-success-light)',
  },
  feedInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  feedTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  feedSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  feedValue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--color-success)',
  },
  feedTime: {
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
  }
};
// Add custom hover styles for dashboard action buttons
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .dashboard-action-btn:hover {
      border-color: var(--color-primary) !important;
      color: var(--color-primary) !important;
      background-color: var(--color-primary-light) !important;
    }
  `;
  document.head.appendChild(style);
}
