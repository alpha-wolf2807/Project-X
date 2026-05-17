/**
 * CARTEX — Admin Pages: Users, Orders, Analytics, Coupons, Zones, Complaints, AuditLogs, Categories
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { Search, UserX, UserCheck, AlertTriangle, Plus, Tag, MapPin, MessageSquare, FileText, FolderOpen, Filter, Download, RefreshCw, Users, TrendingUp, Trash2 } from 'lucide-react';
import { adminApi, analyticsApi, couponsApi, zonesApi, complaintsApi, categoriesApi, districtsApi, localitiesApi } from '@services/api';
import { useAuthStore } from '@store/authStore';
import { useDebounce } from '@hooks/index';
import { Button, Input, Badge, Modal, OrderStatusBadge, Avatar, Divider, EmptyState, SectionHeader } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

// ══════════════════════════════════════════════════════════════
// ADMIN USERS PAGE
// ══════════════════════════════════════════════════════════════
export function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.getAll,
    select: (d) => d.data.zones,
    staleTime: 30 * 60 * 1000,
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: districtsApi.getAll,
    select: (d) => d.data.districts,
    staleTime: 30 * 60 * 1000,
  });

  const { register: regSuspend, handleSubmit: handleSuspend, reset: resetSuspend } = useForm();
  const { register: regWarn, handleSubmit: handleWarn, reset: resetWarn } = useForm();
  const { register: regDistrib, handleSubmit: handleDistrib, reset: resetDistrib, watch: watchDistrib } = useForm();
  const { register: regDeliv, handleSubmit: handleDeliv, reset: resetDeliv, watch: watchDeliv, setValue: setDelivValue } = useForm();
  const { register: regSupport, handleSubmit: handleSupport, reset: resetSupport, watch: watchSupport, setValue: setSupportValue } = useForm();

  const selectedDistributorDistrict = watchDistrib('districtId');
  const selectedDeliveryDistrict = watchDeliv('districtId');
  const selectedSupportDistrict = watchSupport('districtId');

  useEffect(() => {
    setDelivValue('localityId', '');
  }, [selectedDeliveryDistrict, setDelivValue]);

  useEffect(() => {
    setSupportValue('localityId', '');
  }, [selectedSupportDistrict, setSupportValue]);

  const { data: deliveryLocalities = [] } = useQuery({
    queryKey: ['localities', selectedDeliveryDistrict],
    enabled: Boolean(selectedDeliveryDistrict),
    queryFn: () => localitiesApi.getByDistrict(selectedDeliveryDistrict),
    select: (d) => d.data.localities,
  });

  const { data: supportLocalities = [] } = useQuery({
    queryKey: ['localities', 'support', selectedSupportDistrict],
    enabled: Boolean(selectedSupportDistrict),
    queryFn: () => localitiesApi.getByDistrict(selectedSupportDistrict),
    select: (d) => d.data.localities,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { search: debouncedSearch, role, status, page }],
    queryFn: () => adminApi.getUsers({ search: debouncedSearch, role, status, page, limit: 20 }),
    select: (d) => d.data,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.suspendUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); toast.success('User suspended.'); setModalType(null); resetSuspend(); },
    onError: (err) => toast.error(err.message),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id) => adminApi.unsuspendUser(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); toast.success('User reactivated.'); },
    onError: (err) => toast.error(err.message),
  });

  const warnMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.warnUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); toast.success('Warning sent.'); setModalType(null); resetWarn(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); toast.success('User deleted.'); setModalType(null); setSelectedUser(null); },
    onError: (err) => toast.error(err.message),
  });

  const createDistribMutation = useMutation({
    mutationFn: adminApi.createDistributor,
    onSuccess: (response) => { 
      queryClient.invalidateQueries(['admin-users']);
      // Reset to page 1 and clear filters to see new user
      setPage(1);
      setRole('distributor');
      setSearch('');
      toast.success(`✅ ${response.data.user.name} created as Distributor!`); 
      setModalType(null); 
      resetDistrib(); 
    },
    onError: (err) => toast.error(`❌ ${err.response?.data?.message || err.message}`),
  });

  const createDelivMutation = useMutation({
    mutationFn: adminApi.createDeliveryDude,
    onSuccess: (response) => { 
      queryClient.invalidateQueries(['admin-users']); 
      // Reset to page 1 and clear filters to see new user
      setPage(1);
      setRole('delivery');
      setSearch('');
      toast.success(`✅ ${response.data.user.name} created as Delivery Dude!`); 
      setModalType(null); 
      resetDeliv(); 
    },
    onError: (err) => toast.error(`❌ ${err.response?.data?.message || err.message}`),
  });

  const createSupportMutation = useMutation({
    mutationFn: adminApi.createSupport,
    onSuccess: (response) => { 
      queryClient.invalidateQueries(['admin-users']); 
      // Reset to page 1 and clear filters to see new user
      setPage(1);
      setRole('support');
      setSearch('');
      toast.success(`✅ ${response.data.user.name} created as Support Agent!`); 
      setModalType(null); 
      resetSupport(); 
    },
    onError: (err) => toast.error(`❌ ${err.response?.data?.message || err.message}`),
  });

  const roleBadge = { admin: 'purple', distributor: 'brand', delivery: 'info', customer: 'success', support: 'warning' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">User Management</h1>
          <p className="text-white/50 text-sm mt-1">{data?.pagination?.total || 0} total users</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setModalType('createDelivery')} leftIcon={<Plus className="w-4 h-4" />}>Add Delivery Dude</Button>
          <Button variant="secondary" size="sm" onClick={() => setModalType('createSupport')} leftIcon={<Plus className="w-4 h-4" />}>Add Support Agent</Button>
          <Button size="sm" onClick={() => setModalType('createDistributor')} leftIcon={<Plus className="w-4 h-4" />}>Add Distributor</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone..." className="input pl-9 py-2.5 text-sm" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input py-2.5 text-sm">
          <option value="">All Roles</option>
          {['admin', 'distributor', 'delivery', 'customer', 'support'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input py-2.5 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 bg-surface-2">
          <p className="text-white/70 text-sm font-medium">
            🔍 Showing <span className="text-white font-bold">{data?.users?.length || 0}</span> users 
            {role && ` • Role: ${role.toUpperCase()}`}
            {search && ` • Search: ${search}`}
            {role && <button onClick={() => setRole('')} className="ml-3 text-brand-400 hover:text-brand-300">Clear filters</button>}
          </p>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>User</th><th>Role</th><th>Status</th><th>District/Zone</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-3 rounded animate-pulse" /></td>)}</tr>
            )) : data?.users && data.users.length > 0 ? data.users.map((user) => (
              <tr key={user._id} className="group hover:bg-surface-2 transition-colors">
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar?.url} name={user.name} size="sm" />
                    <div>
                      <p className="text-white font-medium text-sm">{user.name}</p>
                      <p className="text-white/40 text-xs">{user.email}</p>
                      {user.phone && <p className="text-white/30 text-xs">{user.phone}</p>}
                    </div>
                  </div>
                </td>
                <td><Badge variant={roleBadge[user.role]}>{user.role}</Badge></td>
                <td>
                  <div className="flex flex-col gap-1">
                    {user.suspension?.isSuspended ? (
                      <Badge variant="error">🚫 Suspended</Badge>
                    ) : user.isActive ? (
                      <Badge variant="success">✅ Active</Badge>
                    ) : (
                      <Badge variant="default">⊘ Inactive</Badge>
                    )}
                    {user.warnings?.length > 0 && <Badge variant="warning">⚠️ {user.warnings.length} warnings</Badge>}
                  </div>
                </td>
                <td className="text-white/70 text-sm">
                  {user.district && <p>📍 {user.district}</p>}
                  {user.locality && <p className="text-white/50">└─ {user.locality}</p>}
                  {!user.district && !user.locality && <span className="text-white/40">—</span>}
                </td>
                <td className="text-white/50 text-xs whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setSelectedUser(user); setModalType('warn'); }} className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-500 transition-colors" title="Send warning">
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                    {user.suspension?.isSuspended ? (
                      <button onClick={() => unsuspendMutation.mutate(user._id)} className="w-8 h-8 rounded-lg bg-accent-green/20 hover:bg-accent-green/30 flex items-center justify-center text-accent-green transition-colors" title="Unsuspend user">
                        <UserCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => { setSelectedUser(user); setModalType('suspend'); }} className="w-8 h-8 rounded-lg bg-accent-red/20 hover:bg-accent-red/30 flex items-center justify-center text-accent-red transition-colors" title="Suspend user">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                    {user.role !== 'admin' && currentUser?._id !== user._id && (
                      <button onClick={() => { setSelectedUser(user); setModalType('deleteUser'); }} className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors" title="Delete user">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="text-center py-8">
                  <p className="text-white/40 text-sm">No users found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data?.pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-white/40 text-sm">Page {page} of {data.pagination.pages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={modalType === 'suspend'} onClose={() => setModalType(null)} title={`Suspend ${selectedUser?.name}`}>
        <form onSubmit={handleSuspend((d) => suspendMutation.mutate({ id: selectedUser._id, data: d }))} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Suspension Duration</label>
            <select className="input" {...regSuspend('durationDays')}>
              <option value="">Permanent</option>
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Reason *</label>
            <textarea className="input resize-none" rows={3} placeholder="Reason for suspension..." {...regSuspend('reason', { required: true })} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" loading={suspendMutation.isPending} className="flex-1">Suspend User</Button>
            <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'warn'} onClose={() => setModalType(null)} title={`Warn ${selectedUser?.name}`}>
        <form onSubmit={handleWarn((d) => warnMutation.mutate({ id: selectedUser._id, data: d }))} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Severity</label>
            <select className="input" {...regWarn('severity')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High (3 high warnings = auto-suspend)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Warning Message *</label>
            <textarea className="input resize-none" rows={3} {...regWarn('message', { required: true })} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="warning" loading={warnMutation.isPending} className="flex-1">Send Warning 🔴</Button>
            <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'deleteUser'} onClose={() => setModalType(null)} title={`Delete ${selectedUser?.name}?`}>
        <div className="space-y-4">
          <p className="text-sm text-white/70">This action will permanently delete the user account.</p>
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteUserMutation.isPending} onClick={() => deleteUserMutation.mutate(selectedUser?._id)} className="flex-1">Delete User</Button>
            <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'createDistributor'} onClose={() => setModalType(null)} title="✨ Create Distributor Account">
        <form onSubmit={handleDistrib((d) => {
          if (!d.name || !d.email || !d.phone || !d.password) {
            toast.error('Please fill all required fields');
            return;
          }
          createDistribMutation.mutate(d);
        })} className="space-y-4">
          <Input label="Full Name *" placeholder="e.g., John Doe" {...regDistrib('name', { required: 'Name is required' })} />
          <Input label="Email *" type="email" placeholder="e.g., john@example.com" {...regDistrib('email', { required: 'Email is required' })} />
          <Input label="Phone *" placeholder="e.g., 9876543210" {...regDistrib('phone', { required: 'Phone is required' })} />
          <Input label="Password *" type="password" placeholder="Min 8 characters" {...regDistrib('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Assigned District *</label>
            <select className="input w-full" {...regDistrib('districtId', { required: 'Select a district' })}>
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district._id} value={district._id}>{district.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={createDistribMutation.isPending} disabled={createDistribMutation.isPending} className="w-full">
            {createDistribMutation.isPending ? '⏳ Creating...' : '✅ Create Distributor'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'createDelivery'} onClose={() => setModalType(null)} title="✨ Create Delivery Dude Account">
        <form onSubmit={handleDeliv((d) => {
          if (!d.name || !d.email || !d.phone || !d.password || !d.districtId) {
            toast.error('Please fill all required fields');
            return;
          }
          createDelivMutation.mutate(d);
        })} className="space-y-4">
          <Input label="Full Name *" placeholder="e.g., John Doe" {...regDeliv('name', { required: 'Name is required' })} />
          <Input label="Email *" type="email" placeholder="e.g., john@example.com" {...regDeliv('email', { required: 'Email is required' })} />
          <Input label="Phone *" placeholder="e.g., 9876543210" {...regDeliv('phone', { required: 'Phone is required' })} />
          <Input label="Password *" type="password" placeholder="Min 8 characters" {...regDeliv('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Assigned District *</label>
            <select className="input w-full" {...regDeliv('districtId', { required: 'Select a district' })}>
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district._id} value={district._id}>{district.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Assigned Locality (Optional)</label>
            <select className="input w-full" {...regDeliv('localityId')} disabled={!selectedDeliveryDistrict}>
              <option value="">Select locality</option>
              {deliveryLocalities.map((locality) => (
                <option key={locality._id} value={locality._id}>{locality.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={createDelivMutation.isPending} disabled={createDelivMutation.isPending} className="w-full">
            {createDelivMutation.isPending ? '⏳ Creating...' : '✅ Create Delivery Dude'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'createSupport'} onClose={() => setModalType(null)} title="✨ Create Support Agent">
        <form onSubmit={handleSupport((d) => {
          if (!d.name || !d.email || !d.phone || !d.password || !d.districtId) {
            toast.error('Please fill all required fields');
            return;
          }
          createSupportMutation.mutate(d);
        })} className="space-y-4">
          <Input label="Full Name *" placeholder="e.g., John Doe" {...regSupport('name', { required: 'Name is required' })} />
          <Input label="Email *" type="email" placeholder="e.g., john@example.com" {...regSupport('email', { required: 'Email is required' })} />
          <Input label="Phone *" placeholder="e.g., 9876543210" {...regSupport('phone', { required: 'Phone is required' })} />
          <Input label="Password *" type="password" placeholder="Min 8 characters" {...regSupport('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Assigned District *</label>
            <select className="input w-full" {...regSupport('districtId', { required: 'Select a district' })}>
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district._id} value={district._id}>{district.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Assigned Locality (Optional)</label>
            <select className="input w-full" {...regSupport('localityId')} disabled={!selectedSupportDistrict}>
              <option value="">Select locality</option>
              {supportLocalities.map((locality) => (
                <option key={locality._id} value={locality._id}>{locality.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={createSupportMutation.isPending} disabled={createSupportMutation.isPending} className="w-full">
            {createSupportMutation.isPending ? '⏳ Creating...' : '✅ Create Support Agent'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN ORDERS PAGE
// ══════════════════════════════════════════════════════════════
export function AdminOrders() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { status, page, search }],
    queryFn: () => import('@services/api').then(m => m.default.get('/orders', { params: { status, page, limit: 20, search } })),
    select: (d) => d.data,
  });

  const orders = data?.orders || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">All Orders</h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['', 'pending', 'confirmed', 'distributor_ordered', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={cn('px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all', status === s ? 'bg-brand-500 text-white' : 'bg-surface-2 text-white/60 hover:text-white')}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Order #</th><th>Customer</th><th>Items</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-3 rounded animate-pulse" /></td>)}</tr>
            )) : orders.map((order) => (
              <tr key={order._id}>
                <td><span className="text-brand-400 font-mono text-xs">{order.orderNumber}</span></td>
                <td>
                  <p className="text-white text-sm">{order.customer?.name}</p>
                  <p className="text-white/40 text-xs">{order.deliveryAddress?.hostelName}</p>
                </td>
                <td className="text-white/60 text-sm">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</td>
                <td className="text-white font-bold text-sm">₹{order.pricing?.totalAmount?.toFixed(0)}</td>
                <td><OrderStatusBadge status={order.status} /></td>
                <td className="text-white/50 text-xs">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN ANALYTICS PAGE
// ══════════════════════════════════════════════════════════════
export function AdminAnalytics() {
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: revenue } = useQuery({
    queryKey: ['analytics', 'revenue', period, year],
    queryFn: () => analyticsApi.getRevenue({ period, year }),
    select: (d) => d.data,
  });

  const { data: customers } = useQuery({
    queryKey: ['analytics', 'customers'],
    queryFn: analyticsApi.getCustomers,
    select: (d) => d.data,
  });

  const { data: fraud } = useQuery({
    queryKey: ['analytics', 'fraud'],
    queryFn: analyticsApi.getFraud,
    select: (d) => d.data,
  });

  const revenueChartData = revenue?.map(d => ({
    period: d._id,
    Revenue: Math.round(d.revenue),
    Orders: d.orders,
    Profit: Math.round(d.profit || 0),
    AvgOrder: Math.round(d.avgOrderValue || 0),
  })) || [];

  const customerGrowth = customers?.growthData?.map(d => ({
    month: d._id,
    'New Customers': d.newCustomers,
  })) || [];

  const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Analytics</h1>
        <div className="flex gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input py-2 text-sm">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input py-2 text-sm">
            {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card p-6">
        <SectionHeader title="Revenue & Profit Trend" emoji="📈" />
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={revenueChartData}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="period" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
            <Area type="monotone" dataKey="Revenue" stroke="#f97316" fill="url(#revG)" strokeWidth={2.5} dot={false} />
            <Area type="monotone" dataKey="Profit" stroke="#22c55e" fill="url(#profG)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Customer growth */}
      <div className="card p-6">
        <SectionHeader title="Customer Growth" emoji="👥" />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={customerGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
            <Bar dataKey="New Customers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top spenders */}
      <div className="card p-6">
        <SectionHeader title="Top Spenders" emoji="🏆" />
        <table className="data-table">
          <thead><tr><th>#</th><th>Customer</th><th>Hostel</th><th>Total Spent</th><th>Orders</th><th>Tier</th></tr></thead>
          <tbody>
            {customers?.topSpenders?.map((c, i) => (
              <tr key={c._id}>
                <td className="font-bold text-white/50">{i + 1}</td>
                <td><p className="text-white text-sm">{c.name}</p><p className="text-white/40 text-xs">{c.email}</p></td>
                <td className="text-white/60 text-sm">{c.hostelName}</td>
                <td className="text-brand-400 font-bold">₹{c.totalSpent?.toLocaleString('en-IN')}</td>
                <td className="text-white/60">{c.totalOrders}</td>
                <td><Badge variant={c.loyaltyTier === 'platinum' ? 'purple' : c.loyaltyTier === 'gold' ? 'warning' : c.loyaltyTier === 'silver' ? 'default' : 'success'}>{c.loyaltyTier}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fraud detection */}
      {fraud?.suspiciousUsers?.length > 0 && (
        <div className="card p-6 border-accent-red/20">
          <SectionHeader title="⚠️ Suspicious Users" subtitle="High cancellation rate detected" />
          <table className="data-table">
            <thead><tr><th>User</th><th>Total Orders</th><th>Cancelled</th><th>Cancellation Rate</th></tr></thead>
            <tbody>
              {fraud.suspiciousUsers.map((u) => (
                <tr key={u._id}>
                  <td><p className="text-white text-sm">{u.name}</p><p className="text-white/40 text-xs">{u.email}</p></td>
                  <td className="text-white/60">{u.totalOrders}</td>
                  <td className="text-accent-red">{u.cancelledOrders}</td>
                  <td><Badge variant="error">{(u.cancellationRate * 100).toFixed(0)}%</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN COUPONS PAGE
// ══════════════════════════════════════════════════════════════
export function AdminCoupons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: couponsApi.getAll,
    select: (d) => d.data.coupons,
  });

  const createMutation = useMutation({
    mutationFn: couponsApi.create,
    onSuccess: () => { queryClient.invalidateQueries(['coupons']); toast.success('Coupon created!'); setShowForm(false); reset(); },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => couponsApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries(['coupons']),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Coupons</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} leftIcon={<Plus className="w-4 h-4" />}>Create Coupon</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMutation.mutate({ ...d, value: parseFloat(d.value), minOrderAmount: parseFloat(d.minOrderAmount) || 0, maxDiscountAmount: parseFloat(d.maxDiscountAmount) || undefined, usageLimit: parseInt(d.usageLimit) || null }))} className="card p-6 space-y-4 border-brand-500/30">
          <h2 className="font-bold text-white">New Coupon</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Coupon Code *" placeholder="HOSTEL50" {...register('code', { required: true })} hint="Auto-uppercased" />
            <div>
              <label className="text-sm text-white/60 block mb-1.5">Type *</label>
              <select className="input" {...register('type', { required: true })}>
                <option value="percentage">Percentage Off</option>
                <option value="fixed">Fixed Amount Off</option>
                <option value="free_delivery">Free Delivery</option>
                <option value="cashback">Cashback</option>
              </select>
            </div>
            <Input label="Discount Value *" type="number" step="0.01" placeholder="10 (%) or 50 (₹)" {...register('value', { required: true })} />
            <Input label="Min Order Amount (₹)" type="number" placeholder="0" {...register('minOrderAmount')} />
            <Input label="Max Discount Cap (₹)" type="number" placeholder="Leave blank = no cap" {...register('maxDiscountAmount')} />
            <Input label="Total Usage Limit" type="number" placeholder="Leave blank = unlimited" {...register('usageLimit')} />
            <Input label="Per User Limit" type="number" defaultValue={1} {...register('perUserLimit')} />
            <Input label="Valid Until *" type="datetime-local" {...register('validUntil', { required: true })} />
          </div>
          <Input label="Description (optional)" placeholder="Brief coupon description for customers" {...register('description')} />
          <div className="flex gap-3">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Create Coupon</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-4 h-32 animate-pulse bg-surface-2" />) :
          data?.map((coupon) => {
            const isExpired = new Date(coupon.validUntil) < new Date();
            return (
              <motion.div key={coupon._id} whileHover={{ y: -4 }} className={cn('card p-5 border', coupon.isActive && !isExpired ? 'border-brand-500/20' : 'border-white/5 opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-brand-400 font-black text-lg font-mono tracking-wider">{coupon.code}</p>
                    <p className="text-white/60 text-xs mt-0.5">{coupon.description || coupon.type}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {coupon.isActive && !isExpired ? <Badge variant="success">Active</Badge> : isExpired ? <Badge variant="error">Expired</Badge> : <Badge variant="default">Inactive</Badge>}
                  </div>
                </div>
                <div className="text-2xl font-black text-white mb-3">
                  {coupon.type === 'percentage' ? `${coupon.value}% OFF` : coupon.type === 'fixed' ? `₹${coupon.value} OFF` : coupon.type === 'free_delivery' ? 'Free Delivery' : `₹${coupon.value} Cashback`}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-white/40 mb-3">
                  {coupon.minOrderAmount > 0 && <span>Min ₹{coupon.minOrderAmount}</span>}
                  {coupon.maxDiscountAmount && <span>Max ₹{coupon.maxDiscountAmount} off</span>}
                  <span>Used {coupon.usedCount}/{coupon.usageLimit || '∞'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs">Expires {new Date(coupon.validUntil).toLocaleDateString('en-IN')}</span>
                  <button onClick={() => toggleMutation.mutate({ id: coupon._id, isActive: !coupon.isActive })} className={cn('text-xs font-semibold px-3 py-1 rounded-lg transition-colors', coupon.isActive ? 'bg-accent-red/20 text-accent-red hover:bg-accent-red/30' : 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30')}>
                    {coupon.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </motion.div>
            );
          })
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN COMPLAINTS PAGE
// ══════════════════════════════════════════════════════════════
export function AdminComplaints() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-complaints', statusFilter],
    queryFn: () => complaintsApi.getAll({ status: statusFilter, limit: 30 }),
    select: (d) => d.data.complaints,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => complaintsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-complaints']); toast.success('Complaint updated.'); setSelected(null); reset(); },
    onError: (err) => toast.error(err.message),
  });

  const priorityColor = { low: 'default', medium: 'warning', high: 'error', urgent: 'error' };
  const statusColor = { open: 'warning', assigned: 'info', in_progress: 'brand', resolved: 'success', closed: 'default' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Complaint Management</h1>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {['open', 'assigned', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize', statusFilter === s ? 'bg-brand-500 text-white' : 'bg-surface-2 text-white/60 hover:text-white')}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-4 h-28 animate-pulse bg-surface-2" />) :
          data?.map((complaint) => (
            <button key={complaint._id} onClick={() => setSelected(complaint)} className={cn('card p-4 text-left hover:border-brand-500/30 transition-all', selected?._id === complaint._id && 'border-brand-500/50')}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-brand-400 text-xs font-mono">{complaint.ticketNumber}</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{complaint.subject}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge variant={statusColor[complaint.status]}>{complaint.status.replace('_', ' ')}</Badge>
                  <Badge variant={priorityColor[complaint.priority]}>{complaint.priority}</Badge>
                </div>
              </div>
              <p className="text-white/50 text-xs capitalize">{complaint.category.replace('_', ' ')} · {complaint.customer?.name}</p>
              <p className="text-white/40 text-xs mt-1">{new Date(complaint.createdAt).toLocaleString('en-IN')}</p>
            </button>
          ))
        }
      </div>

      {/* Detail Panel */}
      <Modal isOpen={!!selected} onClose={() => { setSelected(null); reset(); }} title={`Complaint: ${selected?.ticketNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-xl p-4">
              <p className="text-white font-semibold">{selected.subject}</p>
              <p className="text-white/60 text-sm mt-1">{selected.description}</p>
              <p className="text-white/40 text-xs mt-2">By: {selected.customer?.name} · {selected.category.replace('_', ' ')}</p>
            </div>
            {selected.proofImages?.length > 0 && (
              <div className="flex gap-2">{selected.proofImages.map((img, i) => <a key={i} href={img.url} target="_blank" rel="noreferrer"><img src={img.url} alt="" className="w-20 h-20 object-cover rounded-xl border border-white/10" /></a>)}</div>
            )}
            {selected.thread?.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/50 text-xs font-medium">Conversation Thread:</p>
                {selected.thread.map((msg, i) => <div key={i} className="bg-surface-2 rounded-xl p-3"><p className="text-white/40 text-xs mb-1">{msg.sentByRole} · {new Date(msg.sentAt).toLocaleString('en-IN')}</p><p className="text-white text-sm">{msg.message}</p></div>)}
              </div>
            )}
            <Divider />
            <form onSubmit={handleSubmit((d) => updateMutation.mutate({ id: selected._id, data: d }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1.5">Update Status</label>
                  <select className="input" {...register('status')} defaultValue={selected.status}>
                    {['open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-1.5">Priority</label>
                  <select className="input" {...register('priority')} defaultValue={selected.priority}>
                    {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1.5">Reply to Customer</label>
                <textarea className="input resize-none" rows={3} placeholder="Write a response..." {...register('response')} />
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1.5">Internal Note (not visible to customer)</label>
                <textarea className="input resize-none" rows={2} placeholder="Internal notes for team..." {...register('internalNote')} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={updateMutation.isPending} className="flex-1">Update Complaint</Button>
                <Button variant="secondary" onClick={() => { setSelected(null); reset(); }}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN AUDIT LOGS PAGE
// ══════════════════════════════════════════════════════════════
export function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, action }],
    queryFn: () => adminApi.getAuditLogs({ page, limit: 30, action }),
    select: (d) => d.data,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Audit Logs</h1>
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action..." className="input py-2 text-sm w-48" />
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Action</th><th>Resource</th><th>Performed By</th><th>IP</th><th>Time</th></tr></thead>
          <tbody>
            {isLoading ? Array.from({ length: 10 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-3 rounded animate-pulse" /></td>)}</tr>) :
              data?.logs?.map((log) => (
                <tr key={log._id}>
                  <td><span className="font-mono text-brand-400 text-xs">{log.action}</span></td>
                  <td className="text-white/60 text-sm">{log.resource}</td>
                  <td><p className="text-white text-sm">{log.performedBy?.name}</p><p className="text-white/40 text-xs">{log.performedByRole}</p></td>
                  <td className="text-white/40 text-xs font-mono">{log.ipAddress}</td>
                  <td className="text-white/50 text-xs">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {data?.pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-white/40 text-sm">Page {page} of {data.pagination.pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN CATEGORIES PAGE
// ══════════════════════════════════════════════════════════════
export function AdminCategories() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    select: (d) => d.data.categories,
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { queryClient.invalidateQueries(['categories']); toast.success('Category created!'); setShowForm(false); reset(); },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => categoriesApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries(['categories']),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Categories</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} leftIcon={<Plus className="w-4 h-4" />}>Add Category</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="card p-5 space-y-4 border-brand-500/30">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Name *" placeholder="Snacks" {...register('name', { required: true })} />
            <Input label="Slug *" placeholder="snacks" {...register('slug', { required: true })} />
            <Input label="Icon (emoji)" placeholder="🍿" {...register('icon')} />
          </div>
          <Input label="Description" {...register('description')} />
          <div className="flex gap-3">
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-surface-2" />) :
          data?.map((cat) => (
            <div key={cat._id} className={cn('card p-4', !cat.isActive && 'opacity-50')}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{cat.icon || '📦'}</span>
                <div>
                  <p className="text-white font-bold text-sm">{cat.name}</p>
                  <p className="text-white/40 text-xs">{cat.productCount} products</p>
                </div>
              </div>
              <button onClick={() => toggleMutation.mutate({ id: cat._id, isActive: !cat.isActive })} className={cn('text-xs font-medium px-2 py-1 rounded-lg transition-colors w-full text-center', cat.isActive ? 'bg-accent-red/20 text-accent-red hover:bg-accent-red/30' : 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30')}>
                {cat.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN ZONES PAGE
// ══════════════════════════════════════════════════════════════
export function AdminZones() {
  const queryClient = useQueryClient();
  const [showDistrictForm, setShowDistrictForm] = useState(false);
  const [showLocalityForm, setShowLocalityForm] = useState(false);
  const { register: regDistrict, handleSubmit: handleDistrict, reset: resetDistrict } = useForm();
  const { register: regLocality, handleSubmit: handleLocality, reset: resetLocality } = useForm();

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.getAll,
    select: (d) => d.data.zones,
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: districtsApi.getAll,
    select: (d) => d.data.districts,
  });

  const { data: localities = [] } = useQuery({
    queryKey: ['localities'],
    queryFn: localitiesApi.getAll,
    select: (d) => d.data.localities,
  });

  const createDistrictMutation = useMutation({
    mutationFn: districtsApi.create,
    onSuccess: () => { queryClient.invalidateQueries(['districts']); toast.success('District added!'); setShowDistrictForm(false); resetDistrict(); },
    onError: (err) => toast.error(err.message),
  });

  const createLocalityMutation = useMutation({
    mutationFn: localitiesApi.create,
    onSuccess: () => { queryClient.invalidateQueries(['localities']); toast.success('Locality added!'); setShowLocalityForm(false); resetLocality(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteDistrictMutation = useMutation({
    mutationFn: districtsApi.delete,
    onSuccess: () => { queryClient.invalidateQueries(['districts']); toast.success('District removed.'); },
    onError: (err) => toast.error(err.message),
  });

  const deleteLocalityMutation = useMutation({
    mutationFn: localitiesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries(['localities']); toast.success('Locality removed.'); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Region Management</h1>
        <div className="flex gap-3">
          <Button size="sm" onClick={() => setShowLocalityForm(!showLocalityForm)} leftIcon={<Plus className="w-4 h-4" />}>Add Locality</Button>
          <Button size="sm" onClick={() => setShowDistrictForm(!showDistrictForm)} leftIcon={<Plus className="w-4 h-4" />}>Add District</Button>
        </div>
      </div>

      {/* District Form */}
      {showDistrictForm && (
        <form onSubmit={handleDistrict((d) => createDistrictMutation.mutate(d))} className="card p-5 space-y-4 border-brand-500/30">
          <div className="grid grid-cols-2 gap-4">
            <Input label="District Name *" placeholder="Chennai" {...regDistrict('name', { required: true })} />
            <Input label="District Code *" placeholder="CHE" {...regDistrict('code', { required: true })} />
          </div>
          <Input label="Description" {...regDistrict('description')} />
          <div className="flex gap-3">
            <Button type="submit" loading={createDistrictMutation.isPending}>Add District</Button>
            <Button variant="secondary" onClick={() => { setShowDistrictForm(false); resetDistrict(); }}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Locality Form */}
      {showLocalityForm && (
        <form onSubmit={handleLocality((d) => createLocalityMutation.mutate(d))} className="card p-5 space-y-4 border-brand-500/30">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Locality Name *" placeholder="T. Nagar" {...regLocality('name', { required: true })} />
            <Input label="Locality Code *" placeholder="TNG" {...regLocality('code', { required: true })} />
            <div>
              <label className="text-sm text-white/60 block mb-1.5">District *</label>
              <select className="input w-full" {...regLocality('district', { required: 'Select a district' })}>
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district._id} value={district._id}>{district.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Input label="Description" {...regLocality('description')} />
          <div className="flex gap-3">
            <Button type="submit" loading={createLocalityMutation.isPending}>Add Locality</Button>
            <Button variant="secondary" onClick={() => { setShowLocalityForm(false); resetLocality(); }}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Districts Section */}
      <div className="space-y-4">
        <SectionHeader title="Districts" emoji="🏛️" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {districts.map((district) => (
            <div key={district._id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-bold">{district.name}</p>
                  <p className="text-white/40 text-xs font-mono">{district.code}</p>
                </div>
                <button onClick={() => deleteDistrictMutation.mutate(district._id)} className="ml-auto w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-300 transition-colors" title="Delete District">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {district.description && <p className="text-white/60 text-sm">{district.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Localities Section */}
      <div className="space-y-4">
        <SectionHeader title="Localities" emoji="🏘️" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {localities.map((locality) => (
            <div key={locality._id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold">{locality.name}</p>
                  <p className="text-white/40 text-xs font-mono">{locality.code}</p>
                  <p className="text-white/50 text-xs">{locality.district?.name}</p>
                </div>
                <button onClick={() => deleteLocalityMutation.mutate(locality._id)} className="ml-auto w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-300 transition-colors" title="Delete Locality">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {locality.description && <p className="text-white/60 text-sm">{locality.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;

