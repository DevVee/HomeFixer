export const dynamic = 'force-dynamic';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { ClipboardList } from 'lucide-react';

async function getLogs() {
  const { data } = await supabase
    .from('audit_logs')
    .select(`id, action, target_type, target_id, details, created_at, admin:profiles!admin_id(full_name, email)`)
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

const ACTION_COLOR: Record<string, string> = {
  create_user:             'bg-green-50 text-green-700 border-green-200',
  update_user:             'bg-blue-50 text-blue-700 border-blue-200',
  delete_user:             'bg-red-50 text-red-700 border-red-200',
  suspend_user:            'bg-yellow-50 text-yellow-700 border-yellow-200',
  unsuspend_user:          'bg-green-50 text-green-700 border-green-200',
  approve_provider:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  reject_provider:         'bg-red-50 text-red-700 border-red-200',
  broadcast_notification:  'bg-purple-50 text-purple-700 border-purple-200',
  update_setting:          'bg-orange-50 text-orange-700 border-orange-200',
};

export default async function AuditPage() {
  const logs = await getLogs();

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-1">
        <ClipboardList size={22} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">All admin actions are recorded here</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Action','Admin','Target','Details','Date'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No audit logs yet.</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${ACTION_COLOR[log.action] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {log.action.replace(/_/g,' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{log.admin?.full_name ?? 'System'}</p>
                  <p className="text-xs text-gray-400">{log.admin?.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{log.target_type}</p>
                  <p className="text-xs text-gray-400 font-mono">{log.target_id?.slice(0,10)}</p>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono truncate">
                    {JSON.stringify(log.details, null, 0)}
                  </pre>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {new Date(log.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
