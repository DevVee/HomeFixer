export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, Briefcase, DollarSign, TrendingUp, Clock } from 'lucide-react';

async function getStats() {
  const [
    { count: totalUsers },
    { count: totalProviders },
    { count: totalBookings },
    { count: pendingBookings },
    { count: completedBookings },
    { data: revenueRows },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('provider_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['completed', 'paid']),
    supabase.from('bookings').select('final_price').in('status', ['completed', 'paid']),
  ]);

  const totalRevenue = (revenueRows ?? []).reduce((sum, r) => sum + (Number(r.final_price) || 0), 0);

  return {
    totalUsers:       totalUsers       ?? 0,
    totalProviders:   totalProviders   ?? 0,
    totalBookings:    totalBookings    ?? 0,
    pendingBookings:  pendingBookings  ?? 0,
    completedBookings:completedBookings?? 0,
    totalRevenue,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: 'Total Customers', value: stats.totalUsers,        icon: Users,       color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Providers', value: stats.totalProviders,    icon: Briefcase,   color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Bookings',  value: stats.totalBookings,     icon: BookOpen,    color: 'bg-orange-50 text-orange-600' },
    { label: 'Pending',         value: stats.pendingBookings,   icon: Clock,       color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Completed',       value: stats.completedBookings, icon: TrendingUp,  color: 'bg-green-50 text-green-600' },
    {
      label: 'Total Revenue',
      value: `₱${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Overview of HomeFixer activity</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
