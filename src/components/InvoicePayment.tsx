import React, { useState } from 'react';
import {
  TransactionBuilder,
  Operation,
  Networks,
  rpc,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface Invoice {
  id: number;
  freelancer: string;
  client: string;
  amount: string;
  description: string;
  status: 'Pending' | 'Funded' | 'Released' | 'Cancelled';
}

interface InvoicePaymentProps {
  walletAddress: string;
  rpcServer: rpc.Server;
  server: any;
  escrowContractId: string;
  onSuccess?: (id: string) => void;
  t: any;
  isDemoActive?: boolean;
  demoStep?: number;
}

const STATUS_CONFIG = {
  Pending: { color: 'var(--accent)', bg: 'rgba(245,197,24,0.05)', icon: 'pending_actions', label: 'Awaiting Payment' },
  Funded:  { color: 'var(--accent)', bg: 'rgba(245,197,24,0.08)', icon: 'lock', label: 'Funded - Awaiting Release' },
  Released:{ color: 'var(--accent)', bg: 'rgba(245,197,24,0.1)',  icon: 'check_circle', label: 'Payment Released' },
  Cancelled:{ color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.02)', icon: 'cancel', label: 'Cancelled' },
};

export const InvoicePayment: React.FC<InvoicePaymentProps> = ({
  walletAddress, rpcServer, server, escrowContractId, onSuccess, t, isDemoActive, demoStep
}) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  const parseStatus = (statusVal: any): Invoice['status'] => {
    if (typeof statusVal === 'string') return statusVal as Invoice['status'];
    if (Array.isArray(statusVal) && statusVal.length > 0) {
      return statusVal[0].toString() as Invoice['status'];
    }
    if (statusVal && typeof statusVal === 'object') {
      const keys = Object.keys(statusVal);
      if (keys.length > 0) return keys[0] as Invoice['status'];
    }
    return 'Pending';
  };

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setLoadingInvoice(true);
    setInvoice(null);
    setTxStatus({ type: 'idle', message: '' });
    try {
      if (walletAddress.startsWith('GDEMO')) {
        const idNum = Number(invoiceId);
        if (idNum === 1 || idNum === 2 || idNum === 3 || idNum === 4 || idNum === 5) {
          setInvoice({
            id: idNum,
            freelancer: idNum <= 3 ? walletAddress : 'GCZDX5E7RT7BTTA6VJC7YYHOYQYNHRDGEDB3O32K74VC52LC7XFCEZTH',
            client: idNum <= 3 ? 'GBGHSPQEIZGJOJJDJYG5VVIPU7THJQU2Z4B6V5VF5IHUQ2SOLIRITDQS' : walletAddress,
            amount: (idNum * 50).toFixed(4),
            description: idNum === 1 ? 'Website Redesign Proposal' : idNum === 2 ? 'Logo Design Delivery' : idNum === 3 ? 'Smart Contract Audit' : idNum === 4 ? 'Content Writing Phase 1' : 'React Mobile App Setup',
            status: idNum === 1 ? 'Pending' : idNum === 2 ? 'Funded' : idNum === 3 ? 'Released' : idNum === 4 ? 'Pending' : 'Released'
          });
        } else {
          setTxStatus({ type: 'error', message: t.invoiceNotFound });
        }
        setLoadingInvoice(false);
        return;
      }

      const sourceAccount = new (await import('@stellar/stellar-sdk')).Account(walletAddress, '1');
      const invokeOp = Operation.invokeContractFunction({
        contract: escrowContractId,
        function: 'get_invoice',
        args: [nativeToScVal(BigInt(invoiceId), { type: 'u64' })],
      });
      const tx = new TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(invokeOp).setTimeout(30).build();
      const sim = await rpcServer.simulateTransaction(tx) as any;
      if (sim.result?.retval) {
        const raw = scValToNative(sim.result.retval) as any;
        setInvoice({
          id: Number(raw.id),
          freelancer: raw.freelancer.toString(),
          client: raw.client.toString(),
          amount: (Number(raw.amount) / Math.pow(10, 7)).toFixed(4),
          description: raw.description?.toString() || '',
          status: parseStatus(raw.status),
        });
      } else {
        setTxStatus({ type: 'error', message: t.invoiceNotFound });
      }
    } catch (err: any) {
      setTxStatus({ type: 'error', message: t.invoiceLookupFailed });
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePayOrRelease = async (action: 'pay_invoice' | 'release_payment') => {
    if (!invoice) return;
    setTxStatus({ type: 'loading', message: t.lookingUp });
    try {
      if (walletAddress.startsWith('GDEMO')) {
        setTxStatus({ type: 'loading', message: 'Simulating transaction in Demo Mode...' });
        await new Promise(r => setTimeout(r, 1500));
        setTxStatus({ type: 'success', message: 'Demo Mode Success: Transaction simulated successfully!' });
        setInvoice(prev => prev ? { ...prev, status: action === 'pay_invoice' ? 'Funded' : 'Released' } : null);
        if (onSuccess) onSuccess(invoice.id.toString());
        return;
      }

      const sourceAccount = await server.loadAccount(walletAddress);
      const args = action === 'pay_invoice'
        ? [nativeToScVal(BigInt(invoice.id), { type: 'u64' }), new Address(walletAddress).toScVal()]
        : [nativeToScVal(BigInt(invoice.id), { type: 'u64' }), new Address(walletAddress).toScVal()];

      const invokeOp = Operation.invokeContractFunction({ contract: escrowContractId, function: action, args });
      const transaction = new TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(invokeOp).setTimeout(60).build();

      setTxStatus({ type: 'loading', message: t.lookingUp });
      const simResult = await rpcServer.simulateTransaction(transaction) as any;
      if (simResult.error) throw new Error(`Simulation: ${simResult.error}`);
      if (!rpc.Api.isSimulationSuccess(simResult)) throw new Error('Simulation failed.');

      const assembledTx = rpc.assembleTransaction(transaction, simResult) as any;
      const xdrPayload = typeof assembledTx.build === 'function' ? assembledTx.build().toXDR() : assembledTx.toXDR();

      setTxStatus({ type: 'loading', message: 'Awaiting wallet signature...' });
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrPayload, { networkPassphrase: Networks.TESTNET, address: walletAddress });
      if (!signedTxXdr) throw new Error('Transaction rejected.');

      setTxStatus({ type: 'loading', message: 'Submitting...' });
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      const response = await rpcServer.sendTransaction(signedTx);
      if (response.status === 'ERROR') throw new Error('Submission failed.');

      let attempts = 0;
      let statusResponse = await rpcServer.getTransaction(response.hash);
      while (statusResponse.status === 'NOT_FOUND' && attempts < 15) {
        await new Promise(r => setTimeout(r, 2000));
        statusResponse = await rpcServer.getTransaction(response.hash);
        attempts++;
      }

      if (statusResponse.status === 'SUCCESS') {
        const label = action === 'pay_invoice' ? 'Payment successful! Funds locked.' : 'Payment released!';
        setTxStatus({ type: 'success', message: label });
        await fetchInvoice(); // Refresh invoice state
        if (onSuccess) {
          onSuccess(invoice.id.toString());
        }
      } else {
        throw new Error('Transaction failed.');
      }
    } catch (err: any) {
      setTxStatus({ type: 'error', message: err.message || err.toString() });
    }
  };

  const statusConf = invoice ? STATUS_CONFIG[invoice.status] : null;
  const isClient = invoice?.client === walletAddress;
  const isFreelancer = invoice?.freelancer === walletAddress;

  const statusLabel = invoice
    ? invoice.status === 'Pending' ? t.awaitingPay
      : invoice.status === 'Funded' ? t.paidFunded
      : invoice.status === 'Released' ? t.released
      : t.cancelled
    : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '22px' }}>payments</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t.payTitle}</h3>
      </div>

      {isDemoActive && demoStep === 2 && (
        <div className="alert alert-info" style={{ animation: 'pulse 2s infinite', border: '1px solid var(--accent)', background: 'rgba(245,197,24,0.05)', color: 'var(--accent)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lightbulb</span>
            <span>{t.tutorialStepTitle}</span>
          </div>
          <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
            {t.paymentStepGuide}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input type="number" id="search-invoice-input" className="form-input" placeholder={t.enterInvoiceId}
          value={invoiceId} onChange={e => setInvoiceId(e.target.value)} />
        <button className="btn btn-secondary" onClick={fetchInvoice} disabled={loadingInvoice || !invoiceId}
          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          {loadingInvoice ? <RefreshCw size={16} className="spinner" /> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>}
          {t.lookupBtn}
        </button>
      </div>

      {txStatus.type !== 'idle' && (
        <div className={`alert ${txStatus.type === 'error' ? 'alert-danger' : txStatus.type === 'loading' ? 'alert-info' : 'alert-success'}`}
          style={{ marginBottom: '1rem' }}>
          {txStatus.type === 'loading' ? <RefreshCw size={16} className="spinner" /> :
           txStatus.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{txStatus.message}</span>
        </div>
      )}

      {invoice && statusConf && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>{t.invoiceIdLabel} #{invoice.id}</h4>
            <span style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.color}40`, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: statusConf.color }}>{statusConf.icon}</span> {statusLabel}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>{t.descriptionLabel}</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{invoice.description}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>{t.amount}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.1rem' }}>{invoice.amount} XLM</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Freelancer</span>
              <code style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{invoice.freelancer.slice(0,8)}...{invoice.freelancer.slice(-8)}</code>
            </div>
          </div>

          {/* Action buttons */}
          {isClient && invoice.status === 'Pending' && (
            <button className="btn btn-accent" onClick={() => handlePayOrRelease('pay_invoice')} disabled={txStatus.type === 'loading'}
              style={{ width: '100%' }}>
              {txStatus.type === 'loading' ? <RefreshCw size={16} className="spinner" /> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payment</span>}
              {t.payBtn} {invoice.amount} XLM
            </button>
          )}
          {isFreelancer && invoice.status === 'Funded' && (
            <button className="btn btn-accent" onClick={() => handlePayOrRelease('release_payment')} disabled={txStatus.type === 'loading'}
              style={{ width: '100%' }}>
              {txStatus.type === 'loading' ? <RefreshCw size={16} className="spinner" /> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>}
              {t.releaseBtn}
            </button>
          )}

          {/* User Warnings for unauthorized roles */}
          {!isClient && invoice.status === 'Pending' && (
            <div style={{
              background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)',
              borderRadius: '8px', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.8rem',
              color: 'var(--accent)', lineHeight: '1.5', textAlign: 'left'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '0.25rem', verticalAlign: 'middle' }}>warning</span> <strong>{t.clientMismatch}</strong> <code style={{ display: 'block', wordBreak: 'break-all', marginTop: '0.25rem', color: 'var(--accent)' }}>{invoice.client}</code>
            </div>
          )}

          {!isFreelancer && invoice.status === 'Funded' && (
            <div style={{
              background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '8px', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.8rem',
              color: '#06b6d4', lineHeight: '1.5', textAlign: 'left'
            }}>
              ℹ️ <strong>{t.paymentLocked}</strong> (<code>{invoice.freelancer.slice(0, 8)}...{invoice.freelancer.slice(-6)}</code>)
            </div>
          )}
        </div>
      )}
    </div>
  );
};
