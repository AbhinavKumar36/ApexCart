import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Phone,
  IndianRupee,
  Receipt,
  CreditCard,
  QrCode,
  Camera
} from 'lucide-react';
import Invoice from './Invoice';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';

export default function POS({ products, setProducts, sales, setSales, categories, storeSettings, vendor, currentStore, logActivity }) {
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
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Cart state: array of { product, quantity }
  const [cart, setCart] = useState([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment channel details
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showUpiModal, setShowUpiModal] = useState(false);
  
  // Invoice state
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [continuousScan, setContinuousScan] = useState(true);
  const [scanStatus, setScanStatus] = useState('');
  const scannerRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  // Browser synthesized beep audio
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 1400; // beep pitch
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio Context beep failed:", e);
    }
  };

  // Keyboard handheld hardware scanner callback
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const code = searchTerm.trim();
      const matched = products.find(p => 
        (p.barcode === code || p.id === code) && 
        p.store === currentStore
      );
      if (matched) {
        addToCart(matched);
        playBeep();
        setSearchTerm('');
        e.preventDefault();
      }
    }
  };

  const startScanning = () => {
    setScanStatus('Initializing camera...');
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("barcode-reader-viewport");
      scannerRef.current = html5QrCode;
      
      const config = { fps: 12, qrbox: { width: 250, height: 160 } };
      
      html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
          handleBarcodeScanned(decodedText);
        },
        () => {
          // ignore parsing errors
        }
      ).then(() => {
        setScanStatus('Camera active. Place barcode in frame.');
      }).catch(err => {
        setScanStatus(`Camera error: ${err.message || err}`);
      });
    }, 400);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current = null;
          setShowScanner(false);
        }).catch(err => {
          console.error("Failed to stop scanner:", err);
          scannerRef.current = null;
          setShowScanner(false);
        });
      } else {
        scannerRef.current = null;
        setShowScanner(false);
      }
    } else {
      setShowScanner(false);
    }
  };

  const handleBarcodeScanned = (scannedCode) => {
    const matched = products.find(p => 
      (p.barcode === scannedCode || p.id === scannedCode) && 
      p.store === currentStore
    );
    
    if (matched) {
      if (matched.quantity <= 0) {
        setScanStatus(`⚠️ "${matched.name}" is OUT OF STOCK!`);
        return;
      }
      if (matched.expiryDate && matched.expiryDate < today) {
        setScanStatus(`❌ SAFETY BLOCK: "${matched.name}" EXPIRED on ${matched.expiryDate}!`);
        return;
      }
      
      addToCart(matched);
      playBeep();
      setScanStatus(`✅ Added: ${matched.name}!`);
      
      if (!continuousScan) {
        stopScanning();
      } else {
        setTimeout(() => setScanStatus('Scanning...'), 1500);
      }
    } else {
      setScanStatus(`❌ Barcode "${scannedCode}" not recognized in ${currentStore}.`);
    }
  };

  // Stop scanner if component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.warn(err));
      }
    };
  }, []);

  // Add to cart
  const addToCart = (product) => {
    if (product.quantity <= 0) return; // Out of stock

    if (product.expiryDate && product.expiryDate < today) {
      alert(`❌ SAFETY BLOCK: Cannot add "${product.name}" to cart. The product expired on ${product.expiryDate}!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      if (existing) {
        // Check if quantity + 1 exceeds stock
        if (existing.quantity >= product.quantity) {
          alert(`Cannot add more. Only ${product.quantity} units in stock for ${product.name}.`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  // Update quantity in cart
  const updateCartQuantity = (productId, newQty, availableStock) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > availableStock) {
      alert(`Only ${availableStock} units in stock.`);
      return;
    }

    setCart(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Clear checkout cart
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Computations
  const subtotal = cart.reduce((acc, item) => {
    const rawVal = item.product.price * item.quantity;
    return acc + rawVal;
  }, 0);

  const totalGST = cart.reduce((acc, item) => {
    const baseVal = item.product.price * item.quantity;
    const gstVal = (baseVal * item.product.gst) / 100;
    return acc + gstVal;
  }, 0);

  const totalDiscount = cart.reduce((acc, item) => {
    const baseVal = item.product.price * item.quantity;
    const gstVal = baseVal + (baseVal * item.product.gst) / 100;
    const discVal = (gstVal * item.product.discount) / 100;
    return acc + discVal;
  }, 0);

  const grandTotal = subtotal + totalGST - totalDiscount;

  // Handle Checkout & generate Invoice
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    // Double check stock levels in master inventory before decrementing
    let stockError = false;
    cart.forEach(item => {
      const masterProduct = products.find(p => p.id === item.product.id);
      if (!masterProduct || masterProduct.quantity < item.quantity) {
        alert(`Stock mismatch for ${item.product.name}. Available: ${masterProduct ? masterProduct.quantity : 0}.`);
        stockError = true;
      }
    });
    if (stockError) return;

    if (paymentMethod === 'UPI') {
      setShowUpiModal(true);
    } else {
      finalizeCheckout();
    }
  };

  const finalizeCheckout = () => {
    // Deduct stock in global state
    setProducts(prevProducts => 
      prevProducts.map(masterProduct => {
        const cartItem = cart.find(item => item.product.id === masterProduct.id);
        if (cartItem) {
          return {
            ...masterProduct,
            quantity: Math.max(0, masterProduct.quantity - cartItem.quantity)
          };
        }
        return masterProduct;
      })
    );

    // Save sale record
    const dateObj = new Date();
    const invoiceNumber = sales.length > 0 
      ? Math.max(...sales.map(s => parseInt(s.id, 10))) + 1 
      : 10001;

    const newSale = {
      id: invoiceNumber.toString(),
      date: dateObj.toLocaleDateString('en-GB'),
      time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || 'N/A',
      paymentMethod,
      items: cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        gst: item.product.gst,
        discount: item.product.discount,
        lineTotal: (item.product.price + (item.product.price * item.product.gst / 100) - ( (item.product.price + (item.product.price * item.product.gst / 100)) * item.product.discount / 100 )) * item.quantity
      })),
      subtotal,
      totalGST,
      totalDiscount,
      totalPrice: grandTotal,
      store: currentStore
    };

    setSales(prev => [...prev, newSale]);
    setActiveInvoice(newSale);
    logActivity('POS_SALE', `Invoice #${invoiceNumber} checked out in ${currentStore} via ${paymentMethod}. Total: ${storeSettings?.currencySymbol || '₹'}${grandTotal.toFixed(2)}`);
    clearCart();
  };

  // Filter products for POS including vendor stall filtering and store filtering
  const filteredProducts = products.filter(product => {
    if (product.store !== currentStore) {
      return false;
    }
    if (vendor !== 'all' && product.vendor !== vendor) {
      return false;
    }
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
      activeCategory === 'All' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      style={styles.container}
    >
      {/* Product Search & Grid Panel */}
      <div style={styles.productsPanel}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.pageTitle}>POS Register Terminal</h1>
            <p style={styles.pageSubtitle}>Search catalog products to build active shopping carts.</p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar} className="glass">
          <div style={styles.searchWrapper} style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search products by barcode/SKU/name... (Press Enter to scan)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{ ...styles.searchInput, width: '100%' }}
                className="input-field"
              />
            </div>
            <button
              onClick={() => { setShowScanner(true); startScanning(); }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              <Camera size={16} />
              <span>Webcam Scan</span>
            </button>
          </div>
        </div>

        {/* Categories navigation tab row */}
        <div style={styles.tabRow}>
          <button 
            onClick={() => setActiveCategory('All')} 
            style={{
              ...styles.tabBtn,
              borderColor: activeCategory === 'All' ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: activeCategory === 'All' ? 'var(--color-primary-light)' : 'var(--color-bg-surface)',
              color: activeCategory === 'All' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.tabBtn,
                borderColor: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: activeCategory === cat ? 'var(--color-primary-light)' : 'var(--color-bg-surface)',
                color: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <motion.div style={styles.grid} variants={containerVariants} initial="hidden" animate="show">
          {filteredProducts.map((p) => {
            const isOut = p.quantity === 0;
            
            const isExpired = p.expiryDate && p.expiryDate < today;
            const exp = p.expiryDate ? new Date(p.expiryDate) : null;
            const td = new Date(today);
            const diffDays = exp ? Math.ceil((exp - td) / (1000 * 60 * 60 * 24)) : 999;
            const warningDays = storeSettings?.expiryWarningDays || 30;
            const isExpiringSoon = p.expiryDate && !isExpired && diffDays <= warningDays;

            // Cart current count
            const cartItem = cart.find(item => item.product.id === p.id);
            const cartQty = cartItem ? cartItem.quantity : 0;
            const remainingStock = p.quantity - cartQty;

            return (
              <motion.div 
                key={p.id} 
                onClick={() => (!isOut || isExpired) && remainingStock > 0 && addToCart(p)}
                style={{
                  ...styles.prodCard,
                  opacity: isOut || isExpired || remainingStock === 0 ? 0.65 : 1,
                  cursor: isOut || remainingStock === 0 ? 'not-allowed' : 'pointer',
                  borderColor: isExpired ? 'var(--color-danger)' : cartQty > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                }}
                className="card glow-hover"
                variants={itemVariants}
                whileHover={isOut || remainingStock === 0 ? {} : { y: -4, boxShadow: 'var(--shadow-glow)' }}
              >
                {isExpired && (
                  <div style={{ ...styles.cartBadge, backgroundColor: 'var(--color-danger)' }}>
                    <span>Expired</span>
                  </div>
                )}
                {!isExpired && cartQty > 0 && (
                  <div style={styles.cartBadge}>
                    <span className="font-mono">{cartQty} in Cart</span>
                  </div>
                )}
                
                <div style={styles.prodDetails}>
                  <span style={styles.prodSku} className="font-mono">{p.id}</span>
                  <h3 style={styles.prodName}>{p.name}</h3>
                  <span style={styles.prodCat}>{p.category}</span>
                </div>

                <div style={styles.prodFooter}>
                  <span style={styles.prodPrice} className="font-mono">
                    {storeSettings?.currencySymbol || '₹'}{p.price.toFixed(2)}
                  </span>
                  <div style={styles.stockLabel}>
                    {isOut ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : isExpired ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Expired</span>
                    ) : isExpiringSoon ? (
                      <span className="badge badge-warning font-mono" style={{ fontSize: '0.65rem' }}>
                        Expiring ({diffDays}d)
                      </span>
                    ) : remainingStock <= (storeSettings?.lowStockThreshold || p.minStock) ? (
                      <span className="badge badge-warning font-mono" style={{ fontSize: '0.65rem' }}>
                        {remainingStock} left
                      </span>
                    ) : (
                      <span className="badge badge-success font-mono" style={{ fontSize: '0.65rem' }}>
                        {remainingStock} units
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Cart & Customer Panel */}
      <div style={styles.cartPanel} className="glass">
        <div style={styles.cartHeader}>
          <ShoppingCart size={20} color="var(--color-primary)" />
          <h2 style={styles.cartTitle}>Active Invoice Cart</h2>
          {cart.length > 0 && (
            <button onClick={clearCart} style={styles.clearBtn} title="Clear cart">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Customer info fields */}
        <div style={styles.customerBox}>
          <div style={styles.custInputRow}>
            <User size={16} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Customer Full Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={styles.custInput}
            />
          </div>
          <div style={styles.custInputRow}>
            <Phone size={16} color="var(--color-text-muted)" />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={styles.custInput}
            />
          </div>
        </div>

        {/* Payment Channel Selection */}
        <div style={styles.paymentSelector}>
          <span style={styles.paymentLabel}>Payment Channel</span>
          <div style={styles.paymentButtons}>
            {['Cash', 'Card', 'UPI'].map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                style={{
                  ...styles.paySelectBtn,
                  backgroundColor: paymentMethod === method ? 'var(--color-primary-light)' : 'transparent',
                  borderColor: paymentMethod === method ? 'var(--color-primary)' : 'var(--color-border)',
                  color: paymentMethod === method ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: paymentMethod === method ? '800' : '600'
                }}
              >
                {method === 'Cash' && <IndianRupee size={14} />}
                {method === 'Card' && <CreditCard size={14} />}
                {method === 'UPI' && <QrCode size={14} />}
                <span>{method}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cart items list */}
        <div style={styles.cartList}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <Receipt size={36} color="var(--color-text-muted)" />
              <p style={styles.emptyCartText}>Register is empty. Add products from the grid catalog.</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => {
                const base = item.product.price * item.quantity;
                const gstValue = (base * item.product.gst) / 100;
                const totalLine = base + gstValue - ((base + gstValue) * item.product.discount) / 100;

                return (
                  <motion.div 
                    key={item.product.id} 
                    style={styles.cartItem}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <div style={styles.cartItemDetails}>
                      <span style={styles.cartItemName}>{item.product.name}</span>
                      <div style={styles.cartItemPricing}>
                        <span className="font-mono">{storeSettings?.currencySymbol || '₹'}{item.product.price.toFixed(2)} ea</span>
                        <span style={styles.bullet}>•</span>
                        <span style={styles.taxTag} className="font-mono">GST {item.product.gst}%</span>
                        {item.product.discount > 0 && (
                          <>
                            <span style={styles.bullet}>•</span>
                            <span style={styles.discTag} className="font-mono">Disc {item.product.discount}%</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={styles.cartItemControls}>
                      <div style={styles.qtyBox}>
                        <button 
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, item.product.quantity)}
                          style={styles.qtyBtn}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={styles.qtyVal} className="font-mono">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.product.quantity)}
                          style={styles.qtyBtn}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      
                      <span style={styles.cartItemTotal} className="font-mono">{storeSettings?.currencySymbol || '₹'}{totalLine.toFixed(2)}</span>
                      
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        style={styles.cartRemoveBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Pricing calculations summary */}
        <div style={styles.summaryBox}>
          <div style={styles.summaryRow}>
            <span>Subtotal</span>
            <span className="font-mono">{storeSettings?.currencySymbol || '₹'}{subtotal.toFixed(2)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Taxes (GST)</span>
            <span className="font-mono">+{storeSettings?.currencySymbol || '₹'}{totalGST.toFixed(2)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Discounts Applied</span>
            <span style={{ color: 'var(--color-danger)' }} className="font-mono">-{storeSettings?.currencySymbol || '₹'}{totalDiscount.toFixed(2)}</span>
          </div>
          <div style={styles.totalDivider} />
          <div style={styles.grandTotalRow}>
            <span>Grand Total</span>
            <span className="font-mono">{storeSettings?.currencySymbol || '₹'}{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <button 
          onClick={handleCheckout} 
          disabled={cart.length === 0}
          style={{
            ...styles.checkoutBtn,
            backgroundColor: cart.length === 0 ? 'var(--color-border)' : 'var(--color-primary)',
            cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
          }}
          className="btn btn-primary"
        >
          <IndianRupee size={18} />
          <span>Checkout & Print Bill</span>
        </button>
      </div>

      {/* Invoice Modal Overlay */}
      {activeInvoice && (
        <Invoice 
          invoice={activeInvoice} 
          onClose={() => setActiveInvoice(null)} 
          storeSettings={storeSettings}
        />
      )}

      {/* UPI Scan to Pay QR Modal */}
      {showUpiModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.upiModal} className="card glow animate-slide">
            <h3 style={styles.upiTitle}>Scan QR Code to Pay</h3>
            <p style={styles.upiSub}>{storeSettings?.storeName || 'ApexCart Supermarket'}</p>
            
            <div style={styles.qrContainer}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `upi://pay?pa=apexcart@upi&pn=ApexCart&am=${grandTotal.toFixed(2)}&cu=INR`
                )}`} 
                alt="UPI Payment QR Code" 
                style={styles.qrImage}
              />
            </div>
            
            <div style={styles.upiDetails}>
              <span style={styles.upiAmount}>Amount: {storeSettings?.currencySymbol || '₹'}{grandTotal.toFixed(2)}</span>
              <span style={styles.upiVpa}>Merchant: apexcart@upi</span>
            </div>
            
            <div style={styles.upiButtons}>
              <button 
                onClick={() => setShowUpiModal(false)}
                className="btn btn-secondary"
                style={styles.upiCancelBtn}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowUpiModal(false);
                  finalizeCheckout();
                }}
                className="btn btn-primary"
                style={styles.upiConfirmBtn}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webcam Barcode Scanner Modal */}
      {showScanner && (
        <div style={styles.modalOverlay}>
          <div style={styles.scannerModal} className="card glow animate-slide">
            <div style={styles.scannerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={20} color="var(--color-primary)" />
                <h3 style={styles.upiTitle}>Webcam Barcode Scanner</h3>
              </div>
              <button onClick={stopScanning} style={styles.closeBtn}>×</button>
            </div>
            
            <div style={styles.scannerFrame}>
              <div id="barcode-reader-viewport" style={styles.readerViewport}></div>
            </div>
            
            <div style={styles.scannerFooter}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={continuousScan} 
                    onChange={(e) => setContinuousScan(e.target.checked)} 
                    style={{ width: 'auto' }}
                  />
                  <span>Continuous Rapid Scan</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                  Store: {currentStore}
                </span>
              </div>
              
              <div style={{ ...styles.statusBox, backgroundColor: scanStatus.startsWith('❌') ? 'var(--color-danger-light)' : scanStatus.startsWith('✅') ? 'var(--color-success-light)' : 'var(--color-bg-base)', color: scanStatus.startsWith('❌') ? 'var(--color-danger)' : scanStatus.startsWith('✅') ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                {scanStatus || 'Scanning... Align barcode in camera view.'}
              </div>
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
    gap: '2rem',
    height: 'calc(100vh - 4rem)',
    flexDirection: 'row',
  },
  productsPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    overflowY: 'auto',
    paddingRight: '0.5rem',
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
  toolbar: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-lg)',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
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
  tabRow: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  tabBtn: {
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    fontWeight: '700',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
  },
  prodCard: {
    position: 'relative',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '1rem',
    height: '160px',
    userSelect: 'none',
    transition: 'all 0.2s ease',
  },
  cartBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    fontSize: '0.6875rem',
    fontWeight: '800',
    padding: '0.25rem 0.5rem',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-md)',
  },
  prodDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  prodSku: {
    fontSize: '0.6875rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
  },
  prodName: {
    fontSize: '0.875rem',
    fontWeight: '800',
    lineHeight: '1.3',
    margin: '0.2rem 0',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  prodCat: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '600',
  },
  prodFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prodPrice: {
    fontSize: '1rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
  },
  stockLabel: {
    fontSize: '0.6875rem',
  },
  cartPanel: {
    width: '380px',
    borderLeft: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  cartTitle: {
    fontSize: '1.125rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    flex: 1,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
  },
  customerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem 0',
    borderBottom: '1px solid var(--color-border)',
  },
  custInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  custInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    fontSize: '0.8125rem',
    color: 'var(--color-text-primary)',
    fontWeight: '600',
    width: '100%',
  },
  cartList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    height: '100%',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    padding: '0 1rem',
  },
  emptyCartText: {
    fontSize: '0.8125rem',
    fontWeight: '600',
  },
  cartItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  cartItemDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  cartItemName: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  cartItemPricing: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '600',
  },
  bullet: {
    color: 'var(--color-text-muted)',
  },
  taxTag: {
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    padding: '0.05rem 0.25rem',
    borderRadius: '3px',
    fontWeight: '700',
  },
  discTag: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '0.05rem 0.25rem',
    borderRadius: '3px',
    fontWeight: '700',
  },
  cartItemControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  qtyBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  qtyBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.35rem 0.5rem',
  },
  qtyVal: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    padding: '0 0.5rem',
    minWidth: '20px',
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: '0.875rem',
    fontWeight: '800',
    marginLeft: 'auto',
  },
  cartRemoveBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s ease',
  },
  summaryBox: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  totalDivider: {
    height: '1px',
    backgroundColor: 'var(--color-border)',
    margin: '0.25rem 0',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1.25rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-text-primary)',
  },
  checkoutBtn: {
    width: '100%',
    padding: '0.85rem',
    marginTop: '1.25rem',
  },
  paymentSelector: {
    padding: '0.25rem 1rem 1rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  paymentLabel: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  paymentButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  paySelectBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    padding: '0.5rem 0.25rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalOverlay: {
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
  upiModal: {
    width: '100%',
    maxWidth: '360px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  upiTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--color-text-primary)',
  },
  upiSub: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.15rem',
  },
  qrContainer: {
    background: '#ffffff',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    margin: '1.25rem 0',
    display: 'inline-flex',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  qrImage: {
    width: '180px',
    height: '180px',
  },
  upiDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    marginBottom: '1.5rem',
  },
  upiAmount: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--color-primary)',
  },
  upiVpa: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'monospace',
  },
  upiButtons: {
    display: 'flex',
    width: '100%',
    gap: '0.75rem',
  },
  upiCancelBtn: {
    flex: 1,
    padding: '0.65rem',
    fontSize: '0.875rem',
  },
  upiConfirmBtn: {
    flex: 1,
    padding: '0.65rem',
    fontSize: '0.875rem',
  },
  scannerModal: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
  },
  scannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  scannerFrame: {
    padding: '1.25rem',
    backgroundColor: 'var(--color-bg-base)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerViewport: {
    width: '100%',
    maxWidth: '350px',
    height: '240px',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
    backgroundColor: '#000',
  },
  scannerFooter: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
  },
  statusBox: {
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: '700',
    textAlign: 'center',
    border: '1px solid var(--color-border)',
  }
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .glow-hover:hover {
      border-color: var(--color-primary) !important;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
}
