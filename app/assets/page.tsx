'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
  UploadCloud,
  File,
  Loader2,
  X,
  Download,
  FolderOpen,
  Link,
  Trash2,
  Search,
} from 'lucide-react';

type Asset = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
  client_id: string;
  clients: { name: string } | { name: string }[] | null;
};

type Client = { id: string; name: string };

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');

  const [form, setForm] = useState({
    name: '',
    client_id: '',
    file: null as File | null,
  });

  async function fetchAssets() {
    const { data, error: fetchError } = await supabase
      .from('brand_files')
      .select('id, file_name, file_url, file_type, created_at, client_id, clients(name)')
      .order('created_at', { ascending: false });
    if (!fetchError) setAssets((data ?? []) as Asset[]);
  }

  async function fetchClients() {
    const { data, error: fetchError } = await supabase.from('clients').select('id, name').order('name');
    if (!fetchError) setClients(data ?? []);
  }

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchAssets(), fetchClients()]);
    } catch (err) {
      console.error('Assets fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.client_id || !form.file) {
      toast.error('Please enter an asset name, select a client, and choose a file.');
      return;
    }
    setUploading(true);
    try {
      const ext = form.file.name.split('.').pop() || '';
      const fileName = `${Date.now()}-${form.name.trim().replace(/\s+/g, '-')}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(fileName, form.file, { upsert: false });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error('Upload failed: ' + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from('brand_files').insert({
        file_name: form.name.trim(),
        file_url: publicUrl,
        file_type: form.file.type,
        client_id: form.client_id,
      });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        toast.error('Save failed: ' + insertError.message);
        return;
      }

      setModalOpen(false);
      setForm({ name: '', client_id: '', file: null });
      toast.success('Asset uploaded successfully! ✨');
      await fetchAssets();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function getClientName(asset: Asset): string {
    const c = asset.clients;
    return Array.isArray(c) ? c[0]?.name ?? '' : c?.name ?? '';
  }

  function isImage(fileType: string | null): boolean {
    return !!fileType?.includes('image');
  }

  function handleCopyLink(e: React.MouseEvent, url: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard! 🔗');
  }

  async function handleDeleteAsset() {
    if (!assetToDelete) return;
    try {
      const { error } = await supabase.from('brand_files').delete().eq('id', assetToDelete.id);
      if (error) throw error;
      toast.success('Asset deleted successfully 🗑️');
      await fetchAssets();
      setAssetToDelete(null);
    } catch (err) {
      console.error('Delete asset error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = (asset.file_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesClient = selectedClient === 'all' || asset.client_id === selectedClient;
    return matchesSearch && matchesClient;
  });

  const uniqueClients = Array.from(
    new Map(
      assets
        .filter((a) => a.client_id && a.clients)
        .map((a) => {
          const client = Array.isArray(a.clients) ? a.clients[0] : a.clients;
          return [a.client_id, { id: a.client_id, name: client?.name ?? 'Unknown' }];
        })
    ).values()
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">Global Assets</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Manage and access brand assets, files, and media across all clients.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({ name: '', client_id: '', file: null });
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Asset
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-500 dark:text-gray-400">Loading assets...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/30 px-6 py-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-24">
            <FolderOpen className="h-14 w-14 text-slate-300 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No assets yet</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Upload your first asset to get started.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Asset
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex w-full flex-col items-center gap-3 md:flex-row">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 md:w-48"
              >
                <option value="all">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client.id} value={client.id ?? ''}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`relative h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 ${isImage(asset.file_type) ? 'cursor-pointer' : 'flex items-center justify-center'}`}
                  onClick={() => isImage(asset.file_type) && setPreviewAsset(asset)}
                >
                  {isImage(asset.file_type) ? (
                    <>
                      <img
                        src={asset.file_url}
                        alt={asset.file_name}
                        className="h-full w-full border-b border-gray-50 dark:border-gray-800 object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                    </>
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center border-b border-gray-50 dark:border-gray-800">
                      <File className="h-12 w-12 text-slate-400 dark:text-gray-500" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssetToDelete(asset);
                    }}
                    className="absolute right-2 top-2 z-10 rounded-lg bg-white/90 p-1.5 text-red-400 shadow-sm backdrop-blur transition-all opacity-0 group-hover:opacity-100 hover:text-red-600"
                    title="Delete Asset"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(e, asset.file_url)}
                    className="absolute right-2 top-12 z-10 rounded-lg bg-white/90 p-1.5 text-gray-600 shadow-sm backdrop-blur transition-all opacity-0 group-hover:opacity-100 hover:text-indigo-600"
                    title="Copy Link"
                  >
                    <Link size={16} />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <span className="w-fit rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    {getClientName(asset) || 'Unknown'}
                  </span>
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100" title={asset.file_name}>
                    {asset.file_name}
                  </p>
                  <a
                    href={asset.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-indigo-600"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
              ))}
            </div>
          </>
        )}

        {assetToDelete && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setAssetToDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100">Delete Asset</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                Are you sure you want to delete &quot;{assetToDelete.file_name}&quot;? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssetToDelete(null)}
                  className="rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800"
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

        {previewAsset && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-10"
            onClick={() => setPreviewAsset(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white/70 transition-all hover:bg-black/40 hover:text-white"
              onClick={() => setPreviewAsset(null)}
            >
              <X size={24} />
            </button>
            <div
              className="relative flex max-h-full w-full max-w-5xl flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewAsset.file_url}
                alt={previewAsset.file_name}
                className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
              <div className="mt-4 text-center">
                <p className="text-lg font-medium text-white">{previewAsset.file_name}</p>
                <a
                  href={previewAsset.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-indigo-300 transition-colors hover:text-indigo-200"
                >
                  Download Original File
                </a>
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm fade-in duration-200"
            onClick={() => !uploading && setModalOpen(false)}
          >
            <div
              className="mx-4 w-full max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl animate-in zoom-in-95 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Upload Asset</h2>
                <button
                  type="button"
                  onClick={() => !uploading && setModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 dark:text-gray-400 transition-colors hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-600 dark:hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={uploading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Enter asset name"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">File</label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-8 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <input
                      type="file"
                      onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                      className="sr-only outline-none focus:ring-0"
                    />
                    <UploadCloud className="mb-2 h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {form.file ? form.file.name : 'Choose file or drag here'}
                    </span>
                  </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-gray-800 pt-5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={uploading}
                    className="rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      'Upload & Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
