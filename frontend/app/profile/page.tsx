'use client';

import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { UserProfile } from '../../types';
import { useRouter } from 'next/navigation';
import { Save, Download, Trash2, ShieldCheck, Lock, Cpu, Eye, CheckCircle2 } from 'lucide-react';
import { profileService } from '../../services/profile.service';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const GOALS: NonNullable<UserProfile['financialGoal']>[] = [
  'Save Money',
  'Buy a House',
  'Buy a Car',
  'Education',
  'Emergency Fund',
  'Investment',
  'Travel',
  'Other',
];

const emptyForm = {
  name: '',
  occupation: '',
  age: '',
  monthlyIncome: '',
  familySize: '1',
  financialGoal: 'Save Money' as NonNullable<UserProfile['financialGoal']>,
  riskPreference: 'Medium' as NonNullable<UserProfile['riskPreference']>,
};

export default function ProfilePage() {
  const router = useRouter();
  const { refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'ai'>('profile');
  const [formData, setFormData] = useState(emptyForm);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  const [aiDataSharing, setAiDataSharing] = useState(true);
  const [aiMockMode, setAiMockMode] = useState(false);

  const loadProfile = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await profileService.get();
      const profile = res.profile;
      setEmail(profile.email || '');
      setFormData({
        name: profile.name || '',
        occupation: profile.occupation || '',
        age: profile.age != null ? String(profile.age) : '',
        monthlyIncome: profile.monthlyIncome != null ? String(profile.monthlyIncome) : '',
        familySize: String(profile.familySize || 1),
        financialGoal: profile.financialGoal || 'Save Money',
        riskPreference: profile.riskPreference || 'Medium',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.age) {
      setFormError('Name and age are required.');
      return;
    }
    setFormError('');
    setSaving(true);
    setSaved(false);
    try {
      await profileService.update({
        name: formData.name.trim(),
        occupation: formData.occupation.trim(),
        age: parseInt(formData.age, 10),
        monthlyIncome: parseFloat(formData.monthlyIncome || '0'),
        familySize: parseInt(formData.familySize, 10) || 1,
        financialGoal: formData.financialGoal,
        riskPreference: formData.riskPreference,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await profileService.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartfin-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm deletion.');
      return;
    }
    if (!window.confirm('Permanently delete your account and all financial data? This cannot be undone.')) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await profileService.deleteAccount(deletePassword);
      logout();
      router.replace('/login');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Unable to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Account Settings</span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Profile &amp; Privacy Control</h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Manage your financial profile, AI privacy options, security, and data export.
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'profile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'security' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Privacy &amp; Security
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'ai' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                AI Settings
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={loadProfile} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
        ) : (
          <>
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5 text-sm">
                {formError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-xs">{formError}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Full name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Occupation</label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Age</label>
                    <input
                      type="number"
                      required
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Monthly Income Baseline (Rs.)</label>
                    <input
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Family Size</label>
                    <input
                      type="number"
                      value={formData.familySize}
                      onChange={(e) => setFormData({ ...formData, familySize: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Primary Goal</label>
                    <select
                      value={formData.financialGoal}
                      onChange={(e) => setFormData({ ...formData, financialGoal: e.target.value as any })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {GOALS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold text-xs">Risk Preference</label>
                    <select
                      value={formData.riskPreference}
                      onChange={(e) => setFormData({ ...formData, riskPreference: e.target.value as any })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  {saved ? (
                    <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Financial profile saved.
                    </span>
                  ) : <span />}

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Account Security &amp; Encryption</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your financial data is strictly isolated to your authenticated account context using JWT authentication and bcrypt password hashing. API secrets and sensitive credentials are never stored client-side.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 space-y-1 font-mono">
                    <p>• Status: Secure session active</p>
                    <p>• Authentication: Bearer JWT Token</p>
                    <p>• Server validation: Enforced on all API endpoints</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Export Complete Financial Data</h3>
                    <p className="text-xs text-slate-500 mt-1">Download your full history of income, expenses, budgets, goals, and net worth as structured JSON.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={exporting}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>{exporting ? 'Exporting...' : 'Export JSON Data'}</span>
                  </button>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-rose-700 font-bold">
                    <Trash2 className="w-5 h-5" />
                    <span>Permanent Data Deletion</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Permanently delete your account and remove all stored income, expenses, budgets, and savings goals from our database.
                  </p>
                  <form onSubmit={handleDeleteAccount} className="space-y-3 text-xs max-w-md">
                    {deleteError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{deleteError}</div>
                    )}
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Confirm password to delete account"
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={deleting}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                      {deleting ? 'Deleting...' : 'Delete Account Permanently'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Cpu className="w-5 h-5 text-emerald-600" />
                  <span>AI Copilot &amp; Privacy Preferences</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">Secure Financial Context Layer</p>
                      <p className="text-slate-500 mt-0.5">Only send minimal structured summary metrics to AI providers without raw database dumps.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiDataSharing}
                      onChange={(e) => setAiDataSharing(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">Deterministic Offline Engine Fallback</p>
                      <p className="text-slate-500 mt-0.5">Use local rule-based calculations when AI provider keys are not configured or offline.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiMockMode}
                      onChange={(e) => setAiMockMode(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
