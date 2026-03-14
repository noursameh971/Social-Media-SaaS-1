'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { UserPlus, Building2, X, Loader2, Users, Trash2, AlertTriangle } from 'lucide-react';

type Client = {
  id: string;
  name: string;
  industry: string;
  status: string;
};

const STATUS_OPTIONS = ['Active', 'Inactive', 'Prospect'];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    status: 'Active',
  });

  async function fetchClients() {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setClients((data ?? []) as Client[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }

  function openModal() {
    setModalOpen(true);
    setForm({ name: '', industry: '', status: 'Active' });
    setError(null);
  }

  function closeModal() {
    setModalOpen(false);
    setForm({ name: '', industry: '', status: 'Active' });
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      await fetchClients();
      toast.success('Client deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete client');
    } finally {
      setClientToDelete(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.industry.trim()) return;

    const toastId = toast.loading('Adding client...');
    setAdding(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('clients').insert([
        {
          name: form.name.trim(),
          industry: form.industry.trim(),
          status: form.status,
        },
      ]);

      if (insertError) throw insertError;
      closeModal();
      await fetchClients();
      toast.success('Client added successfully!', { id: toastId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
      toast.error(err instanceof Error ? err.message : 'Failed to add client', { id: toastId });
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your client accounts and organizations.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Add Client
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading clients...</p>
          </div>
        </div>
      ) : clients.length === 0 ? (
          <div className="my-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <Users size={48} className="text-indigo-300 dark:text-indigo-600" />
            <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">No clients yet</h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first client. Click the button above to create one.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              Add your first client
            </button>
          </div>
        ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Industry
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Workspace
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-sm text-indigo-600">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <Link
                          href={`/clients/${client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gray-900 hover:text-indigo-600 hover:underline dark:text-gray-100"
                        >
                          {client.name}
                        </Link>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-400">
                      {client.industry}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          client.status === 'Active'
                            ? 'border-green-100 bg-green-50 text-green-700'
                            : client.status === 'Inactive'
                              ? 'border-slate-200 bg-slate-50 text-slate-600'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/clients/${client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                          <Building2 className="h-4 w-4" />
                          Workspace
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToDelete(client.id);
                          }}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete client"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-gray-900/40 duration-200 backdrop-blur-sm fade-in dark:bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl duration-200 animate-in zoom-in-95 dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <div className="mb-2 flex items-center gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete Client</h3>
              </div>
            </div>
            <p className="mb-6 mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you completely sure? This action cannot be undone and will permanently delete this client.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(clientToDelete)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-red-200 transition-colors hover:bg-red-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-gray-900/40 p-4 duration-200 backdrop-blur-sm fade-in dark:bg-black/60">
          <div
            className="absolute inset-0"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl duration-200 animate-in zoom-in-95 dark:border-gray-800 dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex items-center justify-between">
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add Client
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="client-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client Name
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Acme Inc."
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Industry
                </label>
                <input
                  id="industry"
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Software, Retail"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adding ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Add Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
