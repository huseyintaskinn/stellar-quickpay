import React, { useState, useEffect, useCallback } from 'react';
import {
  TransactionBuilder, Operation, Networks, rpc,
  Address, nativeToScVal, scValToNative
} from '@stellar/stellar-sdk';
import { LayoutDashboard, RefreshCw, FileText, TrendingUp } from 'lucide-react';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, funded: 0, earned: 0 });

  const fetchInvoices = useCallback(async () => {
    if (!walletAddress || escrowContractId.includes('YOUR_')) return;
    setLoading(true);
    try {
      const dummyAccount = new (await import('@stellar/stellar-sdk')).Account(walletAddress, '1');

      // 1. Get invoice IDs
      const listOp = Operation.invokeContractFunction({
        contract: escrowContractId,
        function: 'get_freelancer_invoices',
        args: [new Address(walletAddress).toScVal()],
      });
      const listTx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(listOp).setTimeout(30).build();
      const listSim = await rpcServer.simulateTransaction(listTx) as any;
      if (!listSim.result?.retval) { setLoading(false); return; }

      const ids: bigint[] = scValToNative(listSim.result.retval) as bigint[];

      // 2. Fetch each invoice
      const results: Invoice[] = [];
      for (const id of ids) {
        try {
          const getOp = Operation.invokeContractFunction({
            contract: escrowContractId,
            function: 'get_invoice',
            args: [nativeToScVal(id, { type: 'u64' })],
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

            results.push({
              id: Number(raw.id),
              freelancer: raw.freelancer?.toString() || '',
              client: raw.client?.toString() || '',
              amount: (Number(raw.amount) / Math.pow(10, 7)).toFixed(4),
              description: raw.description?.toString() || '',
              status: parseStatus(raw.status),
            });
          }
        } catch { /* skip bad invoice */ }
      }
      results.sort((a, b) => b.id - a.id);
      setInvoices(results);

      // Calculate stats
      const earned = results.filter(i => i.status === 'Released').reduce((s, i) => s + parseFloat(i.amount), 0);
      setStats({
        total: results.length,
        pending: results.filter(i => i.status === 'Pending').length,
        funded: results.filter(i => i.status === 'Funded').length,
        earned,
      });
    } catch (err) {
      console.error('Failed to fetch freelancer invoices', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, rpcServer, escrowContractId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices, refreshTrigger]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutDashboard size={20} style={{ color: '#10b981' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>My Invoices</h3>
        </div>
        <button className="btn btn-secondary" onClick={fetchInvoices} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#94a3b8', icon: FileText },
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

      {/* Invoice List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <RefreshCw size={24} className="spinner" />
          <p>Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p>No invoices yet. Create your first invoice!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {invoices.map(inv => (
            <div key={inv.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Invoice #{inv.id}</div>
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem' }}>{inv.description}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Client: {inv.client.slice(0, 8)}...{inv.client.slice(-6)}
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
