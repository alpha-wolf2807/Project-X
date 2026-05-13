/**
 * PROJECT-X — Customer Layout
 *
 * Premium layout with:
 * - Sticky glassmorphism navbar
 * - Animated cart drawer
 * - Search overlay
 * - Notification panel
 * - Mobile bottom navigation
 */

import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, Bell, User, Menu, X, Home,
  Package, Heart, Wallet, MessageSquare, ChevronRight,
  LogOut, Settings, Zap, Star
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { useCartStore, useUIStore, useNotifStore } from '@store/index';
import { useCart, useWishlist, useDebounce, useClickOutside } from '@hooks/index';
import { Avatar, Badge, Button } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';
import { productsApi } from '@services/api';

// ── Cart Drawer ────────────────────────────────────────────────
const CartDrawer = () => {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, subtotal, mrpTotal, totalSavings, totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-1 border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-brand-500" />
                <h2 className="font-bold text-white text-lg">Cart</h2>
                {totalItems > 0 && (
                  <span className="bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <button onClick={closeCart} className="btn-ghost p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-6xl mb-4">🛒</div>
                  <h3 className="text-white font-bold mb-2">Your cart is empty</h3>
                  <p className="text-white/50 text-sm mb-6">Add items to get started</p>
                  <Button onClick={() => { closeCart(); navigate('/products'); }} size="sm">
                    Browse Products
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.product._id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      className="flex gap-3 bg-surface-2 rounded-xl p-3 border border-white/5"
                    >
                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-3 flex-shrink-0">
                        <img
                          src={item.product.images?.[0]?.url || '/placeholder.png'}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-1">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-brand-400 font-bold text-sm">₹{(item.product.effectivePrice || item.product.price).toFixed(0)}</span>
                          {item.product.mrp > item.product.price && (
                            <span className="text-white/30 line-through text-xs">₹{item.product.mrp}</span>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-surface-3 text-white hover:bg-brand-500 transition-colors flex items-center justify-center text-lg font-bold"
                          >
                            −
                          </button>
                          <span className="text-white font-bold text-sm w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-surface-3 text-white hover:bg-brand-500 transition-colors flex items-center justify-center text-lg font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product._id)}
                            className="ml-auto text-white/30 hover:text-accent-red transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-4 border-t border-white/10 space-y-3">
                {/* Savings */}
                {totalSavings > 0 && (
                  <div className="banner-success text-sm flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    You save ₹{totalSavings.toFixed(0)} compared to MRP!
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Delivery</span>
                    <span className={subtotal >= 199 ? 'text-accent-green' : ''}>{subtotal >= 199 ? 'FREE' : '₹19'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-base border-t border-white/10 pt-2">
                    <span>Total</span>
                    <span>₹{(subtotal + (subtotal >= 199 ? 0 : 19)).toFixed(0)}</span>
                  </div>
                </div>

                {subtotal < 199 && (
                  <p className="text-white/40 text-xs text-center">Add ₹{(199 - subtotal).toFixed(0)} more for free delivery</p>
                )}

                <Button className="w-full" onClick={() => { closeCart(); navigate('/checkout'); }}>
                  Proceed to Checkout <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Search Overlay ─────────────────────────────────────────────
const SearchOverlay = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setResults([]); return; }
    setLoading(true);
    productsApi.getAll({ search: debouncedQuery, limit: 6 })
      .then((data) => setResults(data.data.products || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleSelect = (product) => {
    navigate(`/products/${product.slug}`);
    onClose();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="max-w-2xl mx-auto mt-16"
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search snacks, groceries, essentials..."
                className="input pl-12 pr-12 py-4 text-lg bg-surface-1 border-white/20"
              />
              <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            {(results.length > 0 || loading) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 bg-surface-1 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="p-4 text-center text-white/50">Searching...</div>
                ) : (
                  results.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => handleSelect(product)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
                        <img src={product.images?.[0]?.url} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{product.name}</p>
                        <p className="text-brand-400 font-bold text-sm">₹{product.price}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </button>
                  ))
                )}
              </motion.div>
            )}

            {query.length >= 2 && results.length === 0 && !loading && (
              <div className="mt-3 bg-surface-1 border border-white/10 rounded-2xl p-6 text-center text-white/50">
                No results for "{query}"
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Navbar ─────────────────────────────────────────────────────
const Navbar = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { toggleCart, totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { toggleSearch, toggleNotifPanel } = useUIStore();
  const { unreadCount } = useNotifStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  useClickOutside(profileRef, () => setProfileOpen(false));

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <header className={cn(
        'fixed top-0 left-0 right-0 z-30 transition-all duration-300',
        scrolled ? 'glass border-b border-white/10 py-3' : 'py-4'
      )}>
        <div className="page-container flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center shadow-glow-orange">
              <span className="text-white font-black text-lg">X</span>
            </div>
            <span className="font-black text-xl gradient-text hidden sm:block">PROJECT-X</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
            {[
              { to: '/', label: 'Home' },
              { to: '/products', label: 'Shop' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} className="btn-ghost text-sm">{label}</Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setSearchOpen(true)} className="btn-ghost p-2.5">
              <Search className="w-5 h-5" />
            </button>

            {isAuthenticated && (
              <button onClick={toggleNotifPanel} className="btn-ghost p-2.5 relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent-red text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated && (
              <button onClick={() => navigate('/wishlist')} className="btn-ghost p-2.5 relative">
                <Heart className="w-5 h-5" />
                {wishlistItems?.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistItems.length}
                  </span>
                )}
              </button>
            )}

            <button onClick={toggleCart} className="btn-ghost p-2.5 relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>

            {isAuthenticated ? (
              <div ref={profileRef} className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 btn-ghost px-2 py-1.5 rounded-xl">
                  <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
                  <span className="hidden sm:block text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-surface-1 border border-white/10 rounded-2xl overflow-hidden shadow-card-hover"
                    >
                      <div className="p-3 border-b border-white/10">
                        <p className="font-bold text-white text-sm">{user?.name}</p>
                        <p className="text-white/50 text-xs">{user?.email}</p>
                        {user?.rewardPoints > 0 && (
                          <p className="text-brand-400 text-xs mt-1">🌟 {user.rewardPoints} reward points</p>
                        )}
                      </div>
                      {[
                        { to: '/profile', icon: User, label: 'My Profile' },
                        { to: '/orders', icon: Package, label: 'My Orders' },
                        { to: '/wallet', icon: Wallet, label: 'Wallet' },
                        { to: '/complaints', icon: MessageSquare, label: 'Support' },
                      ].map(({ to, icon: Icon, label }) => (
                        <Link key={to} to={to} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                          <Icon className="w-4 h-4" />
                          {label}
                        </Link>
                      ))}
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/auth/login'); useAuthStore.getState().logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent-red hover:bg-accent-red/10 transition-colors border-t border-white/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')}>Login</Button>
                <Button size="sm" onClick={() => navigate('/auth/register')}>Sign Up</Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

// ── Mobile Bottom Nav ──────────────────────────────────────────
const MobileBottomNav = () => {
  const location = useLocation();
  const { toggleCart, totalItems } = useCart();
  const { isAuthenticated } = useAuthStore();

  const items = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/products', icon: Search, label: 'Shop' },
    { action: toggleCart, icon: ShoppingCart, label: 'Cart', badge: totalItems },
    { to: isAuthenticated ? '/orders' : '/auth/login', icon: Package, label: 'Orders' },
    { to: isAuthenticated ? '/profile' : '/auth/login', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden glass border-t border-white/10">
      <div className="flex">
        {items.map(({ to, action, icon: Icon, label, badge }) => {
          const isActive = to && location.pathname === to;
          return (
            <button
              key={label}
              onClick={action || (() => { if (to) window.location.href = to; })}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 transition-colors', isActive ? 'text-brand-500' : 'text-white/50')}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Customer Layout ────────────────────────────────────────────
export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <CartDrawer />

      <main className="pt-20 pb-20 md:pb-0">
        <Outlet />
      </main>

      <MobileBottomNav />
    </div>
  );
}
