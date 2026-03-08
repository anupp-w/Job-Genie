'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { 
  Users, 
  Search, 
  MoreVertical, 
  Trash2, 
  Shield, 
  User as UserIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  profile_pic_url: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      // Using /users without trailing slash and ensuring baseURL is applied correctly
      const response = await api.get('/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Admin users fetch response:', response.data);
      
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else if (response.data && typeof response.data === 'object' && Array.isArray((response.data as any).users)) {
        // Fallback for nested users array if backend structure changes
        setUsers((response.data as any).users);
      } else {
        console.warn('Unexpected data format from /users:', response.data);
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 403) {
        router.push('/dashboard');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user: User) => {
    setActionLoading(user.id);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/users/${user.id}`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      setError('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setActionLoading(id);
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-[var(--muted)]">Loading system users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Admin Portal</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage system access, roles, and user accounts.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-semibold tracking-wider uppercase">
          <Shield className="w-3.5 h-3.5" />
          Restricted Access
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl surface-panel shadow-sm border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Total Users</p>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)] mt-2">{users.length}</p>
        </div>
        <div className="p-6 rounded-2xl surface-panel shadow-sm border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Admins</p>
            <Shield className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)] mt-2">{users.filter(u => u.role === 'admin').length}</p>
        </div>
      </div>

      {/* User Management Table */}
      <div className="rounded-2xl surface-panel shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-96 bg-white border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--surface-2)]/30 text-[var(--muted)] text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Status / Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--surface-2)]/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.profile_pic_url ? (
                        <img src={user.profile_pic_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover border border-[var(--border)]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100">
                          {user.full_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{user.full_name}</p>
                        <p className="text-xs text-[var(--muted)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' 
                        ? 'bg-red-50 text-red-600 border border-red-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={actionLoading === user.id}
                        className="p-2 text-[var(--muted)] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all title='Toggle Admin Role'"
                      >
                        {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="p-2 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all title='Delete User'"
                      >
                        {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[var(--muted)] text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
