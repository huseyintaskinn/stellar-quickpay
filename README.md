# StellarPay - Cross-Border Freelancer Payments (Level 4 Green Belt Submission)

Welcome to **StellarPay** (formerly *Stellar QuickPay*), a production-ready, glassmorphic Stellar dApp upgraded to satisfy the **Level 4 - Green Belt Submission** requirements for the **Stellar Journey to Mastery** builder program.

StellarPay enables freelancers around the globe to easily generate secure invoices, and allows clients to fund payments that are safely locked on-chain in a custom Soroban Escrow smart contract until work is completed and released by the freelancer.

---

## 🟢 Level 4 - Green Belt Submission Details

| Requirement | Value / Link |
| :--- | :--- |
| **Live Demo Link** | [`https://huseyintaskin.com.tr/stellar-quickpay/`](https://huseyintaskin.com.tr/stellar-quickpay/) |
| **Soroban Escrow Contract ID** | `CDREZXFNVSVQZLFJG4U3XBPA2CVYH2GJNK3MADHJFNHZTXETLEAFF5SK` |
| **Escrow payment Transaction Hash** | [`21280ba3292852dea4b2efee528553cb70c55f6e73b15bfc230935e622de4abb`](https://stellar.expert/explorer/testnet/tx/21280ba3292852dea4b2efee528553cb70c55f6e73b15bfc230935e622de4abb) |
| **User Feedback Link (Google Form)** | [Google Form Link](https://forms.gle/DMxtyMvZkgKaEYE59) |
| **User Feedback Responses (Google Sheets)** | [Google Sheets Link](https://docs.google.com/spreadsheets/d/1dUZSbEjbv271jrsgxIE_9C5mWJLiTgE0ZD8oY9WkP40/edit?usp=sharing) |
| **User Testing Status** | **11 Active Users** (100% Goal Reached! 🎉) |
| **Demo Video Link (1-2 mins)** | [`Google Drive Demo Video`](https://drive.google.com/file/d/154AXYImlzgxtTlkZKssIB-_SN80mU3qo/view?usp=sharing) |

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

#### 📈 User Testing & Feedback Campaign (11 Active Testers)
We successfully completed our user testing campaign with **11 active testers** (including the developer) interacting with the smart contracts on Testnet and providing structured feedback:
- **100% Flow Success:** All 11 users successfully created, funded, paid, and released/withdrew escrowed payments on-chain.
- **Structured Feedback:** User feedback was collected via a Google Form and logged in a public Google Sheets spreadsheet.
- **Summary of User Insights:**
  - *Strengths:* Testers highly praised the real-time transaction updates (visual loader showing contract call progress) and the simplicity of the invoice creation/escrow flow.
  - *Areas of Improvement:* Several testers suggested adding separate pages/routing and a more comprehensive dashboard styling to elevate the user experience beyond a single-page prototype layout.

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

### 1. Double-Sided Invoice Dashboard (Sent & Received Tabs)

<img width="882" height="861" alt="image" src="https://github.com/user-attachments/assets/43ab25f1-45c5-4757-a9b6-66fbd10e720b" />


### 2. Pay Invoice & Action Buttons

<img width="887" height="637" alt="image" src="https://github.com/user-attachments/assets/61437b4c-e1da-4a6c-8da9-4df5eb06c972" />


### 3. CI/CD Success Logs (Both Contracts Cargo Test)

<img width="1865" height="821" alt="image" src="https://github.com/user-attachments/assets/98c15f1d-ea52-44e9-a309-fd32862a2365" />

---

## 🚀 Vibe Coding 3.0 (Rise In) - Final Submission

Bu bölüm, **Vibe Coding 3.0** programı final teslimi kapsamında jüri değerlendirme kriterlerine yönelik proje detaylarını ve raporunu içermektedir.

### 📌 Teslim Bilgileri
- **GitHub Repository:** `https://github.com/huseyintaskinn/stellar-quickpay`
- **Projenin Kısa Açıklaması:** StellarPay, küresel ölçekte çalışan freelancer'lar ve onların müşterileri arasındaki güven problemini çözmek amacıyla geliştirilmiş; Soroban akıllı sözleşmeleriyle güçlendirilmiş, merkeziyetsiz bir faturalandırma ve emanet kasası (Escrow) uygulamasıdır.
- **Kullanılan Teknolojiler:** React, TypeScript, Vite, `@stellar/stellar-sdk` (Horizon & Soroban RPC), `@creit.tech/stellar-wallets-kit` (Freighter, Albedo, xBull), Rust (Soroban Smart Contracts), GitHub Actions (CI/CD), Umami Analytics.

---

### 🏆 Değerlendirme Kriterleri Yanıtları

#### 💡 1. Fikir ve Problem Tanımı
- **Çözülen Gerçek Problem:** Freelance ve uzaktan çalışma modelinde en yaygın karşılaşılan problem "güven" unsurudur. Freelancer'lar işi teslim ettikten sonra ödemelerini alamamaktan; müşteriler ise ödemeyi yaptıktan sonra kalitesiz iş almaktan veya hiç alamamaktan çekinirler. 
- **Merkeziyetsiz Çözüm:** StellarPay, bu güven ilişkisini tamamen kod güvencesine alır. Freelancer faturayı keser, müşteri tutarı akıllı sözleşme kasasına kilitler (`Funded`). Freelancer işi tamamlayıp teslim ettiğinde tek tıkla ödemeyi kendi cüzdanına çekebilir (`Released`).
- **Yaratıcılık:** Stellar'ın hızlı ve ultra düşük komisyonlu yapısını kullanarak küresel sınır ötesi ödemeleri geleneksel escrow (emanet) komisyonları olmadan saniyeler içinde çözer.

#### ⚙️ 2. Teknik Uygulama
- **Akıllı Sözleşme Mimarisi (On-chain):** Rust ile yazılan Soroban sözleşmesi testnet üzerinde canlı çalışmaktadır. Sözleşme, Stellar'ın yerel varlık sözleşmesi (SAC) ile doğrudan konuşarak fon yönetimini ve transferini tamamen zincir üstünde yürütür.
- **Kod Kalitesi ve Testler:** Projede hem ön yüz (`vitest`) hem de akıllı sözleşme (`cargo test`) için otomatik test paketleri yazılmıştır.
- **Otomatik CI/CD:** Yazılan GitHub Actions iş akışı (`deploy.yml`) sayesinde her güncellenen kodda sözleşme otomatik olarak derlenir, testleri koşulur, testnet'e otomatik deploy edilir ve ön yüz GitHub Pages üzerinde canlıya alınır.

#### 🤖 3. AI Kullanımı (Antigravity, Gemini & Claude)
- **Kullanılan Araçlar:** Proje, Google DeepMind ekibinin deneysel asistanı **Antigravity** üzerinde, **Gemini** ve **Claude** yapay zeka modelleriyle hibrit bir şekilde (Pair Programming) geliştirilmiştir.
- **AI'ın Ürüne Katkısı:** AI bu projede sadece kod tamamlayıcı bir yardımcı olarak kalmamış;
  1. **Hata Analizi & Debugging:** Soroban RPC simülasyonlarından dönen enum verilerinin JavaScript tarafında dizi (`Array`) olarak parse edilmesi esnasındaki index çökmelerini ve cüzdan yenileme bakiye güncellemelerini analiz ederek mimari çözümler üretmiştir.
  2. **CI/CD Pipeline Kurulumu:** Rust/WASM derleme zincirinin GitHub üzerinde sıfır kurulumla deploy edilmesini sağlayan karmaşık YAML yapılandırmalarını tasarlamıştır.
  3. **Güvenlik Mimarisi:** Sözleşme içindeki client/freelancer doğrulama mantığını (`require_auth`) kurgulamıştır.

#### 🎨 4. Kullanıcı Deneyimi (UX)
- **Arayüz Tasarımı:** Premium koyu tema (Glassmorphism efektleri), canlı renk paleti ve modern tipografi kullanılarak üst seviye bir tasarım dili kurgulanmıştır.
- **Onboarding (Kullanıcı Alıştırma):** Web3 dünyasına yeni adım atan kullanıcıların uygulamayı test edebilmesi için **3 Adımlı Hızlı Başlangıç Rehberi**, tek tıkla Freighter cüzdanı fonlayan **Friendbot Faucet** aracı ve entegre geri bildirim butonları eklenmiştir.
- **Kullanılabilirlik:** Fatura iptal etme (`Cancel`) ve ödeme çekme (`Release`) gibi kritik işlemler doğrudan tek tıkla dashboard üzerinden yönetilebilmektedir.

#### 📄 5. Dokümantasyon ve Sunum
- **README Kapsamı:** Kurulum adımları, deployed sözleşme adresleri, mimari diyagramlar ve Vibe Coding raporu dahil tüm proje detayları şeffaf bir şekilde dokümante edilmiştir.

