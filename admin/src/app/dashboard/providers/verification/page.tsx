export const dynamic = 'force-dynamic';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { VerificationActions } from './VerificationActions';
import { ShieldCheck } from 'lucide-react';

async function getPending() {
  const { data } = await supabase
    .from('provider_profiles')
    .select(`
      id, service_category, bio, verification_status, created_at,
      user:profiles!user_id(id, full_name, email, phone)
    `)
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: true });
  return data ?? [];
}

export default async function VerificationPage() {
  const providers = await getPending();

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck size={22} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">{providers.length} provider{providers.length !== 1 ? 's' : ''} awaiting review</p>

      {providers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <ShieldCheck size={32} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500 font-medium">All caught up! No pending verifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <span className="font-bold text-orange-600 text-sm">
                        {(p.user?.full_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.user?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{p.user?.email}</p>
                    </div>
                    <span className="text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full capitalize">
                      {p.verification_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-sm">
                    <div><p className="text-xs text-gray-400">Category</p><p className="font-medium capitalize text-gray-900">{p.service_category}</p></div>
                    <div><p className="text-xs text-gray-400">Phone</p><p className="font-medium text-gray-900">{p.user?.phone || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Applied</p><p className="font-medium text-gray-900">{new Date(p.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</p></div>
                  </div>

                  {p.bio && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {p.bio}
                    </p>
                  )}
                </div>

                <VerificationActions
                  providerProfileId={p.id}
                  providerUserId={p.user?.id}
                  email={p.user?.email ?? ''}
                  name={p.user?.full_name ?? ''}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
