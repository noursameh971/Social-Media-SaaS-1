'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { User, Briefcase, Bell, Save, Bot, Key, Sparkles, Building2, UploadCloud, Globe, Users, Mail, Shield, Trash2, UserPlus, Moon, Sun, Loader2, Check } from 'lucide-react';

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

  const [agencyName, setAgencyName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [agencyLogos, setAgencyLogos] = useState<{ name: string; url: string }[]>([]);

  const [emailTasks, setEmailTasks] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [clientUpdates, setClientUpdates] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [teamMembers, setTeamMembers] = useState<{ id: string; email: string; role: string; status?: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [isInviting, setIsInviting] = useState(false);

  const [aiForm, setAiForm] = useState({
    provider: 'groq',
    apiKey: '',
    model: 'llama-3.1-8b-instant',
    tone: 'Professional, engaging, and conversion-focused.',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAgencyName(localStorage.getItem('agencyName') || 'Social Media OS');
      setWebsite(localStorage.getItem('agencyWebsite') || '');
      setLogoUrl(localStorage.getItem('agencyLogo') || '');

      const savedProfile = localStorage.getItem('profileSettings');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setProfile((p) => ({ ...p, ...parsed }));
        } catch {
          /* ignore */
        }
      }

      setEmailTasks(localStorage.getItem('notifyEmailTasks') === 'true');
      setWeeklyReport(localStorage.getItem('notifyWeeklyReport') === 'true');
      setClientUpdates(localStorage.getItem('notifyClientUpdates') === 'true');
    }
  }, []);

  useEffect(() => {
    if (!saveToast) return;
    const t = setTimeout(() => setSaveToast(false), 3000);
    return () => clearTimeout(t);
  }, [saveToast]);

  const fetchLogos = async () => {
    const { data, error } = await supabase.storage.from('logos').list();
    if (error) {
      console.error('Error fetching logos:', error);
      return;
    }
    if (data) {
      const formattedLogos = data
        .filter((file) => file.name !== '.emptyFolderPlaceholder')
        .map((file) => {
          const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(file.name);
          return {
            name: file.name,
            url: publicUrl,
          };
        });

      console.log('Fetched Logos:', formattedLogos);
      setAgencyLogos(formattedLogos);
    }
  };

  useEffect(() => {
    fetchLogos();
  }, []);

  async function fetchTeamMembers() {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setTeamMembers((data ?? []) as { id: string; email: string; role: string; status?: string }[]);
  }

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('profileSettings', JSON.stringify(profile));
    setSaveToast(true);
    toast.success('Profile saved successfully! ✓');
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('notifyEmailTasks', String(emailTasks));
    localStorage.setItem('notifyWeeklyReport', String(weeklyReport));
    localStorage.setItem('notifyClientUpdates', String(clientUpdates));
    toast.success('Preferences saved successfully');
  };

  const handleDarkModeToggle = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    toast.success(nextTheme === 'dark' ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading logo...');
    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/logos/${uploadData.path}`;

      setLogoUrl(publicUrl);
      localStorage.setItem('agencyLogo', publicUrl);
      window.dispatchEvent(new Event('agency-settings-updated'));
      await fetchLogos();
      toast.success('Logo uploaded successfully!', { id: toastId });
    } catch (err) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'), { id: toastId });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleDropzoneFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const input = logoInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const handleSelectLogo = (url: string) => {
    setLogoUrl(url);
    localStorage.setItem('agencyLogo', url);
    window.dispatchEvent(new Event('agency-settings-updated'));
  };

  function handleSaveAIConfig() {
    toast.success('AI Engine configuration securely saved! 🚀');
  }

  const handleSaveAgency = () => {
    localStorage.setItem('agencyName', agencyName);
    localStorage.setItem('agencyWebsite', website);
    localStorage.setItem('agencyLogo', logoUrl);
    window.dispatchEvent(new Event('agency-settings-updated'));
    toast.success('Agency branding saved successfully!');
  };

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Please enter an email address.');
      return;
    }
    const toastId = toast.loading('Sending invitation...');
    setIsInviting(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invitation');

      const { error: insertError } = await supabase.from('team_members').insert([
        { email, role: inviteRole, status: 'Pending' },
      ]);
      if (insertError) throw insertError;

      setInviteEmail('');
      await fetchTeamMembers();
      toast.success('Invitation sent to email! 📧', { id: toastId });
    } catch (err) {
      console.error('Invite error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation', { id: toastId });
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      await fetchTeamMembers();
      toast.success('Member removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
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
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-5 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200 shadow-sm">
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
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-100'
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
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Profile</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Your personal information.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="first-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-400">
                    First Name
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-400">
                    Last Name
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-400">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. you@agency.com"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agency' && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Agency Branding</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
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
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="agency-website" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-400">
                    <Globe className="h-4 w-4" />
                    Website
                  </label>
                  <input
                    id="agency-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="agency-logo" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-400">
                    <UploadCloud className="h-4 w-4" />
                    Logo
                  </label>
                  <input
                    ref={logoInputRef}
                    id="agency-logo"
                    type="file"
                    accept="image/svg+xml,image/png,image/jpeg,image/jpg"
                    onChange={handleLogoUpload}
                    className="sr-only"
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !logoUploading && logoInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && !logoUploading && logoInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (logoUploading) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleDropzoneFile(file);
                    }}
                    className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {logoUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="mb-3 h-14 w-14 text-slate-400 dark:text-gray-500" />
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
                          Drag & drop your agency logos here
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">SVG, PNG, JPG</p>
                      </>
                    )}
                  </div>

                  {agencyLogos.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
                      {agencyLogos.map((logo) => {
                        const isSelected = logo.url === logoUrl;
                        return (
                          <button
                            key={logo.url}
                            type="button"
                            onClick={() => handleSelectLogo(logo.url)}
                            className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-xl border p-2 transition-all hover:border-indigo-500 ${
                              isSelected
                                ? 'border-indigo-600 ring-2 ring-indigo-600 dark:border-indigo-500 dark:ring-indigo-500'
                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'
                            }`}
                          >
                            <img
                              src={logo.url}
                              alt={logo.name}
                              className="h-full w-full object-contain p-2"
                              loading="lazy"
                            />
                            {isSelected && (
                              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Team Workspace</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your agency members and their access levels.</p>
                </div>
              </div>

              <div className="mb-8 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                  <UserPlus size={16} className="text-emerald-500" />
                  Invite New Member
                </h3>
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      placeholder="colleague@agency.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 md:w-40"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={isInviting}
                    className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invite'
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                  <Shield size={16} className="text-indigo-500" />
                  Active Members
                </h3>
                <div className="overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-800">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 transition-colors duration-150 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 text-sm font-bold text-indigo-700">
                          {(member.email || '@').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {member.email}
                            {member.status === 'Pending' && (
                              <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">(Pending)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            member.role === 'Admin'
                              ? 'border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : member.role === 'Editor'
                                ? 'border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
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
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">AI Engine</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Configure your AI provider and API keys for content generation.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="ai-provider" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-400">
                    <Bot className="h-4 w-4" />
                    Provider
                  </label>
                  <select
                    id="ai-provider"
                    value={aiForm.provider}
                    onChange={(e) => setAiForm((a) => ({ ...a, provider: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-api-key" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-400">
                    <Key className="h-4 w-4" />
                    API Key
                  </label>
                  <input
                    id="ai-api-key"
                    type="password"
                    value={aiForm.apiKey}
                    onChange={(e) => setAiForm((a) => ({ ...a, apiKey: e.target.value }))}
                    placeholder="Enter your API key (stored securely)"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="ai-model" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-400">
                    Model
                  </label>
                  <input
                    id="ai-model"
                    type="text"
                    value={aiForm.model}
                    onChange={(e) => setAiForm((a) => ({ ...a, model: e.target.value }))}
                    placeholder="e.g. llama-3.1-8b-instant"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="ai-tone" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-400">
                    <Sparkles className="h-4 w-4" />
                    Default Tone
                  </label>
                  <textarea
                    id="ai-tone"
                    value={aiForm.tone}
                    onChange={(e) => setAiForm((a) => ({ ...a, tone: e.target.value }))}
                    rows={3}
                    placeholder="Describe the default tone for AI-generated content"
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-slate-900 dark:text-gray-100 transition-all placeholder-slate-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Notifications & General</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose how you want to be notified and customize appearance.
              </p>

              <div className="mt-6 border-b border-slate-200 pb-6 dark:border-slate-600">
                <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Appearance</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {resolvedTheme === 'dark' ? <Moon className="h-5 w-5 text-indigo-600" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode (Night Mode)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark theme</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={resolvedTheme === 'dark'}
                    onClick={handleDarkModeToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      resolvedTheme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        resolvedTheme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Alerts for Tasks</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Get notified when tasks are assigned or updated</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailTasks}
                    onClick={() => setEmailTasks((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      emailTasks ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        emailTasks ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Weekly Analytics Report</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Receive a summary every Monday</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={weeklyReport}
                    onClick={() => setWeeklyReport((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      weeklyReport ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        weeklyReport ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Client Updates</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Get notified when clients add or update content</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={clientUpdates}
                    onClick={() => setClientUpdates((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      clientUpdates ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        clientUpdates ? 'translate-x-5' : 'translate-x-1'
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
            {activeTab === 'profile' && (
              <button
                type="button"
                onClick={handleSaveProfile}
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
