import React, { useState, useEffect } from 'react';
import {
  StellarWalletsKit,
  Networks as WalletKitNetworks
} from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import {
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Horizon,
  rpc,
  Address,
  scValToNative,
  Account,
  Memo
} from '@stellar/stellar-sdk';
import {
  Wallet,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  LogOut,
  Cpu,
  Layers,
  FileText,
  CreditCard,
  LayoutDashboard,
  Menu,
  X,
  Home,
  Award,
  Trophy
} from 'lucide-react';
import { VaultDashboard } from './VaultDashboard';
import { InvoiceCreator } from './components/InvoiceCreator';
import { InvoicePayment } from './components/InvoicePayment';
import { FreelancerDashboard } from './components/FreelancerDashboard';
import { translations } from './i18n';

interface PaymentTx {
  id: string;
  type: string;
  from: string;
  to: string;
  amount: string;
  transaction_hash: string;
  created_at: string;
}

interface LeaderboardEntry {
  address: string;
  completed: number;
}

function App() {
  const [lang, setLang] = useState<'en' | 'tr'>('en');
  const t = translations[lang];

  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isAccountActivated, setIsAccountActivated] = useState<boolean>(true);
  
  // UI States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'create-invoice' | 'pay-invoice' | 'advanced'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // StellarPay Escrow Contract
  const ESCROW_CONTRACT_ID = 'CDREZXFNVSVQZLFJG4U3XBPA2CVYH2GJNK3MADHJFNHZTXETLEAFF5SK';
  const NATIVE_ASSET_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form State - Classic
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  // Soroban Contract State
  const contractId = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const [contractSymbol, setContractSymbol] = useState<string | null>(null);
  const [contractDecimals, setContractDecimals] = useState<number | null>(null);
  const [contractBalance, setContractBalance] = useState<string | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);

  // Transaction Status
  const [txStatus, setTxStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    hash?: string;
  }>({ type: 'idle', message: '' });

  // History State
  const [history, setHistory] = useState<PaymentTx[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search History State (Local Storage Caching)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('invoice_search_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Server Instances
  const HORIZON_URL = 'https://horizon-testnet.stellar.org';
  const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
  
  const server = new Horizon.Server(HORIZON_URL);
  const rpcServer = new rpc.Server(SOROBAN_RPC_URL);

  // Initialize Stellar Wallets Kit on mount
  useEffect(() => {
    try {
      StellarWalletsKit.init({
        modules: [
          new FreighterModule(),
          new AlbedoModule(),
          new xBullModule()
        ],
        network: WalletKitNetworks.TESTNET
      });
      
      const checkCurrentAddress = async () => {
        try {
          const { address } = await StellarWalletsKit.getAddress();
          if (address) {
            setWalletAddress(address);
            await loadAllData(address);
          }
        } catch {
          // No active wallet address stored yet, ignore
        }
      };
      checkCurrentAddress();
    } catch (err) {
      console.error("Error initializing Stellar Wallets Kit:", err);
    }
  }, []);

  // Fetch contract metadata (symbol, decimals, balance)
  const fetchContractMetadata = async (address: string) => {
    setLoadingContract(true);
    try {
      const sourceAccount = new Account(address, '1');

      // 1. Query symbol()
      const symbolTx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: contractId,
            function: 'symbol',
            args: []
          })
        )
        .setTimeout(30)
        .build();

      const symbolRes = await rpcServer.simulateTransaction(symbolTx) as any;
      if (symbolRes.result && symbolRes.result.retval) {
        setContractSymbol(scValToNative(symbolRes.result.retval).toString());
      }

      // 2. Query decimals()
      const decimalsTx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: contractId,
            function: 'decimals',
            args: []
          })
        )
        .setTimeout(30)
        .build();

      const decimalsRes = await rpcServer.simulateTransaction(decimalsTx) as any;
      if (decimalsRes.result && decimalsRes.result.retval) {
        setContractDecimals(Number(scValToNative(decimalsRes.result.retval)));
      }

      // 3. Query balance(Address)
      const balanceTx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: contractId,
            function: 'balance',
            args: [new Address(address).toScVal()]
          })
        )
        .setTimeout(30)
        .build();

      const balanceRes = await rpcServer.simulateTransaction(balanceTx) as any;
      if (balanceRes.result && balanceRes.result.retval) {
        const rawBal = scValToNative(balanceRes.result.retval);
        const formatted = (Number(rawBal) / Math.pow(10, 7)).toFixed(4);
        setContractBalance(formatted);
      }
    } catch (err) {
      console.error('Error fetching contract metadata:', err);
    } finally {
      setLoadingContract(false);
    }
  };

  // Fetch classic native account balance
  const fetchBalance = async (address: string) => {
    try {
      const response = await fetch(`${HORIZON_URL}/accounts/${address}`);
      
      if (response.status === 404) {
        setBalance('0.0000');
        setIsAccountActivated(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }

      const data = await response.json();
      const nativeAsset = data.balances.find((b: any) => b.asset_type === 'native');
      
      if (nativeAsset) {
        setBalance(parseFloat(nativeAsset.balance).toFixed(4));
        setIsAccountActivated(true);
      } else {
        setBalance('0.0000');
        setIsAccountActivated(true);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('Error loading');
    }
  };

  // Fetch recent payments history
  const fetchTxHistory = async (address: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${HORIZON_URL}/accounts/${address}/payments?limit=8&order=desc`);
      if (response.ok) {
        const data = await response.json();
        const payments = data._embedded.records
          .map((r: any) => {
            const from = r.from || r.funder || r.source_account || '';
            const to = r.to || r.account || r.into || '';
            let amount = r.amount || r.starting_balance || '0';
            let type = r.type;

            if (r.type === 'invoke_host_function') {
              type = 'Contract Call';
              amount = 'Soroban Tx';
            }

            return {
              id: r.id,
              type,
              from: from || r.source_account || '',
              to: to || 'StellarPay Contract',
              amount,
              transaction_hash: r.transaction_hash,
              created_at: r.created_at
            };
          });
        setHistory(payments);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper to load all account metrics
  const loadAllData = async (address: string) => {
    await Promise.all([
      fetchBalance(address),
      fetchTxHistory(address),
      fetchContractMetadata(address)
    ]);
  };

  // Refresh trigger
  const handleRefresh = async () => {
    if (!walletAddress) return;
    setIsRefreshing(true);
    await loadAllData(walletAddress);
    setIsRefreshing(false);
  };

  // Connect Wallet using Stellar Wallets Kit Modal
  const connectWallet = async () => {
    setIsConnecting(true);
    setTxStatus({ type: 'idle', message: '' });
    try {
      const { address } = await StellarWalletsKit.authModal();
      
      if (address) {
        setWalletAddress(address);
        await loadAllData(address);
      } else {
        throw new Error('Connection rejected or closed.');
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setTxStatus({
        type: 'error',
        message: err.message || 'Connection request rejected.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch (err) {
      console.error("Disconnect error:", err);
    }
    setWalletAddress(null);
    setBalance(null);
    setHistory([]);
    setIsAccountActivated(true);
    setContractSymbol(null);
    setContractDecimals(null);
    setContractBalance(null);
    setTxStatus({ type: 'idle', message: '' });
    setRecipient('');
    setAmount('');
    setMemo('');
  };

  // Fund Wallet with Friendbot Faucet
  const claimFaucet = async () => {
    if (!walletAddress) return;
    setIsFunding(true);
    setTxStatus({ type: 'loading', message: 'Requesting 10,000 XLM from Friendbot Faucet...' });
    
    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${walletAddress}`);
      if (response.ok) {
        setTxStatus({
          type: 'success',
          message: 'Success! Your account was funded with 10,000 XLM from Friendbot. It is now activated on Testnet.'
        });
        await loadAllData(walletAddress);
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Friendbot failed to process request');
      }
    } catch (err: any) {
      console.error('Faucet error:', err);
      setTxStatus({
        type: 'error',
        message: `Faucet failed: ${err.message || err.toString()}`
      });
    } finally {
      setIsFunding(false);
    }
  };

  // Classic payment flow
  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !recipient || !amount) return;

    setTxStatus({ type: 'loading', message: 'Preparing classic payment transaction...' });

    try {
      if (!recipient.startsWith('G') || recipient.length !== 56) {
        throw new Error('Invalid recipient address format. Stellar addresses are 56 characters and start with G.');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount greater than 0.');
      }

      if (balance) {
        const currentBalanceVal = parseFloat(balance);
        if (parsedAmount + 0.0001 > currentBalanceVal) {
          throw new Error(`Insufficient funds. You are trying to send ${amount} XLM + fee but only have ${balance} XLM.`);
        }
      }

      setTxStatus({ type: 'loading', message: 'Fetching sender account details...' });
      let sourceAccount;
      try {
        sourceAccount = await server.loadAccount(walletAddress);
      } catch (err) {
        throw new Error('Sender account is not active on-chain. Please fund it using the Faucet first.');
      }

      setTxStatus({ type: 'loading', message: 'Building transaction fee and operations...' });
      const fee = await server.fetchBaseFee();

      const transactionBuilder = new TransactionBuilder(sourceAccount, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: recipient,
            asset: Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(60);

      if (memo.trim()) {
        transactionBuilder.addMemo(Memo.text(memo.trim()));
      }

      const transaction = transactionBuilder.build();
      const xdr = transaction.toXDR();

      setTxStatus({ type: 'loading', message: 'Awaiting signature in connected wallet...' });
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, { 
        networkPassphrase: Networks.TESTNET,
        address: walletAddress
      });

      if (!signedTxXdr) {
        throw new Error('Signing request rejected. Transaction was not signed.');
      }

      setTxStatus({ type: 'loading', message: 'Submitting transaction to Horizon Testnet...' });
      const transactionToSubmit = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      const response = await server.submitTransaction(transactionToSubmit);

      setTxStatus({
        type: 'success',
        message: `Successfully sent ${amount} XLM to ${recipient.slice(0, 6)}...${recipient.slice(-6)}!`,
        hash: response.hash,
      });

      setRecipient('');
      setAmount('');
      setMemo('');

      await loadAllData(walletAddress);

    } catch (err: any) {
      console.error('Payment execution failed:', err);
      let errorMsg = err.message || err.toString();
      
      if (err.response && err.response.data && err.response.data.extras && err.response.data.extras.result_codes) {
        const codes = err.response.data.extras.result_codes;
        if (codes.operations && codes.operations.length > 0) {
          const opCode = codes.operations[0];
          if (opCode === 'op_no_destination') {
            errorMsg = 'Destination account does not exist. You must send at least 1 XLM to fund and create this account on-chain.';
          } else if (opCode === 'op_underfunded') {
            errorMsg = 'Your account has insufficient funds to cover this payment amount and base fee.';
          } else {
            errorMsg = `Operation failed with code: ${opCode}`;
          }
        } else if (codes.transaction) {
          errorMsg = `Transaction rejected by network with code: ${codes.transaction}`;
        }
      }
      setTxStatus({
        type: 'error',
        message: errorMsg
      });
    }
  };

  // Copy address helper
  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Truncate address
  const truncateAddr = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  // Format timestamp
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Add search history caching helper
  const handleSearchLookup = (id: string) => {
    if (!id) return;
    const historyUpdated = [id, ...searchHistory.filter(h => h !== id)].slice(0, 5);
    setSearchHistory(historyUpdated);
    localStorage.setItem('invoice_search_history', JSON.stringify(historyUpdated));
  };

  // Mock Active Testers for Leaderboard
  const LEADERBOARD_DATA: LeaderboardEntry[] = [
    { address: 'GBGHSPQEIZGJOJJDJYG5VVIPU7THJQU2Z4B6V5VF5IHUQ2SOLIRITDQS', completed: 6 },
    { address: 'GAJOE3OBM5CDRG75LLO732V3ZZB5LPT6VIWBOAHCYXW57DTYOOGCLD6B', completed: 5 },
    { address: 'GD7UFEHE4J3RKQ25ZDGGJ4VBUWATV645UUMN4JYDIBMSFCSFOWXSQ6LM', completed: 4 },
    { address: 'GCZDX5E7RT7BTTA6VJC7YYHOYQYNHRDGEDB3O32K74VC52LC7XFCEZTH', completed: 4 },
    { address: 'GC74KHZR7ASDTNQL37RDWNH3CDXW6W5BBPIJHCYQ3THFHXAHTXINKBCU', completed: 3 },
    { address: 'GC3HF6V7RVDY4HOEEFK2HZBVHYIR6BJI3ZW5ZIPDRWAOZCMNHSIBUUU2', completed: 3 },
    { address: 'GCK3FLKPSX7BFW2ZT4Y7UYTMGXQJNG4VATNHNVN6HY35Q7VCK5KMY35A', completed: 2 },
    { address: 'GARK7CKUWU5KMQ2SN2YDNUC6VVHJS4TZOKXFVTHMJXRT5OJ3A7R2NAH2', completed: 2 },
    { address: 'GDN3LAXT3AIFBQ6HE7YJS2JYNXZC2MG4GAPLXFWCRYR724KUGVMHBMTH', completed: 1 },
    { address: 'GBGXWU6KR6CPGLHOFVSJ5W4L7ZTVE34VILBRS4TFHV3OIH2SSTQV3AQM', completed: 1 }
  ];

  // Dynamic user statistics for Trust Profile & Badges
  const userCompletedCount = history.filter(tx => tx.type === 'Contract Call').length;
  const userVolume = history.filter(tx => tx.type === 'payment').reduce((acc, tx) => acc + parseFloat(tx.amount || '0'), 0);

  // Dynamic Leaderboard list inserting current user
  const getDynamicLeaderboard = (): LeaderboardEntry[] => {
    if (!walletAddress) return LEADERBOARD_DATA;
    const userInLeaderboard = LEADERBOARD_DATA.find(entry => entry.address === walletAddress);
    if (userInLeaderboard) {
      return [...LEADERBOARD_DATA].sort((a, b) => b.completed - a.completed);
    }
    const currentScore = userCompletedCount;
    const list = [...LEADERBOARD_DATA, { address: walletAddress, completed: currentScore }];
    return list.sort((a, b) => b.completed - a.completed);
  };

  // Gamification badges condition checks
  const isPioneerUnlocked = userCompletedCount >= 1;
  const isDelivererUnlocked = userCompletedCount >= 3;
  const isTrustAnchorUnlocked = userCompletedCount >= 5;
  const isVolumeUnlocked = userVolume >= 500;

  return (
    <div className="app-container">

      {/* ── TOP NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
            </svg>
          </div>
          <span className="navbar-logo-text">StellarPay</span>
        </div>

        {/* Center nav links — grouped into separate pages */}
        {walletAddress && (
          <div className="navbar-nav">
            <button onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} className={`navbar-link ${activeTab === 'overview' ? 'active' : ''}`}>
              <Home size={14} /> {t.dashboardTab}
            </button>
            <button onClick={() => { setActiveTab('invoices'); setMobileMenuOpen(false); }} className={`navbar-link ${activeTab === 'invoices' ? 'active' : ''}`}>
              <LayoutDashboard size={14} /> {t.myInvoices}
            </button>
            <button onClick={() => { setActiveTab('create-invoice'); setMobileMenuOpen(false); }} className={`navbar-link ${activeTab === 'create-invoice' ? 'active' : ''}`}>
              <PlusCircle size={14} /> {t.createTitle}
            </button>
            <button onClick={() => { setActiveTab('pay-invoice'); setMobileMenuOpen(false); }} className={`navbar-link ${activeTab === 'pay-invoice' ? 'active' : ''}`}>
              <CreditCard size={14} /> {t.payTitle}
            </button>
            <button onClick={() => { setActiveTab('advanced'); setMobileMenuOpen(false); }} className={`navbar-link ${activeTab === 'advanced' ? 'active' : ''}`}>
              <Cpu size={14} /> {t.advancedTab}
            </button>
          </div>
        )}

        <div className="navbar-right">
          <div className="testnet-badge">
            <span className="testnet-dot" />
            <span>{t.testnetIndicator}</span>
          </div>

          <button onClick={() => setLang(lang === 'en' ? 'tr' : 'en')} className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', borderRadius: '99px' }}>
            {lang === 'en' ? 'TR' : 'EN'}
          </button>

          {walletAddress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="wallet-chip">
                <span className="wallet-dot" />
                <code style={{ fontSize: '0.75rem' }} title={walletAddress}>{truncateAddr(walletAddress)}</code>
                <button onClick={copyAddress} style={{ background: 'none', border: 'none', color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', lineHeight: '1' }} title="Copy">
                  <Copy size={11} />
                </button>
              </div>
              <button className="btn btn-secondary" onClick={disconnectWallet} title={t.disconnectBtn} style={{ padding: '0.35rem 0.6rem', borderRadius: '99px' }}>
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button className="btn btn-accent" onClick={connectWallet} disabled={isConnecting} style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              {isConnecting ? <><RefreshCw size={14} className="spinner" /> Connecting...</> : <><Wallet size={14} /> {t.connectBtn}</>}
            </button>
          )}

          <button className="navbar-burger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav dropdown overlay */}
      {walletAddress && (
        <div className={`mobile-nav-overlay ${mobileMenuOpen ? 'open' : ''}`}>
          {[
            { tab: 'overview', icon: <Home size={14} />, label: t.dashboardTab },
            { tab: 'invoices', icon: <LayoutDashboard size={14} />, label: t.myInvoices },
            { tab: 'create-invoice', icon: <PlusCircle size={14} />, label: t.createTitle },
            { tab: 'pay-invoice', icon: <CreditCard size={14} />, label: t.payTitle },
            { tab: 'advanced', icon: <Cpu size={14} />, label: t.advancedTab },
          ].map(({ tab, icon, label }) => (
            <button key={tab} onClick={() => { setActiveTab(tab as any); setMobileMenuOpen(false); }}
              className={`navbar-link ${activeTab === tab ? 'active' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.75rem 1rem' }}>
              {icon} {label}
            </button>
          ))}
          <hr style={{ border: 'none', borderTop: '2px solid var(--border)', margin: '0.5rem 0' }} />
          <a href="https://forms.gle/DMxtyMvZkgKaEYE59" target="_blank" rel="noreferrer" className="navbar-link"
            style={{ justifyContent: 'flex-start', textDecoration: 'none', color: 'var(--accent-emerald)', width: '100%', padding: '0.75rem 1rem' }}>
            {t.feedbackBtn}
          </a>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="content-wrapper">

        {/* Transaction state alerts */}
        {txStatus.type !== 'idle' && (
          <div className={`alert ${txStatus.type === 'error' ? 'alert-danger' : txStatus.type === 'loading' ? 'alert-info' : 'alert-success'}`}>
            {txStatus.type === 'loading' ? <RefreshCw size={16} className="spinner" /> : txStatus.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span>{txStatus.message}</span>
              {txStatus.hash && (
                <a href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`} target="_blank" rel="noreferrer"
                  style={{ color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline', fontSize: '0.8rem' }}>
                  View on Stellar.Expert <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── LANDING PAGE (Not Connected) ── */}
        {!walletAddress ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', minHeight: 'calc(100vh - 70px)', paddingBottom: '4rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
              <span className="testnet-badge"><span className="testnet-dot" />Testnet</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>· Stellar Smart Contracts</span>
            </div>

            <h2 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
              {t.connectWallet}
            </h2>

            <h1 className="pulse-glow-text" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontStyle: 'italic', lineHeight: 1.05, marginBottom: '1.5rem', maxWidth: '850px' }}>
              {t.title}
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '560px', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              {t.subtitle}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-accent" onClick={connectWallet} disabled={isConnecting} style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
                {isConnecting ? <><RefreshCw size={16} className="spinner" /> Connecting...</> : <><Wallet size={16} /> {t.connectBtn}</>}
              </button>
              <a href="https://stellar.org" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem', textDecoration: 'none' }}>
                Learn about Stellar <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '3rem', marginTop: '5rem', flexWrap: 'wrap' }}>
              {[{ label: 'Protocol', value: 'Soroban' }, { label: 'Avg. Fee', value: '< 0.0001 XLM' }, { label: 'Settlement', value: '~5 seconds' }].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>{label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

        ) : (
          /* ── AUTHENTICATED WORKSPACE ── */
          <>
            {/* PAGE 1: OVERVIEW & TRUST PROFILE */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontStyle: 'italic' }}>{t.dashboardTab}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{t.subtitle}</p>
                  </div>
                  <button className="btn btn-secondary" onClick={handleRefresh} disabled={isRefreshing} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                    <RefreshCw size={13} className={isRefreshing ? 'spinner' : ''} /> {t.refreshBtn}
                  </button>
                </div>

                {/* Dashboard Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Freelancer Trust Profile & Badges */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <span className="card-title-mono"><Award size={14} /> {t.trustProfileTitle}</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{t.totalVolume}</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{userVolume.toFixed(2)} XLM</div>
                      </div>
                      <div style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{t.successfulProjects}</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{userCompletedCount}</div>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '2px solid var(--border)' }} />

                    {/* Trust Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{t.badgesTitle}</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        
                        <div className={`sticker-badge ${isPioneerUnlocked ? 'unlocked' : 'locked'}`} title={t.stellarPioneerDesc}>
                          <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🚀</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{t.stellarPioneer}</span>
                        </div>

                        <div className={`sticker-badge ${isDelivererUnlocked ? 'unlocked' : 'locked'}`} title={t.fastDelivererDesc}>
                          <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>⚡</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{t.fastDeliverer}</span>
                        </div>

                        <div className={`sticker-badge ${isTrustAnchorUnlocked ? 'unlocked' : 'locked'}`} title={t.trustAnchorDesc}>
                          <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🛡️</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{t.trustAnchor}</span>
                        </div>

                        <div className={`sticker-badge ${isVolumeUnlocked ? 'unlocked' : 'locked'}`} title={t.highVolumeDesc}>
                          <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>💎</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{t.highVolume}</span>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Leaderboard (Active User Competition) */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <span className="card-title-mono"><Trophy size={14} style={{ color: 'var(--accent)' }} /> {t.leaderboardTitle}</span>
                    
                    <div className="custom-table-container" style={{ border: 'none' }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th style={{ padding: '0.5rem' }}>{t.rank}</th>
                            <th style={{ padding: '0.5rem' }}>{t.tester}</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>{t.completedCount}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getDynamicLeaderboard().slice(0, 5).map((entry, idx) => {
                            const isMe = entry.address === walletAddress;
                            return (
                              <tr key={idx} style={{ background: isMe ? 'rgba(245,197,24,0.06)' : 'transparent' }}>
                                <td style={{ padding: '0.5rem', fontWeight: 800, color: idx === 0 ? 'var(--accent)' : 'inherit' }}>
                                  #{idx + 1}
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <code style={{ fontSize: '0.72rem' }}>
                                    {truncateAddr(entry.address)} {isMe ? ' (Me)' : ''}
                                  </code>
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                  {entry.completed}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Balances & Activation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div className="card">
                    <span className="card-title-mono">{t.nativeBalance}</span>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      {balance ?? '—'} <span style={{ fontSize: '1rem', color: 'var(--accent)', fontWeight: 800 }}>XLM</span>
                    </div>
                  </div>

                  <div className="card">
                    <span className="card-title-mono">{t.contractBalance}</span>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      {loadingContract ? '—' : contractBalance || '0.0000'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{contractSymbol || 'XLM'}</span>
                    </div>
                  </div>

                  {!isAccountActivated && (
                    <div className="card" style={{ background: 'rgba(245,68,68,0.02)', borderColor: 'rgba(245,68,68,0.2)' }}>
                      <span className="card-title-mono" style={{ color: '#ef4444' }}>Account Inactive</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>Your wallet is inactive. Funding activates it.</p>
                      <button className="btn btn-accent" onClick={claimFaucet} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Request Faucet XLM</button>
                    </div>
                  )}
                </div>

                {/* Quick Guide */}
                <div className="card">
                  <span className="card-title-mono"><Info size={14} /> {t.guideTitle}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {[{ title: t.step1Title, desc: t.step1Desc }, { title: t.step2Title, desc: t.step2Desc }, { title: t.step3Title, desc: t.step3Desc }].map(({ title, desc }, idx) => (
                      <div key={idx}>
                        <strong style={{ color: '#fff', display: 'block', marginBottom: '0.25rem' }}>{title}</strong>
                        <p>{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Faucet Box */}
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{t.faucetTitle}</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{t.faucetDesc}</p>
                  </div>
                  <button className="btn btn-secondary" onClick={claimFaucet} disabled={isFunding} style={{ borderStyle: 'dashed', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    {isFunding ? <><RefreshCw size={13} className="spinner" /> {t.faucetFunding}</> : <><PlusCircle size={13} /> {t.faucetBtn}</>}
                  </button>
                </div>

              </div>
            )}

            {/* PAGE 2: INVOICES DASHBOARD */}
            {activeTab === 'invoices' && (
              <div className="card">
                <FreelancerDashboard
                  walletAddress={walletAddress!}
                  rpcServer={rpcServer}
                  server={server}
                  escrowContractId={ESCROW_CONTRACT_ID}
                  refreshTrigger={refreshTrigger}
                  onSuccess={() => loadAllData(walletAddress!)}
                  t={t}
                />
              </div>
            )}

            {/* PAGE 3: CREATE INVOICE */}
            {activeTab === 'create-invoice' && (
              <div className="card">
                <InvoiceCreator
                  walletAddress={walletAddress!}
                  rpcServer={rpcServer}
                  server={server}
                  escrowContractId={ESCROW_CONTRACT_ID}
                  nativeAssetContractId={NATIVE_ASSET_CONTRACT_ID}
                  onInvoiceCreated={() => setRefreshTrigger(t => t + 1)}
                  t={t}
                />
              </div>
            )}

            {/* PAGE 4: PAY INVOICE */}
            {activeTab === 'pay-invoice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card">
                  <InvoicePayment
                    walletAddress={walletAddress!}
                    rpcServer={rpcServer}
                    server={server}
                    escrowContractId={ESCROW_CONTRACT_ID}
                    onSuccess={(id) => {
                      loadAllData(walletAddress!);
                      handleSearchLookup(id);
                    }}
                    t={t}
                  />
                </div>

                {/* Recent Searches history block (Local Caching) */}
                {searchHistory.length > 0 && (
                  <div className="card">
                    <span className="card-title-mono"><FileText size={14} /> {t.recentSearches}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {searchHistory.map((id) => (
                        <button
                          key={id}
                          onClick={() => {
                            // Find and lookup
                            const input = document.getElementById('search-invoice-input') as HTMLInputElement;
                            if (input) {
                              input.value = id;
                              const form = input.form;
                              if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                        >
                          #{id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAGE 5: ADVANCED ACTIONS */}
            {activeTab === 'advanced' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                
                {/* Classic Horizon Send */}
                <div className="card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Send size={16} /> Send Classic Payment
                  </h3>
                  <form onSubmit={handleSendPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="recipient">Recipient Address</label>
                      <input id="recipient" type="text" className="form-input" placeholder="G..."
                        value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="amount">Amount (XLM)</label>
                      <input id="amount" type="number" step="any" min="0.0000001" className="form-input" placeholder="0.0"
                        value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="memo">Memo (Optional)</label>
                      <input id="memo" type="text" maxLength={28} className="form-input" placeholder="e.g. Invoice #42"
                        value={memo} onChange={(e) => setMemo(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}
                      disabled={txStatus.type === 'loading' || !recipient || !amount}>
                      <Send size={15} /> Send Transaction
                    </button>
                  </form>
                </div>

                {/* Soroban Vault */}
                <div className="card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={16} /> Advanced Vault Dashboard
                  </h3>
                  <VaultDashboard
                    walletAddress={walletAddress}
                    rpcServer={rpcServer}
                    server={server}
                    onSuccess={() => loadAllData(walletAddress)}
                  />
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
