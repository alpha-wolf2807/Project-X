/**
 * CARTEX — Customer Pages: Orders, Profile, Cart, Wallet, Wishlist, Complaints
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ChevronRight, Plus, Trash2, User, Phone, Mail, Lock, MapPin, Wallet as WalletIcon, Star, AlertCircle, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ordersApi, userApi, complaintsApi } from '@services/api';
import { useAuthStore } from '@store/authStore';
import { useCart } from '@hooks/index';
import { Button, Input, Badge, OrderStatusBadge, Divider, EmptyState, Avatar } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

// ══════════════════════════════════════════════════════════════
// ORDERS PAGE
// ══════════════════════════════════════════════════════════════
export function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'my', { status }],
    queryFn: () => ordersApi.getMyOrders({ status }),
    select: (d) => d.data,
  });

  const statusTabs = [
    { value: '', label: 'All' },
    { value: 'confirmed', label: 'Active' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-black text-white mb-6">My Orders</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {statusTabs.map(tab => (
          <button key={tab.value} onClick={() => setStatus(tab.value)} className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all', status === tab.value ? 'bg-brand-500 text-white' : 'bg-surface-2 text-white/60 hover:text-white')}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-28 animate-pulse bg-surface-2" />)}</div>
      ) : !data?.orders?.length ? (
        <EmptyState icon="📦" title="No orders yet" description="Start shopping to see your orders here" action={<Button onClick={() => navigate('/products')}>Browse Products</Button>} />
      ) : (
        <div className="space-y-4">
          {data.orders.map((order) => (
            <motion.div key={order._id} whileHover={{ x: 4 }} className="card p-5 cursor-pointer" onClick={() => navigate(`/orders/${order._id}`)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-brand-400 font-mono text-sm font-bold">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-white/60 text-sm">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · ₹{order.pricing?.totalAmount?.toFixed(0)}</p>
                  <p className="text-white/40 text-xs mt-1">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {/* Item thumbnails */}
                  <div className="flex gap-1.5 mt-3">
                    {order.items?.slice(0, 4).map((item) => (
                      <div key={item._id} className="w-10 h-10 rounded-lg bg-surface-2 overflow-hidden border border-white/10">
                        <img src={item.productSnapshot?.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {order.items?.length > 4 && <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-white/40 text-xs">+{order.items.length - 4}</div>}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0 mt-1" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════
export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('profile');
  const [showAddAddress, setShowAddAddress] = useState(false);

  const { register: registerProfile, handleSubmit: handleProfileSubmit } = useForm({
    defaultValues: { name: user?.name, phone: user?.phone },
  });

  const profileMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (data) => { updateUser(data.data.user); toast.success('Profile updated!'); },
    onError: (err) => toast.error(err.message),
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: userApi.getCart,
    select: (d) => d.data,
  });

  const addAddressMutation = useMutation({
    mutationFn: userApi.addAddress,
    onSuccess: () => { queryClient.invalidateQueries(['user-profile']); setShowAddAddress(false); toast.success('Address added!'); },
    onError: (err) => toast.error(err.message),
  });

  const { register: registerAddr, handleSubmit: handleAddrSubmit, reset: resetAddr } = useForm();

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-black text-white mb-8">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          {/* Avatar */}
          <div className="card p-5 text-center mb-4">
            <Avatar src={user?.avatar?.url} name={user?.name} size="xl" className="mx-auto mb-3" />
            <p className="text-white font-bold">{user?.name}</p>
            <p className="text-white/50 text-xs">{user?.email}</p>
            {user?.rewardPoints > 0 && <p className="text-brand-400 text-sm mt-2">🌟 {user.rewardPoints} points</p>}
          </div>
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)} className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all', activeSection === id ? 'bg-brand-500/15 text-white border border-brand-500/30' : 'text-white/60 hover:text-white hover:bg-white/5')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            <div className="card p-6">
              <h2 className="font-bold text-white text-lg mb-6">Personal Information</h2>
              <form onSubmit={handleProfileSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
                <Input label="Full Name" leftIcon={<User className="w-4 h-4" />} {...registerProfile('name')} />
                <Input label="Email" type="email" leftIcon={<Mail className="w-4 h-4" />} value={user?.email} disabled className="opacity-50" />
                <Input label="Phone" leftIcon={<Phone className="w-4 h-4" />} {...registerProfile('phone')} disabled className="opacity-50" />
                <Button type="submit" loading={profileMutation.isPending}>Save Changes</Button>
              </form>
            </div>
          )}

          {activeSection === 'addresses' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-white text-lg">Saved Addresses</h2>
                <Button size="sm" onClick={() => setShowAddAddress(!showAddAddress)} leftIcon={<Plus className="w-4 h-4" />}>Add New</Button>
              </div>

              {showAddAddress && (
                <form onSubmit={handleAddrSubmit((d) => addAddressMutation.mutate(d))} className="card p-4 mb-4 space-y-3 border-brand-500/30">
                  <h3 className="font-semibold text-white text-sm">New Address</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Hostel Name" placeholder="Boys Hostel A" {...registerAddr('hostelName', { required: true })} />
                    <Input label="Room Number" placeholder="204" {...registerAddr('roomNumber', { required: true })} />
                    <Input label="Block (optional)" placeholder="Block B" {...registerAddr('block')} />
                    <Input label="Floor (optional)" placeholder="2nd Floor" {...registerAddr('floor')} />
                  </div>
                  <Input label="Landmark (optional)" placeholder="Near mess hall" {...registerAddr('landmark')} />
                  <div className="flex gap-3">
                    <Button type="submit" size="sm" loading={addAddressMutation.isPending}>Save Address</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setShowAddAddress(false); resetAddr(); }}>Cancel</Button>
                  </div>
                </form>
              )}

              {profile?.addresses?.length === 0 && <EmptyState icon="📍" title="No addresses" description="Add your hostel address for delivery" />}

              <div className="space-y-3">
                {profile?.addresses?.map((addr) => (
                  <div key={addr._id} className="flex items-start gap-3 p-4 bg-surface-2 rounded-xl border border-white/5">
                    <MapPin className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{addr.label || 'Hostel Room'}</p>
                      <p className="text-white/60 text-sm">Room {addr.roomNumber}{addr.block ? `, ${addr.block}` : ''}</p>
                      <p className="text-white/50 text-sm">{addr.hostelName}</p>
                    </div>
                    {addr.isDefault && <Badge variant="brand">Default</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="card p-6">
              <h2 className="font-bold text-white text-lg mb-6">Change Password</h2>
              <ChangePasswordForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ChangePasswordForm = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const mutation = useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: () => { toast.success('Password changed! Please log in again.'); reset(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 max-w-md">
      <Input label="Current Password" type="password" leftIcon={<Lock className="w-4 h-4" />} error={errors.currentPassword?.message} {...register('currentPassword', { required: 'Required' })} />
      <Input label="New Password" type="password" leftIcon={<Lock className="w-4 h-4" />} error={errors.newPassword?.message} {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
      <Input label="Confirm New Password" type="password" leftIcon={<Lock className="w-4 h-4" />} {...register('confirmPassword')} />
      <Button type="submit" loading={mutation.isPending}>Update Password</Button>
    </form>
  );
};

// ══════════════════════════════════════════════════════════════
// CART PAGE
// ══════════════════════════════════════════════════════════════
export function CartPage() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, subtotal, mrpTotal, totalSavings, clearCart } = useCart();

  if (items.length === 0) return (
    <div className="page-container py-20">
      <EmptyState icon="🛒" title="Your cart is empty" description="Add products to start shopping" action={<Button onClick={() => navigate('/products')}>Browse Products</Button>} />
    </div>
  );

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Shopping Cart ({items.length})</h1>
        <button onClick={clearCart} className="text-accent-red text-sm hover:text-red-400 transition-colors flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Clear Cart</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.product._id} className="card p-4 flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
                <img src={item.product.images?.[0]?.url} alt={item.product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{item.product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-brand-400 font-bold">₹{item.product.price}</span>
                  {item.product.mrp > item.product.price && <span className="text-white/30 line-through text-sm">₹{item.product.mrp}</span>}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 bg-surface-2 rounded-xl p-1">
                    <button onClick={() => updateQuantity(item.product._id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-surface-3 text-white hover:bg-brand-500 transition-colors text-lg font-bold flex items-center justify-center">−</button>
                    <span className="text-white font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product._id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-surface-3 text-white hover:bg-brand-500 transition-colors text-lg font-bold flex items-center justify-center">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.product._id)} className="text-white/30 hover:text-accent-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                  <span className="ml-auto text-white font-bold">₹{(item.product.price * item.quantity).toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5 h-fit sticky top-24 space-y-4">
          <h2 className="font-bold text-white text-lg">Order Summary</h2>
          {totalSavings > 0 && <div className="banner-success text-sm">💰 You save ₹{totalSavings.toFixed(0)} vs MRP!</div>}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white/60"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between text-white/60"><span>MRP Total</span><span className="line-through text-white/30">₹{mrpTotal.toFixed(0)}</span></div>
            <div className="flex justify-between text-accent-green"><span>You save</span><span>-₹{totalSavings.toFixed(0)}</span></div>
            <div className="flex justify-between text-white/60"><span>Delivery</span><span className={subtotal >= 199 ? 'text-accent-green' : ''}>{subtotal >= 199 ? 'FREE' : '₹19'}</span></div>
            <Divider />
            <div className="flex justify-between font-black text-white text-base"><span>Total</span><span>₹{(subtotal + (subtotal >= 199 ? 0 : 19)).toFixed(0)}</span></div>
          </div>
          <Button className="w-full" size="lg" onClick={() => navigate('/checkout')}>Proceed to Checkout <ChevronRight className="w-4 h-4" /></Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/products')}>Continue Shopping</Button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WALLET PAGE
// ══════════════════════════════════════════════════════════════
export function WalletPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: userApi.getWallet,
    select: (d) => d.data.wallet,
  });

  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="text-2xl font-black text-white mb-8">My Wallet</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-brand-500 to-red-500 rounded-3xl p-8 mb-6 text-center shadow-glow-orange">
        <WalletIcon className="w-10 h-10 text-white/60 mx-auto mb-3" />
        <p className="text-white/70 text-sm mb-1">Available Balance</p>
        <p className="text-5xl font-black text-white">₹{data?.balance?.toFixed(0) || '0'}</p>
      </div>

      {/* Transaction history */}
      <div className="card p-5">
        <h2 className="font-bold text-white mb-4">Transaction History</h2>
        {!data?.transactions?.length ? (
          <EmptyState icon="💸" title="No transactions" description="Your wallet transactions will appear here" />
        ) : (
          <div className="space-y-3">
            {data.transactions.map((txn, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', txn.type === 'credit' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red')}>
                  {txn.type === 'credit' ? '+' : '-'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{txn.description}</p>
                  <p className="text-white/40 text-xs">{new Date(txn.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span className={cn('font-bold', txn.type === 'credit' ? 'text-accent-green' : 'text-accent-red')}>
                  {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WISHLIST PAGE
// ══════════════════════════════════════════════════════════════
export function WishlistPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: userApi.getWishlist,
    select: (d) => d.data.items,
  });

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-black text-white mb-6">My Wishlist</h1>
      {!data?.length ? (
        <EmptyState icon="❤️" title="Your wishlist is empty" description="Add products to your wishlist to save them for later" action={<Button onClick={() => navigate('/products')}>Browse Products</Button>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.map(({ product }) => product && (
            <div key={product._id}>
              <Link to={`/products/${product.slug}`}>
                <div className="card-product p-3">
                  <img src={product.images?.[0]?.url} alt={product.name} className="w-full aspect-square object-cover rounded-xl mb-2" />
                  <p className="text-white text-sm font-medium line-clamp-1">{product.name}</p>
                  <p className="text-brand-400 font-bold">₹{product.price}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPLAINTS PAGE
// ══════════════════════════════════════════════════════════════
export function ComplaintsPage() {
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'my'],
    queryFn: complaintsApi.getMy,
    select: (d) => d.data.complaints,
  });

  const { register, handleSubmit, reset } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => form.append(k, v));
      return complaintsApi.raise(form);
    },
    onSuccess: () => { queryClient.invalidateQueries(['complaints', 'my']); setShowNew(false); reset(); toast.success('Complaint raised!'); },
    onError: (err) => toast.error(err.message),
  });

  const statusColors = { open: 'warning', assigned: 'info', in_progress: 'brand', resolved: 'success', closed: 'default' };

  return (
    <div className="page-container py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Support & Complaints</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)} leftIcon={<Plus className="w-4 h-4" />}>New Complaint</Button>
      </div>

      {showNew && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card p-5 mb-6 space-y-4 border-brand-500/30">
          <h2 className="font-bold text-white">Raise a Complaint</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 block mb-1.5">Category</label>
              <select className="input" {...register('category', { required: true })}>
                <option value="wrong_item">Wrong Item</option>
                <option value="missing_item">Missing Item</option>
                <option value="damaged">Damaged Product</option>
                <option value="late_delivery">Late Delivery</option>
                <option value="payment">Payment Issue</option>
                <option value="rude_delivery">Rude Delivery</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Order ID (optional)" placeholder="PX-2024-..." {...register('orderId')} />
          </div>
          <Input label="Subject" placeholder="Brief description of the issue" {...register('subject', { required: true })} />
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Description</label>
            <textarea className="input min-h-24 resize-none" placeholder="Describe your issue in detail..." {...register('description', { required: true })} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" size="sm" loading={mutation.isPending} leftIcon={<AlertCircle className="w-4 h-4" />}>Submit Complaint</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNew(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-surface-2" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="✅" title="No complaints" description="You're all good! Raise a complaint if you face any issue." />
      ) : (
        <div className="space-y-4">
          {data.map((complaint) => (
            <div key={complaint._id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-brand-400 font-mono text-xs mb-1">{complaint.ticketNumber}</p>
                  <p className="text-white font-semibold">{complaint.subject}</p>
                  <p className="text-white/50 text-sm mt-0.5 capitalize">{complaint.category.replace('_', ' ')}</p>
                </div>
                <Badge variant={statusColors[complaint.status] || 'default'} className="flex-shrink-0">{complaint.status.replace('_', ' ')}</Badge>
              </div>
              <p className="text-white/50 text-sm line-clamp-2">{complaint.description}</p>
              {complaint.thread?.length > 0 && (
                <div className="mt-3 p-3 bg-surface-2 rounded-xl border border-white/5">
                  <p className="text-white/40 text-xs mb-1">Latest response:</p>
                  <p className="text-white/70 text-sm">{complaint.thread[complaint.thread.length - 1].message}</p>
                </div>
              )}
              <p className="text-white/30 text-xs mt-3">{new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;

