/**
 * PROJECT-X — Delivery Portal: Layout, Dashboard, Active, History, Earnings
 */

import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Truck, History, IndianRupee, LogOut,
  Bell, MapPin, Phone, CheckCircle, XCircle, Navigation,
  Clock, Star, Package, AlertTriangle, ChevronRight, RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { deliveryApi, ordersApi } from '@services/api';
import { updateDeliveryLocation } from '@services/socket';
import { useSocketEvent, useCountUp } from '@hooks/index';
import { useAuthStore } from '@store/authStore';
import { useUIStore, useNotifStore } from '@store/index';
import { Button, Badge, Avatar, OrderStatusBadge, Modal, StatCard, EmptyState, ProgressBar } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

const delivNavItems = [
  { to: '/delivery/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/delivery/active', icon: Truck, label: 'Active Deliveries' },
  { to: '/delivery/history', icon: History, label: 'History' },
  { to: '/delivery/earnings', icon: IndianRupee, label: 'Earnings' },
];

// ── Delivery Layout ────────────────────────────────────────────
export function DeliveryLayout() {
  const { user, logout } = useAuthStore();
  const { toggleNotifPanel } = useUIStore();
  const { unreadCount } = useNotifStore();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 hidden lg:flex flex-col bg-surface-1 border-r border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center">
            <span className="text-white font-black text-lg">X</span>
          </div>
          <div>
            <p className="font-black text-white text-sm">PROJECT-X</p>
            <p className="text-accent-green text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse inline-block" />
              Delivery
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {delivNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link key={to} to={to} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-brand-500/15 text-white border border-brand-500/30' : 'text-white/50 hover:text-white hover:bg-white/5'
              )}>
                <Icon className={cn('w-4 h-4', isActive && 'text-brand-400')} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 p-2 mb-2">
            <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-accent-green text-xs">🌟 {user?.rewardPoints || 0} pts</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-accent-red hover:bg-accent-red/10 text-sm transition-colors">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/10">
        <div className="flex">
          {delivNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link key={to} to={to} className={cn('flex-1 flex flex-col items-center gap-1 py-3 transition-colors', isActive ? 'text-brand-500' : 'text-white/50')}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center px-6 border-b border-white/10 bg-surface-1 gap-4 flex-shrink-0">
          <p className="text-white font-bold flex-1">Delivery Portal</p>
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
        <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Delivery Dashboard ─────────────────────────────────────────
export function DeliveryDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: deliveryApi.getStats,
    select: (d) => d.data,
    refetchInterval: 60000,
  });

  const { data: activeDeliveries } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: () => deliveryApi.getMyDeliveries({ status: 'out_for_delivery' }),
    select: (d) => d.data.orders,
    refetchInterval: 15000,
  });

  const { data: assignedDeliveries } = useQuery({
    queryKey: ['delivery-assigned'],
    queryFn: () => deliveryApi.getMyDeliveries({ status: 'picked_up' }),
    select: (d) => d.data.orders,
    refetchInterval: 15000,
  });

  const deliveredCount = useCountUp(stats?.totalDelivered || 0);
  const todayCount = useCountUp(stats?.todayDeliveries || 0);

  // Real-time new assignment notification
  useSocketEvent('order:assigned_to_you', (data) => {
    toast.success(`📦 New delivery assigned: ${data.orderNumber}`, { duration: 6000 });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">My Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Your delivery overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -4 }} className="card p-5 text-center">
          <p className="text-3xl font-black text-white">{isLoading ? '--' : deliveredCount}</p>
          <p className="text-white/50 text-sm mt-1">Total Delivered</p>
        </motion.div>
        <motion.div whileHover={{ y: -4 }} className="card p-5 text-center">
          <p className="text-3xl font-black text-accent-green">{isLoading ? '--' : todayCount}</p>
          <p className="text-white/50 text-sm mt-1">Today's Deliveries</p>
        </motion.div>
        <motion.div whileHover={{ y: -4 }} className="card p-5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <p className="text-3xl font-black text-white">{isLoading ? '--' : (stats?.averageRating || 0).toFixed(1)}</p>
          </div>
          <p className="text-white/50 text-sm">Avg Rating</p>
        </motion.div>
        <motion.div whileHover={{ y: -4 }} className="card p-5 text-center bg-brand-500/10 border border-brand-500/20">
          <p className="text-3xl font-black text-brand-400">{isLoading ? '--' : stats?.rewardPoints || 0}</p>
          <p className="text-white/50 text-sm mt-1">Reward Points</p>
        </motion.div>
      </div>

      {/* Active deliveries alert */}
      {activeDeliveries?.length > 0 && (
        <div className="banner-info flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-semibold text-sm">{activeDeliveries.length} delivery in progress</span>
          </div>
          <Link to="/delivery/active">
            <Button size="sm" variant="secondary">View <ChevronRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      )}

      {/* Assigned but not picked */}
      {assignedDeliveries?.length > 0 && (
        <div className="banner-warning flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold text-sm">{assignedDeliveries.length} order(s) waiting to be picked up</span>
          </div>
          <Link to="/delivery/active">
            <Button size="sm" variant="secondary">Pick Up <ChevronRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/delivery/active">
          <motion.div whileHover={{ scale: 1.02 }} className="card p-5 flex items-center gap-4 cursor-pointer hover:border-brand-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <p className="text-white font-bold">Active Deliveries</p>
              <p className="text-white/50 text-sm">{(activeDeliveries?.length || 0) + (assignedDeliveries?.length || 0)} pending</p>
            </div>
          </motion.div>
        </Link>
        <Link to="/delivery/earnings">
          <motion.div whileHover={{ scale: 1.02 }} className="card p-5 flex items-center gap-4 cursor-pointer hover:border-brand-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-accent-green" />
            </div>
            <div>
              <p className="text-white font-bold">Earnings</p>
              <p className="text-white/50 text-sm">View breakdown</p>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}

// ── OTP Verification Component ────────────────────────────────
const OTPVerifier = ({ order, onSuccess }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => ordersApi.verifyOTP(order._id, { otp: otp.join('') }),
    onSuccess: () => {
      toast.success('✅ Delivery verified! Order complete.');
      queryClient.invalidateQueries(['delivery-active']);
      queryClient.invalidateQueries(['delivery-stats']);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleChange = (val, idx) => {
    const clean = val.replace(/\D/, '');
    const next = [...otp];
    next[idx] = clean;
    setOtp(next);
    if (clean && idx < 5) document.getElementById(`dotp-${idx + 1}`)?.focus();
    if (next.every(d => d) && next.join('').length === 6) {
      setTimeout(() => mutation.mutate(), 100);
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`dotp-${idx - 1}`)?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-white/60 text-sm mb-1">Ask customer for their 6-digit delivery OTP</p>
        <p className="text-brand-400 text-xs">OTP expires 24 hours after order confirmation</p>
      </div>
      <div className="flex gap-2 justify-center">
        {otp.map((digit, i) => (
          <input
            key={i}
            id={`dotp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="w-11 h-13 text-center text-xl font-black bg-surface-2 border-2 border-white/10 rounded-xl text-white focus:border-brand-500 focus:outline-none transition-colors"
          />
        ))}
      </div>
      {mutation.isPending && <p className="text-center text-white/50 text-sm animate-pulse">Verifying...</p>}
      {mutation.isError && <p className="text-center text-accent-red text-sm">{mutation.error?.message}</p>}
      <Button
        className="w-full"
        onClick={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={otp.join('').length !== 6}
      >
        Verify & Complete Delivery
      </Button>
    </div>
  );
};

// ── Active Deliveries Page ─────────────────────────────────────
export function DeliveryActive() {
  const queryClient = useQueryClient();
  const [otpModal, setOtpModal] = useState(null);
  const [locationTracking, setLocationTracking] = useState({});

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['delivery-active-all'],
    queryFn: async () => {
      const [picked, active] = await Promise.all([
        deliveryApi.getMyDeliveries({ status: 'picked_up' }),
        deliveryApi.getMyDeliveries({ status: 'out_for_delivery' }),
      ]);
      return [...(active.data.orders || []), ...(picked.data.orders || [])];
    },
    refetchInterval: 20000,
  });

  // Real-time new assignment
  useSocketEvent('order:assigned_to_you', () => {
    refetch();
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }) => ordersApi.updateStatus(id, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries(['delivery-active-all']);
      queryClient.invalidateQueries(['delivery-stats']);
      toast.success('Status updated!');
    },
    onError: (err) => toast.error(err.message),
  });

  // GPS location tracking
  const startTracking = (orderId) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateDeliveryLocation(orderId, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    setLocationTracking(prev => ({ ...prev, [orderId]: watchId }));
    toast.success('📍 Location tracking started');
  };

  const stopTracking = (orderId) => {
    const watchId = locationTracking[orderId];
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setLocationTracking(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      toast.success('Location tracking stopped');
    }
  };

  const getNextStatus = (current) => {
    const flow = { picked_up: 'out_for_delivery' };
    return flow[current];
  };

  const getNextStatusLabel = (current) => {
    const labels = { picked_up: 'Mark Out for Delivery', out_for_delivery: 'Verify OTP & Complete' };
    return labels[current];
  };

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-36 animate-pulse bg-surface-2" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Active Deliveries</h1>
        <button onClick={() => refetch()} className="btn-ghost p-2">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!orders?.length ? (
        <EmptyState
          icon="🛵"
          title="No active deliveries"
          description="New delivery assignments will appear here"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isTracking = !!locationTracking[order._id];
            const nextStatus = getNextStatus(order.status);

            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5 border border-white/10 hover:border-brand-500/30 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-brand-400 font-mono text-xs">{order.orderNumber}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-white font-bold text-lg">{order.deliveryAddress?.hostelName}</p>
                    <p className="text-white/60 text-sm">Room {order.deliveryAddress?.roomNumber}
                      {order.deliveryAddress?.block ? `, Block ${order.deliveryAddress.block}` : ''}
                      {order.deliveryAddress?.floor ? `, ${order.deliveryAddress.floor} Floor` : ''}
                    </p>
                    {order.deliveryAddress?.landmark && (
                      <p className="text-white/40 text-xs mt-0.5">📍 Near: {order.deliveryAddress.landmark}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-xl">₹{order.pricing?.totalAmount?.toFixed(0)}</p>
                    <p className="text-white/40 text-xs">{order.items?.length} items</p>
                  </div>
                </div>

                {/* Customer contact */}
                <div className="flex items-center gap-4 p-3 bg-surface-2 rounded-xl mb-4">
                  <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-400 font-bold">{order.customer?.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{order.customer?.name}</p>
                  </div>
                  <a href={`tel:${order.customer?.phone}`}
                    className="w-9 h-9 rounded-xl bg-accent-green/20 flex items-center justify-center text-accent-green hover:bg-accent-green/30 transition-colors">
                    <Phone className="w-4 h-4" />
                  </a>
                  <a href={`https://maps.google.com/?q=${order.deliveryAddress?.hostelName}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/30 transition-colors">
                    <MapPin className="w-4 h-4" />
                  </a>
                </div>

                {/* Items preview */}
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                  {order.items?.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-2">
                        <img src={item.productSnapshot?.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-white/40 text-xs text-center mt-0.5">×{item.quantity}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {/* GPS Toggle */}
                  <button
                    onClick={() => isTracking ? stopTracking(order._id) : startTracking(order._id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                      isTracking ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' : 'bg-surface-3 text-white/60 hover:text-white'
                    )}
                  >
                    <Navigation className={cn('w-4 h-4', isTracking && 'animate-pulse')} />
                    {isTracking ? 'Tracking On' : 'Start GPS'}
                  </button>

                  {/* Next status action */}
                  {nextStatus && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ id: order._id, status: nextStatus })}
                      className="flex-1"
                    >
                      {getNextStatusLabel(order.status)}
                    </Button>
                  )}

                  {/* OTP Verify (out_for_delivery) */}
                  {order.status === 'out_for_delivery' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setOtpModal(order)}
                      leftIcon={<CheckCircle className="w-4 h-4" />}
                    >
                      Enter OTP
                    </Button>
                  )}

                  {/* Failed delivery */}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => {
                        if (confirm('Mark as failed delivery?')) {
                          updateStatusMutation.mutate({ id: order._id, status: 'failed_delivery', note: 'Customer not available' });
                        }
                      }}
                      className="w-9 h-9 rounded-xl bg-accent-red/20 flex items-center justify-center text-accent-red hover:bg-accent-red/30 transition-colors flex-shrink-0"
                      title="Failed delivery"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* OTP Modal */}
      <Modal isOpen={!!otpModal} onClose={() => setOtpModal(null)} title="Verify Delivery OTP">
        {otpModal && (
          <OTPVerifier order={otpModal} onSuccess={() => setOtpModal(null)} />
        )}
      </Modal>
    </div>
  );
}

// ── Delivery History Page ──────────────────────────────────────
export function DeliveryHistory() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-history', page],
    queryFn: () => deliveryApi.getMyDeliveries({ status: 'delivered' }),
    select: (d) => d.data,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Delivery History</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse bg-surface-2" />)}
        </div>
      ) : !data?.orders?.length ? (
        <EmptyState icon="📦" title="No deliveries yet" description="Completed deliveries will appear here" />
      ) : (
        <div className="space-y-3">
          {data.orders.map((order) => (
            <div key={order._id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-accent-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-brand-400 font-mono text-xs">{order.orderNumber}</p>
                <p className="text-white font-medium text-sm">{order.deliveryAddress?.hostelName}, Room {order.deliveryAddress?.roomNumber}</p>
                <p className="text-white/40 text-xs">
                  {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold">₹{order.pricing?.totalAmount?.toFixed(0)}</p>
                {order.rating?.score && (
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 text-xs">{order.rating.score}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delivery Earnings Page ─────────────────────────────────────
export function DeliveryEarnings() {
  const { data: stats } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: deliveryApi.getStats,
    select: (d) => d.data,
  });

  const rewardTiers = [
    { label: 'Bronze', min: 0, max: 500, color: 'from-yellow-700 to-yellow-600' },
    { label: 'Silver', min: 500, max: 1000, color: 'from-gray-400 to-gray-300' },
    { label: 'Gold', min: 1000, max: 2000, color: 'from-yellow-500 to-yellow-400' },
    { label: 'Platinum', min: 2000, max: 5000, color: 'from-brand-500 to-red-500' },
  ];

  const currentPoints = stats?.rewardPoints || 0;
  const currentTier = rewardTiers.findLast((t) => currentPoints >= t.min) || rewardTiers[0];
  const nextTier = rewardTiers.find((t) => currentPoints < t.max) || rewardTiers[rewardTiers.length - 1];
  const progressToNext = nextTier ? ((currentPoints - (nextTier.min || 0)) / (nextTier.max - (nextTier.min || 0))) * 100 : 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Earnings & Rewards</h1>

      {/* Reward points card */}
      <div className={`bg-gradient-to-br ${currentTier.color} rounded-3xl p-8 text-center shadow-glow-orange`}>
        <p className="text-white/70 text-sm mb-1">{currentTier.label} Tier</p>
        <p className="text-6xl font-black text-white">{currentPoints.toLocaleString()}</p>
        <p className="text-white/80 mt-1">Reward Points</p>
        {nextTier && nextTier.label !== currentTier.label && (
          <div className="mt-4">
            <div className="flex justify-between text-white/60 text-xs mb-1">
              <span>{currentTier.label}</span>
              <span>{nextTier.label} at {nextTier.max} pts</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(progressToNext, 100)}%` }} />
            </div>
            <p className="text-white/70 text-xs mt-1">{nextTier.max - currentPoints} points to {nextTier.label}</p>
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">How to Earn Points</h2>
        <div className="space-y-3">
          {[
            { action: 'Complete a delivery', points: '+10 pts' },
            { action: 'Get a 5-star rating', points: '+20 pts' },
            { action: 'Zero failed deliveries in a week', points: '+50 pts' },
            { action: 'Deliver 10 orders in a day', points: '+100 pts' },
          ].map(({ action, points }) => (
            <div key={action} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <p className="text-white/70 text-sm">{action}</p>
              <p className="text-accent-green font-bold text-sm">{points}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 text-center">
          <p className="text-3xl font-black text-white">{stats?.totalDelivered || 0}</p>
          <p className="text-white/50 text-sm mt-1">Total Deliveries</p>
        </div>
        <div className="card p-5 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <p className="text-3xl font-black text-white">{(stats?.averageRating || 0).toFixed(1)}</p>
          </div>
          <p className="text-white/50 text-sm mt-1">Average Rating</p>
        </div>
      </div>
    </div>
  );
}

export default DeliveryLayout;
