'use client';
import { useState } from 'react';
import { adminApproveProvider, adminRejectProvider } from '@/lib/actions';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  providerProfileId: string;
  providerUserId:    string;
  email:             string;
  name:              string;
}

export function VerificationActions({ providerProfileId, providerUserId, email, name }: Props) {
  const [loading,    setLoading]    = useState<'approve' | 'reject' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason,     setReason]     = useState('');
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const getAdminId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? '';
  };

  if (done) return (
    <span className="text-sm font-semibold text-green-600">✓ Processed</span>
  );

  const approve = async () => {
    setLoading('approve'); setError('');
    try {
      const adminId = await getAdminId();
      await adminApproveProvider(adminId, providerProfileId, providerUserId, email, name);
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  };

  const reject = async () => {
    if (!reason.trim()) { setError('Please provide a reason for rejection.'); return; }
    setLoading('reject'); setError('');
    try {
      const adminId = await getAdminId();
      await adminRejectProvider(adminId, providerProfileId, providerUserId, email, name, reason);
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  };

  return (
    <div className="flex flex-col gap-2 min-w-40">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {!showReject ? (
        <div className="flex gap-2">
          <button onClick={approve} disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
            {loading === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Approve
          </button>
          <button onClick={() => setShowReject(true)} disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg border border-red-200 transition">
            <XCircle size={13} /> Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={reject} disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
              {loading === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Confirm Reject
            </button>
            <button onClick={() => { setShowReject(false); setReason(''); setError(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
