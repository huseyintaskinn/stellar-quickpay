import React, { useState, useEffect, useCallback } from 'react';
import {
  TransactionBuilder, Operation, Networks, rpc,
  Address, nativeToScVal, scValToNative
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { RefreshCw, ArrowUpRight, ArrowDownLeft, Trash2, CheckCircle2, Download } from 'lucide-react';

interface Invoice {
  id: number; freelancer: string; client: string;
  amount: string; description: string; status: string;
}

interface FreelancerDashboardProps {
  walletAddress: string;
  rpcServer: rpc.Server;
  server: any;
  escrowContractId: string;
  refreshTrigger: number;
  onSuccess?: () => void;
  t: any;
  isDemoActive?: boolean;
  demoStep?: number;
}

const STATUS_CONFIG = {
  Pending: { color: 'var(--accent)', bg: 'rgba(245, 197, 24, 0.08)', border: 'rgba(245, 197, 24, 0.2)' },
  Funded:  { color: 'var(--accent)', bg: 'rgba(245, 197, 24, 0.12)', border: 'rgba(245, 197, 24, 0.25)' },
  Released:{ color: 'var(--accent)', bg: 'rgba(245, 197, 24, 0.16)', border: 'rgba(245, 197, 24, 0.3)' },
  Cancelled:{ color: '#64748b', bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.1)' }
};

export const FreelancerDashboard: React.FC<FreelancerDashboardProps> = ({
  walletAddress, rpcServer, server, escrowContractId, refreshTrigger, onSuccess, t, isDemoActive, demoStep
}) => {
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<Invoice[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'sent' | 'received'>('sent');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, funded: 0, earned: 0 });
  const [actionStatus, setActionStatus] = useState<{ id: number | null; action: 'cancel' | 'release' | null; loading: boolean; error: string | null }>({ id: null, action: null, loading: false, error: null });
  const [uniqueTestersCount, setUniqueTestersCount] = useState(0);

  const exportToCSV = () => {
    const invoicesToExport = activeSubTab === 'sent' ? sentInvoices : receivedInvoices;
    if (invoicesToExport.length === 0) return;

    const headers = ['Invoice ID', 'Role', 'Freelancer Address', 'Client Address', 'Amount (XLM)', 'Description', 'Status'];
    const rows = invoicesToExport.map(inv => [
      inv.id,
      activeSubTab === 'sent' ? 'Freelancer' : 'Client',
      inv.freelancer,
      inv.client,
      inv.amount,
      `"${inv.description.replace(/"/g, '""')}"`,
      inv.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stellarpay_invoices_${activeSubTab}_${walletAddress.slice(0, 8)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const fetchInvoices = useCallback(async () => {
    if (!walletAddress || escrowContractId.includes('YOUR_')) return;
    setLoading(true);
    try {
      if (walletAddress.startsWith('GDEMO')) {
        const rawSaved = localStorage.getItem('stellar_mock_invoices');
        const mockInvoices = rawSaved ? JSON.parse(rawSaved) : [
          { id: 1, freelancer: walletAddress, client: 'GBGHSPQEIZGJOJJDJYG5VVIPU7THJQU2Z4B6V5VF5IHUQ2SOLIRITDQS', amount: '50.0000', description: 'Website Redesign Proposal', status: 'Pending' },
          { id: 2, freelancer: walletAddress, client: 'GAJOE3OBM5CDRG75LLO732V3ZZB5LPT6VIWBOAHCYXW57DTYOOGCLD6B', amount: '150.0000', description: 'Logo Design Delivery', status: 'Funded' },
          { id: 3, freelancer: walletAddress, client: 'GD7UFEHE4J3RKQ25ZDGGJ4VBUWATV645UUMN4JYDIBMSFCSFOWXSQ6LM', amount: '85.0000', description: 'Smart Contract Audit', status: 'Released' },
          { id: 4, freelancer: 'GCZDX5E7RT7BTTA6VJC7YYHOYQYNHRDGEDB3O32K74VC52LC7XFCEZTH', client: walletAddress, amount: '100.0000', description: 'Content Writing Phase 1', status: 'Pending' },
          { id: 5, freelancer: 'GC74KHZR7ASDTNQL37RDWNH3CDXW6W5BBPIJHCYQ3THFHXAHTXINKBCU', client: walletAddress, amount: '250.0000', description: 'React Mobile App Setup', status: 'Released' }
        ];

        if (!rawSaved) {
          localStorage.setItem('stellar_mock_invoices', JSON.stringify(mockInvoices));
        }

        const sent = mockInvoices.filter((inv: any) => inv.freelancer === walletAddress);
        const received = mockInvoices.filter((inv: any) => inv.client === walletAddress);

        const testersSet = new Set<string>();
        mockInvoices.forEach((inv: any) => {
          testersSet.add(inv.freelancer);
          testersSet.add(inv.client);
        });

        setSentInvoices(sent);
        setReceivedInvoices(received);
        setUniqueTestersCount(testersSet.size + 9);
        const earned = sent.filter((i: any) => i.status === 'Released').reduce((s: any, i: any) => s + parseFloat(i.amount), 0);
        setStats({
          total: sent.length,
          pending: sent.filter((i: any) => i.status === 'Pending').length,
          funded: sent.filter((i: any) => i.status === 'Funded').length,
          earned,
        });
        setLoading(false);
        return;
      }

      const dummyAccount = new (await import('@stellar/stellar-sdk')).Account(walletAddress, '1');

      // 1. Get total invoice count
      const countOp = Operation.invokeContractFunction({
        contract: escrowContractId,
        function: 'get_invoice_count',
        args: [],
      });
      const countTx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(countOp).setTimeout(30).build();
      const countSim = await rpcServer.simulateTransaction(countTx) as any;
      if (!countSim.result?.retval) { setLoading(false); return; }

      const totalCount = Number(scValToNative(countSim.result.retval));
      const sent: Invoice[] = [];
      const received: Invoice[] = [];
      const testersSet = new Set<string>();

      // 2. Fetch all invoices sequentially
      for (let id = 1; id <= totalCount; id++) {
        try {
          const getOp = Operation.invokeContractFunction({
            contract: escrowContractId,
            function: 'get_invoice',
            args: [nativeToScVal(BigInt(id), { type: 'u64' })],
          });
          const getTx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
            .addOperation(getOp).setTimeout(30).build();
          const getSim = await rpcServer.simulateTransaction(getTx) as any;
          
          if (getSim.result?.retval) {
            const raw = scValToNative(getSim.result.retval) as any;
            const parseStatus = (statusVal: any): string => {
              if (typeof statusVal === 'string') return statusVal;
              if (Array.isArray(statusVal) && statusVal.length > 0) {
                return statusVal[0].toString();
              }
              if (statusVal && typeof statusVal === 'object') {
                const keys = Object.keys(statusVal);
                if (keys.length > 0) return keys[0];
              }
              return 'Pending';
            };

            const inv: Invoice = {
              id: Number(raw.id),
              freelancer: raw.freelancer?.toString() || '',
              client: raw.client?.toString() || '',
              amount: (Number(raw.amount) / Math.pow(10, 7)).toFixed(4),
              description: raw.description?.toString() || '',
              status: parseStatus(raw.status),
            };

            if (inv.freelancer === walletAddress) {
              sent.push(inv);
            }
            if (inv.client === walletAddress) {
              received.push(inv);
            }

            testersSet.add(raw.freelancer.toString());
            testersSet.add(raw.client.toString());
          }
        } catch { /* skip bad invoice */ }
      }

      sent.sort((a, b) => b.id - a.id);
      received.sort((a, b) => b.id - a.id);

      setSentInvoices(sent);
      setReceivedInvoices(received);
      setUniqueTestersCount(testersSet.size);

      // Calculate stats based on freelancer role
      const earned = sent.filter(i => i.status === 'Released').reduce((s, i) => s + parseFloat(i.amount), 0);
      setStats({
        total: sent.length,
        pending: sent.filter(i => i.status === 'Pending').length,
        funded: sent.filter(i => i.status === 'Funded').length,
        earned,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard invoices', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, rpcServer, escrowContractId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices, refreshTrigger]);

  const handleInvoiceAction = async (id: number, action: 'cancel_invoice' | 'release_payment') => {
    const actionKey = action === 'cancel_invoice' ? 'cancel' : 'release';
    setActionStatus({ id, action: actionKey, loading: true, error: null });
    try {
      if (walletAddress.startsWith('GDEMO')) {
        await new Promise(r => setTimeout(r, 1000));
        
        const rawSaved = localStorage.getItem('stellar_mock_invoices');
        if (rawSaved) {
          let mockInvoices = JSON.parse(rawSaved);
          mockInvoices = mockInvoices.map((inv: any) => {
            if (inv.id === id) {
              return { ...inv, status: action === 'cancel_invoice' ? 'Cancelled' : 'Released' };
            }
            return inv;
          });
          localStorage.setItem('stellar_mock_invoices', JSON.stringify(mockInvoices));
        }

        setActionStatus({ id: null, action: null, loading: false, error: null });
        fetchInvoices();
        if (onSuccess) onSuccess();
        return;
      }

      const sourceAccount = await server.loadAccount(walletAddress);
      const invokeOp = Operation.invokeContractFunction({
        contract: escrowContractId,
        function: action,
        args: [
          nativeToScVal(BigInt(id), { type: 'u64' }),
          new Address(walletAddress).toScVal(),
        ],
      });
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      }).addOperation(invokeOp).setTimeout(60).build();

      const simResult = await rpcServer.simulateTransaction(transaction) as any;
      if (simResult.error) throw new Error(`Simulation: ${simResult.error}`);
      if (!rpc.Api.isSimulationSuccess(simResult)) throw new Error('Simulation failed.');

      const assembledTx = rpc.assembleTransaction(transaction, simResult) as any;
      const xdrPayload = typeof assembledTx.build === 'function' ? assembledTx.build().toXDR() : assembledTx.toXDR();

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrPayload, {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      });
      if (!signedTxXdr) throw new Error('Transaction rejected.');

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
        setActionStatus({ id: null, action: null, loading: false, error: null });
        fetchInvoices();
        if (onSuccess) onSuccess();
      } else {
        throw new Error('Transaction failed on-chain.');
      }
    } catch (err: any) {
      setActionStatus({ id, action: actionKey, loading: false, error: err.message || err.toString() });
    }
  };

  const activeInvoices = activeSubTab === 'sent' ? sentInvoices : receivedInvoices;

  return (
    <div>
      <div className="dashboard-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '20px' }}>dashboard</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t.myInvoices}</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {uniqueTestersCount > 0 && (
            <span style={{
              fontSize: '0.8rem', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '8px',
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(245,197,24,0.08)',
              color: 'var(--accent)',
              border: '1px solid rgba(245,197,24,0.3)',
              boxSizing: 'border-box',
              height: '34px',
              lineHeight: '1'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>groups</span>
              {uniqueTestersCount} {t.activeUsersBadge} {uniqueTestersCount >= 50 ? <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>celebration</span> : `/ 50 ${t.testerGoal}`}
            </span>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={exportToCSV} 
            disabled={activeInvoices.length === 0} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--accent)', borderColor: 'var(--accent)', height: '34px', boxSizing: 'border-box' }}
          >
            <Download size={14} /> {t.exportCsvBtn}
          </button>
          <button className="btn btn-secondary" onClick={fetchInvoices} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', height: '34px', boxSizing: 'border-box' }}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} /> {t.refreshBtn}
          </button>
        </div>
      </div>

      {isDemoActive && demoStep === 3 && (
        <div className="alert alert-info" style={{ animation: 'pulse 2s infinite', border: '1px solid var(--accent)', background: 'rgba(245,197,24,0.05)', color: 'var(--accent)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lightbulb</span>
            <span>{t.tutorialStepTitle}</span>
          </div>
          <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
            {t.listStepGuide}
          </span>
        </div>
      )}

      {/* Role Toggle Selector */}
      <div style={{ display: 'flex', background: 'rgba(2, 3, 6, 0.65)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.3rem', marginBottom: '1.5rem', gap: '0.3rem' }}>
        <button
          style={{
            flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease',
            background: activeSubTab === 'sent' ? 'rgba(245,197,24,0.08)' : 'transparent',
            border: `1px solid ${activeSubTab === 'sent' ? 'rgba(245,197,24,0.25)' : 'transparent'}`,
            color: activeSubTab === 'sent' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          onClick={() => setActiveSubTab('sent')}
        >
          <ArrowUpRight size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
          {t.sentInvoicesTab}
        </button>
        <button
          style={{
            flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease',
            background: activeSubTab === 'received' ? 'rgba(245,197,24,0.08)' : 'transparent',
            border: `1px solid ${activeSubTab === 'received' ? 'rgba(245,197,24,0.25)' : 'transparent'}`,
            color: activeSubTab === 'received' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          onClick={() => setActiveSubTab('received')}
        >
          <ArrowDownLeft size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
          {t.receivedInvoicesTab}
        </button>
      </div>

      {/* Stats Grid */}
      {activeSubTab === 'sent' ? (
        <div className="dashboard-stats-grid">
          {[
            { label: t.totalSent, value: stats.total, icon: 'outbox' },
            { label: t.pending, value: stats.pending, icon: 'pending_actions' },
            { label: t.funded, value: stats.funded, icon: 'lock' },
            { label: t.earnedXlm, value: stats.earned.toFixed(2) + ' XLM', icon: 'payments' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.002) 100%)',
              border: '1px solid rgba(245,197,24,0.12)',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '8px', left: '8px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
              <div style={{
                background: 'rgba(245,197,24,0.06)',
                border: '1px solid rgba(245,197,24,0.15)',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '20px' }}>{icon}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: '1.2' }}>{value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-stats-grid-3">
          {[
            { label: t.totalReceived, value: receivedInvoices.length, icon: 'inbox' },
            { label: t.awaitingPay, value: receivedInvoices.filter(i => i.status === 'Pending').length, icon: 'pending_actions' },
            { label: t.paidFunded, value: receivedInvoices.filter(i => i.status === 'Funded' || i.status === 'Released').length, icon: 'lock' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.002) 100%)',
              border: '1px solid rgba(245,197,24,0.12)',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '8px', left: '8px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
              <div style={{
                background: 'rgba(245,197,24,0.06)',
                border: '1px solid rgba(245,197,24,0.15)',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '20px' }}>{icon}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: '1.2' }}>{value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <RefreshCw size={24} className="spinner" />
          <p>{t.loadingHistory}</p>
        </div>
      ) : activeInvoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '0.5rem', opacity: 0.4, color: 'var(--accent)' }}>description</span>
          <p>{t.noPayments}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeInvoices.map(inv => {
            const cardStatusLabel = inv.status === 'Pending' ? t.pending
              : inv.status === 'Funded' ? t.funded
              : inv.status === 'Released' ? t.released
              : t.cancelled;
            const statusConf = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] || { color: '#94a3b8', bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.08)' };
            return (
              <div key={inv.id} className="invoice-card">
                <div className="invoice-card-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t.invoiceIdLabel} #{inv.id}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {activeSubTab === 'sent' ? t.toClient : t.fromFreelancer}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem', marginTop: '0.25rem' }}>{inv.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {activeSubTab === 'sent'
                      ? `Client: ${inv.client.slice(0, 10)}...${inv.client.slice(-8)}`
                      : `Freelancer: ${inv.freelancer.slice(0, 10)}...${inv.freelancer.slice(-8)}`
                    }
                  </div>
                </div>
                <div className="invoice-card-right">
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{inv.amount} XLM</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeSubTab === 'sent' && inv.status === 'Pending' && (
                      <button
                        onClick={() => handleInvoiceAction(inv.id, 'cancel_invoice')}
                        disabled={actionStatus.id === inv.id && actionStatus.loading}
                        style={{
                          padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', color: '#f87171',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                          transition: 'all 0.2s', fontWeight: 700
                        }}
                      >
                        {actionStatus.id === inv.id && actionStatus.action === 'cancel' && actionStatus.loading ? (
                          <RefreshCw size={10} className="spinner" />
                        ) : (
                          <Trash2 size={10} />
                        )}
                        {t.cancelBtn}
                      </button>
                    )}
                    {activeSubTab === 'sent' && inv.status === 'Funded' && (
                      <button
                        onClick={() => handleInvoiceAction(inv.id, 'release_payment')}
                        disabled={actionStatus.id === inv.id && actionStatus.loading}
                        style={{
                          padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'rgba(245,197,24,0.1)',
                          border: '1px solid rgba(245,197,24,0.3)', borderRadius: '6px', color: 'var(--accent)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                          transition: 'all 0.2s', fontWeight: 700
                        }}
                      >
                        {actionStatus.id === inv.id && actionStatus.action === 'release' && actionStatus.loading ? (
                          <RefreshCw size={10} className="spinner" />
                        ) : (
                          <CheckCircle2 size={10} />
                        )}
                        {t.releaseBtn}
                      </button>
                    )}
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      color: statusConf.color,
                      background: statusConf.bg, 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '12px', 
                      border: `1px solid ${statusConf.border}`,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {cardStatusLabel}
                    </span>
                  </div>
                  {actionStatus.id === inv.id && actionStatus.error && (
                    <span style={{ fontSize: '0.65rem', color: '#ef4444', display: 'block', marginTop: '0.15rem' }}>
                      {actionStatus.error}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
