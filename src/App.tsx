import React, { useState, useEffect } from 'react';
import {
  isConnected as checkFreighterConnected,
  requestAccess,
  getAddress,
  signTransaction
} from '@stellar/freighter-api';
import {
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Horizon,
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
  AlertTriangle,
  Info,
  LogOut
} from 'lucide-react';

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
  // Wallet state
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isAccountActivated, setIsAccountActivated] = useState<boolean>(true);
  
  // UI Loading States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  // Transaction Status
  const [txStatus, setTxStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    hash?: string;
  }>({ type: 'idle', message: '' });

  // History State
  const [history, setHistory] = useState<PaymentTx[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Horizon Server Instance (Stellar Testnet)
  const HORIZON_URL = 'https://horizon-testnet.stellar.org';
  const server = new Horizon.Server(HORIZON_URL);

  // Check if Freighter is installed on mount
  useEffect(() => {
    const verifyFreighter = async () => {
      try {
        const result = await checkFreighterConnected();
        setIsFreighterInstalled(!!result.isConnected);
        
        // If already connected, fetch address automatically
        if (result.isConnected) {
          const addrResult = await getAddress();
          if (addrResult && addrResult.address) {
            setWalletAddress(addrResult.address);
            await fetchBalance(addrResult.address);
            await fetchTxHistory(addrResult.address);
          }
        }
      } catch (err) {
        console.error("Error checking Freighter installation:", err);
        setIsFreighterInstalled(false);
      }
    };
    verifyFreighter();
  }, []);

  // Fetch account balance and activation status
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
        const payments = data._embedded.records.map((r: any) => ({
          id: r.id,
          type: r.type,
          from: r.from,
          to: r.to,
          amount: r.amount || '0',
          transaction_hash: r.transaction_hash,
          created_at: r.created_at
        }));
        setHistory(payments);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Main refresh handler
  const handleRefresh = async () => {
    if (!walletAddress) return;
    setIsRefreshing(true);
    await Promise.all([
      fetchBalance(walletAddress),
      fetchTxHistory(walletAddress)
    ]);
    setIsRefreshing(false);
  };

  // Connect Wallet Action
  const connectWallet = async () => {
    setIsConnecting(true);
    setTxStatus({ type: 'idle', message: '' });
    try {
      // 1. Request access from Freighter (opens popup)
      const accessResult = await requestAccess();
      
      if (accessResult && accessResult.error) {
        throw new Error(accessResult.error);
      }
      
      const publicKey = accessResult?.address;
      
      if (publicKey) {
        setWalletAddress(publicKey);
        await fetchBalance(publicKey);
        await fetchTxHistory(publicKey);
      } else {
        throw new Error('Could not retrieve public key. Please check Freighter permissions.');
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setTxStatus({
        type: 'error',
        message: err.message || 'Failed to connect to Freighter wallet.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Wallet Action
  const disconnectWallet = () => {
    setWalletAddress(null);
    setBalance(null);
    setHistory([]);
    setIsAccountActivated(true);
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
        await fetchBalance(walletAddress);
        await fetchTxHistory(walletAddress);
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

  // Send XLM Payment
  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !recipient || !amount) return;

    setTxStatus({ type: 'loading', message: 'Preparing transaction envelope...' });

    try {
      // Input Validation
      if (!recipient.startsWith('G') || recipient.length !== 56) {
        throw new Error('Invalid recipient address format. Stellar addresses are 56 characters and start with G.');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount greater than 0.');
      }

      // Check balance
      if (balance) {
        const currentBalanceVal = parseFloat(balance);
        if (parsedAmount + 0.0001 > currentBalanceVal) {
          throw new Error(`Insufficient funds. You are trying to send ${amount} XLM + fee but only have ${balance} XLM.`);
        }
      }

      // 1. Load sender account to obtain current sequence number
      setTxStatus({ type: 'loading', message: 'Fetching sender account sequence number...' });
      let sourceAccount;
      try {
        sourceAccount = await server.loadAccount(walletAddress);
      } catch (err) {
        throw new Error('Sender account is not active on-chain. Please fund it using the Faucet first.');
      }

      // 2. Build transaction
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

      // Add memo if specified
      if (memo.trim()) {
        transactionBuilder.addMemo(Memo.text(memo.trim()));
      }

      const transaction = transactionBuilder.build();
      const xdr = transaction.toXDR();

      // 3. Sign the transaction in Freighter
      setTxStatus({ type: 'loading', message: 'Awaiting signature in Freighter wallet...' });
      const signResult = await signTransaction(xdr, { 
        networkPassphrase: Networks.TESTNET 
      });

      if (signResult && signResult.error) {
        throw new Error(signResult.error);
      }

      const signedXdr = signResult?.signedTxXdr;

      if (!signedXdr) {
        throw new Error('Signing request rejected or failed. Transaction was not signed.');
      }

      // 4. Submit to Horizon Network
      const transactionToSubmit = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      setTxStatus({ type: 'loading', message: 'Submitting signed transaction to Horizon Testnet...' });
      const response = await server.submitTransaction(transactionToSubmit);

      setTxStatus({
        type: 'success',
        message: `Successfully sent ${amount} XLM to ${recipient.slice(0, 6)}...${recipient.slice(-6)}!`,
        hash: response.hash,
      });

      // Reset Form fields
      setRecipient('');
      setAmount('');
      setMemo('');

      // Refresh state
      await fetchBalance(walletAddress);
      await fetchTxHistory(walletAddress);

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

  // Copy wallet address helper
  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper: Truncate address
  const truncateAddr = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  // Helper: Format date
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
            Stellar QuickPay
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Journey to Mastery &bull; Level 1 White Belt
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }}></span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Stellar Testnet</span>
          </div>

          {walletAddress && (
            <button className="btn btn-secondary" onClick={disconnectWallet} title="Disconnect Wallet" style={{ padding: '0.5rem' }}>
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Connection Check / Install Warning */}
      {isFreighterInstalled === false && (
        <div className="alert alert-danger" style={{ marginBottom: '2rem' }}>
          <AlertTriangle size={20} />
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Freighter Wallet Not Found</strong>
            Freighter wallet extension was not detected in this browser. Please install the extension to continue.
            <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#06b6d4', fontWeight: 600, marginLeft: '0.5rem', textDecoration: 'none' }}>
              Install Freighter <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Core Dashboard / Connection States */}
      {!walletAddress ? (
        <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', width: '70px', height: '70px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.5rem', margin: '0 auto 1.5rem auto' }}>
              <Wallet size={36} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>Connect Your Wallet</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
              To complete the Level 1 tasks, connect your Freighter wallet on Testnet. You will be able to check your XLM balance, request testnet funding, and send test payments.
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
                  Connecting Wallet...
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  Connect Freighter Wallet
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
                <span className="badge badge-info">Freighter Account</span>
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
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Native Balance</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    {balance !== null ? balance : '...'}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#06b6d4' }}>XLM</span>
                </div>
              </div>

              {!isAccountActivated && (
                <div className="alert alert-warning" style={{ marginTop: '1.5rem', padding: '0.75rem', fontSize: '0.85rem', gap: '0.5rem' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    Account not activated on Testnet. Click the Faucet button below to fund and activate it.
                  </div>
                </div>
              )}
            </div>

            {/* Faucet Card */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Testnet Faucet</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
                Need testnet funds? Request 10,000 XLM from Friendbot to run tests and make payments.
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

          {/* Middle Column: Send Payment Form */}
          <div style={{ gridColumn: 'span 12' }} className="col-lg-7">
            <div className="glass-panel" style={{ padding: '1.75rem', height: '100%', boxSizing: 'border-box' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} style={{ color: '#06b6d4' }} />
                Send Payment
              </h3>
              
              <form onSubmit={handleSendPayment}>
                <div className="form-group">
                  <label className="form-label" htmlFor="recipient">Recipient Stellar Address</label>
                  <input
                    id="recipient"
                    type="text"
                    className="form-input"
                    placeholder="G..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value.trim())}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="amount">Amount (XLM)</label>
                    <input
                      id="amount"
                      type="number"
                      step="any"
                      min="0.0000001"
                      className="form-input"
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="memo">Memo (Optional text)</label>
                    <input
                      id="memo"
                      type="text"
                      maxLength={28}
                      className="form-input"
                      placeholder="e.g. Tip Jar"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '1rem' }}
                  disabled={txStatus.type === 'loading' || !recipient || !amount}
                >
                  <Send size={16} />
                  Send XLM Transaction
                </button>
              </form>
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
                            </td>
                            <td style={{ fontWeight: 600, color: isSent ? '#f8fafc' : '#34d399' }}>
                              {isSent ? '-' : '+'}{parseFloat(tx.amount).toFixed(4)} XLM
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

      {/* Grid adjustment media queries in style element for simplicity of single file deployment */}
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
