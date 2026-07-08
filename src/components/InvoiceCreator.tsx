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
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface InvoiceCreatorProps {
  walletAddress: string;
  rpcServer: rpc.Server;
  server: any;
  escrowContractId: string;
  nativeAssetContractId: string;
  onInvoiceCreated: () => void;
  t: any;
  isDemoActive?: boolean;
  demoStep?: number;
}

export const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({
  walletAddress, rpcServer, server, escrowContractId, nativeAssetContractId, onInvoiceCreated, t, isDemoActive, demoStep
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
      if (walletAddress.startsWith('GDEMO')) {
        setStatus({ type: 'loading', message: t.demoSimulating || 'Simulating invoice creation in Demo Mode...' });
        await new Promise(r => setTimeout(r, 1500));
        
        const rawSaved = localStorage.getItem('stellar_mock_invoices');
        let mockInvoices = rawSaved ? JSON.parse(rawSaved) : [
          { id: 1, freelancer: walletAddress, client: 'GBGHSPQEIZGJOJJDJYG5VVIPU7THJQU2Z4B6V5VF5IHUQ2SOLIRITDQS', amount: '50.0000', description: 'Website Redesign Proposal', status: 'Pending' },
          { id: 2, freelancer: walletAddress, client: 'GAJOE3OBM5CDRG75LLO732V3ZZB5LPT6VIWBOAHCYXW57DTYOOGCLD6B', amount: '150.0000', description: 'Logo Design Delivery', status: 'Funded' },
          { id: 3, freelancer: walletAddress, client: 'GD7UFEHE4J3RKQ25ZDGGJ4VBUWATV645UUMN4JYDIBMSFCSFOWXSQ6LM', amount: '85.0000', description: 'Smart Contract Audit', status: 'Released' },
          { id: 4, freelancer: 'GCZDX5E7RT7BTTA6VJC7YYHOYQYNHRDGEDB3O32K74VC52LC7XFCEZTH', client: walletAddress, amount: '100.0000', description: 'Content Writing Phase 1', status: 'Pending' },
          { id: 5, freelancer: 'GC74KHZR7ASDTNQL37RDWNH3CDXW6W5BBPIJHCYQ3THFHXAHTXINKBCU', client: walletAddress, amount: '250.0000', description: 'React Mobile App Setup', status: 'Released' }
        ];

        const nextId = mockInvoices.length > 0 ? Math.max(...mockInvoices.map((inv: any) => inv.id)) + 1 : 1;
        const newInvoice = {
          id: nextId,
          freelancer: walletAddress,
          client: clientAddress,
          amount: parseFloat(amount).toFixed(4),
          description: description,
          status: 'Pending'
        };

        mockInvoices.push(newInvoice);
        localStorage.setItem('stellar_mock_invoices', JSON.stringify(mockInvoices));

        setStatus({
          type: 'success',
          message: t.invoiceCreatedSuccess,
          invoiceId: nextId.toString()
        });
        setClientAddress('');
        setAmount('');
        setDescription('');
        if (onInvoiceCreated) onInvoiceCreated();
        return;
      }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '22px' }}>note_add</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t.createTitle}</h3>
      </div>

      {isDemoActive && demoStep === 1 && (
        <div className="alert alert-info" style={{ animation: 'pulse 2s infinite', border: '1px solid var(--accent)', background: 'rgba(245,197,24,0.05)', color: 'var(--accent)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lightbulb</span>
            <span>{t.tutorialStepTitle}</span>
          </div>
          <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
            {t.creatorStepGuide}
          </span>
        </div>
      )}

      {status.type !== 'idle' && (
        <div className={`alert ${status.type === 'error' ? 'alert-danger' : status.type === 'loading' ? 'alert-info' : 'alert-success'}`}
          style={{ marginBottom: '1rem' }}>
          {status.type === 'loading' ? <RefreshCw size={16} className="spinner" /> :
           status.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{status.message}</span>
        </div>
      )}

      {status.type === 'success' && status.invoiceId && (
        <div style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>{t.invoiceIdLabel}</p>
            <code style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>#{status.invoiceId}</code>
          </div>
          <button onClick={copyId} style={{ background: copied ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '0.5rem 1rem', color: copied ? 'var(--accent)' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span> {copied ? 'Copied!' : 'Copy'}
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
              value={amount} onChange={e => {
                const val = e.target.value;
                if (parseFloat(val) < 0) return;
                setAmount(val);
              }} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t.descriptionLabel}</label>
            <input type="text" className="form-input" placeholder="e.g. Website Design" maxLength={64}
              value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={status.type === 'loading'} style={{ marginTop: '0.5rem' }}>
          {status.type === 'loading' ? <><RefreshCw size={16} className="spinner" /> {t.creatingInvoice}</> : <><span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle' }}>description</span> {t.createInvoiceBtn}</>}
        </button>
      </form>
    </div>
  );
};
