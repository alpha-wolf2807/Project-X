/**
 * PROJECT-X — Support Portal: Layout, Dashboard, Complaints, ComplaintDetail
 */

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, LogOut, Bell,
  Clock, CheckCircle, AlertCircle, TrendingDown,
  RefreshCw, ChevronRight, Send, StickyNote, Star
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { complaintsApi } from '@services/api';
import { useAuthStore } from '@store/authStore';
import { useUIStore, useNotifStore } from '@store/index';
import { Button, Badge, Avatar, StatCard, EmptyState, Divider } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

const supportNavItems = [
  { to: '/support/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/support/complaints', icon: MessageSquare, label: 'Complaints' },
];

// ── Support Layout ─────────────────────────────────────────────
export function SupportLayout() {
  const { user, logout } = useAuthStore();
  const { toggleNotifPanel } = useUIStore();
  const { unreadCount } = useNotifStore();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <aside className="w-56 hidden lg:flex flex-col bg-surface-1 border-r border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center">
            <span className="text-white font-black text-lg">X</span>
          </div>
          <div>
            <p className="font-black text-white text-sm">PROJECT-X</p>
            <p className="text-blue-400 text-xs">Support</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {supportNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-brand-500/15 text-white border border-brand-500/30' : 'text-white/50 hover:text-white hover:bg-white/5'
              )}>
                <Icon className={cn('w-4 h-4', isActive && 'text-brand-400')} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 p-2 mb-2">
            <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-blue-400 text-xs">{user?.role}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-accent-red hover:bg-accent-red/10 text-sm transition-colors">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center px-6 border-b border-white/10 bg-surface-1 gap-4 flex-shrink-0">
          <p className="text-white font-bold flex-1">Support Portal</p>
          <button onClick={toggleNotifPanel} className="btn-ghost p-2 relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}

