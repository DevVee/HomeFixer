'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminUpdateSetting } from '@/lib/actions';
import { Settings, Save, Loader2, CheckCircle } from 'lucide-react';

type Setting = { key: string; value: string; description: string };

const SETTING_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Financial',      keys: ['commission_rate','min_wallet_balance','max_topup_amount','min_topup_amount'] },
  { label: 'Booking Rules',  keys: ['max_booking_advance_days'] },
  { label: 'App Control',    keys: ['maintenance_mode','app_version_android','app_version_ios'] },
  { label: 'Contact',        keys: ['support_email'] },
];

export default function SettingsPage() {
  const [settings, setSettings]   = useState<Record<string, Setting>>({});
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState<string | null>(null);
  const [saved,    setSaved]      = useState<string | null>(null);
  const [adminId,  setAdminId]    = useState('');
  const [edits,    setEdits]      = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? ''));
    supabase.from('app_settings').select('*').then(({ data }) => {
      const map: Record<string, Setting> = {};
      (data ?? []).forEach((s: any) => { map[s.key] = s; });
      setSettings(map);
      const editMap: Record<string, string> = {};
      (data ?? []).forEach((s: any) => { editMap[s.key] = s.value; });
      setEdits(editMap);
      setLoading(false);
    });
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    try {
      await adminUpdateSetting(adminId, key, edits[key] ?? '');
      setSettings((prev) => ({ ...prev, [key]: { ...prev[key], value: edits[key] } }));
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {}
    setSaving(null);
  };

  if (loading) return <div className="p-8 text-gray-400">Loading settings…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <Settings size={22} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Configure platform-wide settings. Changes take effect immediately.</p>

      <div className="space-y-6">
        {SETTING_GROUPS.map(({ label, keys }) => {
          const groupSettings = keys.filter((k) => settings[k]);
          if (!groupSettings.length) return null;
          return (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {groupSettings.map((key) => {
                  const s = settings[key];
                  const isBool = s.value === 'true' || s.value === 'false';
                  const isDirty = edits[key] !== s.value;
                  return (
                    <div key={key} className="px-5 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 font-mono">{key}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isBool ? (
                          <button
                            onClick={() => {
                              const newVal = edits[key] === 'true' ? 'false' : 'true';
                              setEdits((p) => ({ ...p, [key]: newVal }));
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              edits[key] === 'true' ? 'bg-orange-500' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              edits[key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        ) : (
                          <input
                            value={edits[key] ?? ''}
                            onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                            className="w-40 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          />
                        )}
                        {saved === key ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <button
                            onClick={() => save(key)}
                            disabled={saving === key || (!isDirty && !isBool)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40"
                          >
                            {saving === key ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
