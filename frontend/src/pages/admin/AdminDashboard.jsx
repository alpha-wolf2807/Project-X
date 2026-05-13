/**
 * PROJECT-X — Admin Dashboard
 *
 * Live analytics with animated counters, Recharts graphs,
 * real-time activity feed, and heatmaps.
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Users, ShoppingBag, IndianRupee,
  Truck, AlertCircle, Package, Star
} from 'lucide-react';
import { analyticsApi } from '@services/api';
import { useCountUp } from '@hooks/index';
import { StatCard, Badge, OrderStatusBadge, Skeleton, SectionHeader } from '@components/common/GlobalLoader';

// ── Animated Stat Card with CountUp ───────────────────────────
const AnimatedStat = ({ title, rawValue, prefix = '', suffix = '', icon, color, change }) => {
  const numericValue = parseFloat(rawValue) || 0;
  const count = useCountUp(numericValue);

  const formattedValue = prefix + (numericValue > 9999
    ? `${(count / 1000).toFixed(1)}K`
    : count.toLocaleString('en-IN')) + suffix;

  return (
    <StatCard
      title={title}
      value={formattedValue}
      icon={icon}
      color={color}
      change={change}
    />
  );
};

// ── Custom Tooltip ─────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-white/10 rounded-xl px-4 py-3 shadow-card-hover">
      <p className="text-white/60 text-xs mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {p.name.includes('Revenue') || p.name.includes('₹') ? '₹' : ''}{p.value?.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

// ── Revenue Chart ──────────────────────────────────────────────
const RevenueChart = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'revenue', 'monthly'],
    queryFn: () => analyticsApi.getRevenue({ period: 'monthly' }),
    select: (d) => d.data,
  });

  const chartData = data?.map((d) => ({
    month: new Date(d._id + '-01').toLocaleDateString('en-IN', { month: 'short' }),
    Revenue: Math.round(d.revenue),
    Orders: d.orders,
    Profit: Math.round(d.profit || 0),
  })) || [];

  return (
    <div className="card p-6">
      <SectionHeader title="Revenue Overview" subtitle="Monthly revenue & profit" emoji="📈" />
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
            <Area type="monotone" dataKey="Revenue" stroke="#f97316" fill="url(#revGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f97316' }} />
            <Area type="monotone" dataKey="Profit" stroke="#22c55e" fill="url(#profGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#22c55e' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── Order Analytics ────────────────────────────────────────────
const OrderAnalytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'orders'],
    queryFn: analyticsApi.getOrders,
    select: (d) => d.data,
  });

  const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#eab308'];

  const statusData = data?.statusDistribution?.map((d) => ({
    name: d._id.replace('_', ' '),
    value: d.count,
  })) || [];

  const hourlyData = data?.hourlyPeaks?.map((d) => ({
    hour: `${d._id}:00`,
    Orders: d.count,
  })) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Status Pie */}
      <div className="card p-6">
        <SectionHeader title="Order Status Distribution" emoji="📊" />
        {isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hourly peaks */}
      <div className="card p-6">
        <SectionHeader title="Peak Ordering Hours" subtitle="Last 30 days" emoji="⏰" />
        {isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData.filter((_, i) => i % 2 === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Orders" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ── Hostel Heatmap Table ──────────────────────────────────────
const HostelHeatmap = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'orders'],
    queryFn: analyticsApi.getOrders,
    select: (d) => d.data.hostelHeatmap,
  });

  const maxOrders = Math.max(...(data?.map((h) => h.orderCount) || [1]));

  return (
    <div className="card p-6">
      <SectionHeader title="Hostel-wise Demand" subtitle="Order heatmap" emoji="🏠" />
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {data?.slice(0, 10).map((hostel) => {
            const pct = (hostel.orderCount / maxOrders) * 100;
            return (
              <div key={hostel._id} className="flex items-center gap-3">
                <span className="text-white/70 text-sm w-40 truncate">{hostel._id || 'Unknown'}</span>
                <div className="flex-1 h-7 bg-surface-3 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full bg-gradient-to-r from-brand-500 to-red-500 rounded-lg flex items-center px-2"
                  >
                    {pct > 20 && <span className="text-white text-xs font-bold">{hostel.orderCount}</span>}
                  </motion.div>
                </div>
                <span className="text-white/50 text-sm w-16 text-right">₹{(hostel.revenue / 1000).toFixed(1)}K</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Top Products ──────────────────────────────────────────────
const TopProducts = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'products'],
    queryFn: analyticsApi.getProducts,
    select: (d) => d.data,
  });

  return (
    <div className="card p-6">
      <SectionHeader title="Top Products" emoji="🏆" />
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {data?.topProducts?.slice(0, 8).map((p, i) => (
            <div key={p._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-brand-500 text-white' : 'bg-surface-3 text-white/50'}`}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-white/80 truncate">{p.name}</span>
              <span className="text-brand-400 text-sm font-bold">{p.orderCount} sold</span>
              <span className="text-white/50 text-xs">₹{(p.revenue / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Recent Orders ──────────────────────────────────────────────
const RecentOrders = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboard,
    select: (d) => d.data.recentOrders,
    refetchInterval: 30000,
  });

  return (
    <div className="card p-6">
      <SectionHeader title="Recent Orders" emoji="🕐" subtitle="Live feed" />
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((order) => (
                <tr key={order._id}>
                  <td className="text-brand-400 font-mono text-xs">{order.orderNumber}</td>
                  <td className="text-white/80">{order.customer?.name}</td>
                  <td className="text-white font-semibold">₹{order.pricing?.totalAmount?.toFixed(0)}</td>
                  <td><OrderStatusBadge status={order.status} /></td>
                  <td className="text-white/40 text-xs">
                    {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Admin Dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboard,
    select: (d) => d.data,
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="text-white/50 mt-1">Real-time platform overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStat title="Total Revenue" rawValue={data?.revenue || 0} prefix="₹" icon={<IndianRupee className="w-5 h-5" />} color="brand" />
        <AnimatedStat title="Total Orders" rawValue={data?.totalOrders || 0} icon={<ShoppingBag className="w-5 h-5" />} color="blue" />
        <AnimatedStat title="Customers" rawValue={data?.totalCustomers || 0} icon={<Users className="w-5 h-5" />} color="green" />
        <AnimatedStat title="Platform Profit" rawValue={data?.profit || 0} prefix="₹" icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStat title="Distributors" rawValue={data?.totalDistributors || 0} icon={<Package className="w-5 h-5" />} color="brand" />
        <AnimatedStat title="Delivery Dudes" rawValue={data?.totalDeliveryDudes || 0} icon={<Truck className="w-5 h-5" />} color="green" />
        <AnimatedStat title="Open Complaints" rawValue={data?.pendingComplaints || 0} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <AnimatedStat title="Avg Order Value" rawValue={data?.totalOrders ? Math.round(data.revenue / data.totalOrders) : 0} prefix="₹" icon={<Star className="w-5 h-5" />} color="blue" />
      </div>

      {/* Revenue chart */}
      <RevenueChart />

      {/* Order analytics */}
      <OrderAnalytics />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><HostelHeatmap /></div>
        <TopProducts />
      </div>

      {/* Recent orders */}
      <RecentOrders />
    </div>
  );
}
