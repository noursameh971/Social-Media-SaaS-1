'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, FileText, Calendar, Image, Megaphone, Loader2, Check, UploadCloud, Sparkles, Fingerprint, Target, Camera, ListChecks, Plus, X, Download, Trash2, AlertTriangle, Folder } from 'lucide-react';

type TabId = 'strategy' | 'content' | 'assets' | 'campaigns';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'strategy', label: 'Brand Hub', icon: <FileText className="h-4 w-4" /> },
  { id: 'content', label: 'Content Calendar', icon: <Calendar className="h-4 w-4" /> },
  { id: 'assets', label: 'Brand Assets', icon: <Image className="h-4 w-4" /> },
  { id: 'campaigns', label: 'Campaigns', icon: <Megaphone className="h-4 w-4" /> },
];

export default function ClientWorkspacePage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<{ name: string; industry: string; status: string; full_strategy?: { brand_bible?: unknown } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('strategy');

  const [brandCore, setBrandCore] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [artDirection, setArtDirection] = useState('');
  const [customRules, setCustomRules] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [headingFont, setHeadingFont] = useState('');
  const [bodyFont, setBodyFont] = useState('');

  const [profileSaveState, setProfileSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileToast, setProfileToast] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [contentToast, setContentToast] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<{ id: string; title: string; platform: string; format: string; content: string; status?: string; created_at?: string; scheduled_date?: string; campaign_id?: string | null }[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [newPostPlatform, setNewPostPlatform] = useState('Instagram');
  const [newPostScheduledDate, setNewPostScheduledDate] = useState('');
  const [newPostStatus, setNewPostStatus] = useState('idea');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [postCampaignId, setPostCampaignId] = useState('');

  const [assets, setAssets] = useState<{ id: string; file_name: string; file_url: string; file_type?: string }[]>([]);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<{ id: string; name: string; description: string | null; status: string; start_date: string | null; end_date: string | null }[]>([]);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignStatus, setCampaignStatus] = useState('Planning');
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  useEffect(() => {
    async function loadClient() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('name, industry, status, custom_rules, business_model, art_direction, target_market, full_strategy')
          .eq('id', id)
          .single();

        if (fetchError || !data) {
          setError('Client not found');
          setClient(null);
          return;
        }
        setClient(data);
        const d = data as Record<string, unknown>;
        setCustomRules((d.custom_rules as string) ?? '');
        setBusinessModel((d.business_model as string) ?? '');
        setArtDirection((d.art_direction as string) ?? '');
        setTargetMarket((d.target_market as string) ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client');
        setClient(null);
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [id]);

  useEffect(() => {
    async function loadStrategy() {
      if (!id) return;
      try {
        const { data, error: stratError } = await supabase
          .from('brand_strategies')
          .select('brand_core, primary_color, secondary_color, heading_font, body_font')
          .eq('client_id', id)
          .maybeSingle();

        if (!stratError && data) {
          const d = data as Record<string, string | null | undefined>;
          setBrandCore(d.brand_core || '');
          setPrimaryColor(d.primary_color || '');
          setSecondaryColor(d.secondary_color || '');
          setHeadingFont(d.heading_font || '');
          setBodyFont(d.body_font || '');
        }
      } catch {
        // Table may not exist yet
      }
    }
    loadStrategy();
  }, [id]);

  useEffect(() => {
    if (!contentToast) return;
    const t = setTimeout(() => setContentToast(false), 3000);
    return () => clearTimeout(t);
  }, [contentToast]);

  useEffect(() => {
    if (!profileToast) return;
    const t = setTimeout(() => setProfileToast(false), 3000);
    return () => clearTimeout(t);
  }, [profileToast]);

  async function fetchSavedPosts() {
    if (!id) return;
    try {
      const { data } = await supabase
        .from('content_posts')
        .select('id, title, platform, format, content, status, created_at, scheduled_date, campaign_id')
        .eq('client_id', id)
        .order('created_at', { ascending: false });
      setSavedPosts(data ?? []);
    } catch {
      setSavedPosts([]);
    }
  }

  useEffect(() => {
    if (id && activeTab === 'content') {
      fetchSavedPosts();
    }
  }, [id, activeTab]);

  async function fetchAssets() {
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (!unwrappedId) return;
    try {
      const { data } = await supabase
        .from('client_assets')
        .select('id, file_name, file_url, file_type')
        .eq('client_id', unwrappedId)
        .order('created_at', { ascending: false });
      setAssets(data ?? []);
    } catch {
      setAssets([]);
    }
  }

  useEffect(() => {
    if (id && activeTab === 'assets') {
      fetchAssets();
    }
  }, [id, activeTab]);

  async function fetchCampaigns() {
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (!unwrappedId) return;
    try {
      const { data } = await supabase
        .from('campaigns')
        .select('id, name, description, status, start_date, end_date')
        .eq('client_id', unwrappedId)
        .order('created_at', { ascending: false });
      setCampaigns(data ?? []);
    } catch {
      setCampaigns([]);
    }
  }

  useEffect(() => {
    if (id) {
      fetchCampaigns();
    }
  }, [id]);

  async function handleUploadAsset(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (files.length === 0 || !unwrappedId) return;

    setIsUploadingAsset(true);
    try {
      const results = await Promise.all(
        files.map(async (file, i) => {
          const path = `${unwrappedId}/${Date.now()}_${i}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('brand-assets').upload(path, file);
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
          return {
            client_id: unwrappedId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
          };
        })
      );

      const { error: insertError } = await supabase.from('client_assets').insert(results);
      if (insertError) throw insertError;
    } catch (err) {
      console.error('Upload asset error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload asset');
    } finally {
      await fetchAssets();
      setIsUploadingAsset(false);
      e.target.value = '';
    }
  }

  async function handleDeleteAsset() {
    if (!assetToDelete) return;
    const asset = assets.find((a) => a.id === assetToDelete);
    if (!asset) {
      setAssetToDelete(null);
      return;
    }
    try {
      const path = asset.file_url.includes('brand-assets/') ? asset.file_url.split('brand-assets/')[1]?.split('?')[0] : asset.file_url.includes('client_assets/') ? asset.file_url.split('client_assets/')[1]?.split('?')[0] : null;
      if (path) {
        await supabase.storage.from('brand-assets').remove([path]);
      }
      await supabase.from('client_assets').delete().eq('id', assetToDelete);
      await fetchAssets();
      setAssetToDelete(null);
    } catch (err) {
      console.error('Delete asset error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete asset');
      setAssetToDelete(null);
    }
  }

  async function handleDeletePost() {
    if (!postToDelete) return;
    try {
      const { error } = await supabase.from('content_posts').delete().eq('id', postToDelete);
      if (error) throw error;
      toast.success('Post deleted successfully');
      await fetchSavedPosts();
      setPostToDelete(null);
    } catch (err) {
      console.error('Delete post error:', err);
      toast.error('Error deleting post');
      setPostToDelete(null);
    }
  }

  async function handleDeleteCampaign() {
    if (!campaignToDelete) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', campaignToDelete);
      if (error) throw error;
      toast.success('Campaign deleted successfully');
      await fetchCampaigns();
      setCampaignToDelete(null);
    } catch (err) {
      console.error('Delete campaign error:', err);
      toast.error('Error deleting campaign');
      setCampaignToDelete(null);
    }
  }

  async function handleDraftWithAI() {
    if (!newPostContent.trim()) {
      toast.error('Please write a topic or idea in the content box first.');
      return;
    }

    setIsDrafting(true);
    try {
      const brandBible = client?.full_strategy?.brand_bible ?? {
        core_identity: brandCore,
        target_audience: targetMarket,
        tone_and_voice: customRules,
        visual_system: artDirection,
        business_model_and_product: businessModel,
        market_positioning: '',
      };

      const res = await fetch('/api/draft-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newPostContent.trim(),
          platform: newPostPlatform,
          brand_bible: brandBible,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to draft');

      if (data.content) {
        setNewPostContent(data.content);
      }
    } catch (err) {
      console.error('Draft with AI error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to draft post');
    } finally {
      setIsDrafting(false);
    }
  }

  async function handleSaveNewPost() {
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (!unwrappedId) return;

    if (!postTitle.trim() || !newPostContent.trim()) {
      toast.error('Please enter a title and content.');
      return;
    }

    setIsSavingPost(true);
    try {
      const { error } = await supabase.from('content_posts').insert([
        {
          client_id: unwrappedId,
          title: postTitle.trim(),
          platform: newPostPlatform,
          format: 'Post',
          content: newPostContent.trim(),
          status: newPostStatus,
          scheduled_date: newPostScheduledDate.trim() || null,
          campaign_id: postCampaignId ? postCampaignId : null,
        },
      ]);

      if (error) {
        console.error('Supabase Error:', error);
        toast.error('DB Error: ' + error.message);
        return;
      }

      setContentToast(true);
      setIsPostModalOpen(false);
      setPostTitle('');
      setNewPostContent('');
      setNewPostScheduledDate('');
      setNewPostStatus('idea');
      setNewPostPlatform('Instagram');
      setPostCampaignId('');
      fetchSavedPosts();
    } catch (err) {
      console.error('Save post error:', err);
      toast.error('DB Error: ' + (err instanceof Error ? err.message : 'Failed to save post'));
    } finally {
      setIsSavingPost(false);
    }
  }

  async function handleAutoFillCampaign(campaign: { id: string; name: string; description: string | null }) {
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (!unwrappedId) return;

    setIsGeneratingFor(campaign.id);
    try {
      const brandBible = client?.full_strategy?.brand_bible ?? {
        core_identity: brandCore,
        target_audience: targetMarket,
        tone_and_voice: customRules,
        visual_system: artDirection,
        business_model_and_product: businessModel,
        market_positioning: '',
      };

      const res = await fetch('/api/campaign-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaign.name,
          campaignDescription: campaign.description ?? '',
          brandBible,
        }),
      });

      const generatedData = await res.json();
      if (!res.ok) throw new Error(generatedData.error || 'Failed to generate campaign');

      const posts = generatedData.posts ?? [];
      if (posts.length === 0) {
        toast.error('No posts were generated.');
        return;
      }

      const postsToInsert = posts.map((p: { title: string; content: string; platform: string }) => ({
        client_id: unwrappedId,
        campaign_id: campaign.id,
        title: p.title,
        content: p.content,
        platform: p.platform ?? 'Instagram',
        format: 'Post',
        status: 'idea',
      }));

      const { error } = await supabase.from('content_posts').insert(postsToInsert);
      if (error) throw error;

      toast.success('Campaign Auto-Filled! 5 posts added to calendar. ✨');
      await fetchSavedPosts();
    } catch (err) {
      console.error('Auto-fill campaign error:', err);
      toast.error('Failed to generate campaign.');
    } finally {
      setIsGeneratingFor(null);
    }
  }

  async function handleSaveCampaign() {
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (!unwrappedId) return;
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name.');
      return;
    }
    setIsSavingCampaign(true);
    try {
      const { error } = await supabase.from('campaigns').insert([
        {
          client_id: unwrappedId,
          name: campaignName.trim(),
          description: campaignDescription.trim() || null,
          status: campaignStatus,
          start_date: campaignStartDate.trim() || null,
          end_date: campaignEndDate.trim() || null,
        },
      ]);
      if (error) {
        console.error('Supabase Error:', error);
        toast.error('DB Error: ' + error.message);
        return;
      }
      setIsCampaignModalOpen(false);
      setCampaignName('');
      setCampaignDescription('');
      setCampaignStatus('Planning');
      setCampaignStartDate('');
      setCampaignEndDate('');
      await fetchCampaigns();
    } catch (err) {
      console.error('Save campaign error:', err);
      toast.error('DB Error: ' + (err instanceof Error ? err.message : 'Failed to save campaign'));
    } finally {
      setIsSavingCampaign(false);
    }
  }

  async function handleExtractFromPdf() {
    if (!selectedFiles.length) return;
    setExtracting(true);
    setProfileError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/extract-brand', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      const bb = data.brand_bible;
      const safeStr = (v: unknown): string => {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'object') return JSON.stringify(v, null, 2);
        return String(v);
      };
      setBrandCore(safeStr(bb?.core_identity ?? data.brand_core));
      setBusinessModel(safeStr(bb?.business_model_and_product ?? data.business_model));
      setTargetMarket(safeStr(bb?.target_audience ?? data.target_market));
      setArtDirection(safeStr(bb?.visual_system ?? data.art_direction));
      setCustomRules(safeStr(bb?.tone_and_voice ?? data.custom_rules));
      setPrimaryColor(typeof data.primary_color === 'string' ? data.primary_color : '#000000');
      setSecondaryColor(typeof data.secondary_color === 'string' ? data.secondary_color : '#ffffff');
      setHeadingFont(typeof data.heading_font === 'string' ? data.heading_font : 'Brand Default');
      setBodyFont(typeof data.body_font === 'string' ? data.body_font : 'Brand Default');
      setSelectedFiles([]);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveProfile() {
    const unwrappedId = Array.isArray(id) ? id[0] : id;
    if (!unwrappedId) return;

    setProfileSaveState('saving');
    setProfileError(null);

    try {
      await supabase.from('brand_strategies').upsert(
        {
          client_id: unwrappedId,
          brand_core: brandCore.trim() || null,
          primary_color: primaryColor.trim() || null,
          secondary_color: secondaryColor.trim() || null,
          heading_font: headingFont.trim() || null,
          body_font: bodyFont.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      );

      const { error: clientError } = await supabase.from('clients').update({
        custom_rules: customRules.trim() || null,
        business_model: businessModel.trim() || null,
        art_direction: artDirection.trim() || null,
        target_market: targetMarket.trim() || null,
      }).eq('id', unwrappedId);

      if (clientError) throw clientError;
      setProfileSaveState('saved');
      setProfileToast(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile');
      setProfileSaveState('idle');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8">
        <p className="text-sm font-medium text-red-700">{error || 'Client not found'}</p>
        <Link
          href="/clients"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{client.industry}</p>
          </div>
        </div>
      </header>

      {/* Tabbed Navigation */}
      <nav className="inline-flex rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-12">
        {activeTab === 'strategy' && (
          <div className="relative space-y-6">
            {profileError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {profileError}
              </div>
            )}
            {profileToast && (
              <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 shadow-lg">
                Brand profile saved successfully!
              </div>
            )}

            {/* Top Bar: Dropzone + Save Button */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                id="pdf-upload"
                multiple
                className="sr-only"
                onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
              />
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 sm:flex-row sm:gap-4">
                <label
                  htmlFor="pdf-upload"
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  <UploadCloud className="h-5 w-5 flex-shrink-0 text-slate-400" />
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected — ${selectedFiles.map((f) => f.name).slice(0, 2).join(', ')}${selectedFiles.length > 2 ? '...' : ''}`
                    : 'Drop or click to upload brand documents (PDF, Word, PPT)'}
                </label>
                <button
                  type="button"
                  onClick={handleExtractFromPdf}
                  disabled={extracting || selectedFiles.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Extract'
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaveState === 'saving'}
                className={`flex-shrink-0 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  profileSaveState === 'saved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {profileSaveState === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : profileSaveState === 'saved' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Save Brand Profile'
                )}
              </button>
            </div>

            {/* 2-Column Grid: Visual Identity (1) | Deep Strategy (2) */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Left: Visual Identity */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Visual Identity</h3>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="primary_color" className="mb-2 block text-sm font-medium text-gray-700">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#1D4ED8' }}
                        className="h-8 w-8 flex-shrink-0 rounded-full border border-slate-200 shadow-sm"
                      />
                      <div className="flex flex-1 gap-2">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#1D4ED8'}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200"
                        />
                        <input
                          id="primary_color"
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#1D4ED8"
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 font-mono text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="secondary_color" className="mb-2 block text-sm font-medium text-gray-700">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : '#F1F5F9' }}
                        className="h-8 w-8 flex-shrink-0 rounded-full border border-slate-200 shadow-sm"
                      />
                      <div className="flex flex-1 gap-2">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : '#F1F5F9'}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200"
                        />
                        <input
                          id="secondary_color"
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          placeholder="#F1F5F9"
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 font-mono text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="heading_font" className="mb-2 block text-sm font-medium text-gray-700">
                      Heading Font
                    </label>
                    <input
                      id="heading_font"
                      type="text"
                      value={headingFont}
                      onChange={(e) => setHeadingFont(e.target.value)}
                      placeholder="e.g. Inter, Playfair Display"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="body_font" className="mb-2 block text-sm font-medium text-gray-700">
                      Body Font
                    </label>
                    <input
                      id="body_font"
                      type="text"
                      value={bodyFont}
                      onChange={(e) => setBodyFont(e.target.value)}
                      placeholder="e.g. Roboto, Source Sans"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Deep Strategy (span 2) */}
              <div className="space-y-0 lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Core Identity & DNA */}
                  <div className="border-b border-slate-100 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Core Identity & DNA</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="brand_core" className="mb-1.5 block text-xs font-medium text-gray-600">
                          Brand Core / Mission
                        </label>
                        <textarea
                          id="brand_core"
                          rows={5}
                          value={brandCore}
                          onChange={(e) => setBrandCore(e.target.value)}
                          placeholder="Mission, vision, archetype, and core positioning..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="business_model" className="mb-1.5 block text-xs font-medium text-gray-600">
                          Business Model & Monetization
                        </label>
                        <textarea
                          id="business_model"
                          rows={5}
                          value={businessModel}
                          onChange={(e) => setBusinessModel(e.target.value)}
                          placeholder="e.g., Direct-to-consumer luxury fashion, high-ticket items..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Target Market */}
                  <div className="border-b border-slate-100 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Target Market</h3>
                    </div>
                    <textarea
                      id="target_market"
                      rows={5}
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value)}
                      placeholder="e.g., High-net-worth individuals, 25-45, urban..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Art Direction & Aesthetic */}
                  <div className="border-b border-slate-100 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Art Direction & Aesthetic</h3>
                    </div>
                    <textarea
                      id="art_direction"
                      rows={5}
                      value={artDirection}
                      onChange={(e) => setArtDirection(e.target.value)}
                      placeholder="e.g., Minimalist, harsh shadows, editorial high-fashion photography..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Custom Rules */}
                  <div className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Custom Rules</h3>
                    </div>
                    <textarea
                      id="custom_rules"
                      rows={5}
                      value={customRules}
                      onChange={(e) => setCustomRules(e.target.value)}
                      placeholder="e.g., Target Gen Z, humorous tone, focus on video..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            {contentToast && (
              <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 shadow-sm">
                Post saved!
              </div>
            )}

            {/* Content Pipeline Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Content Pipeline</h2>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            </div>

            {/* Pipeline View */}
            {savedPosts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-gray-50/50 py-16 text-center">
                <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-600">No posts yet</p>
                <p className="mt-1 text-sm text-slate-500">Create your first post to get started</p>
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  New Post
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setPostToDelete(post.id)}
                      className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          post.platform === 'Instagram'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : post.platform === 'LinkedIn'
                              ? 'bg-blue-700 text-white'
                              : post.platform === 'Twitter'
                                ? 'bg-sky-500 text-white'
                                : post.platform === 'Facebook'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-600 text-white'
                        }`}
                      >
                        {post.platform}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          (post.status ?? 'idea') === 'idea'
                            ? 'bg-slate-100 text-slate-600'
                            : (post.status ?? 'idea') === 'draft'
                              ? 'bg-amber-100 text-amber-700'
                              : (post.status ?? 'idea') === 'review'
                                ? 'bg-blue-100 text-blue-700'
                                : (post.status ?? 'idea') === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {(post.status ?? 'idea').charAt(0).toUpperCase() + (post.status ?? 'idea').slice(1)}
                      </span>
                    </div>
                    <h3 className="mb-2 font-semibold text-slate-900 line-clamp-1">{post.title}</h3>
                    <p className="line-clamp-3 text-sm text-slate-600">{post.content}</p>
                    {post.campaign_id && (() => {
                      const campaignName = campaigns.find((c) => c.id === post.campaign_id)?.name;
                      return campaignName ? (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <Folder className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{campaignName}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* New Post Modal */}
            {isPostModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setIsPostModalOpen(false)}
                role="presentation"
              >
                <div
                  className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="new-post-title"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 id="new-post-title" className="text-lg font-semibold text-slate-900">New Post</h3>
                    <button
                      type="button"
                      onClick={() => setIsPostModalOpen(false)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4 p-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Post Title (Internal Name)</label>
                      <input
                        type="text"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="e.g. Summer Campaign - Week 1"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Platform</label>
                      <select
                        value={newPostPlatform}
                        onChange={(e) => setNewPostPlatform(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Instagram">Instagram</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter">Twitter</option>
                        <option value="Facebook">Facebook</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled Date</label>
                      <input
                        type="date"
                        value={newPostScheduledDate}
                        onChange={(e) => setNewPostScheduledDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                      <select
                        value={newPostStatus}
                        onChange={(e) => setNewPostStatus(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="idea">Idea</option>
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="approved">Approved</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Campaign (Optional)</label>
                      <select
                        value={postCampaignId}
                        onChange={(e) => setPostCampaignId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">None / Standalone Post</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
                      <button
                        type="button"
                        onClick={handleDraftWithAI}
                        disabled={isDrafting || !newPostContent.trim()}
                        className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:from-indigo-100 hover:to-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDrafting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Drafting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Draft with AI Brain
                          </>
                        )}
                      </button>
                      <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={6}
                        placeholder="Write your post content..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setIsPostModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewPost}
                      disabled={isSavingPost || !postTitle.trim() || !newPostContent.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingPost ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Post'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-8">
            {/* Upload Zone */}
            <input
              type="file"
              id="asset-upload"
              className="sr-only"
              multiple
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
              onChange={handleUploadAsset}
              disabled={isUploadingAsset}
            />
            <label
              htmlFor="asset-upload"
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-gray-50/50 px-6 py-10 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 ${
                isUploadingAsset ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              {isUploadingAsset ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                  <span className="text-sm font-medium text-slate-600">Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">Drop or click to upload assets</span>
                  <span className="text-xs text-slate-500">Images, PDFs, Word, PowerPoint</span>
                </>
              )}
            </label>

            {/* Asset Gallery */}
            {(() => {
              const imageAssets = assets.filter((a) => a.file_type?.includes('image'));
              const documentAssets = assets.filter((a) => !a.file_type?.includes('image'));

              if (assets.length === 0) {
                return (
                  <div className="rounded-xl border border-slate-200 bg-gray-50/30 py-12 text-center">
                    <Image className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-sm font-medium text-slate-600">No assets yet</p>
                    <p className="mt-1 text-sm text-slate-500">Upload logos, images, or brand files to get started</p>
                  </div>
                );
              }

              return (
                <div className="space-y-8">
                  {/* Brand Images */}
                  {imageAssets.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">Brand Images</h3>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {imageAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                          >
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={asset.file_url}
                                alt={asset.file_name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                              <a
                                href={asset.file_url}
                                download={asset.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-white/90 p-2 text-slate-700 shadow-sm transition-colors hover:bg-white"
                              >
                                <Download className="h-5 w-5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setAssetToDelete(asset.id)}
                                className="rounded-lg bg-white/90 p-2 text-red-600 shadow-sm transition-colors hover:bg-white hover:text-red-700"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brand Documents */}
                  {documentAssets.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">Brand Documents</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {documentAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                              <FileText className="h-8 w-8 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900" title={asset.file_name}>
                                {asset.file_name}
                              </p>
                            </div>
                            <div className="flex flex-shrink-0 gap-2">
                              <a
                                href={asset.file_url}
                                download={asset.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                              >
                                <Download className="h-5 w-5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setAssetToDelete(asset.id)}
                                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Delete Asset Modal */}
            {assetToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-sm transform rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Delete Asset</h3>
                  <p className="mt-2 text-sm text-gray-500">Are you sure you want to delete this asset? This action cannot be undone.</p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setAssetToDelete(null)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAsset}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Campaign Pipeline Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Campaign Pipeline</h2>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </button>
            </div>

            {/* Campaigns Grid */}
            {campaigns.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-gray-50/50 py-16 text-center">
                <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-600">No campaigns yet</p>
                <p className="mt-1 text-sm text-slate-500">Create your first campaign to get started</p>
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  New Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setCampaignToDelete(campaign.id)}
                      className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        campaign.status === 'Planning' || campaign.status === 'Planned'
                          ? 'bg-amber-100 text-amber-700'
                          : campaign.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {campaign.status}
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-slate-900">{campaign.name}</h3>
                    {campaign.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-500">{campaign.description}</p>
                    )}
                    {(campaign.start_date || campaign.end_date) && (
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {campaign.start_date ?? '—'} – {campaign.end_date ?? '—'}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAutoFillCampaign(campaign)}
                      disabled={isGeneratingFor === campaign.id}
                      className="mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGeneratingFor === campaign.id ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          ✨ Generating Full Campaign...
                        </span>
                      ) : (
                        '✨ Auto-Fill Calendar'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Campaign Modal */}
            {isCampaignModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setIsCampaignModalOpen(false)}
                role="presentation"
              >
                <div
                  className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="new-campaign-title"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 id="new-campaign-title" className="text-lg font-semibold text-slate-900">Create New Campaign</h3>
                    <button
                      type="button"
                      onClick={() => setIsCampaignModalOpen(false)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4 p-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Campaign Name</label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g. Summer Sale 2025"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                      <select
                        value={campaignStatus}
                        onChange={(e) => setCampaignStatus(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Planning">Planning</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Start Date</label>
                        <input
                          type="date"
                          value={campaignStartDate}
                          onChange={(e) => setCampaignStartDate(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">End Date</label>
                        <input
                          type="date"
                          value={campaignEndDate}
                          onChange={(e) => setCampaignEndDate(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        value={campaignDescription}
                        onChange={(e) => setCampaignDescription(e.target.value)}
                        rows={4}
                        placeholder="Describe the campaign goals and scope..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setIsCampaignModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCampaign}
                      disabled={isSavingCampaign || !campaignName.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingCampaign ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Campaign'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Post Modal */}
        {postToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm transform rounded-2xl bg-white p-6 shadow-xl transition-all">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Delete Post</h3>
              <p className="mt-2 text-sm text-gray-500">Are you sure you want to delete this post?</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePost}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Campaign Modal */}
        {campaignToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm transform rounded-2xl bg-white p-6 shadow-xl transition-all">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Delete Campaign</h3>
              <p className="mt-2 text-sm text-gray-500">Are you sure? This might delete associated posts depending on DB cascading.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCampaignToDelete(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
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
