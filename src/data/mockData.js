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
    quantity: 45,
    price: 3.49,
    costPrice: 2.10,
    gst: 5.0, // 5% GST
    discount: 0.0,
    minStock: 15
  },
  {
    id: 'P1002',
    name: 'Brown Basmati Rice 5kg',
    category: 'Grocery',
    quantity: 30,
    price: 14.99,
    costPrice: 9.50,
    gst: 5.0,
    discount: 5.0, // 5% discount
    minStock: 8
  },
  {
    id: 'P1003',
    name: 'Extra Virgin Olive Oil 1L',
    category: 'Grocery',
    quantity: 12,
    price: 18.99,
    costPrice: 13.00,
    gst: 5.0,
    discount: 10.0,
    minStock: 5
  },
  {
    id: 'P1004',
    name: 'Gluten-Free Oats 1kg',
    category: 'Grocery',
    quantity: 4, // Low stock!
    price: 6.99,
    costPrice: 4.20,
    gst: 5.0,
    discount: 0.0,
    minStock: 10
  },

  // Dairy & Eggs
  {
    id: 'P1005',
    name: 'Organic Whole Milk 1 Gal',
    category: 'Dairy & Eggs',
    quantity: 25,
    price: 4.89,
    costPrice: 3.10,
    gst: 5.0,
    discount: 0.0,
    minStock: 10
  },
  {
    id: 'P1006',
    name: 'Unsalted Butter 450g',
    category: 'Dairy & Eggs',
    quantity: 3, // Low stock!
    price: 5.49,
    costPrice: 3.50,
    gst: 5.0,
    discount: 0.0,
    minStock: 8
  },
  {
    id: 'P1007',
    name: 'Free-Range Large Eggs 12pk',
    category: 'Dairy & Eggs',
    quantity: 40,
    price: 3.99,
    costPrice: 2.20,
    gst: 5.0,
    discount: 0.0,
    minStock: 12
  },

  // Beverages
  {
    id: 'P1008',
    name: 'Coca Cola 12-Pack',
    category: 'Beverages',
    quantity: 18,
    price: 7.99,
    costPrice: 4.80,
    gst: 18.0, // 18% GST for soft drinks
    discount: 8.0,
    minStock: 8
  },
  {
    id: 'P1009',
    name: '100% Orange Juice 2L',
    category: 'Beverages',
    quantity: 15,
    price: 5.29,
    costPrice: 3.40,
    gst: 12.0,
    discount: 0.0,
    minStock: 6
  },
  {
    id: 'P1010',
    name: 'Premium Roasted Coffee Beans 500g',
    category: 'Beverages',
    quantity: 22,
    price: 12.49,
    costPrice: 8.00,
    gst: 12.0,
    discount: 15.0,
    minStock: 5
  },

  // Electronics
  {
    id: 'P1011',
    name: 'Wireless Bluetooth Earbuds',
    category: 'Electronics',
    quantity: 14,
    price: 49.99,
    costPrice: 28.00,
    gst: 18.0,
    discount: 10.0,
    minStock: 5
  },
  {
    id: 'P1012',
    name: 'Fast Charging Power Bank 20k',
    category: 'Electronics',
    quantity: 2, // Low stock!
    price: 29.99,
    costPrice: 16.50,
    gst: 18.0,
    discount: 5.0,
    minStock: 5
  },

  // Apparel & Home
  {
    id: 'P1013',
    name: 'Classic Cotton Crewneck T-Shirt',
    category: 'Apparel',
    quantity: 35,
    price: 19.99,
    costPrice: 8.00,
    gst: 12.0,
    discount: 20.0,
    minStock: 10
  },
  {
    id: 'P1014',
    name: 'Stainless Steel Water Bottle',
    category: 'Home & Kitchen',
    quantity: 16,
    price: 15.99,
    costPrice: 9.00,
    gst: 12.0,
    discount: 0.0,
    minStock: 5
  },
  {
    id: 'P1015',
    name: 'Microfiber Cleaning Cloths 6pk',
    category: 'Home & Kitchen',
    quantity: 50,
    price: 8.99,
    costPrice: 4.50,
    gst: 12.0,
    discount: 0.0,
    minStock: 15
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
