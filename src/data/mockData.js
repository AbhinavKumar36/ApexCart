// Default mock data for the Superstore Inventory Management System
 
export const DEFAULT_CREDENTIALS = {
  username: 'root',
  password: 'root'
};

export const INITIAL_PRODUCTS = [
  // Grocery
  {
    id: 'P1001',
    name: 'Organic Whole Wheat Bread',
    category: 'Grocery',
    vendor: 'Apex Grocery',
    quantity: 45,
    price: 3.49,
    costPrice: 2.10,
    gst: 5.0, // 5% GST
    discount: 0.0,
    minStock: 15,
    mfgDate: '2026-05-27',
    expiryDate: '2026-06-03', // Expired!
    barcode: '8901234001001'
  },
  {
    id: 'P1002',
    name: 'Brown Basmati Rice 5kg',
    category: 'Grocery',
    vendor: 'Apex Grocery',
    quantity: 30,
    price: 14.99,
    costPrice: 9.50,
    gst: 5.0,
    discount: 5.0, // 5% discount
    minStock: 8,
    mfgDate: '2026-02-15',
    expiryDate: '2027-02-15', // Safe
    barcode: '8901234001002'
  },
  {
    id: 'P1003',
    name: 'Extra Virgin Olive Oil 1L',
    category: 'Grocery',
    vendor: 'Apex Grocery',
    quantity: 12,
    price: 18.99,
    costPrice: 13.00,
    gst: 5.0,
    discount: 10.0,
    minStock: 5,
    mfgDate: '2025-12-20',
    expiryDate: '2026-12-20', // Safe
    barcode: '8901234001003'
  },
  {
    id: 'P1004',
    name: 'Gluten-Free Oats 1kg',
    category: 'Grocery',
    vendor: 'Apex Grocery',
    quantity: 4, // Low stock!
    price: 6.99,
    costPrice: 4.20,
    gst: 5.0,
    discount: 0.0,
    minStock: 10,
    mfgDate: '2025-06-15',
    expiryDate: '2026-06-15', // Expiring soon
    barcode: '8901234001004'
  },

  // Dairy & Eggs
  {
    id: 'P1005',
    name: 'Organic Whole Milk 1 Gal',
    category: 'Dairy & Eggs',
    vendor: 'Apex Fresh',
    quantity: 25,
    price: 4.89,
    costPrice: 3.10,
    gst: 5.0,
    discount: 0.0,
    minStock: 10,
    mfgDate: '2026-05-30',
    expiryDate: '2026-06-09', // Expiring soon
    barcode: '8901234001005'
  },
  {
    id: 'P1006',
    name: 'Unsalted Butter 450g',
    category: 'Dairy & Eggs',
    vendor: 'Apex Fresh',
    quantity: 3, // Low stock!
    price: 5.49,
    costPrice: 3.50,
    gst: 5.0,
    discount: 0.0,
    minStock: 8,
    mfgDate: '2026-05-01',
    expiryDate: '2026-06-01', // Expired!
    barcode: '8901234001006'
  },
  {
    id: 'P1007',
    name: 'Free-Range Large Eggs 12pk',
    category: 'Dairy & Eggs',
    vendor: 'Apex Fresh',
    quantity: 40,
    price: 3.99,
    costPrice: 2.20,
    gst: 5.0,
    discount: 0.0,
    minStock: 12,
    mfgDate: '2026-05-25',
    expiryDate: '2026-06-25', // Expiring soon
    barcode: '8901234001007'
  },

  // Beverages
  {
    id: 'P1008',
    name: 'Coca Cola 12-Pack',
    category: 'Beverages',
    vendor: 'Apex Grocery',
    quantity: 18,
    price: 7.99,
    costPrice: 4.80,
    gst: 18.0, // 18% GST for soft drinks
    discount: 8.0,
    minStock: 8,
    mfgDate: '2026-04-01',
    expiryDate: '2027-04-01', // Safe
    barcode: '8901234001008'
  },
  {
    id: 'P1009',
    name: '100% Orange Juice 2L',
    category: 'Beverages',
    vendor: 'Apex Grocery',
    quantity: 15,
    price: 5.29,
    costPrice: 3.40,
    gst: 12.0,
    discount: 0.0,
    minStock: 6,
    mfgDate: '2026-04-20',
    expiryDate: '2026-05-20', // Expired!
    barcode: '8901234001009'
  },
  {
    id: 'P1010',
    name: 'Premium Roasted Coffee Beans 500g',
    category: 'Beverages',
    vendor: 'Apex Grocery',
    quantity: 22,
    price: 12.49,
    costPrice: 8.00,
    gst: 12.0,
    discount: 15.0,
    minStock: 5,
    mfgDate: '2026-03-18',
    expiryDate: '2026-06-18', // Expiring soon
    barcode: '8901234001010'
  },

  // Electronics
  {
    id: 'P1011',
    name: 'Wireless Bluetooth Earbuds',
    category: 'Electronics',
    vendor: 'Apex Electronics',
    quantity: 14,
    price: 49.99,
    costPrice: 28.00,
    gst: 18.0,
    discount: 10.0,
    minStock: 5,
    mfgDate: '',
    expiryDate: '',
    barcode: '8901234001011'
  },
  {
    id: 'P1012',
    name: 'Fast Charging Power Bank 20k',
    category: 'Electronics',
    vendor: 'Apex Electronics',
    quantity: 2, // Low stock!
    price: 29.99,
    costPrice: 16.50,
    gst: 18.0,
    discount: 5.0,
    minStock: 5,
    mfgDate: '',
    expiryDate: '',
    barcode: '8901234001012'
  },

  // Apparel & Home
  {
    id: 'P1013',
    name: 'Classic Cotton Crewneck T-Shirt',
    category: 'Apparel',
    vendor: 'Apex Apparel',
    quantity: 35,
    price: 19.99,
    costPrice: 8.00,
    gst: 12.0,
    discount: 20.0,
    minStock: 10,
    mfgDate: '',
    expiryDate: '',
    barcode: '8901234001013'
  },
  {
    id: 'P1014',
    name: 'Stainless Steel Water Bottle',
    category: 'Home & Kitchen',
    vendor: 'Apex Apparel',
    quantity: 16,
    price: 15.99,
    costPrice: 9.00,
    gst: 12.0,
    discount: 0.0,
    minStock: 5,
    mfgDate: '',
    expiryDate: '',
    barcode: '8901234001014'
  },
  {
    id: 'P1015',
    name: 'Microfiber Cleaning Cloths 6pk',
    category: 'Home & Kitchen',
    vendor: 'Apex Apparel',
    quantity: 50,
    price: 8.99,
    costPrice: 4.50,
    gst: 12.0,
    discount: 0.0,
    minStock: 15,
    mfgDate: '',
    expiryDate: '',
    barcode: '8901234001015'
  }
];

