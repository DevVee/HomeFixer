'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { adminBroadcastNotification } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { Bell, Send, Users, Briefcase, Globe, Loader2, CheckCircle } from 'lucide-react';

type Audience = 'all' | 'customers' | 'providers';

const AUDIENCES: { id: Audience; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'all',       label: 'Everyone',   icon: Globe,     desc: 'All active users'      },
  { id: 'customers', label: 'Customers',  icon: Users,     desc: 'Customer accounts only' },
  { id: 'providers', label: 'Providers',  icon: Briefcase, desc: 'Provider accounts only' },
];

const TYPES = ['system','booking','payment','verification','message'];

export default function NotificationsPage() {
  const [audience, setAudience] = useState<Audience>('all');
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [type,     setType]     = useState('system');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');

  const send = async () => {
    if (!title.trim() || !body.trim()) { setError('Title and message are required.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await supabase.auth.getUser();
      const adminId  = data.user?.id ?? '';
      await adminBroadcastNotification(adminId, { audience, title, body, type });
      setSuccess(`Notification sent to all ${audience === 'all' ? 'users' : audience}!`);
      setTitle(''); setBody('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <Bell size={22} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Send Notification</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Broadcast push notifications and in-app messages to users</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Audience */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Audience</label>
          <div className="grid grid-cols-3 gap-3">
            {AUDIENCES.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => setAudience(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm transition ${
                  audience === id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-100 hover:border-gray-200 text-gray-600'
                }`}>
                <Icon size={18} />
                <span className="font-semibold">{label}</span>
                <span className="text-xs opacity-60">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm capitalize focus:outline-none focus:ring-2 focus:ring-orange-300">
            {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
            placeholder="e.g. 🎉 Special offer this weekend!"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={300}
            placeholder="e.g. Book any service today and get 10% off your first booking."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/300</p>
        </div>

        {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle size={14} /> {success}
          </div>
        )}

        {/* Preview */}
        {(title || body) && (
          <div className="bg-gray-900 rounded-xl p-4 text-white">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Preview</p>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-[9px] font-bold">H</div>
                <span className="text-xs font-semibold text-gray-200">HomeFixer</span>
                <span className="text-xs text-gray-500 ml-auto">now</span>
              </div>
              <p className="text-sm font-semibold text-white leading-tight">{title || 'Title'}</p>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{body || 'Your message here'}</p>
            </div>
          </div>
        )}

        <button onClick={send} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Sending…' : `Send to ${audience === 'all' ? 'Everyone' : audience}`}
        </button>
      </div>
    </div>
  );
}
