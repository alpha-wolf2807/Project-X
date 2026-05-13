/**
 * PROJECT-X — Common UI Components
 */

import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, X } from 'lucide-react';
import { forwardRef } from 'react';

export const cn = (...inputs) => twMerge(clsx(inputs));

// ── GlobalLoader ───────────────────────────────────────────────
export default function GlobalLoader() {
  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center shadow-glow-orange animate-pulse-glow">
            <span className="text-white font-black text-2xl">X</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-500 to-red-500 opacity-20 blur-sm animate-ping" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-500"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────
export const Button = forwardRef(({
  children, variant = 'primary', size = 'md', loading = false,
  className, disabled, leftIcon, rightIcon, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-glow-orange rounded-xl',
    secondary: 'bg-surface-3 hover:bg-surface-4 text-white border border-white/10 hover:border-white/20 rounded-xl',
    ghost: 'text-white/70 hover:text-white hover:bg-white/5 rounded-lg',
    danger: 'bg-accent-red hover:bg-red-600 text-white rounded-xl',
    outline: 'border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white rounded-xl',
    success: 'bg-accent-green hover:bg-green-600 text-white rounded-xl',
  };

  const sizes = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
    icon: 'w-10 h-10',
  };

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
Button.displayName = 'Button';

// ── Input ──────────────────────────────────────────────────────
export const Input = forwardRef(({
  label, error, hint, leftIcon, rightIcon, className, ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'input',
            leftIcon && 'pl-11',
            rightIcon && 'pr-11',
            error && 'border-accent-red focus:border-accent-red focus:ring-accent-red/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-accent-red text-xs">{error}</p>}
      {hint && !error && <p className="text-white/30 text-xs">{hint}</p>}
    </div>
  );
});
Input.displayName = 'Input';

// ── Skeleton ──────────────────────────────────────────────────
export const Skeleton = ({ className, ...props }) => (
  <div className={cn('skeleton', className)} {...props} />
);

export const ProductCardSkeleton = () => (
  <div className="card p-4 space-y-3">
    <Skeleton className="aspect-square rounded-xl w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-3 px-4 border-b border-white/5">
        <Skeleton className="h-4 w-full rounded" />
      </td>
    ))}
  </tr>
);

// ── Badge ──────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-surface-3 text-white/70',
    success: 'bg-accent-green/20 text-accent-green border border-accent-green/30',
    error: 'bg-accent-red/20 text-accent-red border border-accent-red/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    brand: 'bg-brand-500/20 text-brand-400 border border-brand-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  };

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
};

// ── Modal ──────────────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn('modal-content w-full', sizes[size])}
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Empty State ────────────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-6xl mb-4">{icon || '📭'}</div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    {description && <p className="text-white/50 text-sm max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────
export const StatCard = ({ title, value, change, icon, color = 'brand', loading }) => {
  const colors = {
    brand: 'from-brand-500/20 to-brand-600/10 border-brand-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  };

  const iconColors = {
    brand: 'bg-brand-500/20 text-brand-400',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className={cn('p-5 rounded-2xl border bg-gradient-to-br', colors[color])}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-sm font-medium">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-2" />
          ) : (
            <p className="text-2xl font-black text-white mt-1">{value}</p>
          )}
          {change !== undefined && !loading && (
            <p className={cn('text-xs mt-1 font-medium', change >= 0 ? 'text-accent-green' : 'text-accent-red')}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconColors[color])}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Order Status Badge ────────────────────────────────────────
export const OrderStatusBadge = ({ status }) => {
  const config = {
    pending: { label: 'Pending', variant: 'warning' },
    confirmed: { label: 'Confirmed', variant: 'info' },
    distributor_ordered: { label: 'Procuring', variant: 'info' },
    picked_up: { label: 'Picked Up', variant: 'brand' },
    out_for_delivery: { label: 'Out for Delivery', variant: 'brand' },
    delivered: { label: 'Delivered', variant: 'success' },
    failed_delivery: { label: 'Failed Delivery', variant: 'error' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    refund_initiated: { label: 'Refund Initiated', variant: 'warning' },
    refunded: { label: 'Refunded', variant: 'success' },
  };

  const cfg = config[status] || { label: status, variant: 'default' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

// ── Price Display ─────────────────────────────────────────────
export const PriceDisplay = ({ price, mrp, size = 'md' }) => {
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl', xl: 'text-3xl' };

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={cn('font-black text-white', sizes[size])}>
        ₹{price.toFixed(0)}
      </span>
      {mrp && mrp > price && (
        <>
          <span className="text-white/40 line-through text-sm">₹{mrp.toFixed(0)}</span>
          <span className="badge-discount text-xs">{discount}% off</span>
        </>
      )}
    </div>
  );
};

// ── Divider ────────────────────────────────────────────────────
export const Divider = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 border-t border-white/10" />
    {label && <span className="text-white/30 text-xs">{label}</span>}
    <div className="flex-1 border-t border-white/10" />
  </div>
);

// ── Avatar ─────────────────────────────────────────────────────
export const Avatar = ({ src, name, size = 'md', className }) => {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className={cn('rounded-full bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center font-bold text-white flex-shrink-0 overflow-hidden', sizes[size], className)}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
};

// ── Loading Spinner ────────────────────────────────────────────
export const Spinner = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return <Loader2 className={cn('animate-spin text-brand-500', sizes[size], className)} />;
};

// ── Section Header ─────────────────────────────────────────────
export const SectionHeader = ({ title, subtitle, action, emoji }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        {title}
      </h2>
      {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ── Tabs ────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 bg-surface-2 p-1 rounded-xl">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={cn(
          'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          active === tab.value
            ? 'bg-brand-500 text-white shadow-glow-orange'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ── Progress Bar ──────────────────────────────────────────────
export const ProgressBar = ({ value, max = 100, color = 'brand', showLabel }) => {
  const pct = Math.min((value / max) * 100, 100);
  const colors = { brand: 'bg-brand-500', green: 'bg-accent-green', red: 'bg-accent-red', blue: 'bg-blue-500' };

  return (
    <div className="space-y-1">
      <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colors[color])}
        />
      </div>
      {showLabel && <p className="text-xs text-white/50">{pct.toFixed(0)}%</p>}
    </div>
  );
};

// ── Table ──────────────────────────────────────────────────────
export const Table = ({ headers, children, loading, emptyState }) => (
  <div className="overflow-x-auto">
    <table className="data-table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={headers.length} />)
          : children}
      </tbody>
    </table>
    {!loading && !children?.length && emptyState}
  </div>
);
