# Implementation Plan - Perishables Tracking & Store Control Panel

This plan covers updating **ApexCart** into a high-fidelity **Smart Supermarket & Pharmacy Perishables Hub** by adding batch tracking (manufacturing and expiry dates), custom store control parameters in Settings, and real-time alerts.

---

## Supermarket vs Alternate Domain Suggestion

### Why We Recommend Staying with the Supermarket/Grocery Domain
For a high-level hackathon presentation, a **Smart Supermarket & Pharmacy Hub** is the absolute sweet spot. It allows you to showcase:
* **Perishables Tracking**: Perishable items (Dairy, Groceries, Beverages) expire and spoil. This is a complex inventory challenge that most general inventory apps ignore.
* **Smart Dashboard Actions**: You can show warning counts of expiring products and offer a **"Clearance Discount"** button to discount close-to-expiry stock in real time.
* **POS Register Blocking**: The register terminal blocks cashiers from adding expired items to active baskets, mimicking high-fidelity ERP systems.
* **Dynamic Settings**: Store address, receipt headers, currency, and expiry alerts can be customized by the Administrator and synced via Cloud Firestore.

---

## User Review Required

> [!IMPORTANT]
> **Settings Form Redesign**: We will replace the local credential-changing form with a Firestore-synced **Superstore Configuration Panel**. Admins can customize the Store Name, Address, Currency Symbol, global Low-stock warning threshold, and global Expiry Warning window.

> [!WARNING]
> **POS Register Block**: Adding expired items to a POS basket will trigger a red warning popup and block the operation, enforcing store safety rules.

---

## Proposed Changes

### 1. Data Layer

#### [MODIFY] [mockData.js](file:///c:/Users/shubh/OneDrive/Desktop/sms/src/data/mockData.js)
* Seed default `mfgDate` and `expiryDate` fields for perishable items.
* Grocery, Dairy, and Beverage items will be seeded with expired, close-to-expiry, and safe dates relative to the active date (`2026-06-06`) to demonstrate the warning dashboard instantly.

### 2. Core State Management

#### [MODIFY] [App.jsx](file:///c:/Users/shubh/OneDrive/Desktop/sms/src/App.jsx)
* Add a new `storeSettings` state (defaults to `Store Name`, `Address`, `$`, `GST 12%`, `minStock: 10`, `expiryWarningDays: 30`).
* Sync `storeSettings` with Firestore collection `settings/general` in real-time.
* Pass `storeSettings` and its setter to POS, Settings, Dashboard, and Inventory components.

### 3. Components

#### [MODIFY] [Settings.jsx](file:///c:/Users/shubh/OneDrive/Desktop/sms/src/components/Settings.jsx)
* Retouch the settings page layout:
  * Remove local credential fields (as Auth is managed securely via Firebase console).
  * Add form inputs for **Store Meta** (Store Name, Address, Contact, Currency Symbol).
  * Add configuration sliders/number fields for **Global Alert Rules** (Low Stock Threshold, Expiry Alert Warning Days).
  * Align options with responsive cards.

#### [MODIFY] [Inventory.jsx](file:///c:/Users/shubh/OneDrive/Desktop/sms/src/components/Inventory.jsx)
* Update the Add/Edit Product Modal to include:
  * Optional **Manufacturing Date** (`mfgDate`) and **Expiry Date** (`expiryDate`) fields.
* Add an **Expiry Warning Badge** to items in the inventory table:
  * `Expired` (Red capsule) if the item is past today's date.
  * `Expiring Soon (X days)` (Orange capsule) if expiring within the configured threshold.
* Add an **Expiry Status** filter dropdown in the toolbar (All, Expired, Expiring Soon, Safe).

#### [MODIFY] [POS.jsx](file:///c:/Users/shubh/OneDrive/Desktop/sms/src/components/POS.jsx)
* Update the POS product grid cards to display expiration warning flags.
* In `addToCart`, verify if the product is expired:
  * If expired, block the checkout and display a warning banner: `❌ Cannot sell expired item!`.
  * If expiring soon, display a notification badge so cashiers can alert the customer or apply clearance promotions.
* Read the currency symbol, store name, and address from the live synced `storeSettings` state for the invoice layout.

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/shubh/OneDrive/Desktop/sms/src/components/Dashboard.jsx)
* Add a **Perishables Expiry Alert** KPI card to the top panel.
* Replace or append a widget card in the grid with a **Perishables Expiry Console**:
  * Lists all products that have expired or are expiring soon.
  * For expiring items, render a quick **"Apply 30% Clearance Discount"** button. This automatically applies a discount parameter in the Firestore database, allowing cashiers to sell off the items before they expire.

---

## Verification Plan

### Automated Tests
* Run `npm run build` to verify bundles compile without static import errors.

### Manual Verification
1. **Admin Control Settings**: Edit the Store Name to "ApexCart Superstore" and Expiry Warning window to "15 days" in the Settings tab. Check that it updates instantly in the POS receipts and dashboards.
2. **Expiry Flow**: Go to POS, search for "Organic Whole Wheat Bread" (seeded as expired), click it, and verify that the app shows a checkout block.
3. **Clearance Discounts**: Go to the Dashboard's Perishables Console, click "Apply 30% Clearance Discount" for a close-to-expiry product, go to POS, and check that the 30% discount is automatically active on that product.
