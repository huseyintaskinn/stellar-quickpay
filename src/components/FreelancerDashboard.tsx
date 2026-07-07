import React, { useState, useEffect, useCallback } from 'react';
import {
  TransactionBuilder, Operation, Networks, rpc,
  Address, nativeToScVal, scValToNative
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { RefreshCw, FileText, TrendingUp, ArrowUpRight, ArrowDownLeft, Trash2, CheckCircle2, Download } from 'lucide-react';

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
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b', Funded: '#06b6d4', Released: '#10b981', Cancelled: '#ef4444',
};

export const FreelancerDashboard: React.FC<FreelancerDashboardProps> = ({
  walletAddress, rpcServer, server, escrowContractId, refreshTrigger, onSuccess, t
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
        const mockSent: Invoice[] = [
          { id: 1, freelancer: walletAddress, client: 'GBGHSPQEIZGJOJJDJYG5VVIPU7THJQU2Z4B6V5VF5IHUQ2SOLIRITDQS', amount: '50.0000', description: 'Website Redesign Proposal', status: 'Pending' },
          { id: 2, freelancer: walletAddress, client: 'GAJOE3OBM5CDRG75LLO732V3ZZB5LPT6VIWBOAHCYXW57DTYOOGCLD6B', amount: '150.0000', description: 'Logo Design Delivery', status: 'Funded' },
          { id: 3, freelancer: walletAddress, client: 'GD7UFEHE4J3RKQ25ZDGGJ4VBUWATV645UUMN4JYDIBMSFCSFOWXSQ6LM', amount: '85.0000', description: 'Smart Contract Audit', status: 'Released' }
        ];
        const mockReceived: Invoice[] = [
          { id: 4, freelancer: 'GCZDX5E7RT7BTTA6VJC7YYHOYQYNHRDGEDB3O32K74VC52LC7XFCEZTH', client: walletAddress, amount: '100.0000', description: 'Content Writing Phase 1', status: 'Pending' },
          { id: 5, freelancer: 'GC74KHZR7ASDTNQL37RDWNH3CDXW6W5BBPIJHCYQ3THFHXAHTXINKBCU', client: walletAddress, amount: '250.0000', description: 'React Mobile App Setup', status: 'Released' }
        ];
        setSentInvoices(mockSent);
        setReceivedInvoices(mockReceived);
        setUniqueTestersCount(8);
        const earned = mockSent.filter(i => i.status === 'Released').reduce((s, i) => s + parseFloat(i.amount), 0);
        setStats({
          total: mockSent.length,
          pending: mockSent.filter(i => i.status === 'Pending').length,
          funded: mockSent.filter(i => i.status === 'Funded').length,
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
        setActionStatus({ id: null, action: null, loading: false, error: null });
        
        const updateStatus = (list: Invoice[]): Invoice[] =>
          list.map(inv => inv.id === id ? { ...inv, status: action === 'cancel_invoice' ? 'Cancelled' : 'Released' } : inv);
        
        setSentInvoices(prev => {
          const updated = updateStatus(prev);
          const earned = updated.filter(i => i.status === 'Released').reduce((s, i) => s + parseFloat(i.amount), 0);
          setStats({
            total: updated.length,
            pending: updated.filter(i => i.status === 'Pending').length,
            funded: updated.filter(i => i.status === 'Funded').length,
            earned,
          });
          return updated;
        });
        setReceivedInvoices(prev => updateStatus(prev));
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: '20px' }}>dashboard</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t.myInvoices}</h3>
          {uniqueTestersCount > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '12px',
              marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              background: 'rgba(245,197,24,0.08)',
              color: 'var(--accent)',
              border: '1px solid rgba(245,197,24,0.2)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>groups</span>
              {uniqueTestersCount} {t.activeUsersBadge} {uniqueTestersCount >= 10 ? <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>celebration</span> : `/ 10 ${t.testerGoal}`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={exportToCSV} 
            disabled={activeInvoices.length === 0} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}
          >
            <Download size={14} /> {t.exportCsvBtn}
          </button>
          <button className="btn btn-secondary" onClick={fetchInvoices} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} /> {t.refreshBtn}
          </button>
        </div>
      </div>

      {/* Role Toggle Selector */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem' }}>
        <button
          style={{
            flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
            background: activeSubTab === 'sent' ? 'rgba(16,185,129,0.15)' : 'transparent',
            color: activeSubTab === 'sent' ? '#34d399' : '#64748b',
          }}
          onClick={() => setActiveSubTab('sent')}
        >
          <ArrowUpRight size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
          {t.sentInvoicesTab}
        </button>
        <button
          style={{
            flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
            background: activeSubTab === 'received' ? 'rgba(139,92,246,0.15)' : 'transparent',
            color: activeSubTab === 'received' ? '#a78bfa' : '#64748b',
          }}
          onClick={() => setActiveSubTab('received')}
        >
          <ArrowDownLeft size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
          {t.receivedInvoicesTab}
        </button>
      </div>

      {/* Stats Grid */}
      {activeSubTab === 'sent' ? (
        <div className="dashboard-stats-grid">
          {[
            { label: t.totalSent, value: stats.total, color: '#94a3b8', icon: FileText },
            { label: t.pending, value: stats.pending, color: '#f59e0b', icon: FileText },
            { label: t.funded, value: stats.funded, color: '#06b6d4', icon: FileText },
            { label: t.earnedXlm, value: stats.earned.toFixed(2), color: '#10b981', icon: TrendingUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
              <Icon size={16} style={{ color, marginBottom: '0.25rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-stats-grid-3">
          {[
            { label: t.totalReceived, value: receivedInvoices.length, color: '#a78bfa', icon: FileText },
            { label: t.awaitingPay, value: receivedInvoices.filter(i => i.status === 'Pending').length, color: '#f59e0b', icon: FileText },
            { label: t.paidFunded, value: receivedInvoices.filter(i => i.status === 'Funded' || i.status === 'Released').length, color: '#10b981', icon: FileText },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
              <Icon size={16} style={{ color, marginBottom: '0.25rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
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
          <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p>{t.noPayments}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeInvoices.map(inv => {
            const cardStatusLabel = inv.status === 'Pending' ? t.pending
              : inv.status === 'Funded' ? t.funded
              : inv.status === 'Released' ? t.released
              : t.cancelled;
            return (
              <div key={inv.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.invoiceIdLabel} #{inv.id}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      {activeSubTab === 'sent' ? t.toClient : t.fromFreelancer}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem', marginTop: '0.2rem' }}>{inv.description}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {activeSubTab === 'sent'
                      ? `Client: ${inv.client.slice(0, 10)}...${inv.client.slice(-8)}`
                      : `Freelancer: ${inv.freelancer.slice(0, 10)}...${inv.freelancer.slice(-8)}`
                    }
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#06b6d4' }}>{inv.amount} XLM</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeSubTab === 'sent' && inv.status === 'Pending' && (
                      <button
                        onClick={() => handleInvoiceAction(inv.id, 'cancel_invoice')}
                        disabled={actionStatus.id === inv.id && actionStatus.loading}
                        style={{
                          padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', color: '#f87171',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                          transition: 'all 0.2s'
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
                          padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)',
                          border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', color: '#34d399',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                          transition: 'all 0.2s'
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
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: STATUS_COLORS[inv.status] || '#94a3b8',
                      background: `${STATUS_COLORS[inv.status] || '#94a3b8'}18`, padding: '0.15rem 0.5rem', borderRadius: '12px', border: `1px solid ${STATUS_COLORS[inv.status] || '#94a3b8'}30` }}>
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
