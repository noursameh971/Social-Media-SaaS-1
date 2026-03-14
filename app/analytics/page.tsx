'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2, Layers, TrendingUp, BarChart2, CheckCircle, Sparkles } from 'lucide-react';

const PIE_COLORS = ['#6366f1', '#a855f7', '#10b981'] as const; // Indigo, Purple, Emerald

export default function AnalyticsPage() {
  const [platformData, setPlatformData] = useState<{ name: string; count: number }[]>([]);
  const [taskData, setTaskData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [kpis, setKpis] = useState({
    totalContent: 0,
    publishRate: 0,
    topPlatform: 'None',
    taskCompletion: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  async function handleGenerateInsight() {
    setIsGeneratingInsight(true);
    setAiInsight(null);
    try {
      const response = await fetch('/api/agency-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: kpis }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to generate insight');
      setAiInsight(data.insight ?? '');
      toast.success('Insight generated! ✨');
    } catch (err) {
      console.error('Insight error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate insight');
    } finally {
      setIsGeneratingInsight(false);
    }
  }

  useEffect(() => {
    async function fetchAndAggregate() {
      setLoading(true);
      setError(null);
      try {
        const [postsRes, tasksRes] = await Promise.all([
          supabase.from('content_posts').select('platform, status'),
          supabase.from('tasks').select('status'),
        ]);

        if (postsRes.error) throw postsRes.error;
        if (tasksRes.error) throw tasksRes.error;

        const posts = postsRes.data ?? [];
        const tasks = tasksRes.data ?? [];

        const totalPosts = posts.length;
        const publishedPosts = posts.filter((p) => p.status === 'Published').length;
        const publishRate = totalPosts === 0 ? 0 : Math.round((publishedPosts / totalPosts) * 100);

        let topPlatform = 'None';
        if (posts.length > 0) {
          const platformCounts = posts.reduce(
            (acc, post) => {
              if (post.platform) {
                acc[post.platform] = (acc[post.platform] || 0) + 1;
              }
              return acc;
            },
            {} as Record<string, number>
          );
          let maxCount = 0;
          for (const [platform, count] of Object.entries(platformCounts)) {
            if (count > maxCount) {
              maxCount = count;
              topPlatform = platform;
            }
          }
        }

        const totalTasks = tasks.length;
        const doneTasks = tasks.filter((t) => (t.status ?? 'todo').toLowerCase() === 'done').length;
        const taskCompletion = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

        setKpis({ totalContent: totalPosts, publishRate, topPlatform, taskCompletion });

        const platformCountsChart: Record<string, number> = {};
        posts.forEach((p) => {
          const platform = p.platform || 'Other';
          platformCountsChart[platform] = (platformCountsChart[platform] ?? 0) + 1;
        });
        const platformChart = Object.entries(platformCountsChart).map(([name, count]) => ({
          name,
          count,
        }));

        const statusCounts: Record<string, number> = {
          todo: 0,
          'in-progress': 0,
          done: 0,
        };
        tasks.forEach((t) => {
          const status = (t.status ?? 'todo').toLowerCase();
          if (status in statusCounts) {
            statusCounts[status]++;
          } else {
            statusCounts.todo++;
          }
        });
        const taskChart = [
          { name: 'To Do', value: statusCounts.todo, fill: PIE_COLORS[0] },
          { name: 'In Progress', value: statusCounts['in-progress'], fill: PIE_COLORS[1] },
          { name: 'Done', value: statusCounts.done, fill: PIE_COLORS[2] },
        ];

        setPlatformData(platformChart);
        setTaskData(taskChart);
      } catch (err) {
        const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to load analytics';
        setError(message);
        console.error('Analytics fetch error:', err);
        setPlatformData([]);
        setTaskData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAndAggregate();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-200">
      <div className="space-y-8 p-6 lg:p-8">
        <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">Agency Analytics</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Internal stats across content and tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateInsight}
            disabled={isGeneratingInsight}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {isGeneratingInsight ? 'Analyzing Data...' : 'Generate AI Insights'}
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-500 dark:text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/30 px-6 py-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Total Content Output</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{kpis.totalContent}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Publishing Efficiency</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{kpis.publishRate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Top Platform</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{kpis.topPlatform}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Task Completion</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{kpis.taskCompletion}%</p>
                </div>
              </div>
            </div>

            {aiInsight && (
              <div className="relative mb-8 overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 p-6 shadow-sm">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-full bg-white dark:bg-gray-800 p-2 text-purple-500 shadow-sm animate-pulse">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-sm font-bold uppercase tracking-wider text-transparent">
                      Executive AI Summary
                    </h3>
                    <p className="font-medium leading-relaxed text-indigo-800 dark:text-indigo-200">{aiInsight}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition-shadow hover:shadow-md">
              <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-gray-100">Content by Platform</h2>
              <div className="h-[300px] w-full">
                {platformData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        }}
                        formatter={(value: number) => [value, 'Posts']}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} name="Posts" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-gray-400">
                    No content data yet
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition-shadow hover:shadow-md">
              <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-gray-100">Tasks Overview</h2>
              <div className="h-[300px] w-full">
                {taskData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        label={false}
                      >
                        {taskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        }}
                        formatter={(value: number) => [value, 'Tasks']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full min-h-[250px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-6 text-center text-sm text-slate-500 dark:text-gray-400">
                    No tasks data yet
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
