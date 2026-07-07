import React, { useState, useEffect } from 'react';
import {
  TransactionBuilder,
  Operation,
  Networks,
  rpc,
  Address,
  nativeToScVal,
  scValToNative,
  Account
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface VaultDashboardProps {
  walletAddress: string;
  rpcServer: rpc.Server;
  server: any; // Horizon server
  onSuccess: () => void;
  t: any;
  lang: 'en' | 'tr';
}

export const VaultDashboard: React.FC<VaultDashboardProps> = ({ walletAddress, rpcServer, server, onSuccess, t, lang }) => {
  const VAULT_CONTRACT_ID = 'CCPOQABR5MGO3NPRJCI75EYTW43JCKUUSR4DJLIZLWKLJFVUZY5K5GV2'; // Will be replaced by CI/CD or User
  const NATIVE_ASSET_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  
  const [events, setEvents] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const [txStatus, setTxStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string; hash?: string }>({ type: 'idle', message: '' });

  // Localized error helper
  const getLocalizedError = (errMsg: string): string => {
    const lower = errMsg.toLowerCase();
    if (lower.includes('underfunded') || lower.includes('insufficient')) {
      return lang === 'en' ? 'Insufficient funds in wallet.' : 'Cüzdanda yetersiz bakiye.';
    }
    if (lower.includes('no_destination') || lower.includes('not active') || lower.includes('inactive')) {
      return lang === 'en' ? 'Destination account is inactive. Please fund it first.' : 'Alıcı hesabı aktif değil. Lütfen önce fonlayın.';
    }
    if (lower.includes('rejected') || lower.includes('user declined') || lower.includes('cancel')) {
      return lang === 'en' ? 'Transaction canceled by user.' : 'İşlem kullanıcı tarafından iptal edildi.';
    }
    if (lower.includes('not found') || lower.includes('404')) {
      return lang === 'en' ? 'Invoice not found.' : 'Fatura bulunamadı.';
    }
    return lang === 'en' ? 'Transaction failed. Please try again.' : 'İşlem başarısız oldu. Lütfen tekrar deneyin.';
  };

  // Load vault balance
  const fetchVaultBalance = async () => {
    if (VAULT_CONTRACT_ID.startsWith('YOUR_VAULT')) return;
    try {
      const invokeOp = Operation.invokeContractFunction({
        contract: VAULT_CONTRACT_ID,
        function: 'get_balance',
        args: [new Address(walletAddress).toScVal()]
      });

      const tx = new TransactionBuilder(new Account(walletAddress, "1"), {
        fee: '100',
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(invokeOp)
        .setTimeout(30)
        .build();

      const sim = await rpcServer.simulateTransaction(tx) as any;
      if (sim.result && sim.result.retval) {
        const val = scValToNative(sim.result.retval);
        setVaultBalance((Number(val) / Math.pow(10, 7)).toFixed(4));
      } else {
        setVaultBalance('0.0000');
      }
    } catch (err) {
      console.error('Failed to fetch vault balance', err);
    }
  };

  // Poll for Events
  const pollEvents = async () => {
    if (VAULT_CONTRACT_ID.startsWith('YOUR_VAULT')) return;
    try {
      const networkInfo = await rpcServer.getLatestLedger();
      const startLedger = Math.max(networkInfo.sequence - 100, 1); // Get last 100 ledgers

      const response = await rpcServer.getEvents({
        startLedger,
        filters: [{ type: 'contract', contractIds: [VAULT_CONTRACT_ID] }]
      });

      if (response && response.events) {
        const formattedEvents = response.events.map((e: any) => {
          let type = 'Unknown';
          let amount = '0';
          let user = '';
          
          try {
             const topics = e.topic;
             if (topics && topics.length > 0) {
                 const sym = scValToNative(topics[0]);
                 if (sym === 'deposit' || sym === 'withdraw') {
                    type = sym.toUpperCase();
                    if (topics.length > 1) {
                        user = scValToNative(topics[1]);
                    }
                 }
             }
             if (e.value) {
                const rawAmount = scValToNative(e.value);
                amount = (Number(rawAmount) / Math.pow(10, 7)).toFixed(4);
             }
          } catch(err) {}

          return { id: e.id, type, ledger: e.ledger, user, amount };
        });
        
        const validEvents = formattedEvents.filter((e) => e.type !== 'Unknown');
        setEvents(validEvents.reverse());
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  useEffect(() => {
    fetchVaultBalance();
    
    if (!isPolling) {
      setIsPolling(true);
      const interval = setInterval(() => {
        pollEvents();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  const executeVaultCall = async (method: 'deposit' | 'withdraw', amountStr: string) => {
    if (VAULT_CONTRACT_ID.startsWith('YOUR_VAULT')) {
        setTxStatus({ type: 'error', message: 'Please update YOUR_VAULT_CONTRACT_ID in the code after CI/CD deployment!' });
        return;
    }
    setTxStatus({ type: 'loading', message: t.vaultPreparingTx });
    try {
      const parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Invalid amount');
      const rawAmount = BigInt(Math.floor(parsedAmount * Math.pow(10, 7)));

      let sourceAccount;
      try {
        sourceAccount = await server.loadAccount(walletAddress);
      } catch (err) {
        throw new Error('Account is not active.');
      }

      const invokeOp = Operation.invokeContractFunction({
        contract: VAULT_CONTRACT_ID,
        function: method,
        args: [
          new Address(NATIVE_ASSET_CONTRACT_ID).toScVal(),
          new Address(walletAddress).toScVal(),
          nativeToScVal(rawAmount, { type: 'i128' })
        ]
      });

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(invokeOp)
        .setTimeout(60)
        .build();

      setTxStatus({ type: 'loading', message: t.vaultSimulating });
      const simResult = await rpcServer.simulateTransaction(transaction) as any;
      
      if (simResult.error) {
        throw new Error(`Simulation error: ${simResult.error}`);
      }

      if (rpc.Api.isSimulationSuccess(simResult)) {
        const assembledTx = rpc.assembleTransaction(transaction, simResult) as any;
        const xdrPayload = typeof assembledTx.build === 'function' ? assembledTx.build().toXDR() : assembledTx.toXDR();

        setTxStatus({ type: 'loading', message: t.vaultAssembling });
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrPayload, {
          networkPassphrase: Networks.TESTNET,
          address: walletAddress
        });

        if (!signedTxXdr) throw new Error('Transaction rejected by user.');

        const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
        setTxStatus({ type: 'loading', message: t.vaultSubmitting });
        
        const response = await rpcServer.sendTransaction(signedTx);
        if (response.status === 'ERROR') {
            const resErr = (response as any).errorResult || (response as any).errorResultXdr;
            throw new Error(`Submission error: ${resErr}`);
        }

        setTxStatus({ type: 'loading', message: t.vaultWaiting });
        
        let statusResponse = await rpcServer.getTransaction(response.hash);
        let attempts = 0;
        while (statusResponse.status === 'NOT_FOUND' || statusResponse.status === 'SUCCESS' && !statusResponse.resultMetaXdr) {
          await new Promise(r => setTimeout(r, 2000));
          statusResponse = await rpcServer.getTransaction(response.hash);
          attempts++;
          if (attempts > 15) break;
        }

        if (statusResponse.status === 'SUCCESS') {
          setTxStatus({
            type: 'success',
            message: method === 'deposit' ? t.vaultDepositSuccess : t.vaultWithdrawSuccess,
            hash: response.hash
          });
          setDepositAmount('');
          setWithdrawAmount('');
          fetchVaultBalance();
          pollEvents();
          onSuccess();
        } else {
          throw new Error(`Execution failed: ${statusResponse.status}`);
        }
      } else {
        throw new Error('Simulation failed validation.');
      }
    } catch (err: any) {
      setTxStatus({ type: 'error', message: getLocalizedError(err.message || err.toString()) });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Vault Status Box */}
      <div style={{ background: 'rgba(245, 197, 24, 0.04)', border: '1px solid rgba(245, 197, 24, 0.15)', borderRadius: '16px', padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)', fontSize: '0.9rem' }}>{t.vaultBalanceTitle}</h4>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>
            {vaultBalance || '0.0000'} <span style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>XLM</span>
        </div>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          {t.vaultContractId}: <code style={{ color: '#e2e8f0' }}>{VAULT_CONTRACT_ID.substring(0,8)}...{VAULT_CONTRACT_ID.substring(VAULT_CONTRACT_ID.length-8)}</code>
        </p>
      </div>

      {txStatus.type !== 'idle' && (
        <div className={`alert alert-${txStatus.type === 'error' ? 'danger' : txStatus.type === 'loading' ? 'info' : 'success'}`}>
          {txStatus.type === 'loading' ? <RefreshCw size={18} className="spinner" /> : txStatus.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{txStatus.message}</span>
        </div>
      )}

      {/* Action Forms */}
      <div className="vault-actions-grid">
        {/* Deposit */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '16px' }}>
          <label className="form-label">{t.vaultDeposit}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="number" 
              className="form-input" 
              placeholder="0.0" 
              value={depositAmount} 
              onChange={e => setDepositAmount(e.target.value)} 
              style={{ flex: 1, minWidth: 0 }}
            />
            <button 
              className="btn btn-accent" 
              style={{ padding: '0.6rem 1.1rem' }}
              onClick={() => executeVaultCall('deposit', depositAmount)}
              disabled={txStatus.type === 'loading' || !depositAmount}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_upward</span>
            </button>
          </div>
        </div>

        {/* Withdraw */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '16px' }}>
          <label className="form-label">{t.vaultWithdraw}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="number" 
              className="form-input" 
              placeholder="0.0" 
              value={withdrawAmount} 
              onChange={e => setWithdrawAmount(e.target.value)} 
              style={{ flex: 1, minWidth: 0 }}
            />
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.6rem 1.1rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
              onClick={() => executeVaultCall('withdraw', withdrawAmount)}
              disabled={txStatus.type === 'loading' || !withdrawAmount}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_downward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Event Streaming */}
      <div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0', fontSize: '1.1rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', marginRight: '0.3rem' }}>monitoring</span>
          {t.vaultLiveEvents}
          <span style={{ fontSize: '0.7rem', background: 'var(--accent)', padding: '0.15rem 0.5rem', borderRadius: '6px', color: '#000', fontWeight: 800 }}>{t.vaultStreaming}</span>
        </h4>
        
        {events.length === 0 ? (
           <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '16px', color: '#64748b' }}>
              {t.vaultNoEvents}
           </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {events.map((ev, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ 
                    fontWeight: 800, 
                    fontSize: '0.8rem',
                    color: 'var(--accent)' 
                  }}>
                    {ev.type}
                  </span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>{ev.amount} XLM</span>
                </div>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Ledger: {ev.ledger}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
