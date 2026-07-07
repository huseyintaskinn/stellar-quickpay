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
import { FileText, CheckCircle2, XCircle, RefreshCw, Copy } from 'lucide-react';

interface InvoiceCreatorProps {
  walletAddress: string;
  rpcServer: rpc.Server;
  server: any;
  escrowContractId: string;
  nativeAssetContractId: string;
  onInvoiceCreated: () => void;
  t: any;
}

export const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({
  walletAddress, rpcServer, server, escrowContractId, nativeAssetContractId, onInvoiceCreated, t
}) => {
  const [clientAddress, setClientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string; invoiceId?: string }>({ type: 'idle', message: '' });
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientAddress || !amount || !description) return;
    setStatus({ type: 'loading', message: t.creatingInvoice });

    try {
      if (!clientAddress.startsWith('G') || clientAddress.length !== 56)
        throw new Error('Invalid client address format.');
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Amount must be positive.');

      const rawAmount = BigInt(Math.floor(parsedAmount * Math.pow(10, 7)));
      const sourceAccount = await server.loadAccount(walletAddress);

      const invokeOp = Operation.invokeContractFunction({
        contract: escrowContractId,
        function: 'create_invoice',
        args: [
          new Address(walletAddress).toScVal(),
          new Address(clientAddress).toScVal(),
          new Address(nativeAssetContractId).toScVal(),
          nativeToScVal(rawAmount, { type: 'i128' }),
          nativeToScVal(description, { type: 'string' }),
        ],
      });

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      }).addOperation(invokeOp).setTimeout(60).build();

      setStatus({ type: 'loading', message: t.creatingInvoice });
      const simResult = await rpcServer.simulateTransaction(transaction) as any;
      if (simResult.error) throw new Error(`Simulation: ${simResult.error}`);
      if (!rpc.Api.isSimulationSuccess(simResult)) throw new Error('Simulation failed.');

      const assembledTx = rpc.assembleTransaction(transaction, simResult) as any;
      const xdrPayload = typeof assembledTx.build === 'function' ? assembledTx.build().toXDR() : assembledTx.toXDR();

      setStatus({ type: 'loading', message: 'Awaiting wallet signature...' });
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrPayload, {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      });
      if (!signedTxXdr) throw new Error('Transaction rejected.');

      setStatus({ type: 'loading', message: 'Submitting transaction...' });
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      const response = await rpcServer.sendTransaction(signedTx);
      if (response.status === 'ERROR') throw new Error('Submission failed.');

      // Wait for confirmation and extract invoice ID from result
      let attempts = 0;
      let statusResponse = await rpcServer.getTransaction(response.hash);
      while (statusResponse.status === 'NOT_FOUND' && attempts < 15) {
        await new Promise(r => setTimeout(r, 2000));
        statusResponse = await rpcServer.getTransaction(response.hash);
        attempts++;
      }

      if (statusResponse.status === 'SUCCESS') {
        // Extract invoice ID from the contract's return value (u64)
        let invoiceId = '?';
        try {
          const successRes = statusResponse as rpc.Api.GetSuccessfulTransactionResponse;
          if (successRes.returnValue) {
            invoiceId = scValToNative(successRes.returnValue).toString();
          }
        } catch { /* fallback to ? */ }

        setStatus({
          type: 'success',
          message: `${t.invoiceCreatedSuccess} (${t.invoiceIdLabel} #${invoiceId})`,
          invoiceId: invoiceId,
        });
        setClientAddress('');
        setAmount('');
        setDescription('');
        onInvoiceCreated();
      } else {
        throw new Error('Transaction failed on-chain.');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || err.toString() });
    }
  };

  const copyId = () => {
    if (!status.invoiceId) return;
    navigator.clipboard.writeText(status.invoiceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <FileText size={20} style={{ color: '#06b6d4' }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t.createTitle}</h3>
      </div>

      {status.type !== 'idle' && (
        <div className={`alert ${status.type === 'error' ? 'alert-danger' : status.type === 'loading' ? 'alert-info' : 'alert-success'}`}
          style={{ marginBottom: '1rem' }}>
          {status.type === 'loading' ? <RefreshCw size={16} className="spinner" /> :
           status.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{status.message}</span>
        </div>
      )}

      {status.type === 'success' && status.invoiceId && (
        <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>{t.invoiceIdLabel}</p>
            <code style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4' }}>#{status.invoiceId}</code>
          </div>
          <button onClick={copyId} style={{ background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? '#34d399' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '0.5rem 1rem', color: copied ? '#34d399' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
            <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">{t.clientAddress}</label>
          <input type="text" className="form-input" placeholder="G... (56 characters)" value={clientAddress}
            onChange={e => setClientAddress(e.target.value.trim())} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{t.amountLabel}</label>
            <input type="number" step="any" min="0.0001" className="form-input" placeholder="0.0"
              value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t.descriptionLabel}</label>
            <input type="text" className="form-input" placeholder="e.g. Website Design" maxLength={64}
              value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={status.type === 'loading'} style={{ marginTop: '0.5rem' }}>
          {status.type === 'loading' ? <><RefreshCw size={16} className="spinner" /> {t.creatingInvoice}</> : <><FileText size={16} /> {t.createInvoiceBtn}</>}
        </button>
      </form>
    </div>
  );
};
