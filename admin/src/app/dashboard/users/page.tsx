'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { adminCreateUser, adminUpdateUser, adminDeleteUser, adminSuspendUser } from '@/lib/actions';
import {
  UserPlus, Search, MoreVertical, Pencil, Trash2, Ban, CheckCircle2, X, Loader2,
} from 'lucide-react';

type User = {
  id: string; email: string; full_name: string; phone: string;
  role: string; is_active: boolean; created_at: string;
};

type ModalMode = 'add' | 'edit' | 'delete' | 'suspend' | null;

const ROLE_PILL: Record<string, string> = {
  admin:    'bg-orange-50 text-orange-700 border-orange-200',
  provider: 'bg-purple-50 text-purple-700 border-purple-200',
  customer: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function UsersPage() {
  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');
  const [modal,       setModal]       = useState<ModalMode>(null);
  const [selected,    setSelected]    = useState<User | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [openMenu,    setOpenMenu]    = useState<string | null>(null);
  const [adminId,     setAdminId]     = useState('');

  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', role: 'customer',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles')
      .select('id, email, full_name, phone, role, is_active, created_at')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? ''));
  }, [load]);

  const filtered = users.filter((u) => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const openEdit = (u: User) => {
    setSelected(u);
    setForm({ email: u.email, password: '', fullName: u.full_name, phone: u.phone ?? '', role: u.role });
    setModal('edit');
    setOpenMenu(null);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'add') {
        if (!form.email || !form.password || !form.fullName) throw new Error('Email, password and name are required.');
        await adminCreateUser(adminId, form);
      } else if (modal === 'edit' && selected) {
        await adminUpdateUser(adminId, selected.id, { fullName: form.fullName, phone: form.phone, role: form.role });
      }
      setModal(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try { await adminDeleteUser(adminId, selected.id); setModal(null); load(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleSuspend = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await adminSuspendUser(adminId, selected.id, selected.is_active);
      setModal(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const counts = {
    all: users.length,
    customer: users.filter((u) => u.role === 'customer').length,
    provider:  users.filter((u) => u.role === 'provider').length,
    admin:     users.filter((u) => u.role === 'admin').length,
  };

  return (
    <div className="p-8" onClick={() => setOpenMenu(null)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{users.length} total accounts</p>
        </div>
        <button
          onClick={() => { setModal('add'); setForm({ email:'',password:'',fullName:'',phone:'',role:'customer' }); setError(''); }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div className="flex gap-1">
          {(['all','customer','provider','admin'] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition border ${
                roleFilter === r ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}>
              {r} {r !== 'all' && <span className="ml-1 opacity-70">({counts[r]})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Name','Email','Phone','Role','Joined','Status','Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found.</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${ROLE_PILL[u.role] ?? ''}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {u.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                      className="p-1 rounded hover:bg-gray-100 transition"
                    >
                      <MoreVertical size={15} className="text-gray-400" />
                    </button>
                    {openMenu === u.id && (
                      <div className="absolute right-0 top-7 z-50 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-40">
                        <button onClick={() => openEdit(u)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Pencil size={13}/> Edit
                        </button>
                        <button onClick={() => { setSelected(u); setModal('suspend'); setOpenMenu(null); setError(''); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          {u.is_active ? <><Ban size={13}/> Suspend</> : <><CheckCircle2 size={13}/> Unsuspend</>}
                        </button>
                        <button onClick={() => { setSelected(u); setModal('delete'); setOpenMenu(null); setError(''); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 size={13}/> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal === 'add' ? 'Add New User' : 'Edit User'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              {[
                { key:'fullName', label:'Full Name',   type:'text',     show: true },
                { key:'email',    label:'Email',        type:'email',    show: true,   disabled: modal==='edit' },
                { key:'password', label:'Password',     type:'password', show: modal==='add' },
                { key:'phone',    label:'Phone',        type:'tel',      show: true },
              ].filter(f => f.show).map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type={f.type} disabled={f.disabled}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="customer">Customer</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60 transition">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {modal === 'add' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'delete' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Delete User</h2>
            <p className="text-sm text-gray-600 mb-1">This will permanently delete <strong>{selected.full_name || selected.email}</strong> and all their data. This cannot be undone.</p>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 my-3">{error}</p>}
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Cancel</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60 transition">
                {saving && <Loader2 size={13} className="animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'suspend' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-2">{selected.is_active ? 'Suspend User' : 'Unsuspend User'}</h2>
            <p className="text-sm text-gray-600">
              {selected.is_active
                ? `Suspending ${selected.full_name || selected.email} will prevent them from using the app.`
                : `Restoring ${selected.full_name || selected.email} will allow them to use the app again.`}
            </p>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mt-3">{error}</p>}
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Cancel</button>
              <button onClick={handleSuspend} disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 transition ${selected.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {selected.is_active ? 'Suspend' : 'Unsuspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
