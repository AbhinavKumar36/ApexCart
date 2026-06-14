# 🛒 ApexCart: Comprehensive Technical Review & Documentation

This document provides an exhaustive technical review, architectural breakdown, and workflow map for **ApexCart**, an Enterprise Retail Point of Sale (POS) and Business Intelligence (BI) system.

---

## 1. 🏗️ High-Level Architecture & Project Philosophy

ApexCart is built as a highly robust, offline-first Progressive Web App (PWA). It is designed to run gracefully on cashier terminals even during internet outages, synchronizing transactions back to the cloud once connectivity is restored.

### Core Architectural Patterns:
- **Lifting State Up (SSOT)**: The `App.jsx` component acts as the Single Source of Truth, holding all major application states (`products`, `sales`, `suppliers`, `settings`, etc.). These are passed down to child views (POS, Dashboard, Inventory) via props.
- **Offline-First Synchronization**: Uses a local storage queuing system (`offlineSyncQueue`). Checkouts and inventory modifications made while offline are stored locally and flushed to the database silently in the background when the network reconnects.
- **Dynamic Multi-Tenancy**: The app supports logical isolation between locations (e.g., "Store A" and "Store B"). Components filter catalog reads and sales writes based on the globally active `currentStore` state.

---

## 2. 💻 Complete Technology Stack

### Frontend Core
- **Framework**: **React 19** (Functional Components, Hooks, Context, extensive Memoization).
- **Build Tool / Bundler**: **Vite 8** (Lightning-fast HMR and optimized production builds via Rolldown).
- **Styling**: Vanilla CSS leveraging CSS Custom Properties (Variables) defined in `index.css`. The system uses a proprietary "Midnight & Indigo" glassmorphism theme, completely avoiding bloated CSS frameworks like Tailwind or Bootstrap.
- **Animations**: **Framer Motion 12** (Orchestrating layout transitions, modal slide-ins, and hover micro-interactions).

### Backend & Cloud Services
- **Database**: **Firebase Cloud Firestore (v12)** (NoSQL document database, deeply integrated with real-time snapshot listeners).
- **Authentication**: **Firebase Authentication** (Email/Password system with custom user metadata for role-based access control).
- **AI Integration**: **Google Gemini API (`gemini-flash-latest`)** (Powers the dynamic procurement engine and smart business analytics chatbot).

### Specialized Utility Libraries
- **Barcode & Hardware**: 
  - `html5-qrcode` (Direct webcam feed integration for scanning EAN/UPC labels).
  - `jsbarcode` (Dynamic generation of printable barcode SVGs for new inventory items).
- **Data Export & Document Generation**:
  - `jspdf` & `jspdf-autotable` (Compiling POS receipts and business ledgers into downloadable PDF files).
  - `xlsx` (Generating native Excel spreadsheets for accounting exports).
- **Iconography**: `lucide-react` (Lightweight, consistent SVG icon set).

---

## 3. 🔄 Core Workflows & Logic Maps

### A. Point of Sale (Checkout) Workflow
1. **Scanning/Selection**: Cashiers interact with the grid in `POS.jsx` or scan physical items using the integrated webcam scanner.
2. **Cart Management**: The system checks local stock constraints (`remainingStock = product.quantity - cartQty`). If the item is expired or out of stock, it blocks the addition.
3. **Transaction Execution**:
   - `App.jsx` intercepts the checkout payload.
   - The system maps over the cart to deduct `quantity` from the respective product IDs in the `products` array.
   - A new `Sale` record is appended to the `sales` array.
   - The transaction is fired to Firestore. If offline, it is cached in `offlineSyncQueue`.
4. **Receipt Generation**: The `Invoice.jsx` component is invoked within a hidden print area, and `window.print()` triggers the hardware receipt printer.

