export const dynamic = 'force-dynamic';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted:    'bg-blue-50 text-blue-700 border-blue-200',
  en_route:    'bg-violet-50 text-violet-700 border-violet-200',
  in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
  completed:   'bg-green-50 text-green-700 border-green-200',
  paid:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:   'bg-red-50 text-red-700 border-red-200',
  declined:    'bg-gray-50 text-gray-700 border-gray-200',
};

async function getBookings() {
  const { data } = await supabase
    .from('bookings')
    .select(`
      id, status, scheduled_date, scheduled_time, address,
      final_price, payment_method, payment_status, created_at,
      customer:profiles!customer_id(full_name, email),
      provider:provider_profiles!provider_id(
        user:profiles!user_id(full_name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export default async function BookingsPage() {
  const bookings = await getBookings();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bookings</h1>
      <p className="text-sm text-gray-500 mb-6">{bookings.length} total bookings</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['ID', 'Customer', 'Provider', 'Date', 'Address', 'Final Price', 'Payment', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{b.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{b.customer?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{b.customer?.email ?? ''}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{b.provider?.user?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.scheduled_date} {b.scheduled_time}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{b.address}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {b.final_price != null ? `₱${Number(b.final_price).toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 uppercase text-xs text-gray-600">{b.payment_method}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <div className="text-center py-16 text-gray-400">No bookings yet.</div>
        )}
      </div>
    </div>
  );
}
