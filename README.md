# Stellar QuickPay & Soroban Hub (Level 2 Yellow Belt Submission)

Welcome to **Stellar QuickPay & Soroban Hub**, a premium, glassmorphic Stellar testnet dApp upgraded to satisfy the **Level 2 - Yellow Belt Submission** requirements for the **Stellar Journey to Mastery** builder program.

This project implements multi-wallet integration, Soroban smart contract interactions on Testnet, real-time transaction lifecycle tracking, and graceful error handling.

---

## 🟠 Level 3 - Orange Belt Architecture

This level transitions the project from a simple wallet interface to a **production-ready dApp architecture**.

### 1. Advanced Smart Contract (Soroban Vault)
We implemented a custom Soroban smart contract (`contracts/vault/src/lib.rs`) that acts as a decentralized Vault.
- **Inter-contract Communication:** The vault securely interacts with the native Stellar Asset Contract (SAC) to manage XLM deposits and withdrawals.
- **State Management:** Uses persistent storage to track individual user balances on-chain.
- **Event Streaming:** Emits `deposit` and `withdraw` events that the frontend listens to in real-time.

### 2. CI/CD Pipeline & Zero-Install Deployment
To bypass the need for a heavy local Rust/WASM toolchain, we architected a fully automated CI/CD pipeline using **GitHub Actions** (`.github/workflows/deploy.yml`). 
- **Automated Testing:** Runs both frontend `vitest` unit tests and backend Soroban `cargo test` on every push.
- **Automated Build & Deploy:** The pipeline automatically installs Rust, compiles the smart contract to `.wasm`, generates a temporary Testnet identity, funds it via Friendbot, and deploys the contract to the Stellar Testnet.
- **Live Hosting:** Automatically deploys the React frontend to GitHub Pages.

### 3. Real-Time Frontend
The frontend features a dedicated **Vault Dashboard** component that:
- Polls the Soroban RPC for real-time contract events.
- Handles robust error states and transaction consensus waiting.

---

## 🔗 Level 3 Submission Details

| Requirement | Value / Link |
| :--- | :--- |
| **Live Demo Link** | `https://huseyintaskin.com.tr/stellar-quickpay/` |
| **Soroban Vault Contract ID** | `CCPOQABR5MGO3NPRJCI75EYTW43JCKUUSR4DJLIZLWKLJFVUZY5K5GV2` |
| **Transaction Hash** | `https://stellar.expert/explorer/testnet/tx/fb59578ca826ccbb4a6ff667aa3e2b80aeba380c581845a2c93e269146c11aaa` |
| **Demo Video Link (1-2 mins)** | `https://drive.google.com/file/d/1KtvdFwVSZI63OGwcmBluFc0tXDRCMn_3/view?usp=sharing` |

### 📸 Level 3 Proof Screenshots

#### 1. CI/CD Pipeline Running (GitHub Actions)
*Screenshot showing a fully successful run of the `deploy.yml` workflow, including contract tests, building, deploying, and Pages deployment.*

<img width="813" height="292" alt="image" src="https://github.com/user-attachments/assets/24eb6ed4-e402-4f43-a18e-0e08b7ff05d6" />

#### 2. Test Output with 3+ Passing Tests (Frontend / Contract)
*Screenshot showing the test suite results (from GitHub Actions run logs or local console).*

<img width="1373" height="690" alt="image" src="https://github.com/user-attachments/assets/248332a7-4840-4352-9668-5a720123ef33" />


#### 3. Mobile Responsive UI
*Screenshot showing the Vault Dashboard running on a mobile screen size.*

<img width="435" height="967" alt="image" src="https://github.com/user-attachments/assets/7f51245f-a047-457f-91ee-ded7c11ba50c" />


<img width="437" height="966" alt="image" src="https://github.com/user-attachments/assets/a063df76-64dc-44d2-8a9a-29291b6c375c" />


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

<img width="490" height="395" alt="image" src="https://github.com/user-attachments/assets/50090909-3816-4ee0-b003-d0335fdb5f5d" />

#### 2. Connected State & Smart Contract Info Card
*Shows the connected wallet details alongside the Soroban Smart Contract card displaying Token Symbol, Decimals, and Contract Balance.*

<img width="635" height="435" alt="image" src="https://github.com/user-attachments/assets/e2a11e1a-7db8-4678-bac9-e912e6d75d36" />

#### 3. Successful Soroban Transfer & Status Tracking
*Shows the transaction lifecycle status updating to success and the tx hash link.*

<img width="1747" height="768" alt="image" src="https://github.com/user-attachments/assets/f4a901ff-17b4-4b22-b410-bf1337a0ff09" />

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

