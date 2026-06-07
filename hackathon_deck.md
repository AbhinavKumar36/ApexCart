# ApexCart: Next-Generation Retail POS & BI Suite
*Hackathon Pitch Deck & Technical Specification*

---

## 🛝 Slide 1: Pitch Abstract

### **ApexCart**
> *Transforming standard retail checkouts into robust business intelligence platforms with smart AI procurement, offline resilience, and multi-store logistics.*

- **Problem**: Main street retail outlets suffer from unstable internet connection dropouts, high licensing costs for separate POS/BI packages, complex stock transfer logistics, and insecure deployment keys.
- **Solution**: A unified, responsive app shell featuring local-first POS registers, webcam scanner integrations, auto-calculating moving averages forecasting, write-once security logs, and a dynamic settings-based key manager.

---

## 🛝 Slide 2: Technical Architecture

This system maintains an **Offline-First Synchronization Architecture**:

```mermaid
graph TD
    A[React App Shell] --> B[PWA Service Worker Cache]
    A --> C[Local Storage Ledger]
    A --> D[Offline Sync Queue]
    D -- Flush when Online --> E[Cloud Firestore]
    A -- Run AI Prompts --> F[Gemini Flash API]
    E -. Real-Time Sync .-> A
    A --> G[jsPDF / XLSX Generators]
```

### Key Engineering Features
1. **Dynamic Key Resolution**: Gemini API tokens are fetched from a Firestore general config settings document at runtime rather than static environment variables.
2. **Synthetic Scan Audits**: Web Audio API generates browser-native scanner validation soundscapes offline without network requests.
3. **Optimized SVG Engine**: High-fidelity line/bar charts are rendered dynamically using inline SVGs to maintain a zero-library dashboard dependency.

---

## 🛝 Slide 3: Transaction Flowcharts

### Cashier Checkout Workflow (POS Terminal)

```mermaid
sequenceDiagram
    participant Cashier
    participant Scanner
    participant Register
    participant LocalCache
    participant CloudDB

    Cashier->>Scanner: Activate Webcam Scan
    Scanner->>Register: Read SKU Barcode (Continuous Scan)
    Register->>Register: Synthesize Scan Beep (Web Audio)
    Register->>LocalCache: Query Stock Availability & Expiry
    alt Stock Validated & Safe
        Register->>Register: Add Item to Active Cart
        Cashier->>Register: Confirm Transaction
        Register->>LocalCache: Decrement Stock
        Register->>LocalCache: Write Invoice & Log Event
        Register->>CloudDB: Write Sale Document (Async Sync)
    else Stock Out / Expired
        Register->>Cashier: Trigger Safety Alert Block
    end
```

### Stock Transfer & Supplier PO Logistical Loop

```mermaid
flowchart LR
    A[Suppliers tab] -->|Draft Purchase Order| B(PO Created)
    B -->|Click 'Receive'| C[Inventory updates]
    C -->|Auto calculate unit cost| D[Profit Margin Analytics]
    E[Current Store A] -->|Initiate Stock Transfer| F(Move Quantity)
    F -->|Subtract from A| G[Destination Store B]
    G -->|Add to B| H[Audit Log Recorded]
```

---

## 🛝 Slide 4: Retail Screen Mockups

### **1. Executive Business Intelligence Dashboard**
Displays Revenue metrics, Gross Profit margin indexes, and the hourly peak sales trendline.

![ApexCart Dashboard BI Mockup](file:///C:/Users/shubh/.gemini/antigravity-ide/brain/d04b4c62-6147-47b8-ab1d-874f50c48031/apexcart_dashboard_mockup_1780812879669.png)

---

## 🛝 Slide 5: Checkout Interface

### **2. POS Checkout Register & Barcode Scan Terminal**
Features product list, active shopping cart, scanner viewport, and payment options.

![ApexCart POS Terminal Mockup](file:///C:/Users/shubh/.gemini/antigravity-ide/brain/d04b4c62-6147-47b8-ab1d-874f50c48031/apexcart_pos_terminal_1780812898289.png)
