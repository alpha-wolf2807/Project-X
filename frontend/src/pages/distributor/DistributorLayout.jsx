/**
 * PROJECT-X — Distributor Portal: Layout, Dashboard, Orders, Team, Inventory
 */

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, Users, Package, LogOut, Bell, TrendingUp, Clock, CheckCircle, AlertCircle, UserCog, MapPin, RefreshCw } from 'lucide-react';
import { useUIStore, useNotifStore } from '@store/index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { distributorApi, adminApi } from '@services/api';
import { useAuthStore } from '@store/authStore';
import { Button, Badge, Avatar, OrderStatusBadge, Modal, Input, StatCard, EmptyState } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

const distNavItems = [
  { to: '/distributor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/distributor/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/distributor/team', icon: Users, label: 'My Team' },
  { to: '/distributor/inventory', icon: Package, label: 'Inventory' },
];

// ── Distributor Layout ─────────────────────────────────────────
export function DistributorLayout() {
  const { user, logout } = useAuthStore();
  const { toggleNotifPanel } = useUIStore();
  const { unreadCount } = useNotifStore();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <aside className="w-56 hidden lg:flex flex-col bg-surface-1 border-r border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center"><span className="text-white font-black text-lg">X</span></div>
          <div>
            <p className="font-black text-white text-sm">PROJECT-X</p>
            <p className="text-brand-400 text-xs">Distributor</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {distNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link key={to} to={to} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive ? 'bg-brand-500/15 text-white border border-brand-500/30' : 'text-white/50 hover:text-white hover:bg-white/5')}>
                <Icon className={cn('w-4 h-4', isActive && 'text-brand-400')} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 p-2 mb-2">
            <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold truncate">{user?.name}</p></div>
          </div>
          <button onClick={() => { logout(); navigate('/auth/login'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-accent-red hover:bg-accent-red/10 text-sm transition-colors">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center px-6 border-b border-white/10 bg-surface-1 gap-4">
          <p className="text-white font-bold flex-1">Distributor Portal</p>
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

// ── Distributor Dashboard ──────────────────────────────────────
export function DistributorDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['distributor-stats'],
    queryFn: distributorApi.getZoneStats,
    select: (d) => d.data,
    refetchInterval: 30000,
  });

  const { data: orders } = useQuery({
    queryKey: ['distributor-orders', 'active'],
    queryFn: () => distributorApi.getOrders({ status: 'confirmed', limit: 5 }),
    select: (d) => d.data.orders,
    refetchInterval: 15000,
  });

  const statusStats = stats?.stats || [];
  const getCount = (s) => statusStats.find(x => x._id === s)?.count || 0;
  const getRevenue = (s) => statusStats.find(x => x._id === s)?.revenue || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Zone: {stats?.zone?.name || 'Loading...'}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Orders" value={getCount('confirmed')} icon={<Clock className="w-5 h-5" />} color="brand" />
        <StatCard title="In Progress" value={getCount('distributor_ordered') + getCount('picked_up') + getCount('out_for_delivery')} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <StatCard title="Delivered Today" value={getCount('delivered')} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatCard title="Zone Revenue" value={`₹${Math.round(getRevenue('delivered') / 1000)}K`} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Incoming Orders</h2>
          <Link to="/distributor/orders" className="text-brand-400 text-sm hover:text-brand-300">View All</Link>
        </div>
        {!orders?.length ? (
          <EmptyState icon="📭" title="No pending orders" description="New orders will appear here" />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="flex items-center gap-4 p-3 bg-surface-2 rounded-xl border border-white/5">
                <div className="flex-1">
                  <p className="text-brand-400 font-mono text-xs">{order.orderNumber}</p>
                  <p className="text-white text-sm font-medium">{order.customer?.name}</p>
                  <p className="text-white/50 text-xs">{order.deliveryAddress?.hostelName}, Room {order.deliveryAddress?.roomNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">₹{order.pricing?.totalAmount?.toFixed(0)}</p>
                  <p className="text-white/40 text-xs">{order.items?.length} items</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Distributor Orders ─────────────────────────────────────────
export function DistributorOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('confirmed');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['distributor-orders', status],
    queryFn: () => distributorApi.getOrders({ status, limit: 30 }),
    select: (d) => d.data.orders,
    refetchInterval: 15000,
  });

  const { data: team } = useQuery({
    queryKey: ['distributor-team'],
    queryFn: distributorApi.getDeliveryDudes,
    select: (d) => d.data.deliveryDudes,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }) => import('@services/api').then(m => m.ordersApi.updateStatus(id, { status, note })),
    onSuccess: () => { queryClient.invalidateQueries(['distributor-orders']); toast.success('Status updated!'); },
    onError: (err) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryDudeId }) => distributorApi.assignDelivery(orderId, { deliveryDudeId }),
    onSuccess: () => { queryClient.invalidateQueries(['distributor-orders']); toast.success('Delivery dude assigned!'); setSelectedOrder(null); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Orders</h1>
        <button onClick={() => refetch()} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {['confirmed', 'distributor_ordered', 'picked_up', 'out_for_delivery', 'delivered', 'failed_delivery'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={cn('px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all', status === s ? 'bg-brand-500 text-white' : 'bg-surface-2 text-white/60 hover:text-white')}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-surface-2" />) :
          !data?.length ? <EmptyState icon="📭" title={`No ${status.replace(/_/g, ' ')} orders`} /> :
          data.map((order) => (
            <div key={order._id} className="card p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-brand-400 font-mono text-xs">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-white font-semibold">{order.customer?.name} <span className="text-white/40 text-sm">· {order.customer?.phone}</span></p>
                  <p className="text-white/50 text-sm">{order.deliveryAddress?.hostelName}, Room {order.deliveryAddress?.roomNumber}</p>
                  <p className="text-white/40 text-xs mt-1">{order.items?.length} items · ₹{order.pricing?.totalAmount?.toFixed(0)}</p>
                  {order.deliveryDude && <p className="text-blue-400 text-xs mt-1">🛵 {order.deliveryDude.name} · {order.deliveryDude.phone}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  {order.status === 'confirmed' && (
                    <Button size="xs" onClick={() => updateStatusMutation.mutate({ id: order._id, status: 'distributor_ordered', note: 'Items procured' })}>
                      Mark Procured
                    </Button>
                  )}
                  {order.status === 'distributor_ordered' && (
                    <Button size="xs" onClick={() => updateStatusMutation.mutate({ id: order._id, status: 'picked_up' })}>
                      Mark Picked Up
                    </Button>
                  )}
                  <Button size="xs" variant="secondary" onClick={() => setSelectedOrder(order)} leftIcon={<UserCog className="w-3 h-3" />}>
                    Assign
                  </Button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Reassign Delivery Dude">
        {selectedOrder && (
          <div className="space-y-3">
            <p className="text-white/60 text-sm">Order: <span className="text-brand-400">{selectedOrder.orderNumber}</span></p>
            {team?.map((dude) => (
              <button key={dude._id} onClick={() => assignMutation.mutate({ orderId: selectedOrder._id, deliveryDudeId: dude._id })}
                className="w-full flex items-center gap-3 p-3 bg-surface-2 rounded-xl hover:bg-surface-3 transition-colors text-left">
                <Avatar src={dude.avatar?.url} name={dude.name} size="sm" />
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{dude.name}</p>
                  <p className="text-white/50 text-xs">{dude.activeOrders || 0} active orders</p>
                </div>
                {dude._id === selectedOrder.deliveryDude?._id && <Badge variant="brand">Current</Badge>}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Distributor Team ───────────────────────────────────────────
export function DistributorTeam() {
  const { data, isLoading } = useQuery({
    queryKey: ['distributor-team'],
    queryFn: distributorApi.getDeliveryDudes,
    select: (d) => d.data.deliveryDudes,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">My Delivery Team</h1>
      {isLoading ? <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-32 animate-pulse bg-surface-2" />)}</div> :
        !data?.length ? <EmptyState icon="🛵" title="No delivery dudes assigned" description="Contact admin to add delivery dudes to your zone" /> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((dude) => (
            <div key={dude._id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={dude.avatar?.url} name={dude.name} size="lg" />
                <div>
                  <p className="text-white font-bold">{dude.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn('w-2 h-2 rounded-full', dude.isActive ? 'bg-accent-green animate-pulse' : 'bg-white/20')} />
                    <span className="text-white/50 text-xs">{dude.isActive ? 'Active' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-surface-2 rounded-xl p-2">
                  <p className="text-xl font-black text-white">{dude.activeOrders || 0}</p>
                  <p className="text-white/40 text-xs">Active</p>
                </div>
                <div className="bg-surface-2 rounded-xl p-2">
                  <p className="text-xl font-black text-brand-400">{dude.rewardPoints || 0}</p>
                  <p className="text-white/40 text-xs">Points</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ── Distributor Inventory ──────────────────────────────────────
export function DistributorInventory() {
  const { data } = useQuery({
    queryKey: ['analytics-products'],
    queryFn: () => import('@services/api').then(m => m.analyticsApi.getProducts()),
    select: (d) => d.data,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Inventory Insights</h1>
      {data?.lowStock?.length > 0 && (
        <div className="card p-5 border-yellow-500/20">
          <h2 className="font-bold text-yellow-400 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Low Stock Alert</h2>
          <div className="space-y-2">
            {data.lowStock.map((p) => (
              <div key={p._id} className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-2 flex-shrink-0">
                  <img src={p.images?.[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{p.name}</p>
                  <p className="text-yellow-400 text-xs">{p.stock} units remaining (threshold: {p.lowStockThreshold})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card p-5">
        <h2 className="font-bold text-white mb-4">Top Ordered Products</h2>
        <div className="space-y-2">
          {data?.topProducts?.slice(0, 10).map((p, i) => (
            <div key={p._id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black', i < 3 ? 'bg-brand-500 text-white' : 'bg-surface-3 text-white/50')}>{i + 1}</span>
              <span className="flex-1 text-white/80 text-sm truncate">{p.name}</span>
              <span className="text-brand-400 text-sm font-bold">{p.orderCount} units</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DistributorLayout;
