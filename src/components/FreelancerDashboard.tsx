import React, { useState, useEffect, useCallback } from 'react';
import {
  TransactionBuilder, Operation, Networks, rpc,
  Address, nativeToScVal, scValToNative
} from '@stellar/stellar-sdk';
import { LayoutDashboard, RefreshCw, FileText, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface Invoice {
  id: number; freelancer: string; client: string;
  amount: string; description: string; status: string;
}

interface FreelancerDashboardProps {
  walletAddress: string;
  rpcServer: rpc.Server;
  escrowContractId: string;
  refreshTrigger: number;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b', Funded: '#06b6d4', Released: '#10b981', Cancelled: '#ef4444',
};

export const FreelancerDashboard: React.FC<FreelancerDashboardProps> = ({
  walletAddress, rpcServer, escrowContractId, refreshTrigger
}) => {
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<Invoice[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'sent' | 'received'>('sent');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, funded: 0, earned: 0 });

  const fetchInvoices = useCallback(async () => {
    if (!walletAddress || escrowContractId.includes('YOUR_')) return;
    setLoading(true);
    try {
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
          }
        } catch { /* skip bad invoice */ }
      }

      sent.sort((a, b) => b.id - a.id);
      received.sort((a, b) => b.id - a.id);

      setSentInvoices(sent);
      setReceivedInvoices(received);

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

  const activeInvoices = activeSubTab === 'sent' ? sentInvoices : receivedInvoices;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutDashboard size={20} style={{ color: '#10b981' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>My Invoices</h3>
        </div>
        <button className="btn btn-secondary" onClick={fetchInvoices} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh
        </button>
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
          Sent Invoices (As Freelancer)
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
          Received Invoices (As Client)
        </button>
      </div>

      {/* Stats Grid */}
      {activeSubTab === 'sent' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Sent', value: stats.total, color: '#94a3b8', icon: FileText },
            { label: 'Pending', value: stats.pending, color: '#f59e0b', icon: FileText },
            { label: 'Funded', value: stats.funded, color: '#06b6d4', icon: FileText },
            { label: 'Earned (XLM)', value: stats.earned.toFixed(2), color: '#10b981', icon: TrendingUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
              <Icon size={16} style={{ color, marginBottom: '0.25rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Received', value: receivedInvoices.length, color: '#a78bfa', icon: FileText },
            { label: 'Awaiting Pay', value: receivedInvoices.filter(i => i.status === 'Pending').length, color: '#f59e0b', icon: FileText },
            { label: 'Paid/Funded', value: receivedInvoices.filter(i => i.status === 'Funded' || i.status === 'Released').length, color: '#10b981', icon: FileText },
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
          <p>Loading invoices...</p>
        </div>
      ) : activeInvoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p>No invoices found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeInvoices.map(inv => (
            <div key={inv.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Invoice #{inv.id}</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    {activeSubTab === 'sent' ? 'To Client' : 'From Freelancer'}
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
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#06b6d4' }}>{inv.amount} XLM</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: STATUS_COLORS[inv.status] || '#94a3b8',
                  background: `${STATUS_COLORS[inv.status] || '#94a3b8'}18`, padding: '0.15rem 0.5rem', borderRadius: '12px', border: `1px solid ${STATUS_COLORS[inv.status] || '#94a3b8'}30` }}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
