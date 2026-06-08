import { useMemo, useState } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Package,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  ShoppingBag,
  Target,
  Zap,
  Clock,
  Activity,
  FileText,
  AlertTriangle,
  Search
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

// Helper to parse GB format (dd/mm/yyyy) or Standard (yyyy-mm-dd) to standard string format
const getStandardDateStr = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
};

// Helper to check if a date is within N days
const isWithinDays = (dateStr, days, todayDate) => {
  const stdDate = getStandardDateStr(dateStr);
  if (!stdDate) return false;
  const d = new Date(stdDate);
  d.setHours(0,0,0,0);
  const referenceDate = new Date(todayDate);
  referenceDate.setHours(0,0,0,0);
  const diffTime = referenceDate - d;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
};

const CustomTooltip = ({ active, payload, label, currencySymbol }) => {
  if (active && payload && payload.length) {
    return (
      <div style={styles.glassTooltip}>
        <p style={styles.tooltipLabel}>{label}</p>
        <p style={styles.tooltipValue} className="font-mono">
          {currencySymbol}{payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Reports({ products, sales, storeSettings, vendor, currentStore }) {
  const [activeReportTab, setActiveReportTab] = useState('dashboard'); // 'dashboard', 'forecasting'
  const [dateRange, setDateRange] = useState('30'); // days
  const [forecastSearch, setForecastSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  // Today as dynamic
  const today = useMemo(() => new Date(), []);
  
  // Local timezone date string helper
  const toISOStringLocalDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = toISOStringLocalDate(today);

  // Filter sales by currentStore and date range
  const rangedSales = useMemo(() => {
    const storeFiltered = sales.filter(s => s.store === currentStore);
    if (dateRange === 'all') return storeFiltered;
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange, 10));
    const cutoffStr = toISOStringLocalDate(cutoff);
    
    return storeFiltered.filter(s => getStandardDateStr(s.date) >= cutoffStr);
  }, [sales, currentStore, dateRange]);

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

  // Static reference metrics: Revenue Today, Week, Month
  const statsTodayWeekMonth = useMemo(() => {
    const storeSales = sales.filter(s => s.store === currentStore);
    const vendorSales = vendor === 'all' 
      ? storeSales 
      : storeSales.filter(s => s.items?.some(item => {
          const prod = products.find(p => p.id === item.id);
          return prod && prod.vendor === vendor;
        }));
    
    let todayRev = 0;
    let weekRev = 0;
    let monthRev = 0;
    
    vendorSales.forEach(s => {
      const stdDateStr = getStandardDateStr(s.date);
      
      const rev = vendor === 'all' 
        ? (s.totalPrice || 0)
        : (s.items || []).reduce((sum, item) => {
            const prod = products.find(p => p.id === item.id);
            return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
          }, 0);
          
      if (stdDateStr === todayStr) {
        todayRev += rev;
      }
      if (isWithinDays(s.date, 7, today)) {
        weekRev += rev;
      }
      if (isWithinDays(s.date, 30, today)) {
        monthRev += rev;
      }
    });
    
    return { today: todayRev, week: weekRev, month: monthRev };
  }, [sales, products, currentStore, vendor, todayStr, today]);

  // Core financial metrics (for selected date range)
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
    const days = parseInt(Math.min(dateRange === 'all' ? 14 : dateRange, 14), 10) || 14;
    const result = [];
    const storeSales = sales.filter(s => s.store === currentStore);
    const vendorSales = vendor === 'all'
      ? storeSales
      : storeSales.filter(s => s.items?.some(item => {
          const prod = products.find(p => p.id === item.id);
          return prod && prod.vendor === vendor;
        }));

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toISOStringLocalDate(d);
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayRevenue = vendorSales
        .filter(s => getStandardDateStr(s.date) === dateStr)
        .reduce((acc, s) => {
          const rev = vendor === 'all' 
            ? (s.totalPrice || 0)
            : (s.items || []).reduce((sum, item) => {
                const prod = products.find(p => p.id === item.id);
                return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
              }, 0);
          return acc + rev;
        }, 0);
      result.push({ date: dateStr, label: dayLabel, revenue: dayRevenue });
    }
    return result;
  }, [sales, dateRange, currentStore, vendor, products]);

  // Category performance
  const categoryStats = useMemo(() => {
    const stats = {};
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (!prod) return;
        if (vendor !== 'all' && prod.vendor !== vendor) return;
        const cat = prod.category || 'Uncategorized';
        if (!stats[cat]) stats[cat] = { revenue: 0, units: 0, cost: 0 };
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
      .slice(0, 5);
  }, [filteredSales, vendor, products]);

  // Best Profit Margins products list
  const profitMarginProducts = useMemo(() => {
    let fp = products.filter(p => p.store === currentStore);
    if (vendor !== 'all') fp = fp.filter(p => p.vendor === vendor);
    
    return fp
      .map(p => {
        const cost = p.costPrice || 0;
        const price = p.price || 0;
        const margin = price > 0 ? ((price - cost) / price * 100) : 0;
        return {
          ...p,
          margin: margin.toFixed(1),
          profitPerUnit: price - cost
        };
      })
      .filter(p => p.price > 0 && p.costPrice > 0)
      .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin))
      .slice(0, 5);
  }, [products, currentStore, vendor]);

  // Payment channel distribution
  const paymentStats = useMemo(() => {
    const stats = { Cash: 0, Card: 0, UPI: 0 };
    filteredSales.forEach(s => {
      const method = s.paymentMethod || 'Cash';
      const amt = vendor === 'all' 
        ? (s.totalPrice || 0)
        : (s.items || []).reduce((sum, item) => {
            const prod = products.find(p => p.id === item.id);
            return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
          }, 0);
      stats[method] = (stats[method] || 0) + amt;
    });
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return Object.entries(stats).map(([name, amount]) => ({
      name,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0
    }));
  }, [filteredSales, products, vendor]);

  // Peak sales hours calculation
  const peakSalesHours = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredSales.forEach(s => {
      if (!s.time) return;
      let hour = 12;
      const timeClean = s.time.trim();
      const parts = timeClean.split(':');
      if (parts.length >= 1) {
        let h = parseInt(parts[0], 10);
        if (isNaN(h)) return;
        if (timeClean.toLowerCase().includes('pm') && h < 12) {
          h += 12;
        } else if (timeClean.toLowerCase().includes('am') && h === 12) {
          h = 0;
        }
        hour = h;
      }
      const rev = vendor === 'all' 
        ? (s.totalPrice || 0)
        : (s.items || []).reduce((sum, item) => {
            const prod = products.find(p => p.id === item.id);
            return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
          }, 0);
      hours[hour] += rev;
    });
    return hours.map((revenue, hour) => ({ 
      hour, 
      label: `${hour.toString().padStart(2, '0')}:00`, 
      revenue 
    }));
  }, [filteredSales, vendor, products]);

  // Inventory health stats
  const inventoryHealth = useMemo(() => {
    const fp = products.filter(p => p.store === currentStore && (vendor === 'all' || p.vendor === vendor));
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
  }, [products, vendor, storeSettings, todayStr, currentStore, today]);

  // Inventory turnover calculation
  const inventoryTurnover = useMemo(() => {
    const currentInventoryVal = inventoryHealth.totalValue || 1;
    const ratio = totalCOGS / currentInventoryVal;
    return ratio.toFixed(2);
  }, [totalCOGS, inventoryHealth.totalValue]);

  // Demand forecasting moving average calculations (14 day velocity)
  const forecastingData = useMemo(() => {
    const storeProducts = products.filter(p => p.store === currentStore);
    const storeSales = sales.filter(s => s.store === currentStore);
    
    let fp = storeProducts;
    if (vendor !== 'all') fp = fp.filter(p => p.vendor === vendor);
    
    const velocityDays = 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - velocityDays);
    const cutoffStr = toISOStringLocalDate(cutoffDate);
    
    const recentSales = storeSales.filter(s => getStandardDateStr(s.date) >= cutoffStr);
    
    const productUnitsSold = {};
    recentSales.forEach(s => {
      (s.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (vendor !== 'all' && prod?.vendor !== vendor) return;
        if (!productUnitsSold[item.id]) productUnitsSold[item.id] = 0;
        productUnitsSold[item.id] += item.quantity || 0;
      });
    });
    
    return fp.map(p => {
      const unitsSold = productUnitsSold[p.id] || 0;
      const salesVelocity = unitsSold / velocityDays; // units sold per day
      const demand7Day = salesVelocity * 7;
      
      let stockoutDays = Infinity;
      let stockoutText = 'Safe (No demand)';
      if (salesVelocity > 0) {
        stockoutDays = p.quantity / salesVelocity;
        if (p.quantity === 0) {
          stockoutText = 'Out of Stock';
        } else {
          stockoutText = `${Math.ceil(stockoutDays)} days`;
        }
      }
      
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        salesVelocity: salesVelocity.toFixed(2),
        demand7Day: Math.ceil(demand7Day),
        stockoutDays,
        stockoutText
      };
    }).sort((a, b) => {
      if (a.quantity === 0 && b.quantity > 0) return -1;
      if (b.quantity === 0 && a.quantity > 0) return 1;
      if (a.stockoutDays === Infinity) return 1;
      if (b.stockoutDays === Infinity) return -1;
      return a.stockoutDays - b.stockoutDays;
    });
  }, [products, sales, currentStore, vendor]);

  const filteredForecast = useMemo(() => {
    return forecastingData.filter(item => 
      item.name.toLowerCase().includes(forecastSearch.toLowerCase()) || 
      item.id.toLowerCase().includes(forecastSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(forecastSearch.toLowerCase())
    );
  }, [forecastingData, forecastSearch]);

  // Exports Handlers
  const handleExportPDF = (reportType) => {
    const doc = new jsPDF();
    const storeNameStr = storeSettings?.storeName || 'ApexCart Supermarket';
    const dateStr = new Date().toLocaleDateString();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(storeNameStr.toUpperCase(), 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Report Generated: ${dateStr} | Store: ${currentStore} | Vendor: ${vendor}`, 14, 26);
    
    if (reportType === 'sales') {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Sales Transactions Analytics Report", 14, 36);
      
      const tableColumn = ["Invoice ID", "Date", "Customer", "Payment", "Items Qty", "Total Price"];
      const tableRows = filteredSales.map(s => [
        s.id,
        s.date || '',
        s.customerName || 'Walk-in',
        s.paymentMethod || 'Cash',
        s.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
        `${sym}${s.totalPrice.toFixed(2)}`
      ]);
      
      doc.autoTable({
        startY: 42,
        head: [tableColumn],
        body: tableRows,
        foot: [["", "", "", "", "Total Revenue:", `${sym}${totalRevenue.toFixed(2)}`]]
      });
      doc.save(`ApexCart_Sales_Report_${currentStore}_${todayStr}.pdf`);
      
    } else if (reportType === 'inventory') {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Inventory Valuation Audit Report", 14, 36);
      
      let fp = products.filter(p => p.store === currentStore && (vendor === 'all' || p.vendor === vendor));
      
      const tableColumn = ["SKU", "Product Name", "Category", "Stock Qty", "Cost Price", "Sell Price", "Asset Value"];
      const tableRows = fp.map(p => [
        p.id,
        p.name,
        p.category,
        p.quantity,
        `${sym}${(p.costPrice || 0).toFixed(2)}`,
        `${sym}${(p.price || 0).toFixed(2)}`,
        `${sym}${((p.costPrice || 0) * p.quantity).toFixed(2)}`
      ]);
      
      doc.autoTable({
        startY: 42,
        head: [tableColumn],
        body: tableRows,
        foot: [["", "", "", "", "", "Total Assets:", `${sym}${inventoryHealth.totalValue.toFixed(2)}`]]
      });
      doc.save(`ApexCart_Inventory_Valuation_${currentStore}_${todayStr}.pdf`);
      
    } else if (reportType === 'gst') {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("GST Tax Liabilities Ledger", 14, 36);
      
      const tableColumn = ["Invoice ID", "Date", "Gross Amount", "Taxable Base", "Discount", "GST Collected"];
      
      let totalSalesAmt = 0;
      let totalGSTCollected = 0;
      
      const tableRows = filteredSales.map(s => {
        const rowGst = vendor === 'all'
          ? (s.totalGST || 0)
          : (s.items || []).reduce((sum, item) => {
              const prod = products.find(p => p.id === item.id);
              if (prod?.vendor !== vendor) return sum;
              const base = (prod.price || 0) * item.quantity;
              return sum + (base * (prod.gst || 0) / 100);
            }, 0);
        
        const rowPrice = vendor === 'all'
          ? (s.totalPrice || 0)
          : (s.items || []).reduce((sum, item) => {
              const prod = products.find(p => p.id === item.id);
              return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
            }, 0);

        totalSalesAmt += rowPrice;
        totalGSTCollected += rowGst;

        return [
          s.id,
          s.date || '',
          `${sym}${rowPrice.toFixed(2)}`,
          `${sym}${(rowPrice - rowGst).toFixed(2)}`,
          `${sym}${(vendor === 'all' ? (s.totalDiscount || 0) : 0).toFixed(2)}`,
          `${sym}${rowGst.toFixed(2)}`
        ];
      });
      
      doc.autoTable({
        startY: 42,
        head: [tableColumn],
        body: tableRows,
        foot: [["Total:", "", `${sym}${totalSalesAmt.toFixed(2)}`, "", "", `${sym}${totalGSTCollected.toFixed(2)}`]]
      });
      doc.save(`ApexCart_GST_Report_${currentStore}_${todayStr}.pdf`);
    }
    setShowExportMenu(false);
  };

  const handleExportExcel = (reportType) => {
    let data = [];
    let fileName = '';
    
    if (reportType === 'sales') {
      data = filteredSales.map(s => ({
        "Invoice ID": s.id,
        "Date": s.date || '',
        "Time": s.time || '',
        "Customer Name": s.customerName || 'Walk-in',
        "Payment Method": s.paymentMethod || 'Cash',
        "Subtotal": s.subtotal || 0,
        "Discount": s.totalDiscount || 0,
        "GST": s.totalGST || 0,
        "Total Price": s.totalPrice || 0
      }));
      fileName = `ApexCart_Sales_${currentStore}_${todayStr}.xlsx`;
      
    } else if (reportType === 'inventory') {
      let fp = products.filter(p => p.store === currentStore && (vendor === 'all' || p.vendor === vendor));
      
      data = fp.map(p => ({
        "SKU": p.id,
        "Product Name": p.name,
        "Category": p.category,
        "Stock Qty": p.quantity,
        "Cost Price": p.costPrice || 0,
        "Sell Price": p.price || 0,
        "Asset Valuation": (p.costPrice || 0) * p.quantity,
        "Expiry Date": p.expiryDate || 'N/A',
        "Vendor Stall": p.vendor || 'General'
      }));
      fileName = `ApexCart_Inventory_${currentStore}_${todayStr}.xlsx`;
      
    } else if (reportType === 'gst') {
      data = filteredSales.map(s => {
        const rowGst = vendor === 'all'
          ? (s.totalGST || 0)
          : (s.items || []).reduce((sum, item) => {
              const prod = products.find(p => p.id === item.id);
              if (prod?.vendor !== vendor) return sum;
              const base = (prod.price || 0) * item.quantity;
              return sum + (base * (prod.gst || 0) / 100);
            }, 0);
        
        const rowPrice = vendor === 'all'
          ? (s.totalPrice || 0)
          : (s.items || []).reduce((sum, item) => {
              const prod = products.find(p => p.id === item.id);
              return prod && prod.vendor === vendor ? sum + (item.lineTotal || 0) : sum;
            }, 0);

        return {
          "Invoice ID": s.id,
          "Date": s.date || '',
          "Gross Sales": rowPrice,
          "Taxable Base": rowPrice - rowGst,
          "GST Amount Collected": rowGst
        };
      });
      fileName = `ApexCart_GST_${currentStore}_${todayStr}.xlsx`;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    
    // Auto column widths
    const maxKeys = Object.keys(data[0] || {});
    worksheet['!cols'] = maxKeys.map(k => ({ wch: Math.max(k.length + 4, 12) }));
    
    XLSX.writeFile(workbook, fileName);
    setShowExportMenu(false);
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={styles.container}
    >
      {/* Header View Selection Tab Bar */}
      <div style={styles.tabHeaderRow}>
        <div style={styles.tabButtonGroup} className="glass">
          <button
            onClick={() => setActiveReportTab('dashboard')}
            style={{
              ...styles.tabLink,
              backgroundColor: activeReportTab === 'dashboard' ? 'var(--color-primary-light)' : 'transparent',
              color: activeReportTab === 'dashboard' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderColor: activeReportTab === 'dashboard' ? 'var(--color-primary)' : 'transparent',
            }}
          >
            <Activity size={16} />
            <span>Sales Analytics Dashboard</span>
          </button>
          <button
            onClick={() => setActiveReportTab('forecasting')}
            style={{
              ...styles.tabLink,
              backgroundColor: activeReportTab === 'forecasting' ? 'var(--color-primary-light)' : 'transparent',
              color: activeReportTab === 'forecasting' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderColor: activeReportTab === 'forecasting' ? 'var(--color-primary)' : 'transparent',
            }}
          >
            <TrendingUp size={16} />
            <span>Demand &amp; Stock Forecasting</span>
          </button>
        </div>

        {/* Global actions */}
        <div style={styles.headerActions}>
          {activeReportTab === 'dashboard' && (
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
          )}

          {/* Export Dropdown Menu */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)} 
              className="btn btn-secondary" 
              style={styles.exportBtn}
            >
              <Download size={16} />
              <span>Export Reports</span>
            </button>
            
            {showExportMenu && (
              <div style={styles.dropdownMenu} className="glass shadow-lg">
                <div style={styles.dropdownHeader}>PDF Formats</div>
                <button onClick={() => handleExportPDF('sales')} style={styles.dropdownItem}>
                  <FileText size={12} /> Sales Ledger (PDF)
                </button>
                <button onClick={() => handleExportPDF('inventory')} style={styles.dropdownItem}>
                  <FileText size={12} /> Inventory Valuation (PDF)
                </button>
                <button onClick={() => handleExportPDF('gst')} style={styles.dropdownItem}>
                  <FileText size={12} /> GST Tax Ledger (PDF)
                </button>
                <div style={styles.dropdownDivider} />
                <div style={styles.dropdownHeader}>Excel Spreadsheets</div>
                <button onClick={() => handleExportExcel('sales')} style={styles.dropdownItem}>
                  <FileText size={12} /> Sales Analysis (Excel)
                </button>
                <button onClick={() => handleExportExcel('inventory')} style={styles.dropdownItem}>
                  <FileText size={12} /> Inventory Sheet (Excel)
                </button>
                <button onClick={() => handleExportExcel('gst')} style={styles.dropdownItem}>
                  <FileText size={12} /> GST Liabilities (Excel)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeReportTab === 'dashboard' ? (
        <>
          {/* Real-time Sales Metrics (Static Reference & Selected Range) */}
          <div style={styles.dashboardStatsGrid}>
            {/* Revenue Today Card */}
            <motion.div variants={itemVariants} whileHover={{ y: -4, boxShadow: 'var(--shadow-glow)' }} style={styles.kpiCard} className="card glow">
              <div style={styles.kpiIcon} className="kpi-icon-revenue">
                <IndianRupee size={20} color="var(--color-success)" />
              </div>
              <div style={styles.kpiBody}>
                <span style={styles.kpiLabel}>Revenue Today</span>
                <span style={styles.kpiValue} className="font-mono">{sym}{statsTodayWeekMonth.today.toFixed(2)}</span>
                <span style={{ ...styles.kpiBadge, color: 'var(--color-text-muted)' }}>current store billing</span>
              </div>
            </motion.div>
            {/* Revenue This Week Card */}
            <motion.div variants={itemVariants} whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }} style={styles.kpiCard} className="card">
              <div style={styles.kpiIcon} className="kpi-icon-revenue">
                <Calendar size={20} color="var(--color-primary)" />
              </div>
              <div style={styles.kpiBody}>
                <span style={styles.kpiLabel}>Revenue (7D)</span>
                <span style={styles.kpiValue} className="font-mono">{sym}{statsTodayWeekMonth.week.toFixed(2)}</span>
                <span style={{ ...styles.kpiBadge, color: 'var(--color-text-muted)' }}>rolling last 7 days</span>
              </div>
            </motion.div>
            {/* Revenue This Month Card */}
            <motion.div variants={itemVariants} whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }} style={styles.kpiCard} className="card">
              <div style={styles.kpiIcon} className="kpi-icon-revenue">
                <ShoppingBag size={20} color="#8b5cf6" />
              </div>
              <div style={styles.kpiBody}>
                <span style={styles.kpiLabel}>Revenue (30D)</span>
                <span style={styles.kpiValue} className="font-mono">{sym}{statsTodayWeekMonth.month.toFixed(2)}</span>
                <span style={{ ...styles.kpiBadge, color: 'var(--color-text-muted)' }}>rolling last 30 days</span>
              </div>
            </motion.div>
            {/* Inventory Turnover Card */}
            <motion.div variants={itemVariants} whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }} style={styles.kpiCard} className="card">
              <div style={styles.kpiIcon} className="kpi-icon-inv">
                <TrendingUp size={20} color="#f59e0b" />
              </div>
              <div style={styles.kpiBody}>
                <span style={styles.kpiLabel}>Inventory Turnover</span>
                <span style={styles.kpiValue} className="font-mono">{inventoryTurnover}x</span>
                <span style={{ ...styles.kpiBadge, color: parseFloat(inventoryTurnover) > 0.5 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  COGS / Inventory Assets
                </span>
              </div>
            </motion.div>
          </div>

          {/* Core range specific KPIs */}
          <div style={styles.kpiRow}>
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={styles.kpiCardMini}>
              <span style={styles.kpiLabelMini}>Selected Range Revenue</span>
              <span style={styles.kpiValueMini} className="font-mono">{sym}{totalRevenue.toFixed(2)}</span>
            </motion.div>
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={styles.kpiCardMini}>
              <span style={styles.kpiLabelMini}>Gross Profit</span>
              <span style={styles.kpiValueMini} className="font-mono">{sym}{grossProfit.toFixed(2)}</span>
            </motion.div>
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={styles.kpiCardMini}>
              <span style={styles.kpiLabelMini}>Margin</span>
              <span style={styles.kpiValueMini} className="font-mono">{grossMargin}%</span>
            </motion.div>
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={styles.kpiCardMini}>
              <span style={styles.kpiLabelMini}>Avg Ticket Value</span>
              <span style={styles.kpiValueMini} className="font-mono">{sym}{avgOrderValue.toFixed(2)}</span>
            </motion.div>
          </div>

          {/* Revenue Trends and Payment Methods */}
          <div style={styles.chartRow}>
            {/* Revenue Trend AreaChart */}
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={{ ...styles.chartCard, flex: 2 }} className="card">
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleRow}>
                  <BarChart3 size={20} color="var(--color-primary)" />
                  <h2 style={styles.cardTitle}>Daily Revenue Trend</h2>
                </div>
                <span style={styles.cardSubtext}>Last {Math.min(dateRange === 'all' ? 14 : dateRange, 14)} days</span>
              </div>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportsDailyChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      stroke="var(--color-text-secondary)" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={5}
                    />
                    <Tooltip 
                      content={<CustomTooltip currencySymbol={sym} />}
                      cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--color-primary)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#reportsDailyChartGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Payment Distribution PieChart */}
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={{ ...styles.chartCard, flex: 1 }} className="card">
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleRow}>
                  <PieChartIcon size={20} color="var(--color-primary)" />
                  <h2 style={styles.cardTitle}>Payment Distribution</h2>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
                <div style={{ width: '100%', height: 110 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {paymentStats.map((entry, index) => {
                          const colors = ['#8b5cf6', 'var(--color-success)', 'var(--color-primary)'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.paymentList}>
                  {paymentStats.map((pay, idx) => {
                    const colors = ['#8b5cf6', 'var(--color-success)', 'var(--color-primary)'];
                    return (
                      <div key={pay.name} style={styles.paymentRow}>
                        <div style={styles.paymentLeft}>
                          <div style={{ ...styles.payDot, backgroundColor: colors[idx] }} />
                          <span style={styles.payName}>{pay.name}</span>
                        </div>
                        <div style={styles.payRight}>
                          <span style={styles.payAmt} className="font-mono">{sym}{pay.amount.toFixed(2)}</span>
                          <span style={{ ...styles.payPct, color: colors[idx] }} className="font-mono">{pay.pct}%</span>
                        </div>
                        <div style={styles.payBarWrap}>
                          <div style={{ ...styles.payBar, width: `${pay.pct}%`, backgroundColor: colors[idx] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Peak Hours Recharts BarChart */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <Clock size={20} color="var(--color-primary)" />
                <h2 style={styles.cardTitle}>Hourly Peak Sales Distribution</h2>
              </div>
              <span style={styles.cardSubtext}>Identifies peak shopping hours</span>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakSalesHours} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="label" 
                    stroke="var(--color-text-secondary)" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip currencySymbol={sym} />}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="var(--color-primary)" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Tables Row (Category Performance, Top Products, Best Profit Margins) */}
          <div style={styles.tableRow}>
            {/* Category Performance */}
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={{ ...styles.tableCard, flex: 1.2 }} className="card">
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleRow}>
                  <Target size={18} color="var(--color-primary)" />
                  <h2 style={styles.cardTitle}>Category Performance</h2>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Category</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], flexShrink: 0 }} />
                              <span style={styles.catName}>{cat.name}</span>
                            </div>
                            <div style={styles.catBarOuter}>
                              <div style={{ ...styles.catBarInner, width: `${barPct}%`, backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                            </div>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }} className="font-mono">{sym}{cat.revenue.toFixed(2)}</td>
                          <td style={{ ...styles.td, textAlign: 'right', color: cat.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: '700' }} className="font-mono">
                            {sym}{cat.profit.toFixed(2)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <span style={{
                              ...styles.marginBadge,
                              color: parseFloat(cat.margin) > 20 ? 'var(--color-success)' : parseFloat(cat.margin) > 10 ? 'var(--color-warning)' : 'var(--color-danger)',
                              backgroundColor: parseFloat(cat.margin) > 20 ? 'var(--color-success-light)' : parseFloat(cat.margin) > 10 ? 'var(--color-warning-light)' : 'var(--color-danger-light)'
                            }} className="font-mono">
                              {cat.margin}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {categoryStats.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No sales data for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Best Profit Margins Table */}
            <motion.div variants={itemVariants} whileHover={{ y: -2 }} style={{ ...styles.tableCard, flex: 1 }} className="card">
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleRow}>
                  <TrendingUp size={18} color="var(--color-primary)" />
                  <h2 style={styles.cardTitle}>Highest Markup Products</h2>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Cost/Sell</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitMarginProducts.map(p => (
                      <tr key={p.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.prodName}>{p.name}</div>
                          <span style={styles.prodCat}>{p.category}</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }} className="font-mono">
                          <span style={{ color: 'var(--color-text-muted)' }}>{sym}{p.costPrice.toFixed(1)}</span>
                          <span style={{ margin: '0 4px' }}>/</span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{sym}{p.price.toFixed(1)}</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <span style={{ ...styles.marginBadge, color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)' }} className="font-mono">
                            {p.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {profitMarginProducts.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No margin data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Top Selling Products */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <Zap size={18} color="var(--color-primary)" />
                <h2 style={styles.cardTitle}>Top Selling Products (Selected Range)</h2>
              </div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Rank</th>
                    <th style={styles.th}>Product SKU</th>
                    <th style={styles.th}>Product Name</th>
                    <th style={styles.th}>Category</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Units Sold</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Gross Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((prod, idx) => (
                    <tr key={prod.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '800', color: 'var(--color-text-muted)', width: '50px' }} className="font-mono">#{idx+1}</td>
                      <td style={styles.td} className="code font-mono">{prod.id}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{prod.name}</td>
                      <td style={styles.td}>{prod.category}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }} className="font-mono">{prod.units} units</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)' }} className="font-mono">{sym}{prod.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Inventory Health Snapshots */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="card" style={styles.invHealthCard}>
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
                { label: 'Expired Items', value: inventoryHealth.expired, color: 'var(--color-danger)' },
                { label: 'Expiring Soon', value: inventoryHealth.expiringSoon, color: 'var(--color-warning)' },
                { label: 'Asset Value', value: `${sym}${inventoryHealth.totalValue.toFixed(0)}`, color: 'var(--color-primary)' },
              ].map(item => (
                <div key={item.label} style={styles.invStat}>
                  <span style={{ ...styles.invStatValue, color: item.color }} className="font-mono">{item.value}</span>
                  <span style={styles.invStatLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      ) : (
        /* Demand Forecasting Tab View */
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Moving Average Explanation Banner */}
          <motion.div variants={itemVariants} style={styles.forecastingBanner} className="glass">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', marginBottom: '0.25rem' }}>Moving Average Velocity Forecasting Engine</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  This dashboard calculates moving average demand velocity over the last **14 days** of store transactions. 
                  Based on current inventory quantities, we predict remaining days of stock and estimate stockout milestones. 
                  Use this data to draft restock purchase orders before stock hits zero.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Search bar & statistics */}
          <motion.div variants={itemVariants} style={styles.forecastToolbar} className="card">
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filter forecasting table by SKU, name, category..."
                  value={forecastSearch}
                  onChange={(e) => setForecastSearch(e.target.value)}
                  style={styles.forecastSearchInput}
                  className="input-field"
                />
              </div>
              <button 
                onClick={() => handleExportExcel('inventory')} 
                className="btn btn-secondary"
                style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', whiteSpace: 'nowrap' }}
              >
                <Download size={14} />
                <span>Download Forecast Sheet (Excel)</span>
              </button>
            </div>
          </motion.div>

          {/* Forecasting Grid Table */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Stockout &amp; Demand Predictions</h2>
              <span style={styles.cardSubtext}>{filteredForecast.length} items evaluated</span>
            </div>
            
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>SKU</th>
                    <th style={styles.th}>Product Name</th>
                    <th style={styles.th}>Category</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Active Stock</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Avg Sales/Day</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Est. 7D Demand</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Est. Stockout</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForecast.map(item => {
                    const velocity = parseFloat(item.salesVelocity);
                    const stock = item.quantity;
                    const stockoutDays = item.stockoutDays;
                    
                    let actionText = 'Safe';
                    let badgeColor = 'var(--color-success)';
                    let badgeBg = 'var(--color-success-light)';
                    
                    if (stock === 0) {
                      actionText = 'REORDER URGENT';
                      badgeColor = 'var(--color-danger)';
                      badgeBg = 'var(--color-danger-light)';
                    } else if (velocity > 0 && stockoutDays <= 3) {
                      actionText = 'REORDER NOW';
                      badgeColor = 'var(--color-warning)';
                      badgeBg = 'var(--color-warning-light)';
                    } else if (velocity > 0 && stockoutDays <= 7) {
                      actionText = 'Monitor';
                      badgeColor = 'var(--color-primary)';
                      badgeBg = 'var(--color-primary-light)';
                    }
                    
                    return (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.td} className="code font-mono">{item.id}</td>
                        <td style={{ ...styles.td, fontWeight: '700' }}>{item.name}</td>
                        <td style={styles.td}>{item.category}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }} className="font-mono">
                          <span style={{ color: stock === 0 ? 'var(--color-danger)' : 'inherit' }}>
                            {stock} units
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', color: 'var(--color-text-secondary)' }} className="font-mono">{item.salesVelocity} units/day</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600', color: 'var(--color-primary)' }} className="font-mono">{item.demand7Day} units</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700' }} className="font-mono">
                          <span style={{ 
                            color: stock === 0 ? 'var(--color-danger)' : stockoutDays <= 3 ? 'var(--color-warning)' : 'inherit'
                          }}>
                            {item.stockoutText}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={{
                            ...styles.marginBadge,
                            color: badgeColor,
                            backgroundColor: badgeBg
                          }} className="font-mono">
                            {actionText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredForecast.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No forecasting data found matching search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        .kpi-icon-revenue { background-color: var(--color-success-light) !important; }
        .kpi-icon-profit { background-color: var(--color-primary-light) !important; }
        .kpi-icon-avg { background-color: rgba(139, 92, 246, 0.1) !important; }
        .kpi-icon-inv { background-color: rgba(245, 158, 11, 0.1) !important; }
        .code { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.5px; }
      `}</style>
    </motion.div>
  );
}

