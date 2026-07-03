# StellarPay - Cross-Border Freelancer Payments (Level 4 Green Belt Submission)

Welcome to **StellarPay** (formerly *Stellar QuickPay*), a production-ready, glassmorphic Stellar dApp upgraded to satisfy the **Level 4 - Green Belt Submission** requirements for the **Stellar Journey to Mastery** builder program.

StellarPay enables freelancers around the globe to easily generate secure invoices, and allows clients to fund payments that are safely locked on-chain in a custom Soroban Escrow smart contract until work is completed and released by the freelancer.

---

## 🟢 Level 4 - Green Belt Submission Details

| Requirement | Value / Link |
| :--- | :--- |
| **Live Demo Link** | `https://huseyintaskinn.com.tr/stellar-quickpay/` |
| **Soroban Escrow Contract ID** | `CDREZXFNVSVQZLFJG4U3XBPA2CVYH2GJNK3MADHJFNHZTXETLEAFF5SK` |
| **Escrow payment Transaction Hash** | `YOUR_LEVEL4_ESCROW_TX_HASH` *(Faturayı ödedikten sonra Stellar.Expert üzerindeki işlem özetinin linkini buraya ekleyin)* |
| **User Feedback Link (Google Form)** | `https://forms.gle/stellar-pay-feedback` |
| **Demo Video Link (1-2 mins)** | `YOUR_LEVEL4_VIDEO_LINK` *(Ekran kaydı alıp Drive veya YouTube yükleyerek linkini buraya ekleyin)* |

---

## 🏗️ Level 4 Architecture & Features

This level transforms the project from a simple wallet vault into a **scalable, production-ready MVP with real user onboarding, analytics, and robust business logic**.

### 1. Advanced Soroban Escrow Contract (`contracts/escrow`)
We developed and deployed a custom Soroban Escrow Smart Contract written in Rust:
- **On-chain State Machine:** Manages invoice lifecycles through explicit statuses: `Pending` (Created) $\rightarrow$ `Funded` (Paid & Locked) $\rightarrow$ `Released` (Withdrawn) or `Cancelled` (Pending invoice cancelled by creator).
- **Inter-Contract Token Transfers:** Integrates with the official Stellar Asset Contract (SAC) to safely transfer and lock client funds in the contract, and release them to the freelancer upon successful work delivery.
- **Robust Event Logging:** Emits `invoice_created`, `invoice_paid`, `payment_released`, and `invoice_cancelled` events for real-time frontend syncing.
- **On-chain Validations:** Restricts payment to the designated client and release/cancellation to the designated freelancer.

### 2. Double-Sided Invoice Dashboard
The frontend has been completely revamped with a dedicated **My Invoices** panel featuring role-based views:
- **Sent Invoices (Freelancer View):** Tracks invoices you have generated. If the status is `Pending`, you can trigger a **Cancel Invoice** action. If the status is `Funded`, you can click **Release Payment** directly on the card to claim your funds.
- **Received Invoices (Client View):** Displays invoices billed to you. Easily search by invoice ID in the **Pay Invoice** tab to view details and pay.

### 3. User Onboarding System
To facilitate smooth onboarding for the required **10+ real testers**, we added:
- **Quick Start Guide:** A responsive, glassmorphic 3-step guide detailing how to set up Freighter, request test tokens, and interact with invoices.
- **Friendbot Auto-Activator:** A one-click **Request Faucet XLM** button that automatically activates and funds newly connected testnet wallets.
- **Feedback Collection:** A visible "Share Feedback 💬" button prompting testers to leave feedback after testing.

### 4. Real-time Analytics & Event Tracking
- **Umami Analytics:** Integrated privacy-focused, open-source analytics to track visitor numbers and general interface engagement.
- **Custom Event Logs:** Real-time state synchronization when transactions succeed on-chain, automatically updating wallet balances and histories without requiring page reloads.

### 5. Advanced CI/CD Pipeline
- **Dual Rust Workspace Tests:** Configured GitHub Actions to run unit tests for both `vault` and `escrow` Rust contracts concurrently.
- **Deployment Automations:** Builds WASM files, generates keys, funds them, deploys to testnet, and publishes the React build to GitHub Pages.

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Stellar Tooling:**
  - `@stellar/stellar-sdk` (Horizon and Soroban RPC simulation/assembly)
  - `@creit.tech/stellar-wallets-kit` (Freighter, Albedo, xBull wallet adapter)
- **Analytics:** Umami Analytics
- **CI/CD:** GitHub Actions

---

## 📦 Deployed Contracts

- **Vault Contract ID:** `CC5IAW2LDGVTDZJVP5Z4SLI466QGFDAGO6M7AYPVGER7GTGWAKRBTEYJ`
- **Escrow Contract ID:** `CDREZXFNVSVQZLFJG4U3XBPA2CVYH2GJNK3MADHJFNHZTXETLEAFF5SK`

---

## 📦 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Stellar wallet extension (e.g. Freighter) switched to **Testnet**.

### 1. Clone & Install
```bash
git clone https://github.com/huseyintaskinn/stellar-quickpay.git
cd stellar-quickpay
npm install
```

### 2. Run Local Dev Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📸 Level 4 Submission Proof Screenshots

*(Lütfen cüzdanınızla işlem yaptıktan sonra kendi ekran görüntülerinizle bu alanları doldurun)*

### 1. Double-Sided Invoice Dashboard (Sent & Received Tabs)
*Freelancer ve Müşteri sekmelerini içeren My Invoices panelinin ekran görüntüsü.*

[Buraya Dashboard Ekran Görüntüsünü Ekleyin]

### 2. Pay Invoice & Action Buttons
*Arama ekranında fatura detayının ve altındaki ödeme/release butonlarının görünümü.*

[Buraya Fatura Arama ve Ödeme Ekran Görüntüsünü Ekleyin]

### 3. CI/CD Success Logs (Both Contracts Cargo Test)
*GitHub Actions loglarındaki Rust sözleşme testlerinin başarıyla geçtiğini gösteren görsel.*

[Buraya CI/CD Başarı Ekran Görüntüsünü Ekleyin]
