# ApexCart - Rapid Prototyping Developer Guide

This guide is designed for developers looking to prototype, extend, or mock-test the **ApexCart Enterprise Retail & BI System** quickly.

---

## 🚀 1. Setup & Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase Account (or use built-in Offline Mode)

### Running Locally
1. Clone the project and navigate to the directory:
   ```bash
   cd sms
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the terminal at [http://localhost:5173](http://localhost:5173).

---

## 📂 2. Directory Structure

```text
sms/
├── public/                 # Static PWA assets
│   ├── manifest.json       # PWA Application Metadata
│   └── sw.js               # Service Worker caching rules
├── src/
│   ├── components/         # React Views & Controls
│   │   ├── Chatbot.jsx     # Gemini AI Business Assistant
│   │   ├── Inventory.jsx   # Stock control & transfer panel
│   │   ├── POS.jsx         # Scanner register & cart checkouts
│   │   ├── Reports.jsx     # BI charts, moving average forecasting
│   │   ├── Settings.jsx    # Admin configs & Audit Logs
│   │   └── Suppliers.jsx   # Suppliers & Purchase Order flows
│   ├── data/
│   │   └── mockData.js     # Default items seed catalog
│   ├── App.jsx             # State sync, auth listeners, navigation routing
│   └── firebase.js         # Cloud Firestore initialization
├── firestore.rules         # Security & database access rules
└── vite.config.js          # Rolldown bundler setup
```

---

## 🗄️ 3. Denormalized Database Schema

Below are JSON document representations of collections. For rapid prototyping without Firestore connection, these schemas are fully supported inside the client's `localStorage`.

### `products` Collection
```json
{
  "id": "P1001_A",
  "originalId": "P1001",
  "name": "Organic Whole Wheat Bread",
  "category": "Grocery",
  "quantity": 42,
  "costPrice": 1.80,
  "price": 3.49,
  "gst": 5,
  "discount": 10,
  "minStock": 15,
  "expiryDate": "2026-06-15",
  "barcode": "01010101",
  "vendor": "Apex Grocery",
  "store": "Store A"
}
```

### `sales` Collection
```json
{
  "id": "10001",
  "date": "07/06/2026",
  "time": "08:15:30 AM",
  "customerName": "John Doe",
  "customerPhone": "+1 (555) 901-2291",
  "paymentMethod": "UPI",
  "items": [
    {
      "id": "P1001_A",
      "name": "Organic Whole Wheat Bread",
      "quantity": 2,
      "price": 3.49,
      "gst": 5,
      "discount": 10,
      "lineTotal": 6.63
    }
  ],
  "subtotal": 6.98,
  "totalGST": 0.35,
  "totalDiscount": 0.70,
  "totalPrice": 6.63,
  "store": "Store A"
}
```

### `suppliers` Collection
```json
{
  "id": "SUP101",
  "name": "Vanguard Foods Ltd.",
  "contact": "+1 (555) 019-9911",
  "email": "supply@vanguard.com",
  "address": "44 Logistics park, Port City"
}
```

### `activityLogs` Collection
```json
{
  "id": "L17808119028_c2e1",
  "timestamp": "2026-06-07T08:15:30.000Z",
  "user": "cashier@apexcart.com",
  "action": "POS_SALE",
  "details": "Invoice #10001 checked out in Store A via UPI. Total: $6.63",
  "store": "Store A"
}
```

---

## 🔌 4. Rapid Mocking & Offline Support

### Running in Offline Mode
If you do not have credentials to access the Firestore database, ApexCart runs on a fallback **Offline Mode**:
1. Check the local storage database sync logic in `App.jsx`.
2. All writes populate `apexcart_*` local storage arrays.
3. Transactions are captured in `apexcart_sync_queue`.
4. To test data flushes, click **Restore Connection** in the sidebar. This will execute `processOfflineSyncQueue()` and write local updates to the Firestore back-end server when online.
