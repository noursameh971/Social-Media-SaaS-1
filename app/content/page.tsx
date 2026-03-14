'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FileText, Search, Loader2, Trash2, AlertTriangle, Plus } from 'lucide-react';

const KANBAN_COLUMNS = [
  { id: 'idea', label: 'Idea', dotColor: 'bg-gray-400', headerBg: 'bg-gray-50/50 border-b border-gray-100' },
  { id: 'draft', label: 'Draft', dotColor: 'bg-amber-500', headerBg: 'bg-amber-50/30 border-b border-amber-100' },
  { id: 'review', label: 'Review', dotColor: 'bg-blue-500', headerBg: 'bg-blue-50/30 border-b border-blue-100' },
  { id: 'published', label: 'Published', dotColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/30 border-b border-emerald-100' },
] as const;

const PLATFORM_STYLES: Record<string, string> = {
  Instagram: 'border border-pink-100 bg-pink-50 text-pink-700',
  LinkedIn: 'border border-blue-100 bg-blue-50 text-blue-700',
  TikTok: 'border border-slate-200 bg-slate-50 text-slate-700',
  Twitter: 'border border-sky-200 bg-sky-50 text-sky-700',
  Facebook: 'border border-blue-200 bg-blue-50 text-blue-700',
};

type Post = {
  id: string;
  title: string;
  platform: string;
  format: string;
  content: string;
  status: string;
  created_at: string;
  client_id: string;
  clients: { name: string } | { name: string }[] | null;
};

export default function ContentPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editToast, setEditToast] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostClientId, setNewPostClientId] = useState('');
  const [newPostPlatform, setNewPostPlatform] = useState('Instagram');
  const [newPostSaving, setNewPostSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!editToast) return;
    const t = setTimeout(() => setEditToast(false), 3000);
    return () => clearTimeout(t);
  }, [editToast]);

  async function fetchPosts() {
    const { data } = await supabase
      .from('content_posts')
      .select('id, title, platform, format, content, status, created_at, client_id, clients(name)')
      .order('created_at', { ascending: false });
    setPosts((data ?? []) as Post[]);
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setClients((data ?? []) as { id: string; name: string }[]);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPosts(), fetchClients()]).finally(() => setLoading(false));
  }, []);

  const filteredPosts = posts.filter((post) => {
    const searchMatch = post.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const clientMatch = selectedClient === 'all' || post.client_id === selectedClient;
    const platformMatch = selectedPlatform === 'all' || post.platform === selectedPlatform;
    return searchMatch && clientMatch && platformMatch;
  });

  const uniqueClients = Array.from(
    new Map(
      posts.filter((p) => p.clients).map((p) => [p.client_id, p.clients])
    ).entries()
  ).map(([id, clients]) => ({
    id,
    name: Array.isArray(clients) ? clients[0]?.name ?? 'Unknown' : (clients as { name?: string })?.name ?? 'Unknown',
  }));

  const uniquePlatforms = [...new Set(posts.map((p) => p.platform).filter(Boolean))].sort();

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;

    setPosts((prev) =>
      prev.map((p) => (p.id === draggableId ? { ...p, status: newStatus } : p))
    );

    const { error } = await supabase
      .from('content_posts')
      .update({ status: newStatus })
      .eq('id', draggableId);

    if (error) {
      toast.error('Failed to move post');
      await fetchPosts();
    }
  };

  function openEditModal(post: Post) {
    setSelectedPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setSelectedPost(null);
    setIsEditModalOpen(false);
  }

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const { error } = await supabase.from('content_posts').delete().eq('id', postToDelete);
      if (error) throw error;
      await fetchPosts();
      toast.success('Post deleted successfully 🗑️');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete post');
    } finally {
      setPostToDelete(null);
    }
  };

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim() || !newPostClientId) {
      toast.error('Please enter a title, content, and select a client.');
      return;
    }
    setNewPostSaving(true);
    try {
      const { error } = await supabase.from('content_posts').insert([
        {
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          client_id: newPostClientId,
          platform: newPostPlatform,
          format: 'Post',
          status: 'idea',
        },
      ]);
      if (error) throw error;
      toast.success('Post created successfully! ✨');
      setIsNewPostModalOpen(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostClientId('');
      setNewPostPlatform('Instagram');
      await fetchPosts();
    } catch (err) {
      console.error('Create post error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setNewPostSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedPost) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ title: editTitle, content: editContent })
        .eq('id', selectedPost.id);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, title: editTitle, content: editContent } : p
        )
      );
      setEditToast(true);
      closeEditModal();
    } catch (err) {
      console.error('Edit save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  }

  if (!isMounted || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <div className="mb-6 flex w-full shrink-0 flex-col gap-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">All Content</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Manage your social media posts</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={() => setIsNewPostModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-gray-100 shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Clients</option>
            {uniqueClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Platforms</option>
            {uniquePlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50 p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid min-w-[900px] gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {KANBAN_COLUMNS.map((col) => {
              const columnPosts = filteredPosts.filter(
                (p) => (p.status ?? 'idea').toLowerCase() === col.id
              );

              return (
                <div
                  key={col.id}
                  className={`flex min-h-[400px] flex-col rounded-2xl overflow-hidden ${columnPosts.length > 0 ? 'bg-gray-50/30 dark:bg-gray-900/30' : ''}`}
                >
                  <div className={`flex items-center justify-between p-3 ${col.headerBg} rounded-t-xl`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-400">
                        {col.label}
                      </h3>
                    </div>
                    <span className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                      {columnPosts.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-1 flex-col gap-3 p-2 rounded-b-xl ${
                          snapshot.isDraggingOver ? 'bg-gray-100/50 dark:bg-gray-800/50' : columnPosts.length > 0 ? 'bg-gray-50/30 dark:bg-gray-900/30' : ''
                        }`}
                      >
                        {columnPosts.map((post, index) => (
                          <Draggable key={post.id} draggableId={post.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => openEditModal(post)}
                                className={`group relative cursor-pointer rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-all duration-200 ${
                                  dragSnapshot.isDragging
                                    ? 'rotate-1 cursor-grabbing shadow-lg ring-2 ring-indigo-500/20'
                                    : 'cursor-grab hover:-translate-y-1 hover:shadow-md'
                                }`}
                              >
                                <div className="mb-2 flex items-start justify-between">
                                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                    {Array.isArray(post.clients) ? post.clients[0]?.name : post.clients?.name ?? 'Unknown Client'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPostToDelete(post.id);
                                    }}
                                    className="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <p className="font-semibold text-slate-900 dark:text-gray-100">{post.title}</p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                                      PLATFORM_STYLES[post.platform] ?? 'border-slate-200 bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    {post.platform}
                                  </span>
                                  <span className="rounded-full border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-2 py-0.5 text-xs text-slate-600 dark:text-gray-400">
                                    {post.format}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {columnPosts.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 py-12">
                            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-400" />
                            <p className="mt-2 text-sm italic text-gray-400 dark:text-gray-500">No posts yet</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {editToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          Changes saved successfully!
        </div>
      )}

      {isEditModalOpen && selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {Array.isArray(selectedPost.clients) ? selectedPost.clients[0]?.name : selectedPost.clients?.name ?? 'Unknown Client'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  PLATFORM_STYLES[selectedPost.platform] ?? 'bg-slate-200 text-slate-700'
                }`}
              >
                {selectedPost.platform}
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-gray-800 px-3 py-1 text-sm text-slate-600 dark:text-gray-400">
                {selectedPost.format}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label htmlFor="edit-content" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-400">
                  Content
                </label>
                <textarea
                  id="edit-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={16}
                  className="h-64 w-full resize-y rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-slate-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewPostModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !newPostSaving && setIsNewPostModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-gray-100">New Post</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label htmlFor="new-post-title" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  id="new-post-title"
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Enter post title"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label htmlFor="new-post-client" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Client
                </label>
                <select
                  id="new-post-client"
                  value={newPostClientId}
                  onChange={(e) => setNewPostClientId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-post-platform" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Platform
                </label>
                <select
                  id="new-post-platform"
                  value={newPostPlatform}
                  onChange={(e) => setNewPostPlatform(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter">Twitter</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-post-content" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Content
                </label>
                <textarea
                  id="new-post-content"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Write your post content..."
                  rows={8}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  disabled={newPostSaving}
                  className="rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newPostSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {newPostSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {postToDelete && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-gray-900/40 dark:bg-black/60 duration-200 backdrop-blur-sm fade-in">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl duration-200 animate-in zoom-in-95 md:p-8">
            <div className="mb-2 flex items-center gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete Post</h3>
              </div>
            </div>
            <p className="mb-6 mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you completely sure? This action cannot be undone and will permanently delete this content.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-red-200 transition-colors hover:bg-red-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
