# Stellar QuickPay & Soroban Hub (Level 2 Yellow Belt Submission)

Welcome to **Stellar QuickPay & Soroban Hub**, a premium, glassmorphic Stellar testnet dApp upgraded to satisfy the **Level 2 - Yellow Belt Submission** requirements for the **Stellar Journey to Mastery** builder program.

This project implements multi-wallet integration, Soroban smart contract interactions on Testnet, real-time transaction lifecycle tracking, and graceful error handling.

---

## 🚀 Level 2 Features

1. 🔌 **Multi-Wallet Adapter (Stellar Wallets Kit)**:
   - Integrates `@creit.tech/stellar-wallets-kit` to show a wallet connection modal supporting **Freighter, Albedo, and xBull** wallets.
2. ⛓️ **Soroban Smart Contract Integration**:
   - Targets the official **Stellar Native Asset Contract (SAC)** on testnet:
     `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
   - **Read Calls**: Queries token metadata (`symbol()`, `decimals()`) and the connected account's contract `balance()` via Soroban RPC simulations (`https://soroban-testnet.stellar.org`).
   - **Write Calls**: Invokes the `transfer(from, to, amount)` function on the contract, simulating resource footprints/fees and signing via the selected wallet.
3. ⚠️ **Graceful Error Handling (3+ Error Types)**:
   - **Wallet Connection Rejected/Closed**: Friendly alerts if the user cancels or closes the wallet kit modal.
   - **Insufficient Balance**: Validates payment amounts against current wallet/contract balance prior to building and signing.
   - **Simulation & Invalid Input Error**: Displays detailed diagnostics if simulation fails (e.g., due to an invalid destination address or contract exception).
4. ⚡ **Transaction Status Progression**:
   - Real-time display of execution states: `idle` | `preparing` | `simulating` | `signing` | `submitting` | `success` | `error`.

---

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **SDKs**:
  - `@stellar/stellar-sdk` (v16.x for Soroban RPC & Horizon integration)
  - `@creit.tech/stellar-wallets-kit` (v2.4.0 for multi-wallet support)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Vanilla CSS (Custom Design System in `src/index.css`)

---

## 📦 Deployed Contract & Proofs

- **Target Soroban Contract ID**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (Native Asset SAC)
- **Valid Contract Call Tx Hash**: `YOUR_SOROBAN_TRANSFER_TX_HASH` *(After performing a contract transfer, replace this placeholder with your transaction hash)*

---

## 📦 Local Setup Instructions

Follow these steps to run the application locally on your machine:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A supported Stellar wallet extension installed (e.g. [Freighter](https://www.freighter.app/), [xBull](https://xbull.app/), or [Albedo](https://albedo.link/)). Ensure your wallet is switched to **Testnet**.

### 1. Clone the repository
```bash
git clone https://github.com/huseyintaskinn/stellar-quickpay.git
cd stellar-quickpay
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
```

The application will start running, and you can open it in your browser at `http://localhost:5173`.

---

### Level 2 - Screenshots (Yellow Belt Proofs)

*Note: Replace these placeholders with your actual screenshots for submission.*

#### 1. Multi-Wallet Adapter Modal
*Shows the Stellar Wallets Kit modal triggering when clicking "Connect Wallet", listing Freighter, Albedo, and xBull.*
![Multi-Wallet Kit Modal](https://placehold.co/800x450/0b0f19/f8fafc?text=1.+Multi-Wallet+Kit+Modal)

#### 2. Connected State & Smart Contract Info Card
*Shows the connected wallet details alongside the Soroban Smart Contract card displaying Token Symbol, Decimals, and Contract Balance.*
![Connected & Soroban Metadata](https://placehold.co/800x450/0b0f19/f8fafc?text=2.+Soroban+Metadata+Loaded)

#### 3. Successful Soroban Transfer & Status Tracking
*Shows the transaction lifecycle status updating to success and the tx hash link.*
![Successful Soroban Transfer](https://placehold.co/800x450/0b0f19/f8fafc?text=3.+Successful+Soroban+Transfer)

---

### Level 1 - Screenshots (White Belt Proofs)

#### 1. Wallet Connected State
*Shows the dApp dashboard once Freighter is successfully connected.*

<img width="640" height="500" alt="image" src="https://github.com/user-attachments/assets/48cbc86d-dc61-49b2-86b4-37e0a15bfb7e" />

#### 2. Balance Displayed
*Shows the wallet address and native XLM balance loaded from the Testnet Horizon server.*

<img width="640" height="650" alt="image" src="https://github.com/user-attachments/assets/c7e26293-66d2-4626-be01-89681b9d3c5d" />

#### 3. Successful Testnet Transaction
*Shows the transaction success alert with the generated transaction hash.*

<img width="1530" height="820" alt="image" src="https://github.com/user-attachments/assets/894f3059-685e-4352-b413-9d77b4934142" />

#### 4. Transaction Result & History
*Shows the updated balance, transaction status, and the payment appearing in the Recent Payments table.*

<img width="1530" height="380" alt="image" src="https://github.com/user-attachments/assets/5a778cc1-8976-44c0-94a0-7dd63ba08849" />

