import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Users,
  Zap,
  Target
} from 'lucide-react';

export default function Reports({ products, sales, storeSettings, vendor }) {
  const [dateRange, setDateRange] = useState('30'); // days

  const sym = storeSettings?.currencySymbol || '$';

  // Today as dynamic
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Filter sales by date range
  const rangedSales = useMemo(() => {
    if (dateRange === 'all') return sales;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange, 10));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return sales.filter(s => (s.date || s.timestamp || todayStr) >= cutoffStr);
  }, [sales, dateRange, todayStr]);

  // Vendor-filtered sales
  const filteredSales = useMemo(() => {
    if (vendor === 'all') return rangedSales;
    return rangedSales.filter(s =>
      s.items?.some(item => {
        const prod = products.find(p => p.id === item.id);
        return prod && prod.vendor === vendor;
      })
    );
  }, [rangedSales, vendor, products]);

  // Core financial metrics
  const totalRevenue = useMemo(() => {
    if (vendor === 'all') return filteredSales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
    return filteredSales.reduce((acc, s) => {
      const vendorSum = (s.items || []).reduce((sum, item) => {
        const prod = products.find(p => p.id === item.id);
        return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
      }, 0);
      return acc + vendorSum;
    }, 0);
  }, [filteredSales, vendor, products]);

  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      return acc + (s.items || []).reduce((sum, item) => {
        const prod = products.find(p => p.id === item.id);
        if (!prod) return sum;
        if (vendor !== 'all' && prod.vendor !== vendor) return sum;
        return sum + ((prod.costPrice || 0) * item.quantity);
      }, 0);
    }, 0);
  }, [filteredSales, vendor, products]);

  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Daily revenue for chart (last 14 days)
  const dailyRevenue = useMemo(() => {
    const days = parseInt(Math.min(dateRange, 14), 10) || 14;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayRevenue = sales
        .filter(s => (s.date || todayStr) === dateStr)
        .reduce((acc, s) => acc + (s.totalPrice || 0), 0);
      result.push({ date: dateStr, label: dayLabel, revenue: dayRevenue });
    }
    return result;
  }, [sales, dateRange, todayStr]);

  // Category performance
  const categoryStats = useMemo(() => {
    const stats = {};
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (!prod) return;
        if (vendor !== 'all' && prod.vendor !== vendor) return;
        const cat = prod.category || 'Uncategorized';
        if (!stats[cat]) stats[cat] = { revenue: 0, units: 0, orders: 0, cost: 0 };
        stats[cat].revenue += item.lineTotal || 0;
        stats[cat].units += item.quantity || 0;
        stats[cat].cost += (prod.costPrice || 0) * (item.quantity || 0);
      });
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        units: data.units,
        cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, vendor, products]);

  const totalCategoryRevenue = categoryStats.reduce((acc, c) => acc + c.revenue, 0);

  // Top selling products
  const topProducts = useMemo(() => {
    const stats = {};
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (!prod) return;
        if (vendor !== 'all' && prod.vendor !== vendor) return;
        if (!stats[item.id]) stats[item.id] = { name: prod.name, units: 0, revenue: 0, category: prod.category };
        stats[item.id].units += item.quantity || 0;
        stats[item.id].revenue += item.lineTotal || 0;
      });
    });
    return Object.entries(stats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredSales, vendor, products]);

  // Payment channel distribution
  const paymentStats = useMemo(() => {
    const stats = { Cash: 0, Card: 0, UPI: 0 };
    filteredSales.forEach(s => {
      const method = s.paymentMethod || 'Cash';
      stats[method] = (stats[method] || 0) + (s.totalPrice || 0);
    });
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return Object.entries(stats).map(([name, amount]) => ({
      name,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0
    }));
  }, [filteredSales]);

  // Inventory health stats
  const inventoryHealth = useMemo(() => {
    const fp = vendor === 'all' ? products : products.filter(p => p.vendor === vendor);
    const threshold = storeSettings?.lowStockThreshold || 10;
    const warningDays = storeSettings?.expiryWarningDays || 30;
    return {
      total: fp.length,
      inStock: fp.filter(p => p.quantity > threshold).length,
      lowStock: fp.filter(p => p.quantity > 0 && p.quantity <= threshold).length,
      outOfStock: fp.filter(p => p.quantity === 0).length,
      expired: fp.filter(p => p.expiryDate && p.expiryDate < todayStr).length,
      expiringSoon: fp.filter(p => {
        if (!p.expiryDate || p.expiryDate < todayStr) return false;
        const diff = Math.ceil((new Date(p.expiryDate) - today) / (1000 * 60 * 60 * 24));
        return diff <= warningDays;
      }).length,
      totalValue: fp.reduce((acc, p) => acc + (p.costPrice || 0) * p.quantity, 0)
    };
  }, [products, vendor, storeSettings, todayStr]);

  // Bar chart for daily revenue
  const chartHeight = 180;
  const chartPad = 40;
  const chartW = 600;
  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);
  const barWidth = Math.max(4, Math.floor((chartW - chartPad * 2) / dailyRevenue.length) - 6);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Invoice ID', 'Date', 'Customer', 'Payment', 'Items', 'Total'],
      ...filteredSales.map(s => [
        s.id,
        s.date || '',
        s.customerName || 'Walk-in',
        s.paymentMethod || 'Cash',
        (s.items || []).length,
        (s.totalPrice || 0).toFixed(2)
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `ApexCart_Sales_Report_${todayStr}.csv`;
    a.click();
  };

  const CATEGORY_COLORS = [
    'var(--color-primary)',
    'var(--color-success)',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
  ];

  return (
    <div style={styles.container} className="animate-fade">
      {/* Header Row */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Analytics &amp; Reports</h1>
          <p style={styles.pageSubtitle}>
            {vendor === 'all' ? 'Store-wide performance metrics' : `Metrics for ${vendor}`} · Real-time data
          </p>
        </div>
        <div style={styles.headerActions}>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="input-field"
            style={styles.dateSelect}
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={handleExportCSV} className="btn btn-secondary" style={styles.exportBtn}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard} className="card glow">
          <div style={styles.kpiIcon} className="kpi-icon-revenue">
            <DollarSign size={22} color="var(--color-success)" />
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiLabel}>Total Revenue</span>
            <span style={styles.kpiValue}>{sym}{totalRevenue.toFixed(2)}</span>
            <span style={{ ...styles.kpiBadge, color: 'var(--color-success)' }}>
              <ArrowUpRight size={12} /> from {totalOrders} orders
            </span>
          </div>
        </div>
        <div style={styles.kpiCard} className="card">
          <div style={styles.kpiIcon} className="kpi-icon-profit">
            <TrendingUp size={22} color="var(--color-primary)" />
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiLabel}>Gross Profit</span>
            <span style={styles.kpiValue}>{sym}{grossProfit.toFixed(2)}</span>
            <span style={{ ...styles.kpiBadge, color: grossMargin > 20 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {grossMargin}% margin
            </span>
          </div>
        </div>
        <div style={styles.kpiCard} className="card">
          <div style={styles.kpiIcon} className="kpi-icon-avg">
            <ShoppingBag size={22} color="#8b5cf6" />
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiLabel}>Avg Order Value</span>
            <span style={styles.kpiValue}>{sym}{avgOrderValue.toFixed(2)}</span>
            <span style={{ ...styles.kpiBadge, color: 'var(--color-text-muted)' }}>per transaction</span>
          </div>
        </div>
        <div style={styles.kpiCard} className="card">
          <div style={styles.kpiIcon} className="kpi-icon-inv">
            <Package size={22} color="#f59e0b" />
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiLabel}>Inventory Value</span>
            <span style={styles.kpiValue}>{sym}{inventoryHealth.totalValue.toFixed(0)}</span>
            <span style={{ ...styles.kpiBadge, color: 'var(--color-text-muted)' }}>{inventoryHealth.total} SKUs tracked</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart + Category Breakdown */}
      <div style={styles.chartRow}>
        {/* Revenue Trend Bar Chart */}
        <div style={{ ...styles.chartCard, flex: 3 }} className="card">
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleRow}>
              <BarChart3 size={20} color="var(--color-primary)" />
              <h2 style={styles.cardTitle}>Daily Revenue Trend</h2>
            </div>
            <span style={styles.cardSubtext}>Last {Math.min(dateRange, 14)} days</span>
          </div>
          <div style={styles.svgWrap}>
            <svg viewBox={`0 0 ${chartW} ${chartHeight + 30}`} style={{ width: '100%', height: 'auto' }}>
              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = chartPad + (1 - pct) * (chartHeight - chartPad);
                return (
                  <g key={i}>
                    <line x1={chartPad} y1={y} x2={chartW - chartPad / 2} y2={y}
                      stroke="var(--color-border)" strokeDasharray="3" strokeWidth="1" />
                    <text x={chartPad - 5} y={y + 4} fontSize="9" textAnchor="end"
                      fill="var(--color-text-muted)" fontWeight="600">
                      {sym}{Math.round(maxRevenue * pct)}
                    </text>
                  </g>
                );
              })}
              {/* Bars */}
              {dailyRevenue.map((d, i) => {
                const x = chartPad + i * ((chartW - chartPad * 2) / dailyRevenue.length) + 3;
                const barH = dailyRevenue.length > 0 ? (d.revenue / maxRevenue) * (chartHeight - chartPad) : 0;
                const y = chartHeight - barH;
                const isToday = d.date === todayStr;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barH, 2)}
                      rx="3"
                      fill={isToday ? 'var(--color-primary)' : 'var(--color-primary)'}
                      opacity={isToday ? 1 : 0.55}
                    />
                    {d.revenue > 0 && (
                      <text x={x + barWidth / 2} y={y - 4} fontSize="8" textAnchor="middle"
                        fill="var(--color-text-primary)" fontWeight="700">
                        {sym}{d.revenue.toFixed(0)}
                      </text>
                    )}
                    <text x={x + barWidth / 2} y={chartHeight + 16} fontSize="8" textAnchor="middle"
                      fill="var(--color-text-muted)" fontWeight="600">
                      {d.label.replace(/^\w+ /, '')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Payment Channel Donut */}
        <div style={{ ...styles.chartCard, flex: 1 }} className="card">
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleRow}>
              <PieChart size={20} color="var(--color-primary)" />
              <h2 style={styles.cardTitle}>Payment Channels</h2>
            </div>
          </div>
          <div style={styles.paymentList}>
            {paymentStats.map((pay, idx) => {
              const colors = ['var(--color-text-muted)', 'var(--color-success)', 'var(--color-primary)'];
              return (
                <div key={pay.name} style={styles.paymentRow}>
                  <div style={styles.paymentLeft}>
                    <div style={{ ...styles.payDot, backgroundColor: colors[idx] }} />
                    <span style={styles.payName}>{pay.name}</span>
                  </div>
                  <div style={styles.payRight}>
                    <span style={styles.payAmt}>{sym}{pay.amount.toFixed(2)}</span>
                    <span style={{ ...styles.payPct, color: colors[idx] }}>{pay.pct}%</span>
                  </div>
                  <div style={styles.payBarWrap}>
                    <div style={{ ...styles.payBar, width: `${pay.pct}%`, backgroundColor: colors[idx] }} />
                  </div>
                </div>
              );
            })}
            {paymentStats.every(p => p.amount === 0) && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', textAlign: 'center', marginTop: '2rem' }}>
                No sales recorded in this period.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Performance + Top Products */}
      <div style={styles.tableRow}>
        {/* Category Performance Table */}
        <div style={{ ...styles.tableCard, flex: 1 }} className="card">
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleRow}>
              <Target size={20} color="var(--color-primary)" />
              <h2 style={styles.cardTitle}>Category Performance</h2>
            </div>
          </div>
          {categoryStats.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0', textAlign: 'center' }}>
              No sales data in this period.
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Units Sold</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Profit</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((cat, idx) => {
                    const barPct = totalCategoryRevenue > 0 ? Math.round((cat.revenue / totalCategoryRevenue) * 100) : 0;
                    return (
                      <tr key={cat.name} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], flexShrink: 0 }} />
                            <span style={styles.catName}>{cat.name}</span>
                          </div>
                          <div style={styles.catBarOuter}>
                            <div style={{ ...styles.catBarInner, width: `${barPct}%`, backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                          </div>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }}>{sym}{cat.revenue.toFixed(2)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{cat.units}</td>
                        <td style={{ ...styles.td, textAlign: 'right', color: cat.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: '700' }}>
                          {cat.profit >= 0 ? '+' : ''}{sym}{cat.profit.toFixed(2)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <span style={{
                            ...styles.marginBadge,
                            color: parseFloat(cat.margin) > 20 ? 'var(--color-success)' : parseFloat(cat.margin) > 10 ? 'var(--color-warning)' : 'var(--color-danger)',
                            backgroundColor: parseFloat(cat.margin) > 20 ? 'var(--color-success-light)' : parseFloat(cat.margin) > 10 ? 'var(--color-warning-light)' : 'var(--color-danger-light)'
                          }}>
                            {cat.margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div style={{ ...styles.tableCard, flex: 1 }} className="card">
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleRow}>
              <Zap size={20} color="var(--color-primary)" />
              <h2 style={styles.cardTitle}>Top Selling Products</h2>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0', textAlign: 'center' }}>
              No products sold in this period.
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Product</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Units</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((prod, idx) => (
                    <tr key={prod.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: 'var(--color-text-muted)', width: '30px', fontWeight: '800' }}>
                        {idx + 1}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.prodName}>{prod.name}</div>
                        <span style={styles.prodCat}>{prod.category}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }}>
                        {sym}{prod.revenue.toFixed(2)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {prod.units} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Health Row */}
      <div className="card" style={styles.invHealthCard}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleRow}>
            <Package size={20} color="var(--color-primary)" />
            <h2 style={styles.cardTitle}>Inventory Health Snapshot</h2>
          </div>
        </div>
        <div style={styles.invGrid}>
          {[
            { label: 'Total SKUs', value: inventoryHealth.total, color: 'var(--color-text-primary)' },
            { label: 'In Stock', value: inventoryHealth.inStock, color: 'var(--color-success)' },
            { label: 'Low Stock', value: inventoryHealth.lowStock, color: 'var(--color-warning)' },
            { label: 'Out of Stock', value: inventoryHealth.outOfStock, color: 'var(--color-danger)' },
            { label: 'Expired', value: inventoryHealth.expired, color: 'var(--color-danger)' },
            { label: 'Expiring Soon', value: inventoryHealth.expiringSoon, color: 'var(--color-warning)' },
            { label: 'Inventory Value', value: `${sym}${inventoryHealth.totalValue.toFixed(0)}`, color: 'var(--color-primary)' },
          ].map(item => (
            <div key={item.label} style={styles.invStat}>
              <span style={{ ...styles.invStatValue, color: item.color }}>{item.value}</span>
              <span style={styles.invStatLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .kpi-icon-revenue { background-color: var(--color-success-light) !important; }
        .kpi-icon-profit { background-color: var(--color-primary-light) !important; }
        .kpi-icon-avg { background-color: rgba(139, 92, 246, 0.1) !important; }
        .kpi-icon-inv { background-color: rgba(245, 158, 11, 0.1) !important; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginTop: '0.25rem',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dateSelect: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    minWidth: '140px',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  kpiCard: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    padding: '1.25rem',
  },
  kpiIcon: {
    display: 'flex',
    padding: '0.65rem',
    borderRadius: 'var(--radius-md)',
    flexShrink: 0,
  },
  kpiBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '1.625rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    color: 'var(--color-text-primary)',
    lineHeight: '1.1',
  },
  kpiBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
  },
  chartRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  chartCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minWidth: '200px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--color-border)',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
  },
  cardSubtext: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  svgWrap: {
    width: '100%',
    overflowX: 'auto',
  },
  paymentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginTop: '0.5rem',
  },
  paymentRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  paymentLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  payDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  payName: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  payRight: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payAmt: {
    fontSize: '0.875rem',
    fontWeight: '800',
  },
  payPct: {
    fontSize: '0.75rem',
    fontWeight: '800',
  },
  payBarWrap: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'var(--color-border)',
    overflow: 'hidden',
  },
  payBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  tableRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minWidth: '200px',
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
    padding: '0.5rem 0.75rem',
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
    transition: 'background 0.15s',
  },
  td: {
    padding: '0.6rem 0.75rem',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  },
  catName: {
    fontWeight: '600',
    fontSize: '0.8125rem',
  },
  catBarOuter: {
    marginTop: '4px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-border)',
    overflow: 'hidden',
  },
  catBarInner: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.4s ease',
  },
  marginBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.6875rem',
    fontWeight: '800',
  },
  prodName: {
    fontWeight: '600',
    fontSize: '0.8125rem',
    lineHeight: '1.2',
  },
  prodCat: {
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  invHealthCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  invGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem',
  },
  invStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
    gap: '0.35rem',
  },
  invStatValue: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
  },
  invStatLabel: {
    fontSize: '0.6875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--color-text-muted)',
  }
};
