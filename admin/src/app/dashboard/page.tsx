export const dynamic = 'force-dynamic';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import {
  Users, Briefcase, BookOpen, DollarSign, TrendingUp, Clock,
  CheckCircle, XCircle,
} from 'lucide-react';
import { DashboardCharts } from '@/components/DashboardCharts';

async function getStats() {
  const [
    { count: totalCustomers },
    { count: totalProviders },
    { count: totalBookings },
    { count: pendingBookings },
    { count: completedBookings },
    { count: cancelledBookings },
    { data: revenueRows },
    { data: recentBookings },
    { data: revenueByDay },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('provider_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['completed', 'paid']),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['cancelled', 'declined']),
    supabase.from('bookings').select('final_price').in('status', ['completed', 'paid']),
    supabase.from('bookings').select(`
      id, status, scheduled_date, final_price, payment_method, created_at,
      customer:profiles!customer_id(full_name),
      provider:provider_profiles!provider_id(user:profiles!user_id(full_name))
    `).order('created_at', { ascending: false }).limit(8),
    supabase.from('bookings').select('created_at, final_price')
      .in('status', ['completed', 'paid'])
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: true }),
  ]);

  const totalRevenue = (revenueRows ?? []).reduce((s, r) => s + (Number(r.final_price) || 0), 0);

  // Aggregate revenue per day for chart
  const dailyMap: Record<string, number> = {};
  (revenueByDay ?? []).forEach((r: any) => {
    const day = r.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (Number(r.final_price) || 0);
  });
  const chartData = Object.entries(dailyMap).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    revenue,
  }));

  const statusData = [
    { name: 'Pending',   value: pendingBookings   ?? 0, fill: '#F59E0B' },
    { name: 'Completed', value: completedBookings ?? 0, fill: '#10B981' },
    { name: 'Cancelled', value: cancelledBookings ?? 0, fill: '#EF4444' },
    { name: 'Other',
      value: (totalBookings ?? 0) - (pendingBookings ?? 0) - (completedBookings ?? 0) - (cancelledBookings ?? 0),
      fill: '#6366F1' },
  ].filter((d) => d.value > 0);

  return {
    totalCustomers: totalCustomers ?? 0,
    totalProviders: totalProviders ?? 0,
    totalBookings:  totalBookings  ?? 0,
    pendingBookings:pendingBookings?? 0,
    completedBookings: completedBookings ?? 0,
    totalRevenue,
    recentBookings: recentBookings ?? [],
    chartData,
    statusData,
  };
}

const STATUS_PILL: Record<string, string> = {
  pending:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted:    'bg-blue-50 text-blue-700 border-blue-200',
  completed:   'bg-green-50 text-green-700 border-green-200',
  paid:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:   'bg-red-50 text-red-700 border-red-200',
  declined:    'bg-gray-50 text-gray-500 border-gray-200',
  en_route:    'bg-violet-50 text-violet-700 border-violet-200',
  in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default async function DashboardPage() {
  const s = await getStats();

  const statCards = [
    { label: 'Total Customers', value: s.totalCustomers,  icon: Users,       color: 'bg-blue-50 text-blue-600'   },
    { label: 'Total Providers', value: s.totalProviders,  icon: Briefcase,   color: 'bg-purple-50 text-purple-600'},
    { label: 'Total Bookings',  value: s.totalBookings,   icon: BookOpen,    color: 'bg-orange-50 text-orange-600'},
    { label: 'Pending',         value: s.pendingBookings, icon: Clock,       color: 'bg-yellow-50 text-yellow-600'},
    { label: 'Completed',       value: s.completedBookings,icon: CheckCircle,color: 'bg-green-50 text-green-600'  },
    { label: 'Total Revenue',   value: `₱${s.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-6">Real-time HomeFixer platform metrics</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts chartData={s.chartData} statusData={s.statusData} />

      {/* Recent bookings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Customer', 'Provider', 'Date', 'Price', 'Method', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {s.recentBookings.map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{b.customer?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{b.provider?.user?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.scheduled_date}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {b.final_price != null ? `₱${Number(b.final_price).toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 uppercase text-xs text-gray-500">{b.payment_method}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_PILL[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.recentBookings.length === 0 && (
          <p className="text-center py-12 text-gray-400 text-sm">No bookings yet.</p>
        )}
      </div>
    </div>
  );
}
