# rad. Retail Orders & Delivery Fleet Tracker 📦⚡

An ultra-premium, dark glassmorphic web application built for **rad.** retail outlets to track bill dispatch, fleet delivery attendance, agent order routing, photo proofs, and multi-invoice payment settlements with Google Sheets live synchronization.

---

## ✨ What's New

### 1. Official `rad.` Company Branding & Ultra-Premium Obsidian Look 💎
- Official **`rad.`** emerald logo integrated into the sign-in portal, navigation header, and favicon.
- Modern dark obsidian aesthetic (`#080c14`), glowing emerald accents (`#00E082`), backdrop-blur glassmorphism, and responsive micro-animations.
- Dedicated quick **Sign Out / Logout** button in the top navigation header and profile menu.

---

### 2. Delivery Boy Attendance & Duty Shift Tracker ⏱️🟢
- **Agent Duty Command Center (`Attendance` Tab)**:
  - **Live Shift Digital Clock**: Real-time digital clock tracking elapsed duty shift hours, minutes, and seconds.
  - **Punch In / Punch Out**: One-tap duty start and end with automatic timestamp logging.
  - **15-Minute Shift Break**: Pause duty status for rest breaks and resume seamlessly.
  - **Duty Selfie Check-In**: Capture photo or upload verification selfie on duty punch-in.
  - **Agent Live Shift Stats**: Real-time KPI summary for active shift:
    - Delivered Orders count
    - Cash in Hand collected
    - QR / Digital UPI collected
  - **Live Duty Status Indicator**: Glowing header pill (`🟢 ON DUTY`, `🟡 ON BREAK`, `🔴 OFF DUTY`) visible throughout the app.
- **Operations & Owner Fleet Command Center**:
  - Real-time roster showing all delivery fleet agents (*Rahul Sharma*, *Vikram Singh*, *Suresh Kumar*, *Amit Patel*).
  - Live duty status badges, shift start times, active orders, and collected cash/digital amounts.
  - Ops manual clock-in / clock-out override controls.
  - One-click **Export Fleet Attendance to CSV**.

---

### 3. Role-Based Access Control (RBAC) & Direct Sign In / Out 🔐
- **Operations (Ops)**: PIN `1234`
  - Add bills, assign orders to delivery agents, track fleet attendance, and manage settlements.
- **Delivery Fleet (Agent)**: PIN `5555`
  - Punch In/Out, view assigned delivery route, upload delivery proofs, scan QR, and collect payments.
- **Store Owner**: PIN `9999`
  - Full admin control, financial KPI dashboard, edit invoice amounts, Google Sheets sync, and settings.
- **Quick Logout**: Easily sign out or switch between roles with one tap.

---

### 4. Flat Invoices Search & Multi-Bill Settlement 🏠
- Search by flat number (e.g., `A-102`) across header or search bars.
- Select all unpaid invoices for a flat and clear them together in a single transaction.
- Dynamic Paytm QR standee generated with the exact combined sum.
- Mandatory delivery photo proof for all drops, and payment photo proof for QR/CARD.

---

### 5. Google Sheets Real-Time Sync & Live Spreadsheet Viewer 📊
- Connect via Google Apps Script Webhook.
- Interactive in-app Google Sheet simulator complete with column headers, formula bar, and CSV export.

---

## 🚀 Connecting to Google Sheets

1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet.
2. Go to **Extensions** > **Apps Script**.
3. Copy the contents of [`GoogleAppsScript_Code.gs`](file:///c:/Users/Axiora%20User-30/OneDrive/Desktop/Orders%20tracker/GoogleAppsScript_Code.gs) and paste them into `Code.gs`.
4. Click **Deploy** > **New deployment** > **Web app** (*Execute as: Me*, *Who has access: Anyone*).
5. Copy the Web App URL and paste it into the **Settings** tab (Store Owner view).

---

## 🌐 Running Locally
The local server is running at:
👉 **[http://localhost:3000](http://localhost:3000)**

