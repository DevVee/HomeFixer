export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, PlusCircle, AlertCircle } from 'lucide-react';

async function getData() {
  const { data: txs } = await supabase
    .from('wallet_transactions')
    .select(`
      id, type, amount, balance_after, description, created_at,
      provider:provider_profiles!provider_id(user:profiles!user_id(full_name, email))
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: wallets } = await supabase
    .from('provider_wallets')
    .select('balance, total_earned, total_commission_paid');

  const totalBalance    = (wallets ?? []).reduce((s, w: any) => s + (Number(w.balance) || 0), 0);
  const totalEarned     = (wallets ?? []).reduce((s, w: any) => s + (Number(w.total_earned) || 0), 0);
  const totalCommission = (wallets ?? []).reduce((s, w: any) => s + (Number(w.total_commission_paid) || 0), 0);

  return { txs: txs ?? [], totalBalance, totalEarned, totalCommission };
}

const TX_CONFIG = {
  earning:    { icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Earning'    },
  commission: { icon: TrendingDown, color: 'text-red-600',    bg: 'bg-red-50',    label: 'Commission' },
  topup:      { icon: PlusCircle,   color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Top-up'     },
  penalty:    { icon: AlertCircle,  color: 'text-orange-600', bg: 'bg-orange-50', label: 'Penalty'    },
};

export default async function TransactionsPage() {
  const { txs, totalBalance, totalEarned, totalCommission } = await getData();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Transactions</h1>
      <p className="text-sm text-gray-500 mb-6">Provider wallet ledger</p>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Wallet Balance', value: totalBalance,    color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Total Earned (All)',   value: totalEarned,     color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Commission',     value: totalCommission, color: 'text-red-600',   bg: 'bg-red-50'   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-5 border border-gray-100`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>₱{value.toLocaleString('en-PH',{minimumFractionDigits:2})}</p>
          </div>
        ))}
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Type','Provider','Description','Amount','Balance After','Date'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {txs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No transactions yet.</td></tr>
            ) : txs.map((tx: any) => {
              const cfg = TX_CONFIG[tx.type as keyof typeof TX_CONFIG] ?? TX_CONFIG.earning;
              const Icon = cfg.icon;
              return (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                      <Icon size={11} />{cfg.label}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{tx.provider?.user?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{tx.provider?.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{tx.description}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {tx.amount >= 0 ? '+' : ''}₱{Math.abs(Number(tx.amount)).toLocaleString('en-PH',{minimumFractionDigits:2})}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">₱{Number(tx.balance_after).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {new Date(tx.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
