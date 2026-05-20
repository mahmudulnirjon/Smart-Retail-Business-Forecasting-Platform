'use client';

import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

type Role = 'ADMIN' | 'MANAGER' | 'SALES';

type User = {
  id:         number;
  name:       string;
  email:      string;
  role:       Role;
  created_at: string;
};

type FormData = {
  name:     string;
  email:    string;
  password: string;
  role:     Role;
};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:   'bg-rose-500/15 text-rose-400 border-rose-500/30',
  MANAGER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  SALES:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const ROLE_AVATAR: Record<Role, string> = {
  ADMIN:   'from-rose-500 to-pink-600',
  MANAGER: 'from-blue-500 to-indigo-600',
  SALES:   'from-emerald-500 to-teal-600',
};

const EMPTY_FORM: FormData = { name: '', email: '', password: '', role: 'SALES' };

export default function UserManagementPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal state – only one open at a time
  const [showCreate, setShowCreate] = useState(false);
  const [editUser,   setEditUser]   = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form,     setForm]     = useState<FormData>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<Partial<FormData>>({});

  // Password visibility toggles
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Search + filter
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');

  // ── Lock body scroll when any modal is open ─────────────────────────────
  useEffect(() => {
    if (showCreate || editUser || deleteUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCreate, editUser, deleteUser]);

  // ── Scroll to top when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (showCreate || editUser || deleteUser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showCreate, editUser, deleteUser]);

  // ── Ensure only one modal at a time ────────────────────────────────────
  const openCreate = () => {
    setEditUser(null);
    setDeleteUser(null);
    setShowCreate(true);
    setShowCreatePassword(false);
  };
  const openEdit = (user: User) => {
    setShowCreate(false);
    setDeleteUser(null);
    setEditUser(user);
    setEditForm({});
    setShowEditPassword(false);
  };
  const openDelete = (user: User) => {
    setShowCreate(false);
    setEditUser(null);
    setDeleteUser(user);
  };
  const closeModals = () => {
    setShowCreate(false);
    setEditUser(null);
    setDeleteUser(null);
    setForm(EMPTY_FORM);
    setEditForm({});
    setShowCreatePassword(false);
    setShowEditPassword(false);
  };

  // ── Fetch users ─────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Toast ───────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Create user ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      showToast('All fields are required', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        showToast('User created successfully', 'success');
        closeModals();
        fetchUsers();
      } else {
        showToast(data.message || 'Failed to create user', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update user ─────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const res  = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editUser.id, ...editForm }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('User updated successfully', 'success');
        closeModals();
        fetchUsers();
      } else {
        showToast(data.message || 'Failed to update', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete user ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    setSubmitting(true);
    try {
      const res  = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('User deleted successfully', 'success');
        closeModals();
        fetchUsers();
      } else {
        showToast(data.message || 'Failed to delete', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered users ──────────────────────────────────────────────────────
  const filtered = users.filter(u =>
    (roleFilter === 'ALL' || u.role === roleFilter) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    ADMIN:   users.filter(u => u.role === 'ADMIN').length,
    MANAGER: users.filter(u => u.role === 'MANAGER').length,
    SALES:   users.filter(u => u.role === 'SALES').length,
  };

  const clearSearch = () => setSearch('');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all
          ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ── Create Modal (standardized) ────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header with close button */}
            <div className="sticky top-0 bg-[#1a1f2e] border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">➕ Create New User</h2>
              <button onClick={closeModals} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-slate-400 text-sm mb-5">Add a new account to the system</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Full Name</label>
                  <input
                    type="text" placeholder="e.g. Karim Hossain"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Email</label>
                  <input
                    type="email" placeholder="e.g. karim@smartretail.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Password</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showCreatePassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base 
                               focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 
                               transition appearance-none cursor-pointer hover:border-slate-500"
                  >
                    <option value="SALES">Sales Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={closeModals}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition font-semibold">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-60">
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (standardized) ──────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1f2e] border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">✏️ Edit User</h2>
              <button onClick={closeModals} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-slate-400 text-sm mb-5">Update details for <span className="text-white font-semibold">{editUser.name}</span></p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Full Name</label>
                  <input
                    type="text" placeholder={editUser.name}
                    value={editForm.name ?? ''}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Email</label>
                  <input
                    type="email" placeholder={editUser.email}
                    value={editForm.email ?? ''}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">New Password <span className="text-slate-600">(leave blank to keep current)</span></label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={editForm.password ?? ''}
                      onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showEditPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Role</label>
                  <select
                    value={editForm.role ?? editUser.role}
                    onChange={e => setEditForm(p => ({ ...p, role: e.target.value as Role }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base 
                               focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 
                               transition appearance-none cursor-pointer hover:border-slate-500"
                  >
                    <option value="SALES">Sales Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={closeModals}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition font-semibold">
                  Cancel
                </button>
                <button onClick={handleUpdate} disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal (standardized) ────────────────────────────── */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-auto">
            <div className="sticky top-0 bg-[#1a1f2e] border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Confirm Delete</h2>
              <button onClick={closeModals} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 text-center">
              <div className="text-5xl mb-4">🗑️</div>
              <h3 className="text-lg font-bold text-white mb-2">Delete User?</h3>
              <p className="text-slate-400 text-sm mb-2">
                You are about to delete <span className="text-white font-semibold">{deleteUser.name}</span>
              </p>
              <p className="text-xs text-yellow-400 mb-6">
                ⚠️ Their sales records will be reassigned to Admin
              </p>
              <div className="flex gap-3">
                <button onClick={closeModals}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition font-semibold">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-60">
                  {submitting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content (unchanged) ───────────────────────────────────────── */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">👥 User Management</h1>
            <p className="text-slate-400 mt-1 text-base">Manage all accounts in the system</p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold transition shadow-lg hover:shadow-blue-500/20 active:scale-95"
          >
            ➕ Create New User
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {([
            { label: 'Admins',   value: counts.ADMIN,   icon: '👑', color: 'from-rose-700 to-rose-900'     },
            { label: 'Managers', value: counts.MANAGER, icon: '🏢', color: 'from-blue-700 to-blue-900'     },
            { label: 'Sales',    value: counts.SALES,   icon: '💼', color: 'from-emerald-700 to-emerald-900' },
          ] as const).map((kpi, i) => (
            <div key={i} className={`rounded-2xl bg-gradient-to-br ${kpi.color} p-5 shadow-lg transition hover:shadow-xl`}>
              <div className="text-4xl mb-3">{kpi.icon}</div>
              <p className="text-white/70 text-base font-medium">{kpi.label}</p>
              <p className="text-white text-4xl font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text" placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition text-base"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'ADMIN', 'MANAGER', 'SALES'] as const).map(r => (
              <button key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-5 py-3 rounded-xl text-base font-semibold transition border
                  ${roleFilter === r
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
              >
                {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1623] overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              All Users <span className="text-slate-500 font-normal text-base ml-1">({filtered.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 rounded-xl bg-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-base font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-sm uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 text-left">User</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Role</th>
                    <th className="px-6 py-4 text-left">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${ROLE_AVATAR[user.role]} flex items-center justify-center text-base font-bold text-white flex-shrink-0`}>
                            {user.name[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-200 text-base">{user.name}</span>
                        </div>
                       </td>
                      <td className="px-6 py-4 text-slate-400 text-base">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${ROLE_BADGE[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(user.created_at).toLocaleDateString('en-BD', {
                          timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm font-semibold transition group-hover:shadow-md"
                            title="Edit user"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => openDelete(user)}
                            className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition group-hover:shadow-md"
                            title="Delete user"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}