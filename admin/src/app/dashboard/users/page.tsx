export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

async function getUsers() {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active, created_at')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export default async function UsersPage() {
  const users = await getUsers();
  const customers = users.filter((u: any) => u.role === 'customer');
  const providers  = users.filter((u: any) => u.role === 'provider');
  const admins     = users.filter((u: any) => u.role === 'admin');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
      <div className="flex gap-4 mb-6">
        {[
          { label: 'All',       count: users.length },
          { label: 'Customers', count: customers.length },
          { label: 'Providers', count: providers.length },
          { label: 'Admins',    count: admins.length },
        ].map(({ label, count }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-lg px-4 py-2 text-sm shadow-sm">
            <span className="text-gray-500">{label}: </span>
            <span className="font-bold text-gray-900">{count}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                    u.role === 'admin'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : u.role === 'provider'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    u.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-16 text-gray-400">No users yet.</div>
        )}
      </div>
    </div>
  );
}