// ── Support Dashboard ──────────────────────────────────────────
export function SupportDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['support-stats'],
    queryFn: () => import('@services/api').then(m => m.default.get('/support/stats')),
    select: (d) => d.data,
    refetchInterval: 60000,
  });

  const { data: urgentComplaints } = useQuery({
    queryKey: ['complaints', 'urgent'],
    queryFn: () => complaintsApi.getAll({ priority: 'urgent', status: 'open', limit: 5 }),
    select: (d) => d.data.complaints,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Support Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Complaint resolution overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Open Complaints" value={stats?.openComplaints || 0} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard title="Resolved Today" value={stats?.resolvedComplaints || 0} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatCard title="Avg Resolution" value={`${stats?.avgResolutionHours || 0}h`} icon={<Clock className="w-5 h-5" />} color="blue" />
      </div>

      {urgentComplaints?.length > 0 && (
        <div className="card p-5 border-accent-red/20">
          <h2 className="font-bold text-accent-red mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Urgent Complaints
          </h2>
          <div className="space-y-2">
            {urgentComplaints.map((c) => (
              <Link key={c._id} to={`/support/complaints/${c._id}`}
                className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl hover:bg-surface-3 transition-colors">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{c.subject}</p>
                  <p className="text-white/50 text-xs">{c.ticketNumber} · {c.customer?.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-bold text-white mb-4">Resolution SLA Guide</h2>
        <div className="space-y-2">
          {[
            { priority: 'Urgent', target: '< 2 hours', color: 'accent-red' },
            { priority: 'High', target: '< 4 hours', color: 'yellow-400' },
            { priority: 'Medium', target: '< 12 hours', color: 'blue-400' },
            { priority: 'Low', target: '< 24 hours', color: 'accent-green' },
          ].map(({ priority, target, color }) => (
            <div key={priority} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <p className={`text-${color} font-semibold text-sm`}>{priority}</p>
              <p className="text-white/60 text-sm">{target}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Support Complaints List ────────────────────────────────────
export function SupportComplaints() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['support-complaints', statusFilter, priorityFilter, page],
    queryFn: () => complaintsApi.getAll({ status: statusFilter, priority: priorityFilter || undefined, page, limit: 20 }),
    select: (d) => d.data,
    refetchInterval: 30000,
  });

  const priorityColor = { low: 'default', medium: 'warning', high: 'error', urgent: 'error' };
  const statusColor = { open: 'warning', assigned: 'info', in_progress: 'brand', waiting_customer: 'default', resolved: 'success', closed: 'default' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Complaints Queue</h1>
        <button onClick={() => refetch()} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1.5 bg-surface-2 p-1 rounded-xl">
          {['open', 'assigned', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all', statusFilter === s ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white')}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input py-1.5 text-xs w-32">
          <option value="">All Priority</option>
          {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-surface-2" />)}</div>
      ) : !data?.complaints?.length ? (
        <EmptyState icon="✅" title={`No ${statusFilter.replace(/_/g, ' ')} complaints`} description="All clear!" />
      ) : (
        <div className="space-y-3">
          {data.complaints.map((complaint) => (
            <motion.button
              key={complaint._id}
              whileHover={{ x: 4 }}
              onClick={() => navigate(`/support/complaints/${complaint._id}`)}
              className="w-full card p-4 text-left hover:border-brand-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-brand-400 font-mono text-xs">{complaint.ticketNumber}</span>
                    <Badge variant={priorityColor[complaint.priority]}>{complaint.priority}</Badge>
                    <Badge variant={statusColor[complaint.status]}>{complaint.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-white font-semibold text-sm">{complaint.subject}</p>
                  <p className="text-white/50 text-xs capitalize mt-0.5">{complaint.category.replace(/_/g, ' ')} · {complaint.customer?.name}</p>
                  <p className="text-white/30 text-xs mt-1">{new Date(complaint.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0 mt-1" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Support Complaint Detail ───────────────────────────────────
export function SupportComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch } = useForm();

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaint-detail', id],
    queryFn: () => complaintsApi.getAll({ limit: 1 }).then(() =>
      import('@services/api').then(m => m.default.get(`/complaints/${id}`))
    ),
    select: (d) => d.data?.complaint,
    enabled: !!id,
  });

  // Fallback: get from list
  const { data: complaintFallback } = useQuery({
    queryKey: ['complaint-single', id],
    queryFn: () => import('@services/api').then(m => m.default.get(`/complaints/${id}`).catch(() => null)),
    select: (d) => d?.data?.complaint || d?.data,
    enabled: !!id,
  });

  const resolvedComplaint = complaint || complaintFallback;

  const updateMutation = useMutation({
    mutationFn: (data) => complaintsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['complaint-single', id]);
      queryClient.invalidateQueries(['support-complaints']);
      toast.success('Complaint updated!');
      reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const aiSuggestions = [
    "Thank you for reaching out. We sincerely apologize for the inconvenience caused. We are investigating this issue and will resolve it within 24 hours.",
    "We understand your frustration and take this matter seriously. A full refund has been processed and should reflect within 3-5 business days.",
    "We have notified the delivery team about this incident. Strict action will be taken and this will not happen again.",
  ];

  const priorityColor = { low: 'default', medium: 'warning', high: 'error', urgent: 'error' };
  const statusColor = { open: 'warning', assigned: 'info', in_progress: 'brand', waiting_customer: 'default', resolved: 'success', closed: 'default' };

  if (isLoading) return (
    <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-6 h-32 animate-pulse bg-surface-2" />)}</div>
  );

  if (!resolvedComplaint) return (
    <div className="text-center py-20">
      <p className="text-white/50">Complaint not found</p>
      <Button onClick={() => navigate('/support/complaints')} className="mt-4">Back to Queue</Button>
    </div>
  );

  const c = resolvedComplaint;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/support/complaints')} className="text-white/50 hover:text-white transition-colors text-sm">
          ← Back
        </button>
        <h1 className="text-xl font-black text-white flex-1">{c.ticketNumber}</h1>
        <div className="flex gap-2">
          <Badge variant={priorityColor[c.priority]}>{c.priority}</Badge>
          <Badge variant={statusColor[c.status]}>{c.status.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Issue details */}
          <div className="card p-5">
            <h2 className="font-bold text-white mb-3">{c.subject}</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-3">{c.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-white/40">
              <span className="capitalize bg-surface-2 px-2 py-1 rounded">Category: {c.category?.replace(/_/g, ' ')}</span>
              <span className="bg-surface-2 px-2 py-1 rounded">Filed: {new Date(c.createdAt).toLocaleString('en-IN')}</span>
              {c.order && <span className="bg-surface-2 px-2 py-1 rounded">Order: {c.order?.orderNumber || c.order}</span>}
            </div>

            {/* Proof images */}
            {c.proofImages?.length > 0 && (
              <div className="mt-4">
                <p className="text-white/50 text-xs mb-2">Proof Images:</p>
                <div className="flex gap-2">
                  {c.proofImages.map((img, i) => (
                    <a key={i} href={img.url} target="_blank" rel="noreferrer">
                      <img src={img.url} alt="" className="w-20 h-20 object-cover rounded-xl border border-white/10 hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation thread */}
          {c.thread?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-white mb-4">Conversation</h2>
              <div className="space-y-4">
                {c.thread.map((msg, i) => {
                  const isSupport = msg.sentByRole === 'support' || msg.sentByRole === 'admin';
                  return (
                    <div key={i} className={cn('flex gap-3', isSupport && 'flex-row-reverse')}>
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', isSupport ? 'bg-blue-500' : 'bg-surface-3 text-white/50')}>
                        {isSupport ? 'S' : 'U'}
                      </div>
                      <div className={cn('max-w-sm', isSupport && 'items-end flex flex-col')}>
                        <p className={cn('text-xs text-white/30 mb-1', isSupport && 'text-right')}>
                          {msg.sentByRole} · {new Date(msg.sentAt).toLocaleString('en-IN')}
                        </p>
                        <div className={cn('px-4 py-2.5 rounded-2xl text-sm', isSupport ? 'bg-blue-500/20 text-blue-100 rounded-tr-sm' : 'bg-surface-2 text-white/80 rounded-tl-sm')}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          <div className="card p-5 border-purple-500/20">
            <h2 className="font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-lg">🤖</span> AI Reply Suggestions
            </h2>
            <div className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <button key={i}
                  onClick={() => reset({ response: s })}
                  className="w-full text-left p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-colors text-sm text-white/70 hover:text-white">
                  <p className="line-clamp-2">{s}</p>
                  <p className="text-purple-400 text-xs mt-1">Click to use</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="card p-5 space-y-4">
            <h2 className="font-bold text-white">Send Response</h2>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Type your response to the customer..."
              {...register('response')}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 block mb-1.5">Update Status</label>
                <select className="input" {...register('status')} defaultValue={c.status}>
                  {['open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1.5">Priority</label>
                <select className="input" {...register('priority')} defaultValue={c.priority}>
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 block mb-1.5 flex items-center gap-2">
                <StickyNote className="w-3.5 h-3.5" /> Internal Note (not visible to customer)
              </label>
              <textarea className="input resize-none" rows={2} placeholder="Team-only notes..." {...register('internalNote')} />
            </div>

            <Button type="submit" loading={updateMutation.isPending} leftIcon={<Send className="w-4 h-4" />}>
              Send Response & Update
            </Button>
          </form>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Customer info */}
          <div className="card p-5">
            <h3 className="font-bold text-white mb-3 text-sm">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center font-bold text-brand-400">
                {c.customer?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{c.customer?.name}</p>
                <p className="text-white/50 text-xs">{c.customer?.email}</p>
                <p className="text-white/50 text-xs">{c.customer?.phone}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="font-bold text-white mb-3 text-sm">Timeline</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Filed</span>
                <span>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
              {c.firstResponseAt && (
                <div className="flex justify-between text-white/60">
                  <span>First Response</span>
                  <span>{new Date(c.firstResponseAt).toLocaleDateString('en-IN')}</span>
                </div>
              )}
              {c.resolvedAt && (
                <div className="flex justify-between text-accent-green">
                  <span>Resolved</span>
                  <span>{new Date(c.resolvedAt).toLocaleDateString('en-IN')}</span>
                </div>
              )}
              {c.firstResponseAt && (
                <div className="flex justify-between text-white/60">
                  <span>Time to First Response</span>
                  <span>{Math.round((new Date(c.firstResponseAt) - new Date(c.createdAt)) / 3600000)}h</span>
                </div>
              )}
            </div>
          </div>

          {/* Internal notes */}
          {c.internalNotes?.length > 0 && (
            <div className="card p-5 border-yellow-500/20">
              <h3 className="font-bold text-yellow-400 mb-3 text-sm flex items-center gap-2">
                <StickyNote className="w-4 h-4" /> Internal Notes
              </h3>
              <div className="space-y-2">
                {c.internalNotes.map((note, i) => (
                  <div key={i} className="bg-yellow-500/10 rounded-xl p-3">
                    <p className="text-white/70 text-xs">{note.note}</p>
                    <p className="text-white/30 text-xs mt-1">{new Date(note.addedAt).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          {c.resolution?.action && (
            <div className="card p-5 border-accent-green/20">
              <h3 className="font-bold text-accent-green mb-2 text-sm">Resolution</h3>
              <p className="text-white/70 text-sm">{c.resolution.action}</p>
              {c.resolution.refundAmount && <p className="text-accent-green text-sm mt-1">Refund: ₹{c.resolution.refundAmount}</p>}
              {c.resolution.customerRating && (
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('w-3.5 h-3.5', i < c.resolution.customerRating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20')} />
                  ))}
                  <span className="text-white/50 text-xs ml-1">Customer rating</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupportLayout;
