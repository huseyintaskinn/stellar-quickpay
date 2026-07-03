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
  LayoutDashboard
} from 'lucide-react';
import { VaultDashboard } from './VaultDashboard';
import { InvoiceCreator } from './components/InvoiceCreator';
import { InvoicePayment } from './components/InvoicePayment';
import { FreelancerDashboard } from './components/FreelancerDashboard';

interface PaymentTx {
  id: string;
  type: string;
  from: string;
  to: string;
  amount: string;
  transaction_hash: string;
  created_at: string;
}

function App() {
  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isAccountActivated, setIsAccountActivated] = useState<boolean>(true);
  
  // UI States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'classic' | 'soroban' | 'create-invoice' | 'pay-invoice' | 'dashboard'>('create-invoice');

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
      
      // Auto-check if wallet address is stored/connected
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
      // Create a dummy account for read-only simulations
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
      // Open the connection modal
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
      // 1. Input validations (Error Type 1)
      if (!recipient.startsWith('G') || recipient.length !== 56) {
        throw new Error('Invalid recipient address format. Stellar addresses are 56 characters and start with G.');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount greater than 0.');
      }

      // 2. Insufficient balance checks (Error Type 2)
      if (balance) {
        const currentBalanceVal = parseFloat(balance);
        if (parsedAmount + 0.0001 > currentBalanceVal) {
          throw new Error(`Insufficient funds. You are trying to send ${amount} XLM + fee but only have ${balance} XLM.`);
        }
      }

      // 3. Load account
      setTxStatus({ type: 'loading', message: 'Fetching sender account details...' });
      let sourceAccount;
      try {
        sourceAccount = await server.loadAccount(walletAddress);
      } catch (err) {
        throw new Error('Sender account is not active on-chain. Please fund it using the Faucet first.');
      }

      // 4. Build transaction
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

      // 5. Sign the transaction using Stellar Wallets Kit (Error Type 3)
      setTxStatus({ type: 'loading', message: 'Awaiting signature in connected wallet...' });
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, { 
        networkPassphrase: Networks.TESTNET,
        address: walletAddress
      });

      if (!signedTxXdr) {
        throw new Error('Signing request rejected. Transaction was not signed.');
      }

      // 6. Submit to Horizon Network
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
      
      // Parse Stellar horizon error responses if available
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

  return (
    <div className="app-container">
      {/* Header section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="pulse-glow-text" style={{ fontSize: '2.2rem', margin: 0, fontWeight: 800, background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            StellarPay - Cross-Border Freelancer Payments
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Journey to Mastery &bull; Level 4 Green Belt
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }}></span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Stellar Testnet</span>
          </div>

          {walletAddress && (
            <button className="btn btn-secondary" onClick={disconnectWallet} title="Disconnect Wallet" style={{ padding: '0.5rem' }}>
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Core Dashboard / Connection States */}
      {!walletAddress ? (
        <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', width: '70px', height: '70px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.5rem', margin: '0 auto 1.5rem auto' }}>
              <Wallet size={36} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>Connect Your Wallet</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
              Connect your wallet on testnet to continue. The multi-wallet adapter supports Freighter, Albedo, and xBull wallets.
            </p>
            
            <button 
              className="btn btn-primary" 
              onClick={connectWallet} 
              disabled={isConnecting}
              style={{ width: '100%' }}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  Select Wallet...
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  Connect Wallet
                </>
              )}
            </button>

            {txStatus.type === 'error' && (
              <div className="alert alert-danger" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <XCircle size={18} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <span>{txStatus.message}</span>
              </div>
            )}
          </div>
        </main>
      ) : (
        <main style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          
          {/* Top Level Notifications */}
          {txStatus.type !== 'idle' && (
            <div style={{ gridColumn: 'span 12' }}>
              {txStatus.type === 'loading' && (
                <div className="alert alert-info">
                  <RefreshCw size={18} className="spinner" />
                  <span>{txStatus.message}</span>
                </div>
              )}
              {txStatus.type === 'success' && (
                <div className="alert alert-success">
                  <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span>{txStatus.message}</span>
                    {txStatus.hash && (
                      <a 
                        href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}
                      >
                        View transaction on Stellar.Expert <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
              {txStatus.type === 'error' && (
                <div className="alert alert-danger">
                  <XCircle size={18} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  <span>{txStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Left Column: Account Details & Faucet */}
          <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="col-lg-5">
            {/* Account Card */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <span className="badge badge-info" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <Wallet size={12} /> Connected
                </span>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  <RefreshCw size={12} className={isRefreshing ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Public Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ fontSize: '1rem', color: '#e2e8f0', letterSpacing: '0.05em' }}>{truncateAddr(walletAddress)}</code>
                  <button onClick={copyAddress} style={{ background: 'none', border: 'none', color: copied ? '#34d399' : '#64748b', cursor: 'pointer', display: 'inline-flex', padding: '4px', borderRadius: '4px', transition: 'color 0.2s' }} title="Copy address">
                    <Copy size={16} />
                  </button>
                </div>
                {copied && <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.1rem' }}>Copied to clipboard!</span>}
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Native Wallet Balance</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    {balance !== null ? balance : '...'}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#06b6d4' }}>XLM</span>
                </div>
              </div>

              {!isAccountActivated && (
                <div className="alert alert-warning" style={{ marginTop: '1.5rem', padding: '0.75rem', fontSize: '0.85rem', gap: '0.5rem' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  <div>
                    Account not activated on Testnet. Click the Faucet button below to fund and activate it.
                  </div>
                </div>
              )}
            </div>

            {/* Smart Contract Info Card */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Cpu size={18} style={{ color: '#8b5cf6' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Soroban Smart Contract</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.15rem' }}>Native Token Contract ID</span>
                  <code style={{ fontSize: '0.8rem', color: '#e2e8f0', wordBreak: 'break-all' }}>{contractId}</code>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.15rem' }}>Token Symbol</span>
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {loadingContract ? '...' : contractSymbol || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.15rem' }}>Decimals</span>
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {loadingContract ? '...' : contractDecimals !== null ? contractDecimals : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.15rem' }}>Connected Account Contract Balance</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#8b5cf6' }}>
                      {loadingContract ? '...' : contractBalance || '0.0000'}
                    </span>
                    <span style={{ fontWeight: 600, color: '#a78bfa' }}>XLM</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                  <Layers size={14} />
                  <span style={{ fontSize: '0.75rem' }}>RPC: soroban-testnet.stellar.org</span>
                </div>
              </div>
            </div>

            {/* Faucet Card */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Testnet Faucet</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
                Need testnet funds? Request 10,000 XLM from Friendbot to activate your account and run test payments.
              </p>
              <button 
                className="btn btn-secondary" 
                onClick={claimFaucet} 
                disabled={isFunding}
                style={{ width: '100%', borderStyle: 'dashed', borderColor: 'rgba(6,182,212,0.3)', color: '#67e8f9' }}
              >
                {isFunding ? (
                  <>
                    <RefreshCw size={16} className="spinner" />
                    Funding Account...
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    Request Faucet XLM
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Middle Column: Payment Forms (Classic vs Soroban Tabs) */}
          <div style={{ gridColumn: 'span 12' }} className="col-lg-7">
            <div className="glass-panel" style={{ padding: '1.75rem', minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', gap: '0.25rem', overflowX: 'auto' }}>
                {[
                  { key: 'create-invoice', label: 'Create Invoice', icon: FileText, color: '#10b981' },
                  { key: 'pay-invoice',    label: 'Pay Invoice',    icon: CreditCard, color: '#8b5cf6' },
                  { key: 'dashboard',     label: 'My Invoices',    icon: LayoutDashboard, color: '#06b6d4' },
                  { key: 'classic',       label: 'Send XLM',       icon: Send, color: '#06b6d4' },
                  { key: 'soroban',       label: 'Vault',          icon: Cpu, color: '#8b5cf6' },
                ].map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    style={{
                      background: 'none', border: 'none', whiteSpace: 'nowrap',
                      borderBottom: activeTab === key ? `2px solid ${color}` : '2px solid transparent',
                      color: activeTab === key ? '#f8fafc' : '#64748b',
                      padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                    onClick={() => setActiveTab(key as any)}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Tab: Create Invoice */}
              {activeTab === 'create-invoice' && (
                <InvoiceCreator
                  walletAddress={walletAddress!}
                  rpcServer={rpcServer}
                  server={server}
                  escrowContractId={ESCROW_CONTRACT_ID}
                  nativeAssetContractId={NATIVE_ASSET_CONTRACT_ID}
                  onInvoiceCreated={() => setRefreshTrigger(t => t + 1)}
                />
              )}

              {/* Tab: Pay Invoice */}
              {activeTab === 'pay-invoice' && (
                <InvoicePayment
                  walletAddress={walletAddress!}
                  rpcServer={rpcServer}
                  server={server}
                  escrowContractId={ESCROW_CONTRACT_ID}
                  onSuccess={() => loadAllData(walletAddress!)}
                />
              )}

              {/* Tab: My Invoices Dashboard */}
              {activeTab === 'dashboard' && (
                <FreelancerDashboard
                  walletAddress={walletAddress!}
                  rpcServer={rpcServer}
                  server={server}
                  escrowContractId={ESCROW_CONTRACT_ID}
                  refreshTrigger={refreshTrigger}
                  onSuccess={() => loadAllData(walletAddress!)}
                />
              )}

              {/* Tab: Classic Horizon Payment */}
              {activeTab === 'classic' && (
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Send size={18} style={{ color: '#06b6d4' }} />
                    Send Classic Horizon Payment
                  </h3>
                  <form onSubmit={handleSendPayment} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="recipient">Recipient Stellar Address</label>
                        <input id="recipient" type="text" className="form-input" placeholder="G..."
                          value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} required />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}
                      disabled={txStatus.type === 'loading' || !recipient || !amount}>
                      <Send size={16} /> Send Classic Transaction
                    </button>
                  </form>
                </div>
              )}

              {/* Tab: Soroban Vault */}
              {activeTab === 'soroban' && (
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={18} style={{ color: '#8b5cf6' }} />
                    Advanced Vault Dashboard
                  </h3>
                  <VaultDashboard
                    walletAddress={walletAddress}
                    rpcServer={rpcServer}
                    server={server}
                    onSuccess={() => loadAllData(walletAddress)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Recent Transaction History */}
          <div style={{ gridColumn: 'span 12' }}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.25rem 0' }}>Recent Payments</h3>
              
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0', gap: '0.5rem', color: '#94a3b8' }}>
                  <RefreshCw size={18} className="spinner" />
                  Loading payment history...
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#475569' }}>
                  No payment operations found for this account.
                </div>
              ) : (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Direction</th>
                        <th>Amount</th>
                        <th>Address</th>
                        <th>Timestamp</th>
                        <th>Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((tx) => {
                        const isSent = tx.from === walletAddress;
                        return (
                          <tr key={tx.id}>
                            <td>
                              {tx.type === 'Contract Call' ? (
                                <span 
                                  className="badge" 
                                  style={{
                                    background: 'rgba(139, 92, 246, 0.08)',
                                    color: '#a78bfa',
                                    border: '1px solid rgba(139, 92, 246, 0.15)',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <Cpu size={12} />
                                  Contract
                                </span>
                              ) : (
                                <span 
                                  className="badge" 
                                  style={{
                                    background: isSent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                    color: isSent ? '#f87171' : '#34d399',
                                    border: `1px solid ${isSent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
                                    gap: '0.25rem'
                                  }}
                                >
                                  {isSent ? (
                                    <>
                                      <ArrowUpRight size={12} />
                                      Sent
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownLeft size={12} />
                                      Received
                                    </>
                                  )}
                                </span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600, color: tx.type === 'Contract Call' ? '#a78bfa' : (isSent ? '#f8fafc' : '#34d399') }}>
                              {isNaN(parseFloat(tx.amount)) ? tx.amount : `${isSent ? '-' : '+'}${parseFloat(tx.amount).toFixed(4)} XLM`}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>
                              <code title={isSent ? tx.to : tx.from}>
                                {truncateAddr(isSent ? tx.to : tx.from)}
                              </code>
                            </td>
                            <td style={{ color: '#64748b' }}>
                              {formatDate(tx.created_at)}
                            </td>
                            <td>
                              <a 
                                href={`https://stellar.expert/explorer/testnet/tx/${tx.transaction_hash}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ color: '#06b6d4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                View <ExternalLink size={12} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </main>
      )}

      {/* Grid adjustment media queries */}
      <style>{`
        @media (min-width: 992px) {
          main {
            align-items: stretch;
          }
          .col-lg-5 {
            grid-column: span 5 !important;
          }
          .col-lg-7 {
            grid-column: span 7 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
