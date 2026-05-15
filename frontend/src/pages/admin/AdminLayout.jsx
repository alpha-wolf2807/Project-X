/**
 * CARTEX — Admin Layout
 *
 * Full-featured admin sidebar with:
 * - Collapsible navigation
 * - Live activity indicators
 * - Role indicator
 * - Quick actions
 */

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart3,
  Tag, MapPin, MessageSquare, FileText, FolderOpen,
  ChevronLeft, ChevronRight, Bell, Settings, LogOut,
  Menu, X, Shield
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { useUIStore, useNotifStore } from '@store/index';
import { Avatar, Badge } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/admin/coupons', icon: Tag, label: 'Coupons' },
  { to: '/admin/zones', icon: MapPin, label: 'Zones' },
  { to: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { to: '/admin/audit-logs', icon: FileText, label: 'Audit Logs' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const { toggleNotifPanel } = useUIStore();
  const { unreadCount } = useNotifStore();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-5 border-b border-white/10', collapsed && 'justify-center px-3')}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-lg">X</span>
        </div>
        {!collapsed && (
          <div>
            <span className="font-black text-white text-sm">CARTEX</span>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-brand-400" />
              <span className="text-brand-400 text-xs font-medium">Admin</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                isActive
                  ? 'bg-brand-500/15 text-white border border-brand-500/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-brand-400')} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn('p-3 border-t border-white/10 space-y-2', collapsed && 'items-center')}>
        <div className={cn('flex items-center gap-3 p-2', collapsed && 'justify-center')}>
          <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-white/40 text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-accent-red hover:bg-accent-red/10 transition-colors text-sm', collapsed && 'justify-center')}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-surface-1 border-r border-white/10 relative flex-shrink-0"
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-3 border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-60 bg-surface-1 border-r border-white/10 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-6 border-b border-white/10 bg-surface-1 flex-shrink-0">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden btn-ghost p-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button onClick={toggleNotifPanel} className="btn-ghost p-2 relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
            <span className="text-white text-sm font-medium hidden sm:block">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

