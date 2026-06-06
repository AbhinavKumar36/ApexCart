import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Phone,
  Store,
  DollarSign,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import Invoice from './Invoice';

export default function POS({ products, setProducts, sales, setSales, categories }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Cart state: array of { product, quantity }
  const [cart, setCart] = useState([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Invoice state
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Add to cart
  const addToCart = (product) => {
    if (product.quantity <= 0) return; // Out of stock

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
      totalPrice: grandTotal
    };

    setSales(prev => [...prev, newSale]);
    setActiveInvoice(newSale);
    clearCart();
  };

  // Filter products for POS
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
      activeCategory === 'All' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={styles.container} className="animate-fade">
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
          <div style={styles.searchWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search products by barcode/SKU/name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
              className="input-field"
            />
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
        <div style={styles.grid}>
          {filteredProducts.map((p) => {
            const isOut = p.quantity === 0;
            const isLow = p.quantity <= p.minStock && p.quantity > 0;
            
            // Cart current count
            const cartItem = cart.find(item => item.product.id === p.id);
            const cartQty = cartItem ? cartItem.quantity : 0;
            const remainingStock = p.quantity - cartQty;

            return (
              <div 
                key={p.id} 
                onClick={() => !isOut && remainingStock > 0 && addToCart(p)}
                style={{
                  ...styles.prodCard,
                  opacity: isOut || remainingStock === 0 ? 0.65 : 1,
                  cursor: isOut || remainingStock === 0 ? 'not-allowed' : 'pointer',
                  borderColor: cartQty > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                }}
                className="card glow-hover"
              >
                {cartQty > 0 && (
                  <div style={styles.cartBadge}>
                    <span>{cartQty} in Cart</span>
                  </div>
                )}
                
                <div style={styles.prodDetails}>
                  <span style={styles.prodSku}>{p.id}</span>
                  <h3 style={styles.prodName}>{p.name}</h3>
                  <span style={styles.prodCat}>{p.category}</span>
                </div>

                <div style={styles.prodFooter}>
                  <span style={styles.prodPrice}>${p.price.toFixed(2)}</span>
                  <div style={styles.stockLabel}>
                    {isOut ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : remainingStock <= p.minStock ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        {remainingStock} Units left
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        {remainingStock} units
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

        {/* Cart items list */}
        <div style={styles.cartList}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <Receipt size={36} color="var(--color-text-muted)" />
              <p style={styles.emptyCartText}>Register is empty. Add products from the grid catalog.</p>
            </div>
          ) : (
            cart.map((item) => {
              const base = item.product.price * item.quantity;
              const gstValue = (base * item.product.gst) / 100;
              const totalLine = base + gstValue - ((base + gstValue) * item.product.discount) / 100;

              return (
                <div key={item.product.id} style={styles.cartItem}>
                  <div style={styles.cartItemDetails}>
                    <span style={styles.cartItemName}>{item.product.name}</span>
                    <div style={styles.cartItemPricing}>
                      <span>${item.product.price.toFixed(2)} ea</span>
                      <span style={styles.bullet}>•</span>
                      <span style={styles.taxTag}>GST {item.product.gst}%</span>
                      {item.product.discount > 0 && (
                        <>
                          <span style={styles.bullet}>•</span>
                          <span style={styles.discTag}>Disc {item.product.discount}%</span>
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
                      <span style={styles.qtyVal}>{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.product.quantity)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    
                    <span style={styles.cartItemTotal}>${totalLine.toFixed(2)}</span>
                    
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      style={styles.cartRemoveBtn}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pricing calculations summary */}
        <div style={styles.summaryBox}>
          <div style={styles.summaryRow}>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Taxes (GST)</span>
            <span>+${totalGST.toFixed(2)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Discounts Applied</span>
            <span style={{ color: 'var(--color-danger)' }}>-${totalDiscount.toFixed(2)}</span>
          </div>
          <div style={styles.totalDivider} />
          <div style={styles.grandTotalRow}>
            <span>Grand Total</span>
            <span>${grandTotal.toFixed(2)}</span>
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
          <DollarSign size={18} />
          <span>Checkout & Print Bill</span>
        </button>
      </div>

      {/* Invoice Modal Overlay */}
      {activeInvoice && (
        <Invoice 
          invoice={activeInvoice} 
          onClose={() => setActiveInvoice(null)} 
        />
      )}
    </div>
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