const styles = {
  glassTooltip: {
    backgroundColor: 'rgba(22, 27, 34, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--color-border)',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-md)',
  },
  tooltipLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    margin: 0,
    fontWeight: '600',
  },
  tooltipValue: {
    fontSize: '0.875rem',
    color: 'var(--color-primary)',
    fontWeight: '800',
    margin: '0.1rem 0 0 0',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  tabHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '1rem',
  },
  tabButtonGroup: {
    display: 'flex',
    gap: '0.25rem',
    padding: '0.25rem',
    borderRadius: 'var(--radius-md)',
  },
  tabLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '700',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    zIndex: 100,
    minWidth: '220px',
    padding: '0.5rem 0',
  },
  dropdownHeader: {
    fontSize: '0.6875rem',
    fontWeight: '800',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    padding: '0.4rem 1rem',
    letterSpacing: '0.5px',
  },
  dropdownItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '0.8125rem',
    color: 'var(--color-text-primary)',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: 'var(--color-border)',
    margin: '0.4rem 0',
  },
  dashboardStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.75rem',
  },
  kpiCardMini: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    gap: '0.15rem',
  },
  kpiLabelMini: {
    fontSize: '0.6875rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
  },
  kpiValueMini: {
    fontSize: '1.125rem',
    fontWeight: '800',
    color: 'var(--color-text-primary)',
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
    minWidth: '280px',
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
    minWidth: '280px',
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
  },
  forecastingBanner: {
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    borderLeft: '4px solid #f59e0b',
  },
  forecastToolbar: {
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
  },
  forecastSearchInput: {
    padding: '0.45rem 0.75rem 0.45rem 2rem',
    fontSize: '0.875rem',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
  }
};
