# ApexCart 🛒
### *Enterprise Retail POS & Real-Time Business Intelligence System*

ApexCart is an offline-first, high-fidelity Point of Sale (POS) and Business Intelligence (BI) dashboard designed for modern supermarkets and malls. It combines local-first cashier checkout terminals, webcam-based barcode scanning, multi-outlet stock transfers, and automated inventory forecasting.

---

## ✨ Key Features

1. **📊 Sales Analytics Dashboard**: Monitor Revenue (Today, Week, Month), Cost of Goods Sold (COGS), Gross Profit Margins, and Inventory Turnover ratio in real-time.
2. **📷 Barcode Webcam Scanner**: Seamless cashier terminal with integrated camera scans (via `html5-qrcode`), continuous scan modes, and synthetic browser-native check beep soundscapes.
3. **🏪 Multi-Store Support**: Isolate inventory and transactions between Store A and Store B, with stock transfer interfaces to shift catalog items across locations.
4. **📦 Supplier & PO Management**: Manage vendor databases, create purchase orders, and receive PO stock updates that automatically adjust catalog prices and units.
5. **🤖 AI Business Assistant**: Built-in chat module powered by Gemini API to answer business analytics questions, predict restock lists, and audit expiring products.
6. **📈 Demand Forecasting**: Moving average analytics engine estimating sales velocity, 7-day future stock demand, and projected stockout milestones.
7. **🪵 Employee Activity Logs**: Searchable, action-filterable audit feed tracking employee checkouts, inventory adjustments, and security resets.
8. **📥 Multi-Format Exporters**: Generate PDF receipts in the POS, and download PDF or Excel spreadsheets for Sales ledger, Inventory asset valuations, and GST tax files.
9. **📱 PWA Standalone Configuration**: Installable on desktop/mobile devices, caching essential layout resources via service workers (`sw.js`) for offline functionality.
10. **🔒 Security Enhancements**: Database configurations secured by strict role validations (`firestore.rules`) and dynamic runtime settings keys.

---

## 🛠️ Technology Stack

- **Framework**: React 19 (Hooks, Context, Memoization)
- **Tooling**: Vite 8 (Rolldown bundler)
- **Database / Auth**: Firebase Cloud Firestore & Firebase Auth
- **AI Engine**: Google Gemini API (`gemini-flash-latest`)
- **Libraries**:
  - Scanning: `html5-qrcode` & `jsbarcode`
  - PDF generation: `jspdf` & `jspdf-autotable`
  - Spreadsheets: `xlsx`
  - Icons: `lucide-react`

---

## 🚀 Local Installation

1. **Clone and navigate to the directory**:
   ```bash
   cd sms
   ```

2. **Install node dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Launch development server**:
   ```bash
   npm run dev
   ```

5. **Production Build test**:
   ```bash
   npm run build
   ```

---

## 📄 Developer Documents

Check out these detailed guidelines inside the repository:
- 📖 [Rapid Prototyping Guide](file:///c:/Users/shubh/OneDrive/Desktop/sms/rapid_prototyping_overview.md): Setup templates, JSON database schemas, and testing mocks.
- 📐 [Architectural Review & Audit](file:///c:/Users/shubh/OneDrive/Desktop/sms/project_review.md): Audit findings, database security rules, and performance suggestions.
- 🛝 [Hackathon Slide Deck Specifications](file:///c:/Users/shubh/OneDrive/Desktop/sms/hackathon_deck.md): Presentation slides, transaction flowcharts (Mermaid), and UI screenshots.
