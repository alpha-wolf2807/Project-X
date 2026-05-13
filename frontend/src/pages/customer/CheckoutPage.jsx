/**
 * PROJECT-X — Checkout Page
 * Address selection, coupon, Razorpay payment, order confirmation
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Tag, CreditCard, ChevronRight, Plus, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userApi, ordersApi, paymentsApi, couponsApi } from '@services/api';
import { useCartStore } from '@store/index';
import { Button, Input, Divider, Badge } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

// Load Razorpay SDK
const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cartStore = useCartStore();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: address, 2: payment, 3: success

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: userApi.getCart,
    select: (d) => d.data.cart,
  });

  const { data: profile } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => import('@services/api').then(m => m.authApi.getMe()),
    select: (d) => d.data.customerProfile,
  });

  const addresses = profile?.addresses || [];
  const cartItems = cartData || cartStore.items;
  const getItemUnitPrice = (item) => item.product?.effectivePrice ?? item.product?.price ?? item.priceAtAdd ?? 0;
  const subtotal = cartItems.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0);
  const mrpTotal = cartItems.reduce((sum, i) => sum + (i.product?.mrp || 0) * i.quantity, 0);
  const deliveryFee = subtotal >= 199 ? 0 : 19;
  const platformFee = 2;
  const couponDiscount = appliedCoupon?.discount || 0;
  const totalAmount = subtotal + deliveryFee + platformFee - couponDiscount;

  // Validate coupon
  const couponMutation = useMutation({
    mutationFn: () => couponsApi.validate({ code: couponCode, orderAmount: subtotal }),
    onSuccess: (data) => {
      setAppliedCoupon(data.data.coupon);
      toast.success(`Coupon applied! You save ₹${data.data.coupon.discount}`);
    },
    onError: (err) => toast.error(err.message || 'Invalid coupon'),
  });

  // Place order & pay
  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    if (cartItems.length === 0) { toast.error('Your cart is empty'); return; }

    setIsProcessing(true);
    try {
      // 1. Place order in DB
      const orderItems = cartItems.map((i) => ({
        productId: i.product._id || i.product,
        quantity: i.quantity,
      }));

      const orderRes = await ordersApi.place({
        items: orderItems,
        deliveryAddressId: selectedAddress,
        paymentMethod,
        couponCode: appliedCoupon?.code,
      });

      const { orderId, totalAmount: finalAmount } = orderRes.data;

      if (paymentMethod === 'razorpay') {
        // 2. Create Razorpay order
        const loaded = await loadRazorpay();
        if (!loaded) throw new Error('Razorpay SDK failed to load');

        const rzpOrderRes = await paymentsApi.createRazorpayOrder({ orderId });
        const { razorpayOrderId, amount, currency, keyId } = rzpOrderRes.data;

        // 3. Open Razorpay checkout
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: keyId,
            amount,
            currency,
            name: 'Project-X',
            description: 'Hostel Commerce',
            order_id: razorpayOrderId,
            theme: { color: '#f97316' },
            handler: async (response) => {
              try {
                // 4. Verify payment
                await ordersApi.confirmPayment({
                  orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                cartStore.clearCart();
                queryClient.invalidateQueries(['orders']);
                setStep(3);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled')),
            },
          });
          rzp.open();
        });

      } else if (paymentMethod === 'cod') {
        // COD — just confirm
        await ordersApi.confirmPayment({ orderId });
        cartStore.clearCart();
        setStep(3);
      }

    } catch (err) {
      if (err.message !== 'Payment cancelled') {
        toast.error(err.message || 'Order failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Success State ──────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="page-container py-20 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }} className="w-24 h-24 rounded-full bg-accent-green/20 border-2 border-accent-green flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-accent-green" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-black text-white mb-3">Order Placed! 🎉</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/60 mb-2">Your items will be delivered to your hostel room.</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-brand-400 font-semibold mb-8">Check your email for the delivery OTP!</motion.p>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/orders')}>View Orders</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-black text-white mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Steps ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Delivery Address */}
          <div className="card p-6">
            <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-sm font-black flex items-center justify-center">1</div>
              Delivery Address
            </h2>

            {addresses.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm mb-4">No saved addresses</p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/profile')}>
                  <Plus className="w-4 h-4" /> Add Address
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <button key={addr._id} onClick={() => setSelectedAddress(addr._id)} className={cn('w-full text-left p-4 rounded-xl border-2 transition-all', selectedAddress === addr._id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:border-white/20')}>
                    <div className="flex items-start gap-3">
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5', selectedAddress === addr._id ? 'border-brand-500 bg-brand-500' : 'border-white/30')}>
                        {selectedAddress === addr._id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{addr.label || 'Hostel Room'}</p>
                        <p className="text-white/60 text-sm mt-0.5">Room {addr.roomNumber}{addr.block ? `, Block ${addr.block}` : ''}</p>
                        <p className="text-white/50 text-sm">{addr.hostelName}</p>
                        {addr.landmark && <p className="text-white/40 text-xs mt-1">Near: {addr.landmark}</p>}
                      </div>
                      {addr.isDefault && <Badge variant="brand" className="ml-auto">Default</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Payment */}
          <div className="card p-6">
            <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-sm font-black flex items-center justify-center">2</div>
              Payment Method
            </h2>

            <div className="space-y-3">
              {[
                { id: 'razorpay', label: 'Pay Online', sub: 'UPI, Cards, Wallets, Net Banking', icon: '💳' },
                { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when you receive', icon: '💵' },
              ].map(({ id, label, sub, icon }) => (
                <button key={id} onClick={() => setPaymentMethod(id)} className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all', paymentMethod === id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:border-white/20')}>
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">{label}</p>
                    <p className="text-white/50 text-xs">{sub}</p>
                  </div>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', paymentMethod === id ? 'border-brand-500 bg-brand-500' : 'border-white/30')}>
                    {paymentMethod === id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full lg:hidden" size="lg" loading={isProcessing} onClick={handlePlaceOrder}>
            <CreditCard className="w-5 h-5" /> Place Order — ₹{totalAmount.toFixed(0)}
          </Button>
        </div>

        {/* ── Right: Order Summary ─────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-24">
            <h2 className="font-bold text-white mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.product?._id || item.product} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0">
                    <img src={item.product?.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium line-clamp-1">{item.product?.name}</p>
                    <p className="text-white/50 text-xs">×{item.quantity}</p>
                  </div>
                  <p className="text-white text-sm font-bold">₹{(getItemUnitPrice(item) * item.quantity).toFixed(0)}</p>
                </div>
              ))}
            </div>

            <Divider />

            {/* Coupon */}
            <div className="mb-4">
              <p className="text-white/60 text-sm mb-2 flex items-center gap-2"><Tag className="w-4 h-4" /> Coupon Code</p>
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-accent-green/15 border border-accent-green/30 rounded-xl p-3">
                  <Check className="w-4 h-4 text-accent-green" />
                  <span className="text-accent-green font-bold text-sm">{appliedCoupon.code}</span>
                  <span className="text-accent-green text-sm ml-auto">-₹{appliedCoupon.discount}</span>
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-white/40 hover:text-white transition-colors ml-1">✕</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Enter code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="text-sm py-2" />
                  <Button size="sm" variant="secondary" loading={couponMutation.isPending} onClick={() => couponMutation.mutate()}>Apply</Button>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-white/60"><span>MRP Total</span><span className="line-through text-white/30">₹{mrpTotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-accent-green"><span>Savings</span><span>-₹{(mrpTotal - subtotal).toFixed(0)}</span></div>
              {couponDiscount > 0 && <div className="flex justify-between text-accent-green"><span>Coupon ({appliedCoupon.code})</span><span>-₹{couponDiscount}</span></div>}
              <div className="flex justify-between text-white/60"><span>Delivery</span><span className={deliveryFee === 0 ? 'text-accent-green' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
              <div className="flex justify-between text-white/60"><span>Platform Fee</span><span>₹{platformFee}</span></div>
              <Divider />
              <div className="flex justify-between font-black text-white text-lg"><span>Total</span><span>₹{totalAmount.toFixed(0)}</span></div>
            </div>

            <Button className="w-full mt-4 hidden lg:flex" size="lg" loading={isProcessing} onClick={handlePlaceOrder} rightIcon={<ChevronRight className="w-5 h-5" />}>
              {paymentMethod === 'razorpay' ? 'Pay Now' : 'Place Order'} — ₹{totalAmount.toFixed(0)}
            </Button>

            <p className="text-center text-white/30 text-xs mt-3">🔒 Secured by Razorpay</p>
          </div>
        </div>
      </div>
    </div>
  );
}
