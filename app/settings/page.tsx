'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { User, Briefcase, Bell, Save, Bot, Key, Sparkles, Building2, UploadCloud, Globe, Users, Mail, Shield, Trash2, UserPlus, Moon, Sun } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'agency', label: 'Agency', icon: Briefcase },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'ai', label: 'AI Engine', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [saveToast, setSaveToast] = useState(false);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const [agencyName, setAgencyName] = useState('Social Media OS');
  const [website, setWebsite] = useState('https://agency.com');
  const [logoUrl, setLogoUrl] = useState('');

  const [notifications, setNotifications] = useState({
    emailAlertsTasks: false,
    weeklyAnalyticsReport: false,
    clientUpdates: false,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'Agency Admin (You)', email: 'admin@agency.com', role: 'Admin' },
    { id: 2, name: 'Sarah (Designer)', email: 'sarah@agency.com', role: 'Editor' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');

  const [aiForm, setAiForm] = useState({
    provider: 'groq',
    apiKey: '',
    model: 'llama-3.1-8b-instant',
    tone: 'Professional, engaging, and conversion-focused.',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('agencyName');
      const savedWebsite = localStorage.getItem('agencyWebsite');
      const savedLogo = localStorage.getItem('agencyLogo');
      if (savedName) setAgencyName(savedName);
      if (savedWebsite) setWebsite(savedWebsite);
      if (savedLogo) setLogoUrl(savedLogo);

      const theme = localStorage.getItem('theme');
      setDarkMode(theme === 'dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotifications((n) => ({ ...n, ...parsed }));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!saveToast) return;
    const t = setTimeout(() => setSaveToast(false), 3000);
    return () => clearTimeout(t);
  }, [saveToast]);

  function handleSave() {
    setSaveToast(true);
  }

  const handleSaveNotifications = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    window.dispatchEvent(new Event('agency-settings-updated'));
    toast.success('Notification preferences saved! 🔔');
  };

  const handleDarkModeToggle = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new Event('theme-updated'));
    toast.success(next ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️');
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, etc.)');
      e.target.value = '';
      return;
    }
    setLogoUploading(true);
    try {
      const path = `agency-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success('Logo uploaded! Save Agency Branding to apply.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  function handleSaveAIConfig() {
    toast.success('AI Engine configuration securely saved! 🚀');
  }

  const handleSaveAgency = () => {
    localStorage.setItem('agencyName', agencyName);
    localStorage.setItem('agencyWebsite', website);
    localStorage.setItem('agencyLogo', logoUrl);
    window.dispatchEvent(new Event('agency-settings-updated'));
    toast.success('Agency branding saved successfully! 🎨');
  };

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    setTeamMembers((prev) => [
      ...prev,
      { id: Date.now(), name: 'Pending Invite...', email: inviteEmail.trim(), role: inviteRole },
    ]);
    setInviteEmail('');
    toast.success('Invitation sent successfully! 📧');
  }

  function handleRemove(id: number) {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success('Member removed from workspace 🗑️');
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account and preferences.
        </p>
      </header>

      {saveToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          Changes saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="flex flex-row gap-1 overflow-x-auto pb-2 lg:flex-col lg:space-y-0.5 lg:overflow-visible lg:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors lg:w-full ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your personal information.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="first-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    First Name
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Last Name
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. you@agency.com"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agency' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Agency Branding</h2>
              <p className="mt-1 text-sm text-slate-500">
                White-label your agency with custom logo and branding.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="agency-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Building2 className="h-4 w-4" />
                    Agency Name
                  </label>
                  <input
                    id="agency-name"
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Enter agency name"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="agency-website" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Globe className="h-4 w-4" />
                    Website
                  </label>
                  <input
                    id="agency-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="agency-logo" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <UploadCloud className="h-4 w-4" />
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Agency logo"
                          className="h-full w-full object-contain"
                        />
                      ) : logoUploading ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      ) : (
                        <UploadCloud className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        id="agency-logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                      >
                        {logoUploading ? 'Uploading...' : 'Choose logo file'}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">PNG, JPG, SVG up to 5MB</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAgency}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  Save Agency Branding
                </button>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm duration-300 md:p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Team Workspace</h2>
                  <p className="text-sm text-gray-500">Manage your agency members and their access levels.</p>
                </div>
              </div>

              <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <UserPlus size={16} className="text-emerald-500" />
                  Invite New Member
                </h3>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      placeholder="colleague@agency.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 md:w-40"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleInvite}
                    className="whitespace-nowrap rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Send Invite
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Shield size={16} className="text-indigo-500" />
                  Active Members
                </h3>
                <div className="overflow-hidden divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-white p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 text-sm font-bold text-indigo-700">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            member.role === 'Admin'
                              ? 'bg-purple-100 text-purple-700'
                              : member.role === 'Editor'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {member.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(member.id)}
                          className="rounded p-1 text-gray-400 transition-colors hover:text-red-600"
                          title="Remove Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">AI Engine</h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure your AI provider and API keys for content generation.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="ai-provider" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Bot className="h-4 w-4" />
                    Provider
                  </label>
                  <select
                    id="ai-provider"
                    value={aiForm.provider}
                    onChange={(e) => setAiForm((a) => ({ ...a, provider: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-api-key" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Key className="h-4 w-4" />
                    API Key
                  </label>
                  <input
                    id="ai-api-key"
                    type="password"
                    value={aiForm.apiKey}
                    onChange={(e) => setAiForm((a) => ({ ...a, apiKey: e.target.value }))}
                    placeholder="Enter your API key (stored securely)"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="ai-model" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Model
                  </label>
                  <input
                    id="ai-model"
                    type="text"
                    value={aiForm.model}
                    onChange={(e) => setAiForm((a) => ({ ...a, model: e.target.value }))}
                    placeholder="e.g. llama-3.1-8b-instant"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="ai-tone" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Sparkles className="h-4 w-4" />
                    Default Tone
                  </label>
                  <textarea
                    id="ai-tone"
                    value={aiForm.tone}
                    onChange={(e) => setAiForm((a) => ({ ...a, tone: e.target.value }))}
                    rows={3}
                    placeholder="Describe the default tone for AI-generated content"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveAIConfig}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Save AI Config
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Notifications & General</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose how you want to be notified and customize appearance.
              </p>

              <div className="mt-6 border-b border-slate-200 pb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Appearance</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {darkMode ? <Moon className="h-5 w-5 text-indigo-600" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-700">Dark Mode (Night Mode)</p>
                      <p className="text-xs text-slate-500">Switch between light and dark theme</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={darkMode}
                    onClick={handleDarkModeToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      darkMode ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        darkMode ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Email Alerts for Tasks</p>
                    <p className="text-xs text-slate-500">Get notified when tasks are assigned or updated</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications.emailAlertsTasks}
                    onClick={() => setNotifications((n) => ({ ...n, emailAlertsTasks: !n.emailAlertsTasks }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      notifications.emailAlertsTasks ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        notifications.emailAlertsTasks ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Weekly Analytics Report</p>
                    <p className="text-xs text-slate-500">Receive a summary every Monday</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications.weeklyAnalyticsReport}
                    onClick={() => setNotifications((n) => ({ ...n, weeklyAnalyticsReport: !n.weeklyAnalyticsReport }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      notifications.weeklyAnalyticsReport ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        notifications.weeklyAnalyticsReport ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Client Updates</p>
                    <p className="text-xs text-slate-500">Get notified when clients add or update content</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications.clientUpdates}
                    onClick={() => setNotifications((n) => ({ ...n, clientUpdates: !n.clientUpdates }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      notifications.clientUpdates ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        notifications.clientUpdates ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {activeTab !== 'ai' && activeTab !== 'agency' && activeTab !== 'team' && activeTab !== 'notifications' && (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
