# StellarPay - Cross-Border Freelancer Payments (Level 5 Blue Belt Submission)

Welcome to **StellarPay** (formerly *Stellar QuickPay*), a production-ready, glassmorphic Stellar dApp upgraded to satisfy the **Level 5 - Blue Belt Submission** requirements for the **Stellar Journey to Mastery** builder program.

StellarPay enables freelancers around the globe to easily generate secure invoices, and allows clients to fund payments that are safely locked on-chain in a custom Soroban Escrow smart contract until work is completed and released by the freelancer.

---

## 🔵 Level 5 - Blue Belt Submission Details

| Requirement | Value / Link |
| :--- | :--- |
| **Live Demo Link** | [`https://huseyintaskin.com.tr/stellar-quickpay/`](https://huseyintaskin.com.tr/stellar-quickpay/) |
| **Soroban Escrow Contract ID** | `CDREZXFNVSVQZLFJG4U3XBPA2CVYH2GJNK3MADHJFNHZTXETLEAFF5SK` |
| **Escrow payment Transaction Hash** | [`21280ba3292852dea4b2efee528553cb70c55f6e73b15bfc230935e622de4abb`](https://stellar.expert/explorer/testnet/tx/21280ba3292852dea4b2efee528553cb70c55f6e73b15bfc230935e622de4abb) |
| **User Feedback Link (Google Form)** | [Google Form Link](https://forms.gle/DMxtyMvZkgKaEYE59) |
| **User Feedback Responses (Google Sheets)** | [Google Sheets Link](https://docs.google.com/spreadsheets/d/1dUZSbEjbv271jrsgxIE_9C5mWJLiTgE0ZD8oY9WkP40/edit?usp=sharing) |
| **User Testing Campaign Status** | **50+ Active Users Goal** (In Progress / Campaign Active 🎉) |
| **Demo Video Link (1-2 mins)** | [`Google Drive Demo Video`](https://drive.google.com/file/d/154AXYImlzgxtTlkZKssIB-_SN80mU3qo/view?usp=sharing) |
| **Key Level 5 Features** | Postmodern Neo-Brutalist Glassmorphism UI, On-Chain Web3 Freelancer Portfolio (Trust Profile), Gamified Badges, Dynamic Leaderboard, Stateful Demo Mode, i18n, CSV Export |

---

## 🏗️ Level 5 Architecture & Features

This level elevates the project from a simple functional MVP to a **scalable, highly polished, production-grade application featuring interactive tutorials, custom stateful simulations, gamification, and verifiable trust profiles**.

### 1. Web3 Freelancer Portfolio (Trust Profile)
StellarPay automatically parses on-chain contract transactions to generate a **verifiable freelancer trust profile**:
- **On-chain Reputation:** Displays total volume successfully transacted, total completed escrows, and successful profile statistics.
- **On-chain Badge Achievements:** Unlocks physical sticker-style Web3 badges based on smart contract state transitions.

### 2. Gamified Achievement Badges
We introduced a cüzdan (wallet) based gamification system to incentivize tester interactions:
- 🟢 **Stellar Pioneer:** Unlocked upon successfully creating your first smart contract invoice.
- ⚡ **Fast Deliverer:** Unlocked for fast payment settlements.
- 🛡️ **Trust Anchor:** Awarded for completing 5+ invoices without any contract cancellations.
- 💰 **High Volume:** Awarded for transacting large amounts of testnet XLM.

### 3. Dynamic Leaderboard
To drive user engagement during the campaign, a **top freelancer leaderboard** visualizes mock ranking records of active participant addresses, celebrating top testers.

### 4. Postmodern Neo-Brutalist Glassmorphic UI
We crafted a beautiful, high-contrast, responsive visual system:
- **Cyber-Grid texture:** Gold-tinted mesh overlay adds visual texture.
- **Glass tabs & containers:** Sleek card boundaries with exact button height alignment.
- **Responsive adaptors:** Automatically wraps columns and aligns text nicely for mobile viewports.

### 5. Stateful Demo Mode & Local Databases
We built an offline, stateful sandbox powered by `localStorage`:
- **DB Persistence:** Mock transactions are persisted under `stellar_mock_invoices`, allowing users to create an invoice in the Creator tab, query it by ID in the Payment tab, lock funds, and release it in the Dashboard, maintaining state coherently across tab-switches and page reloads.

### 6. Interactive Tutorial & On-Screen Tips
A step-by-step guided walkthrough automatically coordinates tab transitions and renders glowing visual tip boxes (Turkish/English) guiding users on inputs to enter.

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

