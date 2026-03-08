'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Camera, Check, Loader2, User as UserIcon } from 'lucide-react';

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  profile_pic_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const parsed: UserProfile = JSON.parse(stored);
    setProfile(parsed);
    setFullName(parsed.full_name);
  }, []);

  const initials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U';

  // Convert uploaded image to base64 URL and save to backend as profile_pic_url
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const token = localStorage.getItem('token');
        const resp = await api.patch<UserProfile>('/users/me', { profile_pic_url: dataUrl }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(resp.data);
        localStorage.setItem('user', JSON.stringify(resp.data));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to upload image');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Name cannot be empty'); return; }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const resp = await api.patch<UserProfile>('/users/me', { full_name: fullName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(resp.data);
      localStorage.setItem('user', JSON.stringify(resp.data));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Profile</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Update your name and profile picture.</p>
      </div>

      {/* Avatar Section */}
      <div className="p-6 rounded-2xl surface-panel shadow-sm flex items-center gap-6">
        <div className="relative group">
          {profile.profile_pic_url ? (
            <img
              src={profile.profile_pic_url}
              alt={profile.full_name}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-[var(--border)]"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[var(--surface-2)] border-2 border-dashed border-[var(--border)] flex items-center justify-center text-2xl font-bold text-[var(--muted)]">
              {initials(profile.full_name)}
            </div>
          )}
          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{profile.full_name}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">{profile.email}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {profile.profile_pic_url ? 'Change photo' : 'Upload photo'}
          </button>
          <p className="text-xs text-[var(--muted)] mt-0.5">JPG or PNG, max 10MB</p>
        </div>
      </div>

      {/* Edit Fields */}
      <div className="p-6 rounded-2xl surface-panel shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Account details</h2>

        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Email Address</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--muted)] cursor-not-allowed"
          />
          <p className="text-xs text-[var(--muted)] mt-1.5">Email address cannot be changed here.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Role</label>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
            <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-medium text-indigo-700 capitalize">{profile.role}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || fullName === profile.full_name}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
