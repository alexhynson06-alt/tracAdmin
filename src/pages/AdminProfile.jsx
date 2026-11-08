import React, { useEffect, useState } from 'react';
import { FaCamera, FaCheckCircle, FaSave, FaSpinner, FaTrash, FaUser } from 'react-icons/fa';
import { adminProfileAPI } from '../services/api';

const getInitials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD';

export default function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '' });
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const canEdit = profile && ['admin', 'staff'].includes(profile.role);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const syncCache = (admin) => {
    const current = JSON.parse(localStorage.getItem('currentUser') || '{}');
    localStorage.setItem('currentUser', JSON.stringify({ ...current, ...admin, name: admin.full_name }));
    window.dispatchEvent(new Event('auth-changed'));
  };

  const loadProfile = async () => {
    try {
      const admin = await adminProfileAPI.get();
      setProfile(admin);
      setForm({ full_name: admin.full_name || '', email: admin.email || '' });
      setPreview(admin.avatar_url || '');
      syncCache(admin);
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await adminProfileAPI.update({ full_name: form.full_name });
      setProfile(data.admin);
      syncCache(data.admin);
      showMessage('success', 'Profile updated successfully');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showMessage('error', 'Please choose a JPG, PNG, or WebP image');
    if (file.size > 5 * 1024 * 1024) return showMessage('error', 'Profile photos must be 5 MB or smaller');

    setPreview(URL.createObjectURL(file));
    setAvatarLoading(true);
    try {
      const data = await adminProfileAPI.uploadAvatar(file);
      const nextProfile = { ...profile, avatar_url: data.avatar_url };
      setProfile(nextProfile);
      setPreview(data.avatar_url);
      syncCache(nextProfile);
      showMessage('success', 'Profile photo updated successfully');
    } catch (error) {
      setPreview(profile?.avatar_url || '');
      showMessage('error', error.response?.data?.message || 'Failed to update profile photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setAvatarLoading(true);
    try {
      await adminProfileAPI.deleteAvatar();
      const nextProfile = { ...profile, avatar_url: '' };
      setProfile(nextProfile);
      setPreview('');
      syncCache(nextProfile);
      showMessage('success', 'Profile photo removed');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to remove profile photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  if (loading) return <div className="rounded-2xl bg-white p-8 text-gray-500">Loading profile...</div>;

  return (
    <div className="space-y-6">
      {message.text && <div className={`rounded-xl px-4 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F9A825]">Account</p>
        <h1 className="mt-1 text-3xl font-bold text-[#1B5E20]">My Profile</h1>
        <p className="mt-2 text-gray-600">Manage your staff identity and profile photo.</p>
      </div>

      <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B5E20] to-[#F9A825] text-3xl font-bold text-white">
              {preview ? <img src={preview} alt={`${profile?.full_name} profile`} className="h-full w-full object-cover" /> : getInitials(profile?.full_name)}
            </div>
            {canEdit && <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-[#1B5E20] text-white" title="Update profile photo">
              {avatarLoading ? <FaSpinner className="animate-spin" /> : <FaCamera />}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatar} disabled={avatarLoading} />
            </label>}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900">{profile?.full_name}</h2>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#33691E]">{profile?.role}</p>
          </div>
          {canEdit && preview && <button type="button" onClick={handleDeleteAvatar} disabled={avatarLoading} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><FaTrash /> Remove photo</button>}
        </div>
      </section>

      <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><FaUser className="text-[#1B5E20]" /> Personal information</h2>
        <form onSubmit={handleSave} className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Full name<input disabled={!canEdit} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#1B5E20] disabled:bg-gray-50" required /></label>
          <label className="text-sm font-medium text-gray-700">Email<input disabled type="email" value={form.email} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none" /></label>
          {canEdit && <div className="md:col-span-2"><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#1B5E20] px-5 py-3 font-semibold text-white hover:bg-[#2E7D32] disabled:opacity-60">{saving ? <FaSpinner className="animate-spin" /> : <FaSave />}{saving ? 'Saving...' : 'Save changes'}</button></div>}
        </form>
      </section>
      <div className="flex items-center gap-2 text-xs text-gray-500"><FaCheckCircle className="text-green-600" /> Role and account status are managed by a super administrator.</div>
    </div>
  );
}