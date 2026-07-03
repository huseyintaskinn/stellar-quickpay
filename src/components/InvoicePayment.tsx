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
import { Search, CreditCard, RefreshCw, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';

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
}

const STATUS_CONFIG = {
  Pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Awaiting Payment' },
  Funded:  { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  icon: CheckCircle2, label: 'Funded - Awaiting Release' },
  Released:{ color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2, label: 'Payment Released' },
  Cancelled:{ color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: Ban, label: 'Cancelled' },
};

export const InvoicePayment: React.FC<InvoicePaymentProps> = ({
  walletAddress, rpcServer, server, escrowContractId
}) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  const parseStatus = (statusVal: any): Invoice['status'] => {
    if (typeof statusVal === 'string') return statusVal as Invoice['status'];
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
        setTxStatus({ type: 'error', message: 'Invoice not found. Please verify the ID and try again.' });
      }
    } catch (err: any) {
      setTxStatus({ type: 'error', message: 'Invoice lookup failed. Check the ID.' });
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePayOrRelease = async (action: 'pay_invoice' | 'release_payment') => {
    if (!invoice) return;
    setTxStatus({ type: 'loading', message: `Preparing ${action === 'pay_invoice' ? 'payment' : 'release'}...` });
    try {
      const sourceAccount = await server.loadAccount(walletAddress);
      const args = action === 'pay_invoice'
        ? [nativeToScVal(BigInt(invoice.id), { type: 'u64' }), new Address(walletAddress).toScVal()]
        : [nativeToScVal(BigInt(invoice.id), { type: 'u64' }), new Address(walletAddress).toScVal()];

      const invokeOp = Operation.invokeContractFunction({ contract: escrowContractId, function: action, args });
      const transaction = new TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(invokeOp).setTimeout(60).build();

      setTxStatus({ type: 'loading', message: 'Simulating...' });
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
        const label = action === 'pay_invoice' ? 'Payment successful! Funds are now locked in escrow.' : 'Payment released to freelancer!';
        setTxStatus({ type: 'success', message: label });
        await fetchInvoice(); // Refresh invoice state
      } else {
        throw new Error('Transaction failed.');
      }
    } catch (err: any) {
      setTxStatus({ type: 'error', message: err.message || err.toString() });
    }
  };

  const statusConf = invoice ? STATUS_CONFIG[invoice.status] : null;
  const StatusIcon = statusConf?.icon;
  const isClient = invoice?.client === walletAddress;
  const isFreelancer = invoice?.freelancer === walletAddress;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <CreditCard size={20} style={{ color: '#8b5cf6' }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Pay or Lookup Invoice</h3>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input type="number" className="form-input" placeholder="Enter Invoice ID (e.g. 42)"
          value={invoiceId} onChange={e => setInvoiceId(e.target.value)} />
        <button className="btn btn-secondary" onClick={fetchInvoice} disabled={loadingInvoice || !invoiceId}
          style={{ whiteSpace: 'nowrap' }}>
          {loadingInvoice ? <RefreshCw size={16} className="spinner" /> : <Search size={16} />}
          Lookup
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

      {invoice && statusConf && StatusIcon && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Invoice #{invoice.id}</h4>
            <span style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.color}40`, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <StatusIcon size={12} /> {statusConf.label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Description</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{invoice.description}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Amount</span>
              <span style={{ color: '#06b6d4', fontWeight: 800, fontSize: '1.1rem' }}>{invoice.amount} XLM</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Freelancer</span>
              <code style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{invoice.freelancer.slice(0,8)}...{invoice.freelancer.slice(-8)}</code>
            </div>
          </div>

          {/* Action buttons */}
          {isClient && invoice.status === 'Pending' && (
            <button className="btn" onClick={() => handlePayOrRelease('pay_invoice')} disabled={txStatus.type === 'loading'}
              style={{ width: '100%', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff' }}>
              {txStatus.type === 'loading' ? <RefreshCw size={16} className="spinner" /> : <CreditCard size={16} />}
              Pay {invoice.amount} XLM
            </button>
          )}
          {isFreelancer && invoice.status === 'Funded' && (
            <button className="btn" onClick={() => handlePayOrRelease('release_payment')} disabled={txStatus.type === 'loading'}
              style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
              {txStatus.type === 'loading' ? <RefreshCw size={16} className="spinner" /> : <CheckCircle2 size={16} />}
              Release Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
};
