# Stellar QuickPay & Faucet Hub (Level 1 White Belt Submission)

Welcome to **Stellar QuickPay & Faucet Hub**, a premium, glassmorphic Stellar testnet dApp built to satisfy the **Level 1 - White Belt Submission** requirements for the **Stellar Journey to Mastery** builder program.

This project is a hands-on implementation demonstrating wallet setup, wallet connection, balance fetching, testnet funding, and transaction flows on the Stellar test network.

## 🚀 Features

- 🔌 **Freighter Wallet Connection**: Securely connect and disconnect your Freighter wallet.
- 💰 **Real-time Balance Lookup**: Automatically queries Horizon API to display your active XLM balance.
- 🚰 **Testnet Faucet (Friendbot)**: A one-click button to fund/activate new wallets with 10,000 testnet XLM.
- 💸 **Send XLM Transactions**: Submit native payment transactions with customized amount inputs, target addresses, and optional text memos.
- ⚡ **Transaction Feedback**: Informative indicators during the transaction lifecycle (preparation, signing, submitting, success/failure).
- 📜 **Recent Payments History**: Lists the last 8 payment transactions sent or received by the connected wallet.
- 🎨 **Premium Glassmorphic Design**: Clean UI featuring a dark slate palette, neon accents, modern typography (Outfit Google Font), and sleek micro-animations.

---

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **SDKs**:
  - `@stellar/stellar-sdk` (v12.x for transaction building & Horizon interactions)
  - `@stellar/freighter-api` (v6.x for wallet authorization & secure signing)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Vanilla CSS (Custom Design System in `src/index.css`)

---

## 📦 Local Setup Instructions

Follow these steps to run the application locally on your machine:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Freighter Wallet Browser Extension](https://www.freighter.app/) installed. Make sure to **switch Freighter's network to Testnet** in the settings.

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd <repository-directory>
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

## 📸 Screenshots (Submission Proofs)

*Note: Replace these placeholders with your actual screenshots for submission.*

### 1. Wallet Connected State
*Shows the dApp dashboard once Freighter is successfully connected.*


<img width="640" height="500" alt="image" src="https://github.com/user-attachments/assets/48cbc86d-dc61-49b2-86b4-37e0a15bfb7e" />


### 2. Balance Displayed
*Shows the wallet address and native XLM balance loaded from the Testnet Horizon server.*


<img width="640" height="650" alt="image" src="https://github.com/user-attachments/assets/c7e26293-66d2-4626-be01-89681b9d3c5d" />


### 3. Successful Testnet Transaction
*Shows the transaction success alert with the generated transaction hash.*


<img width="1530" height="820" alt="image" src="https://github.com/user-attachments/assets/894f3059-685e-4352-b413-9d77b4934142" />


### 4. Transaction Result & History
*Shows the updated balance, transaction status, and the payment appearing in the Recent Payments table.*


<img width="1530" height="380" alt="image" src="https://github.com/user-attachments/assets/5a778cc1-8976-44c0-94a0-7dd63ba08849" />

