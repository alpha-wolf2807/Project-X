/**
 * CARTEX — Order Detail + Real-Time Tracking + Chat
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, MapPin, Send, X, Check, CheckCheck, Package, Truck, Home, ShoppingBag, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ordersApi, chatApi } from '@services/api';
import { useSocketEvent } from '@hooks/index';
import { joinOrderRoom, sendChatMessage, sendTyping } from '@services/socket';
import { Button, OrderStatusBadge, Badge, PriceDisplay } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

// ── Order Status Progress ──────────────────────────────────────
const steps = [
  { status: 'confirmed', icon: Check, label: 'Order Confirmed', sub: 'Payment received' },
  { status: 'distributor_ordered', icon: ShoppingBag, label: 'Items Procured', sub: 'Distributor ordering' },
  { status: 'picked_up', icon: Package, label: 'Picked Up', sub: 'Delivery dude has items' },
  { status: 'out_for_delivery', icon: Truck, label: 'Out for Delivery', sub: 'Heading to your hostel' },
  { status: 'delivered', icon: Home, label: 'Delivered', sub: 'Enjoy your order!' },
];

const statusOrder = ['pending', 'confirmed', 'distributor_ordered', 'picked_up', 'out_for_delivery', 'delivered'];

const OrderTimeline = ({ order }) => {
  const currentIdx = statusOrder.indexOf(order.status);

  return (
    <div className="card p-6">
      <h2 className="font-bold text-white mb-6">Order Status</h2>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const stepIdx = statusOrder.indexOf(step.status);
          const isDone = currentIdx >= stepIdx;
          const isActive = statusOrder[currentIdx] === step.status;
          const isFailed = ['cancelled', 'failed_delivery'].includes(order.status) && stepIdx > currentIdx;

          return (
            <div key={step.status} className="flex gap-4 items-start">
              {/* Icon + line */}
              <div className="flex flex-col items-center">
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
                  className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-500',
                    isDone && !isFailed ? 'bg-brand-500/20 border-brand-500 text-brand-400' : isFailed ? 'border-white/10 text-white/20' : 'border-white/10 text-white/20'
                  )}
                >
                  {isDone && !isFailed ? <step.icon className="w-4 h-4" /> : <div className="w-3 h-3 rounded-full bg-current opacity-30" />}
                </motion.div>
                {i < steps.length - 1 && (
                  <motion.div
                    initial={{ height: '0%' }}
                    animate={{ height: isDone && !isFailed ? '100%' : '0%' }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-0.5 bg-brand-500 mt-1"
                    style={{ minHeight: '32px' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <p className={cn('font-semibold text-sm', isDone && !isFailed ? 'text-white' : 'text-white/30')}>{step.label}</p>
                <p className={cn('text-xs mt-0.5', isDone && !isFailed ? 'text-white/50' : 'text-white/20')}>{step.sub}</p>
                {/* Timestamp from history */}
                {order.statusHistory?.find(h => h.status === step.status) && (
                  <p className="text-white/30 text-xs mt-1">
                    {new Date(order.statusHistory.find(h => h.status === step.status).timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Failed / Cancelled */}
      {['cancelled', 'failed_delivery'].includes(order.status) && (
        <div className="mt-4 banner-error text-sm">
          <p className="font-semibold">Order {order.status === 'cancelled' ? 'Cancelled' : 'Delivery Failed'}</p>
          {order.cancellationReason && <p className="mt-1 opacity-80">{order.cancellationReason}</p>}
        </div>
      )}
    </div>
  );
};

// ── Chat Component ─────────────────────────────────────────────
const OrderChat = ({ order, userId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const chatRoomId = order.chatRoomId;

  const { data } = useQuery({
    queryKey: ['chat', chatRoomId],
    queryFn: () => chatApi.getMessages(chatRoomId),
    select: (d) => d.data.messages,
    enabled: !!chatRoomId && order.status !== 'delivered',
    onSuccess: (msgs) => setMessages(msgs),
  });

  useEffect(() => { joinOrderRoom(order._id); }, [order._id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useSocketEvent('chat:message', (msg) => {
    if (msg.chatRoomId === chatRoomId) {
      setMessages((prev) => [...prev, msg]);
    }
  });

  useSocketEvent('chat:typing', ({ userId: typingUserId, isTyping: typing }) => {
    if (typingUserId !== userId) setOtherTyping(typing);
  });

  const handleSend = () => {
    if (!input.trim() || !chatRoomId) return;
    sendChatMessage(chatRoomId, input.trim());
    setInput('');
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isTyping) { setIsTyping(true); sendTyping(chatRoomId, true); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { setIsTyping(false); sendTyping(chatRoomId, false); }, 1500);
  };

  if (!chatRoomId || order.status === 'delivered') {
    return (
      <div className="card p-6 text-center">
        <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50 text-sm">{order.status === 'delivered' ? 'Chat ended after delivery' : 'Chat available after order confirmation'}</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col" style={{ height: '400px' }}>
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-brand-400" />
        <div>
          <p className="font-bold text-white text-sm">Order Chat</p>
          <p className="text-white/40 text-xs">Chat with delivery dude & distributor</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span className="text-accent-green text-xs">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-sm py-8">No messages yet. Start chatting!</div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender?.id === userId || msg.sender?._id === userId;
          return (
            <motion.div key={msg.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2', isMine && 'flex-row-reverse')}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', isMine ? 'bg-brand-500' : 'bg-surface-3')}>
                {(msg.sender?.name || '?')[0].toUpperCase()}
              </div>
              <div className={cn('max-w-xs', isMine && 'items-end flex flex-col')}>
                <p className={cn('text-xs text-white/40 mb-1', isMine && 'text-right')}>
                  {msg.sender?.name} • {msg.sender?.role}
                </p>
                <div className={cn('px-3 py-2 rounded-2xl text-sm', isMine ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-surface-2 text-white/80 rounded-tl-sm')}>
                  {msg.content}
                </div>
                <p className={cn('text-xs text-white/20 mt-1', isMine && 'text-right')}>
                  {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          );
        })}
        {otherTyping && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold">?</div>
            <div className="bg-surface-2 px-4 py-2 rounded-2xl rounded-tl-sm flex gap-1">
              {[0, 1, 2].map(i => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 flex gap-3">
        <input
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="input flex-1 py-2.5 text-sm"
        />
        <Button size="sm" onClick={handleSend} disabled={!input.trim()} className="px-3">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ── Order Detail Page ──────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
    select: (d) => d.data.order,
    enabled: !!id,
    refetchInterval: (data) => ['confirmed', 'distributor_ordered', 'picked_up', 'out_for_delivery'].includes(data?.status) ? 15000 : false,
  });

  // Real-time status updates
  useSocketEvent('order:status_update', (data) => {
    if (data.orderId === id) {
      queryClient.invalidateQueries(['order', id]);
      toast.success(`Order update: ${data.status.replace(/_/g, ' ')}`);
    }
  });

  useSocketEvent('order:delivered', (data) => {
    if (data.orderId === id) {
      queryClient.invalidateQueries(['order', id]);
      toast.success('Your order has been delivered! 🎉');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (reason) => ordersApi.cancel(id, { reason }),
    onSuccess: () => {
      toast.success('Order cancelled.');
      queryClient.invalidateQueries(['order', id]);
      setShowCancelModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="page-container py-8 space-y-6">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-6 animate-pulse"><div className="h-32 bg-surface-3 rounded-xl" /></div>)}
    </div>
  );

  if (!order) return null;

  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/orders')} className="text-white/50 hover:text-white text-sm mb-2 transition-colors">← Back to Orders</button>
          <h1 className="text-2xl font-black text-white">Order {order.orderNumber}</h1>
          <div className="flex items-center gap-3 mt-1">
            <OrderStatusBadge status={order.status} />
            <span className="text-white/40 text-sm">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        {canCancel && (
          <Button variant="danger" size="sm" onClick={() => setShowCancelModal(true)}>Cancel Order</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timeline + Chat */}
        <div className="lg:col-span-2 space-y-6">
          <OrderTimeline order={order} />
          <OrderChat order={order} userId={order.customer?._id} />
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          {/* Order items */}
          <div className="card p-5">
            <h3 className="font-bold text-white mb-4">Items Ordered</h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item._id} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0">
                    <img src={item.productSnapshot?.image} alt={item.productSnapshot?.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{item.productSnapshot?.name}</p>
                    <p className="text-white/50 text-xs">×{item.quantity} @ ₹{item.unitPrice}</p>
                    {item.productSnapshot?.mrp > item.unitPrice && (
                      <p className="text-accent-green text-xs">Saved ₹{((item.productSnapshot.mrp - item.unitPrice) * item.quantity).toFixed(0)}</p>
                    )}
                  </div>
                  <p className="text-white font-bold text-sm">₹{item.totalPrice?.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Price summary */}
          <div className="card p-5">
            <h3 className="font-bold text-white mb-4">Bill Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60"><span>Subtotal</span><span>₹{order.pricing?.subtotal?.toFixed(0)}</span></div>
              <div className="flex justify-between text-accent-green"><span>You saved</span><span>-₹{order.pricing?.totalSavings?.toFixed(0)}</span></div>
              {order.pricing?.couponDiscount > 0 && <div className="flex justify-between text-accent-green"><span>Coupon</span><span>-₹{order.pricing.couponDiscount}</span></div>}
              <div className="flex justify-between text-white/60"><span>Delivery</span><span>{order.pricing?.deliveryFee === 0 ? 'FREE' : `₹${order.pricing?.deliveryFee}`}</span></div>
              <div className="flex justify-between text-white/60"><span>Platform Fee</span><span>₹{order.pricing?.platformFee}</span></div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-black text-white"><span>Total Paid</span><span>₹{order.pricing?.totalAmount?.toFixed(0)}</span></div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="card p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-400" /> Delivery Address</h3>
            <p className="text-white/70 text-sm">Room {order.deliveryAddress?.roomNumber}{order.deliveryAddress?.block ? `, Block ${order.deliveryAddress.block}` : ''}</p>
            <p className="text-white/50 text-sm">{order.deliveryAddress?.hostelName}</p>
            {order.deliveryAddress?.landmark && <p className="text-white/40 text-xs mt-1">Near: {order.deliveryAddress.landmark}</p>}
          </div>

          {/* Delivery OTP */}
          {order.deliveryOTP?.code && ['confirmed', 'distributor_ordered', 'picked_up', 'out_for_delivery'].includes(order.status) && (
            <div className="card p-5 border-brand-500/30">
              <h3 className="font-bold text-white mb-2">🔐 Delivery OTP</h3>
              <p className="text-white/50 text-xs mb-3">Share this with your delivery dude when they arrive</p>
              <div className="flex items-center justify-center bg-brand-500/10 border border-brand-500/30 rounded-xl py-4">
                <span className="text-4xl font-black text-brand-400 tracking-[0.5em]">{order.deliveryOTP.code}</span>
              </div>
            </div>
          )}

          {/* Payment status */}
          <div className="card p-5">
            <h3 className="font-bold text-white mb-3">Payment</h3>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm capitalize">{order.payment?.method?.replace('_', ' ')}</span>
              <Badge variant={order.payment?.status === 'paid' ? 'success' : order.payment?.status === 'refunded' ? 'info' : 'warning'}>
                {order.payment?.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content max-w-sm">
              <div className="p-6">
                <h2 className="text-lg font-bold text-white mb-2">Cancel Order?</h2>
                <p className="text-white/50 text-sm mb-4">This action cannot be undone. If paid, refund will be initiated.</p>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowCancelModal(false)}>Keep Order</Button>
                  <Button variant="danger" className="flex-1" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate('Cancelled by customer')}>Cancel Order</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

