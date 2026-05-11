'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart2, Download, Loader2, FileText } from 'lucide-react';

type ReportType = 'bookings' | 'users' | 'providers' | 'transactions';

const REPORTS: { id: ReportType; label: string; desc: string }[] = [
  { id: 'bookings',     label: 'Bookings Report',      desc: 'All bookings with status, pricing, and payment info'   },
  { id: 'users',        label: 'Users Report',          desc: 'All registered customers and providers'                 },
  { id: 'providers',    label: 'Providers Report',      desc: 'Provider profiles, ratings, and verification status'   },
  { id: 'transactions', label: 'Transactions Report',   desc: 'Wallet transactions, top-ups, commissions, earnings'   },
];

function toCSV(data: Record<string, any>[]): string {
  if (!data.length) return '';
  const keys = Object.keys(data[0]);
  const rows = data.map((row) =>
    keys.map((k) => {
      const v = row[k];
      const str = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(','),
  );
  return [keys.join(','), ...rows].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [selected,  setSelected]  = useState<ReportType>('bookings');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [preview,   setPreview]   = useState<Record<string, any>[] | null>(null);
  const [error,     setError]     = useState('');

  const generate = async (download = false) => {
    setLoading(true); setError(''); if (!download) setPreview(null);
    try {
      let query: any;
      if (selected === 'bookings') {
        query = supabase.from('bookings').select(
          'id,status,scheduled_date,scheduled_time,address,payment_method,payment_status,quoted_price,final_price,commission_amount,created_at'
        );
      } else if (selected === 'users') {
        query = supabase.from('profiles').select('id,email,full_name,phone,role,is_active,is_verified,created_at');
      } else if (selected === 'providers') {
        query = supabase.from('provider_profiles').select(
          'id,service_category,hourly_rate,average_rating,total_jobs_completed,verification_status,is_verified,created_at'
        );
      } else {
        query = supabase.from('wallet_transactions').select(
          'id,type,amount,balance_after,description,created_at'
        );
      }

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate)   query = query.lte('created_at', endDate + 'T23:59:59');
      query = query.order('created_at', { ascending: false }).limit(5000);

      const { data, error: err } = await query;
      if (err) throw err;

      const rows = data ?? [];
      if (download) {
        const csv = toCSV(rows);
        const dateStr = new Date().toISOString().slice(0,10);
        downloadCSV(csv, `homefixer-${selected}-${dateStr}.csv`);
      } else {
        setPreview(rows);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-1">
        <BarChart2 size={22} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Reports & Export</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Generate and download CSV reports</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Report Type</h2>
            <div className="space-y-2">
              {REPORTS.map((r) => (
                <button key={r.id} onClick={() => { setSelected(r.id); setPreview(null); }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                    selected === r.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <FileText size={14} className={`mt-0.5 shrink-0 ${selected===r.id?'text-orange-500':'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${selected===r.id?'text-orange-700':'text-gray-900'}`}>{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Date Range (Optional)</h2>
            <div className="space-y-3">
              {[{label:'From',val:startDate,set:setStartDate},{label:'To',val:endDate,set:setEndDate}].map(({label,val,set})=>(
                <div key={label}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input type="date" value={val} onChange={(e)=>set(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"/>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="space-y-2">
            <button onClick={() => generate(false)} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
              Preview
            </button>
            <button onClick={() => generate(true)} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download CSV
            </button>
          </div>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2">
          {preview === null ? (
            <div className="h-full min-h-48 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center">
              <div className="text-center text-gray-400">
                <BarChart2 size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Click Preview to see data</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Preview — {preview.length} rows</p>
              </div>
              <div className="overflow-auto max-h-[520px]">
                {preview.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">No data for the selected range.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        {Object.keys(preview[0]).map((k) => (
                          <th key={k} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 whitespace-nowrap">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {preview.slice(0, 50).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[140px] truncate">
                              {v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {preview.length > 50 && (
                  <p className="text-center py-3 text-xs text-gray-400">Showing 50 of {preview.length} rows. Download CSV for full data.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