### B. AI Procurement & Inventory Restock Workflow
1. **Data Gathering**: The user opens the Gemini AI assistant. The app parses the entire `products` catalog.
2. **Context Building**: A system prompt is generated containing JSON data of products where `quantity < minStock` or items expiring within 30 days.
3. **AI Evaluation**: Gemini analyzes the sales velocity (derived from recent sales logs) against current stock.
4. **Actionable Output**: The AI returns a JSON array of recommended restock quantities.
5. **Execution**: The `Inventory.jsx` modal parses the AI's JSON, presents a preview table to the admin, and upon approval, automatically increments catalog quantities.

### C. Multi-Store Stock Transfer Workflow
1. **Initiation**: Inside `Inventory.jsx`, the admin clicks "Stock Transfer".
2. **Routing**: The admin selects the Source Store, Destination Store, Product SKU, and Quantity.
3. **Validation**: The UI ensures `Transfer Quantity <= Source Store Stock`.
4. **Atomic Update**: The system deducts the quantity from the source product document and either increments an existing destination product document or creates a new entry for the destination store.

---

## 4. 🗂️ Project Directory & Component Breakdown

### `src/components/`
- **`App.jsx`**: The command center. Handles Firebase initialization, auth state tracking, routing between tabs, and houses the global CRUD modifier functions.
- **`Sidebar.jsx`**: The main navigation shell. Handles responsive mobile toggling, user profile display, and dark/light theme switching.
- **`Dashboard.jsx`**: The executive summary. Computes high-level KPIs (Total Revenue, Margin, Low Stock Count) and renders *custom-built SVG line charts* for sales velocity, bypassing the need for heavy external charting libraries.
- **`POS.jsx`**: The cashier interface. Split into a catalog grid, webcam scanner module, and a fixed cart panel. Calculates GST taxes and discounts in real-time.
- **`Inventory.jsx`**: The catalog manager. Handles CRUD for SKUs, dynamic barcode generation, stock transfer modals, and AI procurement review panels.
- **`Suppliers.jsx`**: Vendor Relationship Management. Tracks Supplier profiles and active Purchase Orders.
- **`History.jsx`**: The sales ledger. Allows administrators to view past receipts, audit transaction metadata, and process refunds/voids.
- **`Reports.jsx`**: The BI engine. Filters sales data by custom date ranges and generates detailed pivot tables. Hooks into `jspdf` and `xlsx` for external accounting exports.
- **`Settings.jsx`**: Global configuration. Manages the dynamic Gemini API key (keeping it out of the Vite bundle), UI themes, low-stock threshold rules, and user roles.
- **`Chatbot.jsx`**: The floating Action Button (FAB). A slide-out panel that communicates with Gemini. It includes a robust offline-heuristic fallback that runs local JS algorithms if the API is unreachable.
- **`Invoice.jsx`**: A specialized, print-only component formatted strictly for 80mm thermal receipt printers.

---

## 5. 🛡️ Security & Database Schema

### Database Layout (Firestore NoSQL)
- `/products/{sku}`: Tracks `name`, `price`, `costPrice`, `quantity`, `store`, `expiryDate`, `gst`.
- `/sales/{txId}`: Tracks `items[]`, `subtotal`, `tax`, `total`, `store`, `timestamp`, `cashier`.
- `/suppliers/{id}`: Vendor contact cards.
- `/purchaseOrders/{poId}`: Tracks ordered items and fulfillment status.
- `/settings/general`: Holds the encrypted or dynamic Gemini key and tax presets.
- `/activityLogs/{logId}`: Append-only security audit trail.

### Security Rules (`firestore.rules`)
- **Strict Role-Based Access Control (RBAC)**: All sensitive write operations require the user's `uid` to exist in the `/users` collection with `role: 'admin'`.
- **Append-Only Logs**: The `activityLogs` collection strictly forbids `update` and `delete` operations, ensuring malicious actors (or compromised cashier accounts) cannot erase transaction history or void records.
- **Bundle Protection**: Sensitive keys (like the AI API key) are stored dynamically in the database and fetched at runtime, preventing GitHub secret leaks and keeping the static `.js` bundles clean.
