'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Plus, X, Loader2, Calendar, Megaphone, Sparkles, AlertCircle, Trash2, Edit2, Search } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  Draft: 'border border-slate-200 bg-slate-50 text-slate-700',
  Planned: 'border border-amber-100 bg-amber-50 text-amber-700',
  Planning: 'border border-amber-100 bg-amber-50 text-amber-700',
  Active: 'border border-green-100 bg-green-50 text-green-700',
  Completed: 'border border-blue-100 bg-blue-50 text-blue-700',
};

type Campaign = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  clients: { id?: string; name: string; brand_bible?: unknown } | { id?: string; name: string; brand_bible?: unknown }[] | null;
  content_posts?: { id: string; status: string }[];
};

type Client = { id: string; name: string; brand_bible?: unknown };

type IdeatorIdea = { name: string; description: string };

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isIdeatorOpen, setIsIdeatorOpen] = useState(false);
  const [ideatorTheme, setIdeatorTheme] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [generatedIdeas, setGeneratedIdeas] = useState<IdeatorIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [form, setForm] = useState({
    name: '',
    client_id: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'Draft',
  });

  async function fetchCampaigns() {
    const { data, error: fetchError } = await supabase
      .from('campaigns')
      .select('*, clients(id, name, brand_bible), content_posts(id, status)')
      .order('created_at', { ascending: false });
    if (!fetchError) setCampaigns((data ?? []) as Campaign[]);
  }

  async function fetchClients() {
    const { data, error: fetchError } = await supabase
      .from('clients')
      .select('id, name, brand_bible')
      .order('name');
    if (!fetchError) setClients((data ?? []) as Client[]);
  }

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCampaigns(), fetchClients()]);
    } catch (err) {
      console.error('Campaigns fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.client_id) {
      toast.error('Please enter a campaign name and select a client.');
      return;
    }
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('campaigns').insert({
        name: form.name.trim(),
        client_id: form.client_id,
        description: form.description.trim() || null,
        start_date: form.start_date?.trim() ? form.start_date : null,
        end_date: form.end_date?.trim() ? form.end_date : null,
        status: form.status,
      });
      if (insertError) {
        console.error('Supabase Error:', insertError);
        toast.error('Error: ' + insertError.message);
        return;
      }
      setModalOpen(false);
      setForm({ name: '', client_id: '', description: '', start_date: '', end_date: '', status: 'Draft' });
      await fetchCampaigns();
    } catch (err) {
      console.error('Create campaign error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  function getClientName(campaign: Campaign): string {
    const c = campaign.clients;
    return Array.isArray(c) ? c[0]?.name ?? '' : c?.name ?? '';
  }

  async function handleGenerateIdeas() {
    const client = clients.find((c) => c.id === selectedClientId);
    const brandBible = client?.brand_bible ?? 'No brand guidelines provided.';

    if (!ideatorTheme.trim()) {
      toast.error('Please enter a theme.');
      return;
    }
    if (!selectedClientId) {
      toast.error('Please select a client.');
      return;
    }

    setIsGenerating(true);
    setGeneratedIdeas([]);
    try {
      const res = await fetch('/api/campaign-ideator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: ideatorTheme.trim(), brandBible }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate ideas');
      setGeneratedIdeas(data.campaigns ?? []);
    } catch (err) {
      console.error('Ideator error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate ideas');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveCampaign(idea: IdeatorIdea) {
    if (!selectedClientId) {
      toast.error('Please select a client.');
      return;
    }
    try {
      const { error } = await supabase.from('campaigns').insert({
        client_id: selectedClientId,
        name: idea.name,
        description: idea.description,
        status: 'Planning',
      });
      if (error) throw error;
      toast.success('Campaign Saved! ✨');
      await fetchCampaigns();
    } catch (err) {
      console.error('Save campaign error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save campaign');
    }
  }

  async function handleAutoFillCampaign(campaign: Campaign) {
    setIsGeneratingFor(campaign.id);
    try {
      const clientsData = campaign.clients;
      const client = Array.isArray(clientsData) ? clientsData[0] : clientsData;
      const brandBible = client?.brand_bible ?? 'No brand guidelines provided.';

      const response = await fetch('/api/campaign-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaign.name,
          campaignDescription: campaign.description ?? '',
          brandBible,
        }),
      });
      const generatedData = await response.json();
      if (!response.ok) throw new Error(generatedData.error ?? 'Failed to generate');

      const postsToInsert = (generatedData.posts ?? []).map((p: { title: string; content: string; platform: string }) => ({
        client_id: campaign.client_id,
        campaign_id: campaign.id,
        title: p.title,
        content: p.content,
        platform: p.platform,
        status: 'Idea',
      }));

      const { error } = await supabase.from('content_posts').insert(postsToInsert);
      if (error) throw error;

      toast.success('Magic! 5 posts added to this campaign. ✨');
      await fetchCampaigns();
    } catch (err) {
      console.error('Auto-fill error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to auto-fill campaign');
    } finally {
      setIsGeneratingFor(null);
    }
  }

  async function handleDeleteCampaign() {
    if (!campaignToDelete) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', campaignToDelete.id);
      if (error) throw error;
      toast.success('Campaign deleted successfully 🗑️');
      await fetchCampaigns();
    } catch (err) {
      console.error('Delete campaign error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setCampaignToDelete(null);
    }
  }

  async function handleUpdateCampaign() {
    if (!campaignToEdit) return;
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ name: editForm.name, description: editForm.description })
        .eq('id', campaignToEdit.id);
      if (error) throw error;
      toast.success('Campaign updated successfully ✨');
      await fetchCampaigns();
      setCampaignToEdit(null);
    } catch (err) {
      console.error('Update campaign error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update campaign');
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      (campaign.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (campaign.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesClient = selectedClient === 'all' || campaign.client_id === selectedClient;
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus;
    return matchesSearch && matchesClient && matchesStatus;
  });

  const uniqueClients = Array.from(
    new Map(
      campaigns
        .filter((c) => c.client_id && c.clients)
        .map((c) => {
          const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
          return [c.client_id, { id: c.client_id, name: client?.name ?? 'Unknown' }];
        })
    ).values()
  );

  const uniqueStatuses = [...new Set(campaigns.map((c) => c.status).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-8 p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">All Campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">
              Overview of all marketing campaigns across your clients.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsIdeatorOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
              Pitch AI Campaigns
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ name: '', client_id: '', description: '', start_date: '', end_date: '', status: 'Draft' });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-500">Loading campaigns...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-24">
            <Megaphone className="h-14 w-14 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No campaigns yet</h3>
            <p className="mt-2 text-sm text-slate-500">Create your first campaign to get started.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex w-full flex-col items-center gap-3 md:flex-row">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 md:w-48"
              >
                <option value="all">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 md:w-48"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-gray-100 bg-white p-1 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignToEdit(campaign);
                      setEditForm({ name: campaign.name, description: campaign.description || '' });
                    }}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:text-indigo-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignToDelete(campaign)}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    {getClientName(campaign) || 'Unknown'}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity duration-200 group-hover:opacity-0 ${
                      STATUS_STYLES[campaign.status] ?? 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{campaign.name}</h3>
                {campaign.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-slate-500">{campaign.description}</p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  {campaign.start_date && campaign.end_date ? (
                    <span>
                      {new Date(campaign.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      –{' '}
                      {new Date(campaign.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  ) : campaign.start_date ? (
                    <span>
                      From{' '}
                      {new Date(campaign.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span>No dates set</span>
                  )}
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  {(() => {
                    const totalPosts = campaign.content_posts?.length ?? 0;
                    const readyPosts =
                      campaign.content_posts?.filter(
                        (p) => p.status === 'Review' || p.status === 'Published'
                      ).length ?? 0;
                    const progressPercentage =
                      totalPosts === 0 ? 0 : Math.round((readyPosts / totalPosts) * 100);

                    if (totalPosts === 0) {
                      return (
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-500">Progress</span>
                            <span className="font-bold text-gray-900">0 / 5 Posts Ready</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: '0%' }} />
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                              <AlertCircle size={14} />
                              <span>Needs Content</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAutoFillCampaign(campaign)}
                              disabled={isGeneratingFor === campaign.id}
                              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                            >
                              {isGeneratingFor === campaign.id ? 'Generating...' : '✨ Auto-Fill'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-500">Progress</span>
                          <span className="font-bold text-gray-900">
                            {readyPosts} / {totalPosts} Posts Ready
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <div className="mt-4 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleAutoFillCampaign(campaign)}
                            disabled={isGeneratingFor === campaign.id}
                            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                          >
                            {isGeneratingFor === campaign.id ? 'Generating...' : '✨ Auto-Fill'}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
            </div>
          </>
        )}

        {isIdeatorOpen && (
          <div
            className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm fade-in duration-200"
            onClick={() => setIsIdeatorOpen(false)}
          >
            <div
              className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">AI Campaign Ideator</h2>
                <button
                  type="button"
                  onClick={() => setIsIdeatorOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 flex flex-wrap items-end gap-4">
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Theme</label>
                  <input
                    type="text"
                    value={ideatorTheme}
                    onChange={(e) => setIdeatorTheme(e.target.value)}
                    placeholder="e.g. Black Friday Sale"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateIdeas}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Ideas
                    </>
                  )}
                </button>
              </div>

              <div className="min-h-[200px]">
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-sm text-slate-500">Pitching campaign ideas...</p>
                  </div>
                )}
                {!isGenerating && generatedIdeas.length > 0 && (
                  <div className="space-y-4">
                    {generatedIdeas.map((idea, idx) => (
                      <div
                        key={idx}
                        className="mb-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5 transition-colors hover:bg-gray-50"
                      >
                        <h4 className="font-bold text-slate-900">{idea.name}</h4>
                        <p className="mt-2 text-sm text-gray-600">{idea.description}</p>
                        <button
                          type="button"
                          onClick={() => handleSaveCampaign(idea)}
                          className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600"
                        >
                          Save to Pipeline
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">New Campaign</h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Campaign Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Client</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="" disabled>Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Campaign description (optional)"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save Campaign'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {campaignToEdit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setCampaignToEdit(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900">Edit Campaign</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCampaignToEdit(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateCampaign}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {campaignToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setCampaignToDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900">Delete Campaign</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete &quot;{campaignToDelete.name}&quot;? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCampaignToDelete(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCampaign}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
