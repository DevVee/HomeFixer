import { supabase } from '@/lib/supabase';
import { Star, BadgeCheck } from 'lucide-react';

async function getProviders() {
  const { data } = await supabase
    .from('provider_profiles')
    .select(`
      id, bio, service_category, average_rating, total_reviews,
      is_verified, is_open_rate, wallet_balance, created_at,
      user:profiles!user_id(full_name, email, phone, is_active)
    `)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export default async function ProvidersPage() {
  const providers = await getProviders();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Providers</h1>
      <p className="text-sm text-gray-500 mb-6">{providers.length} registered providers</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name', 'Email', 'Phone', 'Category', 'Rating', 'Wallet', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {providers.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{p.user?.full_name ?? '—'}</span>
                    {p.is_verified && <BadgeCheck size={14} className="text-blue-500 shrink-0" />}
                    {p.is_open_rate && (
                      <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        Open Rate
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.user?.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.user?.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{p.service_category ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Star size={13} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-medium text-gray-900">{p.average_rating ? Number(p.average_rating).toFixed(1) : '—'}</span>
                    {p.total_reviews > 0 && <span className="text-xs text-gray-400">({p.total_reviews})</span>}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  ₱{Number(p.wallet_balance ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    p.user?.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {p.user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {providers.length === 0 && (
          <div className="text-center py-16 text-gray-400">No providers yet.</div>
        )}
      </div>
    </div>
  );
}