export const CATEGORIES = [
  'Grocery',
  'Dairy & Eggs',
  'Beverages',
  'Electronics',
  'Apparel',
  'Home & Kitchen'
];

export const DEFAULT_SUPPLIERS = [
  {
    id: 'S2001',
    name: 'Global Grocery Distributors',
    contactPerson: 'Sarah Jenkins',
    phone: '+1 (555) 014-9832',
    email: 'orders@globalgrocery.com',
    address: '45 Supply Chain Blvd, Logistics Park'
  },
  {
    id: 'S2002',
    name: 'Fresh Farms Dairy Co.',
    contactPerson: 'David Miller',
    phone: '+1 (555) 012-7645',
    email: 'delivery@freshfarmsdairy.com',
    address: '12 Dairy Pasture Lane, Green Valley'
  },
  {
    id: 'S2003',
    name: 'Apex Tech Wholesalers',
    contactPerson: 'Kevin Patel',
    phone: '+1 (555) 019-3344',
    email: 'sales@apextechwholesale.com',
    address: '88 Tech Hub Circle, Silicon City'
  },
  {
    id: 'S2004',
    name: 'Apex Apparel & Textiles',
    contactPerson: 'Elena Rostova',
    phone: '+1 (555) 017-4499',
    email: 'info@apextextiles.com',
    address: '304 Garment District Way, Fashion City'
  }
];

export const generateMockSales = (productsList) => {
  const sales = [];
  const paymentMethods = ['Cash', 'Card', 'UPI'];
  const customerNames = ['Alice Smith', 'Bob Johnson', 'Charlie Brown', 'Diana Prince', 'Evan Wright', 'Fiona Gallagher', 'Walk-in Customer'];
  const times = [
    '09:15:30 AM', '10:30:12 AM', '11:45:22 AM', '12:15:45 PM', 
    '01:30:00 PM', '02:45:10 PM', '03:55:18 PM', '04:20:00 PM',
    '05:10:45 PM', '06:30:20 PM', '07:15:55 PM', '07:45:10 PM',
    '08:20:30 PM', '08:50:00 PM', '09:15:12 PM', '09:45:00 PM'
  ];

  const today = new Date();
  let invoiceId = 10001;

  for (let i = 13; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = targetDate.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    ['Store A', 'Store B'].forEach(store => {
      const dailySalesCount = 2 + Math.floor(Math.random() * 4);
      
      for (let s = 0; s < dailySalesCount; s++) {
        const storeProducts = productsList.filter(p => p.store === store);
        if (storeProducts.length === 0) return;
        
        const itemCount = 1 + Math.floor(Math.random() * 3);
        const selectedItems = [];
        let subtotal = 0;
        let totalGST = 0;
        let totalDiscount = 0;
        
        for (let k = 0; k < itemCount; k++) {
          const prod = storeProducts[Math.floor(Math.random() * storeProducts.length)];
          if (selectedItems.some(item => item.id === prod.id)) continue;
          
          const qty = 1 + Math.floor(Math.random() * 3);
          const basePrice = prod.price || 2.50;
          const lineTotal = (basePrice + (basePrice * (prod.gst || 5) / 100) - ((basePrice + (basePrice * (prod.gst || 5) / 100)) * (prod.discount || 0) / 100)) * qty;
          
          selectedItems.push({
            id: prod.id,
            name: prod.name,
            quantity: qty,
            price: basePrice,
            gst: prod.gst || 5,
            discount: prod.discount || 0,
            lineTotal: parseFloat(lineTotal.toFixed(2))
          });
          
          const itemBase = basePrice * qty;
          subtotal += itemBase;
          totalGST += (itemBase * (prod.gst || 5)) / 100;
          totalDiscount += ((itemBase + (itemBase * (prod.gst || 5)) / 100) * (prod.discount || 0)) / 100;
        }

        const grandTotal = subtotal + totalGST - totalDiscount;

        sales.push({
          id: (invoiceId++).toString(),
          date: dateStr,
          time: times[Math.floor(Math.random() * times.length)],
          customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
          customerPhone: `+1 (555) 019-${Math.floor(1000 + Math.random() * 9000)}`,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          items: selectedItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          totalGST: parseFloat(totalGST.toFixed(2)),
          totalDiscount: parseFloat(totalDiscount.toFixed(2)),
          totalPrice: parseFloat(grandTotal.toFixed(2)),
          store
        });
      }
    });
  }

  return sales;
};
