'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Plus, X, Loader2, ListTodo, Sparkles, Edit2, Trash2, Search } from 'lucide-react';

const STATUSES = ['todo', 'in-progress', 'done'] as const;
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

const COLUMN_DOTS: Record<string, string> = {
  todo: 'bg-gray-400',
  'in-progress': 'bg-purple-500',
  done: 'bg-emerald-500',
};

const COLUMN_HEADER_BG: Record<string, string> = {
  todo: 'bg-gray-50/50 border-b border-gray-100 rounded-t-xl p-3',
  'in-progress': 'bg-purple-50/30 border-b border-purple-100/50 rounded-t-xl p-3',
  done: 'bg-emerald-50/30 border-b border-emerald-100/50 rounded-t-xl p-3',
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  clients: { name: string } | { name: string }[] | null;
};

type Client = { id: string; name: string };

export default function TasksPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');

  const [form, setForm] = useState({
    title: '',
    client_id: '',
    due_date: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = (task.title?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesClient = selectedClient === 'all' || task.client_id === selectedClient;
    return matchesSearch && matchesClient;
  });

  const uniqueClients = Array.from(
    new Map(
      tasks
        .filter((t) => t.client_id && t.clients)
        .map((t) => {
          const client = Array.isArray(t.clients) ? t.clients[0] : t.clients;
          return [t.client_id, { id: t.client_id, name: client?.name ?? 'Unknown' }];
        })
    ).values()
  );

  const tasksByStatus = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    'in-progress': filteredTasks.filter((t) => t.status === 'in-progress'),
    done: filteredTasks.filter((t) => t.status === 'done'),
  };

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, client_id, due_date, created_at, clients(name)')
      .order('created_at', { ascending: false });
    if (!error) setTasks((data ?? []) as Task[]);
  }

  async function fetchClients() {
    const { data, error } = await supabase.from('clients').select('id, name').order('name');
    if (!error) setClients(data ?? []);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      await Promise.all([fetchTasks(), fetchClients()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId);

    if (error) {
      toast.error('Failed to move task');
      await fetchTasks();
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.client_id) {
      toast.error('Please enter a task title and select a client.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: form.title.trim(),
        status: 'todo',
        client_id: form.client_id,
        due_date: form.due_date?.trim() ? form.due_date : null,
      });
      if (error) {
        console.error('Supabase Error:', error);
        toast.error('Error: ' + error.message);
        return;
      }
      setModalOpen(false);
      setForm({ title: '', client_id: '', due_date: '' });
      await fetchTasks();
      toast.success('Task created!');
    } catch (err) {
      console.error('Create task error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function handleBreakdown(task: Task) {
    setIsBreakingDown(task.id);
    try {
      const res = await fetch('/api/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: task.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to break down task');

      const subtasks = data.subtasks ?? [];
      const newTasks = subtasks.map((title: string) => ({
        title,
        client_id: task.client_id,
        status: 'todo',
      }));

      const { error: insertError } = await supabase.from('tasks').insert(newTasks);
      if (insertError) throw insertError;

      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
      if (deleteError) throw deleteError;

      toast.success('Task broken down magically! ✨');
      await fetchTasks();
    } catch (err) {
      console.error('Breakdown error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to break down task');
    } finally {
      setIsBreakingDown(null);
    }
  }

  async function handleUpdateTask() {
    if (!taskToEdit) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: editTitle })
        .eq('id', taskToEdit.id);
      if (error) throw error;
      toast.success('Task updated!');
      await fetchTasks();
      setTaskToEdit(null);
    } catch (err) {
      console.error('Update task error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update task');
    }
  }

  async function handleDeleteTask() {
    if (!taskToDelete) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) throw error;
      toast.success('Task deleted!');
      await fetchTasks();
      setTaskToDelete(null);
    } catch (err) {
      console.error('Delete task error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }

  function getClientName(task: Task): string {
    const c = task.clients;
    return Array.isArray(c) ? c[0]?.name ?? '' : c?.name ?? '';
  }

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
            <p className="mt-1 text-sm text-slate-500">Manage tasks across all clients</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({ title: '', client_id: '', due_date: '' });
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex min-h-[400px] flex-col rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Loading...</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-24 animate-pulse rounded-xl border border-gray-100 bg-white" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 flex w-full flex-col items-center gap-3 md:flex-row">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
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
                  <option key={client.id} value={client.id ?? ''}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {STATUSES.map((status) => (
                <div
                  key={status}
                  className="flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-gray-100"
                >
                  <div className={`flex items-center justify-between ${COLUMN_HEADER_BG[status]}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${COLUMN_DOTS[status]}`} />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                        {STATUS_LABELS[status]}
                      </h2>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 shadow-sm">
                      {tasksByStatus[status].length}
                    </span>
                  </div>

                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-1 flex-col gap-3 rounded-b-xl bg-gray-50/30 p-2 ${
                          snapshot.isDraggingOver ? 'bg-gray-100/50' : ''
                        }`}
                      >
                        {tasksByStatus[status].map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`group relative cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 ${
                                  dragSnapshot.isDragging
                                    ? 'rotate-1 cursor-grabbing shadow-lg ring-2 ring-indigo-500/20'
                                    : 'cursor-grab hover:-translate-y-1 hover:shadow-md'
                                }`}
                              >
                                <div
                                  className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-gray-100 bg-white/90 p-1 shadow-sm backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaskToEdit(task);
                                      setEditTitle(task.title);
                                    }}
                                    className="rounded p-1 text-gray-400 transition-colors hover:text-indigo-600"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaskToDelete(task);
                                    }}
                                    className="rounded p-1 text-gray-400 transition-colors hover:text-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <p className="font-medium text-gray-900">{task.title}</p>
                                <div className="mt-4 flex items-center justify-between">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {getClientName(task) && (
                                      <span className="w-fit rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                        {getClientName(task)}
                                      </span>
                                    )}
                                    {task.due_date && (
                                      <span className="text-xs text-slate-500">
                                        {new Date(task.due_date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                  {task.status === 'todo' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBreakdown(task);
                                      }}
                                      disabled={isBreakingDown === task.id}
                                      title="AI Breakdown"
                                      className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-600 transition-colors hover:bg-purple-100 hover:text-purple-700 disabled:opacity-50"
                                    >
                                      <Sparkles size={14} />
                                      {isBreakingDown === task.id ? 'Thinking...' : 'Breakdown'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {tasksByStatus[status].length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-gray-400">
                            <ListTodo className="h-10 w-10" />
                            <p className="mt-2 text-sm italic">No tasks</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
              </div>
            </DragDropContext>
          </>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm fade-in duration-200"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="mx-4 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Add Task</h2>
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Task Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Enter task title"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Client</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
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
                      'Save Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {taskToEdit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setTaskToEdit(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Edit Task</h3>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTaskToEdit(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateTask}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {taskToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setTaskToDelete(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Delete Task</h3>
              <p className="mb-6 text-sm text-slate-500">
                Are you sure you want to delete this task?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
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
