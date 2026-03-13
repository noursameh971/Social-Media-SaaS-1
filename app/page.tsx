'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Users, Megaphone, FileText, Image, Calendar, Loader2, UserPlus, AlertCircle, X } from 'lucide-react';

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#ec4899',
  LinkedIn: '#3b82f6',
  Twitter: '#000000',
  Facebook: '#2563eb',
  Other: '#94a3b8',
};

const PLATFORM_STYLES: Record<string, string> = {
  Instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  TikTok: 'bg-slate-900 text-white',
  Twitter: 'bg-sky-500 text-white',
  Facebook: 'bg-blue-600 text-white',
  LinkedIn: 'bg-blue-700 text-white',
};

function getInitials(name: string | null | undefined): string {
  return name ? name.substring(0, 2).toUpperCase() : 'NA';
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
] as const;

function getAvatarBgColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const STATUS_STYLES: Record<string, string> = {
  idea: 'bg-slate-100 text-slate-700',
  draft: 'bg-amber-100 text-amber-700',
  review: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-emerald-100 text-emerald-700',
};

type UpcomingPost = {
  id: string;
  title: string;
  platform: string;
  status: string;
  content?: string | null;
  created_at: string;
  scheduled_date?: string | null;
  clients: { name: string } | null;
};

type Stats = {
  totalClients: number;
  activeCampaigns: number;
  pendingPosts: number;
  totalAssets: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    activeCampaigns: 0,
    pendingPosts: 0,
    totalAssets: 0,
  });
  const [upcomingPosts, setUpcomingPosts] = useState<UpcomingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<UpcomingPost | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      setIsLoading(true);
      try {
        const [clientsRes, campaignsRes, pendingRes, assetsRes, postsRes] = await Promise.all([
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
          supabase.from('content_posts').select('*', { count: 'exact', head: true }).neq('status', 'approved'),
          supabase.from('client_assets').select('*', { count: 'exact', head: true }),
          supabase
            .from('content_posts')
            .select('*, clients(name)')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        setStats({
          totalClients: clientsRes.count ?? 0,
          activeCampaigns: campaignsRes.count ?? 0,
          pendingPosts: pendingRes.count ?? 0,
          totalAssets: assetsRes.count ?? 0,
        });
        setUpcomingPosts((postsRes.data ?? []) as unknown as UpcomingPost[]);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Platform distribution from upcomingPosts
  const platformData = (() => {
    const counts = upcomingPosts.reduce((acc, p) => {
      const platform = p.platform || 'Other';
      acc[platform] = (acc[platform] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        color: PLATFORM_COLORS[name] ?? PLATFORM_COLORS.Other,
      }));
  })();
  const totalForPlatform = platformData.reduce((a, e) => a + e.value, 0);

  // Needs attention: idea or draft
  const needsAttention = upcomingPosts.filter((p) => {
    const s = (p.status ?? 'idea').toLowerCase();
    return s === 'idea' || s === 'draft';
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-8 p-6 lg:p-8">
        {/* Greeting & Quick Actions */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back, Team</h1>
            <p className="mt-1 text-sm text-slate-500">{today}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/clients"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              + New Client
            </Link>
            <Link
              href="/content"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Calendar className="h-4 w-4" />
              View Calendar
            </Link>
          </div>
        </header>

        {/* KPI Metrics - 4 Cards */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Clients</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalClients}</p>
                  <p className="mt-1 text-xs text-slate-400">+2 this week</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Megaphone className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Campaigns</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeCampaigns}</p>
                  <p className="mt-1 text-xs text-slate-400">+2 this week</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Pending Posts</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pendingPosts}</p>
                  <p className="mt-1 text-xs text-slate-400">+2 this week</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Image className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Brand Assets</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalAssets}</p>
                  <p className="mt-1 text-xs text-slate-400">+2 this week</p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Main Dashboard Split */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Section (Span 2) - Pipeline & Content */}
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent / Upcoming Content</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {isLoading ? (
                <div className="flex items-center justify-center gap-3 py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="text-sm text-slate-500">Loading...</span>
                </div>
              ) : upcomingPosts.length > 0 ? (
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/80">
                      <th className="w-40 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Title
                      </th>
                      <th className="w-24 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Platform
                      </th>
                      <th className="w-24 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                      <th className="w-20 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingPosts.map((post, idx) => {
                      const clientName = (Array.isArray(post.clients) ? post.clients[0]?.name : (post.clients as { name?: string })?.name) ?? 'Unknown';
                      const status = (post.status ?? 'idea').toLowerCase();
                      const bgColor = getAvatarBgColor(clientName);
                      const isLast = idx === upcomingPosts.length - 1;
                      return (
                        <tr
                          key={post.id}
                          className={`transition-colors hover:bg-gray-50/50 ${!isLast ? 'border-b border-gray-100' : ''}`}
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-left">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${bgColor}`}>
                                {getInitials(clientName)}
                              </div>
                              <span className="truncate text-sm font-medium text-slate-700">
                                {clientName}
                              </span>
                            </div>
                          </td>
                          <td className="truncate whitespace-nowrap px-6 py-4 text-left text-sm text-slate-900">
                            {post.title}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  PLATFORM_STYLES[post.platform] ?? 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {post.platform}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                  STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {status}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedPost(post)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-sm text-slate-500">No recent or upcoming content yet</p>
                  <Link
                    href="/content"
                    className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View content pipeline →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Right Section (Span 1) - Analytics & To-Dos */}
          <aside className="space-y-6">
            {/* Platform Distribution */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Platform Distribution</h3>
              {platformData.length > 0 ? (
                <div className="space-y-4">
                  {platformData.map((entry) => {
                    const pct = totalForPlatform > 0 ? Math.round((entry.value / totalForPlatform) * 100) : 0;
                    return (
                      <div key={entry.name}>
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{entry.name}</span>
                          <span className="text-slate-500">
                            {entry.value} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: entry.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No content yet</p>
              )}
            </div>

            {/* Needs Attention */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Needs Attention</h3>
              {needsAttention.length > 0 ? (
                <ul className="space-y-3">
                  {needsAttention.slice(0, 5).map((post) => {
                    const clientName = (Array.isArray(post.clients) ? post.clients[0]?.name : (post.clients as { name?: string })?.name) ?? 'Unknown';
                    const status = (post.status ?? 'idea').toLowerCase();
                    return (
                      <li
                        key={post.id}
                        className="flex items-center gap-4 rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{post.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {clientName} · {status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPost(post)}
                          className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          View
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">All caught up</p>
              )}
            </div>
          </aside>
        </div>

        {/* Quick View Modal */}
        {selectedPost && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
            role="presentation"
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-view-title"
            >
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    PLATFORM_STYLES[selectedPost.platform] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedPost.platform}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    STATUS_STYLES[(selectedPost.status ?? 'idea').toLowerCase()] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedPost.status ?? 'idea'}
                </span>
              </div>
              <h2 id="quick-view-title" className="mt-4 text-xl font-bold text-slate-900">
                {selectedPost.title}
              </h2>
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-gray-700 whitespace-pre-wrap">
                {selectedPost.content || 'No content yet'}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
