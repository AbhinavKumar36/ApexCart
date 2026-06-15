import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  IndianRupee, 
  Receipt, 
  PackageCheck, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  PlusCircle, 
  ShoppingBag,
  Inbox,
  Clock,
  Activity
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label, currencySymbol }) => {
  if (active && payload && payload.length) {
    return (
      <div style={styles.glassTooltip}>
        <p style={styles.tooltipLabel}>{label}</p>
        <p style={styles.tooltipValue}>
          {currencySymbol}{payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ products, sales, setProducts, setActiveTab, role, storeSettings, vendor }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const filteredProducts = vendor === 'all' ? products : products.filter(p => p.vendor === vendor);
  const filteredSales = vendor === 'all' ? sales : sales.filter(s => s.items.some(item => {
    const prod = products.find(p => p.id === item.id);
    return prod && prod.vendor === vendor;
  }));

  const totalRevenue = vendor === 'all'
    ? sales.reduce((acc, sale) => acc + sale.totalPrice, 0)
    : sales.reduce((acc, sale) => {
        const vendorSum = sale.items.reduce((sum, item) => {
          const prod = products.find(p => p.id === item.id);
          return prod && prod.vendor === vendor ? sum + item.lineTotal : sum;
        }, 0);
        return acc + vendorSum;
      }, 0);

  const totalBills = filteredSales.length;
  const totalProducts = filteredProducts.length;
  
  const lowStockItems = filteredProducts.filter(p => p.quantity <= (storeSettings?.lowStockThreshold || p.minStock));
  const lowStockCount = lowStockItems.length;

  const today = new Date().toISOString().split('T')[0];
  const expiredProducts = filteredProducts.filter(p => p.expiryDate && p.expiryDate < today);
  const expiringSoonProducts = filteredProducts.filter(p => {
    if (!p.expiryDate || p.expiryDate < today) return false;
    const exp = new Date(p.expiryDate);
    const td = new Date(today);
    const diffDays = Math.ceil((exp - td) / (1000 * 60 * 60 * 24));
    const warningDays = storeSettings?.expiryWarningDays || 30;
    return diffDays <= warningDays;
  });

  const expiredCount = expiredProducts.length;
  const expiringSoonCount = expiringSoonProducts.length;

  const handleQuickRestock = (productId, amount) => {
    setProducts(prevProducts => prevProducts.map(p => p.id === productId ? { ...p, quantity: p.quantity + amount } : p));
  };

  const handleClearanceDiscount = (productId, discountAmount) => {
    setProducts(prevProducts => prevProducts.map(p => p.id === productId ? { ...p, discount: discountAmount } : p));
  };

  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const totalProductsCount = products.length;
  const categoriesList = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / totalProductsCount) * 100)
  })).sort((a, b) => b.count - a.count);

  const normalizeDateStr = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const toLocalDateStr = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dailySales = (() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateStr(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayRevenue = sales
          .filter(s => normalizeDateStr(s.date) === dateStr)
          .reduce((acc, s) => {
            if (vendor === 'all') return acc + (s.totalPrice || 0);
            const vendorSum = (s.items || []).reduce((sum, item) => {
              const prod = products.find(p => p.id === item.id);
              return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
            }, 0);
            return acc + vendorSum;
          }, 0);
      result.push({ day: dayLabel, amount: dayRevenue });
    }
    return result;
  })();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={styles.container}>
      
      {/* Top Welcome Title */}
      <motion.div variants={itemVariants} style={styles.welcomeRow}>
        <div>
          <h1 style={styles.pageTitle}>{storeSettings?.storeName || 'Control Center'}</h1>
          <p style={styles.pageSubtitle}>{storeSettings?.storeAddress || 'Real-time metrics and operations intelligence.'}</p>
        </div>
        <motion.button 
          onClick={() => setActiveTab('pos')} 
          className="btn btn-primary" 
          style={styles.posShortcut}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ShoppingBag size={18} />
          <span>Launch POS</span>
        </motion.button>
      </motion.div>

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Revenue</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'var(--color-primary-light)' }}>
              <IndianRupee size={22} color="var(--color-primary)" />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={styles.kpiValue} className="font-mono">
              {storeSettings?.currencySymbol || '₹'}{totalRevenue.toFixed(2)}
            </span>
            <span style={styles.kpiChange}>
              <TrendingUp size={16} /> +12.4%
            </span>
          </div>
          <span style={styles.kpiSubtext}>Calculated from {totalBills} sales invoices</span>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Invoices Printed</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
              <Receipt size={22} color="#6366f1" />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={styles.kpiValue} className="font-mono">{totalBills}</span>
            <span style={styles.kpiSubtext2}>Active records</span>
          </div>
          <span style={styles.kpiSubtext}>Stock values auto-deducted</span>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Product SKUs</span>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
              <PackageCheck size={22} color="var(--color-success)" />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={styles.kpiValue} className="font-mono">{totalProducts}</span>
            <span style={styles.kpiSubtext2}>In {categoryCounts ? Object.keys(categoryCounts).length : 0} categories</span>
          </div>
          <span style={styles.kpiSubtext}>Check catalog status in real-time</span>
        </motion.div>

        <motion.div 
          variants={itemVariants} 
          whileHover={{ y: -6, scale: 1.02 }}
          style={{
            ...styles.kpiCard,
            border: (lowStockCount > 0 || expiredCount > 0) ? '1px solid var(--color-danger)' : undefined,
          }} 
          className="glass-panel"
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Security & Alerts</span>
            <div style={{ 
              ...styles.kpiIconBox, 
              backgroundColor: (lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger-light)' : 'var(--color-success-light)' 
            }}>
              <AlertTriangle size={22} color={(lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger)' : 'var(--color-success)'} />
            </div>
          </div>
          <div style={styles.kpiValRow}>
            <span style={{ 
              ...styles.kpiValue,
              color: (lowStockCount > 0 || expiredCount > 0) ? 'var(--color-danger)' : 'var(--color-text-primary)'
            }} className="font-mono">
              Low: {lowStockCount} | Exp: {expiredCount}
            </span>
          </div>
          <span style={styles.kpiSubtext}>
            {expiringSoonCount} items expiring in {storeSettings?.expiryWarningDays || 30} days
          </span>
        </motion.div>
      </div>

      {/* Top Row: Chart & Categories */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {/* Sales Trend Chart Card */}
        <motion.div variants={itemVariants} style={{...styles.chartCard, flex: '2 1 600px', gridColumn: 'unset'}} className="glass-panel">
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Velocity Trend</h2>
              <span style={styles.cardInfo}>Weekly sales turnover</span>
            </div>
            <div style={styles.chartAction}>
               <Activity size={20} color="var(--color-primary)" />
            </div>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis 
                  dataKey="day" 
                  stroke="var(--color-text-secondary)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <Tooltip 
                  content={<CustomTooltip currencySymbol={storeSettings?.currencySymbol || '₹'} />}
                  cursor={{ stroke: 'var(--color-primary)', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#dashboardChartGradient)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Inventory Categories Card */}
        <motion.div variants={itemVariants} style={{...styles.categoriesCard, flex: '1 1 300px', gridColumn: 'unset'}} className="glass-panel">
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Inventory Categories</h2>
              <span style={styles.cardInfo}>Distribution of items in warehouse</span>
            </div>
          </div>
          <div style={styles.categoriesList}>
            {categoriesList.map((cat, idx) => {
              const catColors = [
                'var(--color-primary)', 
                'var(--color-success)', 
                'var(--color-text-muted)', 
                'var(--color-warning)', 
                'var(--color-danger)'
              ];
              return (
                <div key={idx} style={styles.catItem}>
                  <div style={styles.catHeader}>
                    <span style={styles.catName}>{cat.name}</span>
                    <span style={styles.catStat} className="font-mono">{cat.count} items ({cat.percentage}%)</span>
                  </div>
                  <div style={styles.progressContainer}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ 
                        ...styles.progressBar, 
                        backgroundColor: catColors[idx % catColors.length]
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Main Charts & Lists Grid */}
      <div style={styles.mainGrid}>
        {/* Payment Channels Share Card */}
        {(() => {
          const paymentMethodStats = filteredSales.reduce((acc, sale) => {
            const method = sale.paymentMethod || 'Cash';
            const revenueVal = vendor === 'all'
              ? sale.totalPrice
              : sale.items.reduce((sum, item) => {
                  const prod = products.find(p => p.id === item.id);
                  return prod && prod.vendor === vendor ? sum + item.lineTotal : sum;
                }, 0);
            acc[method] = (acc[method] || 0) + revenueVal;
            return acc;
          }, {});

          const totalPayments = Object.values(paymentMethodStats).reduce((sum, v) => sum + v, 0);
          const paymentStatsList = ['Cash', 'Card', 'UPI'].map(name => {
            const amount = paymentMethodStats[name] || 0;
            const percentage = totalPayments > 0 ? Math.round((amount / totalPayments) * 100) : 0;
            return { name, amount, percentage };
          });

          return (
            <motion.div variants={itemVariants} style={styles.categoriesCard} className="glass-panel">
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Payment Channels</h2>
                  <span style={styles.cardInfo}>Revenue share by billing route</span>
                </div>
              </div>
              <div style={styles.categoriesList}>
                {paymentStatsList.map((pay, idx) => (
                  <div key={idx} style={styles.catItem}>
                    <div style={styles.catHeader}>
                      <span style={styles.catName}>{pay.name}</span>
                      <span style={styles.catStat} className="font-mono">{storeSettings?.currencySymbol || '₹'}{pay.amount.toFixed(2)} ({pay.percentage}%)</span>
                    </div>
                    <div style={styles.progressContainer}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pay.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ 
                          ...styles.progressBar, 
                          backgroundColor: pay.name === 'UPI' ? 'var(--color-primary)' : pay.name === 'Card' ? 'var(--color-success)' : 'var(--color-text-muted)'
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* Low Stock Alerts Replenishment Console */}
        <motion.div variants={itemVariants} style={styles.alertsCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Replenishment Alerts</h2>
              <span style={styles.cardInfo}>Low stock items requiring updates</span>
            </div>
          </div>
          
          {lowStockItems.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Inbox size={48} color="var(--color-border)" strokeWidth={1} />
              <p style={styles.emptyAlertsText}>All inventory items are healthy.</p>
            </div>
          ) : (
            <div style={styles.alertsList}>
              {lowStockItems.map((item) => (
                <div key={item.id} style={styles.alertItem} className="glass">
                  <div style={styles.alertInfo}>
                    <span style={styles.alertName}>{item.name}</span>
                    <div style={styles.alertSub}>
                      <span style={styles.alertSku}>{item.id}</span>
                      <span style={styles.divider}>•</span>
                      <span style={{ 
                        color: item.quantity === 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                        fontWeight: '700'
                      }}>
                        {item.quantity === 0 ? 'OUT OF STOCK' : <><span className="font-mono">{item.quantity}</span> units left</>}
                      </span>
                    </div>
                  </div>
                  {role === 'admin' && (
                    <div style={styles.alertActions}>
                      <button 
                        onClick={() => handleQuickRestock(item.id, 10)} 
                        style={styles.actionBtn} 
                        className="btn-secondary"
                      >
                        <PlusCircle size={14} /> 10
                      </button>
                      <button 
                        onClick={() => handleQuickRestock(item.id, 50)} 
                        style={{...styles.actionBtn, backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)'}} 
                      >
                        <PlusCircle size={14} /> 50
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Expired Products Console */}
        <motion.div variants={itemVariants} style={styles.alertsCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <div>
              <h2 style={{...styles.cardTitle, color: 'var(--color-danger)'}}>Expired Products</h2>
              <span style={styles.cardInfo}>Items requiring immediate disposal</span>
            </div>
          </div>
          
          {expiredProducts.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Clock size={48} color="var(--color-border)" strokeWidth={1} />
              <p style={styles.emptyAlertsText}>No expired products.</p>
            </div>
          ) : (
            <div style={styles.alertsList}>
              {expiredProducts.map((item) => (
                <div key={item.id} style={{ ...styles.alertItem, borderColor: 'var(--color-danger)' }} className="glass">
                  <div style={styles.alertInfo}>
                    <span style={{ ...styles.alertName, color: 'var(--color-danger)' }}>{item.name}</span>
                    <div style={styles.alertSub}>
                      <span style={{ color: 'var(--color-danger)', fontWeight: '700' }}>EXPIRED: {item.expiryDate}</span>
                    </div>
                  </div>
                  <span className="badge badge-danger" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.2)'}}>DISPOSE</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Expiring Soon Console */}
        <motion.div variants={itemVariants} style={styles.alertsCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Expiring Soon</h2>
              <span style={styles.cardInfo}>Approaching expiration & markdown clearance</span>
            </div>
          </div>
          
          {expiringSoonProducts.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Clock size={48} color="var(--color-border)" strokeWidth={1} />
              <p style={styles.emptyAlertsText}>No upcoming expirations.</p>
            </div>
          ) : (
            <div style={styles.alertsList}>
              {expiringSoonProducts.map((item) => {
                const exp = new Date(item.expiryDate);
                const td = new Date(today);
                const diffDays = Math.ceil((exp - td) / (1000 * 60 * 60 * 24));
                return (
                  <div key={item.id} style={{ ...styles.alertItem, borderColor: 'var(--color-warning)' }} className="glass">
                    <div style={styles.alertInfo}>
                      <span style={styles.alertName}>{item.name}</span>
                      <div style={styles.alertSub}>
                        <span style={styles.alertSku}>{item.id}</span>
                        <span style={styles.divider}>•</span>
                        <span style={{ color: 'var(--color-warning)', fontWeight: '700' }}>Expires in {diffDays}d</span>
                        {item.discount > 0 && (
                          <>
                            <span style={styles.divider}>•</span>
                            <span style={{ color: 'var(--color-success)', fontWeight: '700' }}>{item.discount}% off</span>
                          </>
                        )}
                      </div>
                    </div>
                    {role === 'admin' && (
                      <div style={styles.alertActions}>
                        <button onClick={() => { handleClearanceDiscount(item.id, 30); }} style={styles.actionBtn} className="btn-secondary">
                          30%
                        </button>
                        <button onClick={() => { handleClearanceDiscount(item.id, 50); }} style={{...styles.actionBtn, color: 'var(--color-danger)'}} className="btn-secondary">
                          50%
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Invoices Feed */}
        <motion.div variants={itemVariants} style={{...styles.recentFeedCard, gridColumn: '1 / -1'}} className="glass-panel">
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Recent Store Sales</h2>
              <span style={styles.cardInfo}>Latest billing checkout actions</span>
            </div>
          </div>
          
          {filteredSales.length === 0 ? (
            <div style={styles.emptyAlerts}>
              <Receipt size={40} color="var(--color-text-muted)" />
              <p style={styles.emptyAlertsText}>No orders recorded today yet.</p>
            </div>
          ) : (
            <div style={styles.feedList}>
              {filteredSales.slice(-4).reverse().map((sale) => (
                <div key={sale.id} style={styles.feedItem} className="glass">
                  <div style={styles.feedIcon}>
                    <ArrowUpRight size={18} color="var(--color-success)" />
                  </div>
                  <div style={styles.feedInfo}>
                    <span style={styles.feedTitle}>Invoice #{sale.id}</span>
                    <span style={styles.feedSubtitle}>{sale.customerName || 'Walk-in Customer'} • {sale.items.length} items</span>
                  </div>
                  <div style={styles.feedValue}>
                    <span className="font-mono">+{storeSettings?.currencySymbol || '₹'}{sale.totalPrice.toFixed(2)}</span>
                    <span style={styles.feedTime}>{sale.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

const styles = {
  glassTooltip: {
    backgroundColor: 'var(--color-bg-surface-glass)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--color-border)',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-lg)',
  },
  tooltipLabel: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    margin: 0,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tooltipValue: {
    fontSize: '1.25rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-primary)',
    fontWeight: '800',
    margin: '0.25rem 0 0 0',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
  },
  welcomeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  pageTitle: {
    fontSize: '2.5rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    letterSpacing: '-0.04em',
    lineHeight: '1.1',
    background: 'linear-gradient(90deg, var(--color-text-primary), var(--color-primary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  pageSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '1rem',
    fontWeight: '500',
    marginTop: '0.25rem'
  },
  posShortcut: {
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    boxShadow: '0 8px 20px var(--color-primary-glow)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  kpiCard: {
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
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
    letterSpacing: '0.05em',
  },
  kpiIconBox: {
    display: 'flex',
    padding: '0.6rem',
    borderRadius: '12px',
  },
  kpiValRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  kpiValue: {
    fontSize: '2.25rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.02em',
  },
  kpiChange: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    backgroundColor: 'var(--color-success-light)',
    padding: '0.25rem 0.6rem',
    borderRadius: '20px',
  },
  kpiSubtext: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  kpiSubtext2: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '600',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '1.5rem',
  },
  chartCard: {
    gridColumn: '1 / -1',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  categoriesCard: {
    gridColumn: 'span 1',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  alertsCard: {
    gridColumn: 'span 1',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxHeight: '420px',
    overflowY: 'auto',
  },
  recentFeedCard: {
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(150, 150, 150, 0.15)',
    paddingBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  cardInfo: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
    marginTop: '0.25rem',
    display: 'block'
  },
  chartWrapper: {
    width: '100%',
    height: '100%',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  catItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  catHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9375rem',
  },
  catName: {
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  catStat: {
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
  },
  progressContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '4px',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
  },
  alertInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  alertName: {
    fontSize: '0.9375rem',
    fontWeight: '700',
  },
  alertSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  alertSku: {
    fontFamily: 'monospace',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.1rem 0.3rem',
    borderRadius: '4px',
  },
  divider: {
    color: 'var(--color-border)',
  },
  alertActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    padding: '0.4rem 0.75rem',
    fontSize: '0.8125rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.15s ease',
  },
  emptyAlerts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '3rem 0',
    color: 'var(--color-text-muted)',
  },
  emptyAlertsText: {
    fontSize: '1rem',
    fontWeight: '600',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  feedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.875rem',
    borderRadius: 'var(--radius-md)',
    transition: 'transform 0.2s',
  },
  feedIcon: {
    display: 'flex',
    padding: '0.6rem',
    borderRadius: '10px',
    backgroundColor: 'var(--color-success-light)',
  },
  feedInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '0.15rem'
  },
  feedTitle: {
    fontSize: '1rem',
    fontWeight: '700',
  },
  feedSubtitle: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  feedValue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontSize: '1.125rem',
    fontWeight: '800',
    color: 'var(--color-success)',
  },
  feedTime: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  }
};
