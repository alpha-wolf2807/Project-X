/**
 * CARTEX — Custom Hooks
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@store/authStore';
import { useCartStore } from '@store/index';
import { authApi, userApi, productsApi, ordersApi } from '@services/api';
import { connectSocket, disconnectSocket, getSocket } from '@services/socket';

// ── useAuth ────────────────────────────────────────────────────
export const useAuth = () => {
  const store = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      store.login(data.data.user, data.data.accessToken);
      toast.success(`Welcome back, ${data.data.user.name}! 👋`);
      connectSocket();
      // Redirect based on role
      const roleRoutes = {
        admin: '/admin/dashboard',
        distributor: '/distributor/dashboard',
        delivery: '/delivery/dashboard',
        customer: '/',
        support: '/support/dashboard',
      };
      navigate(roleRoutes[data.data.user.role] || '/');
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      toast.success('Account created! Check your email for OTP.');
      navigate(`/auth/verify-email?userId=${data.data.userId}&email=${data.data.email}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      store.logout();
      useCartStore.getState().clearCart();
      queryClient.clear();
      disconnectSocket();
      navigate('/auth/login');
      toast.success('Logged out successfully.');
    },
  });

  return {
    ...store,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
};

// ── useSocket ─────────────────────────────────────────────────
export const useSocket = () => {
  const socket = getSocket();

  const on = useCallback((event, handler) => {
    if (!socket) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket]);

  const emit = useCallback((event, data) => {
    if (!socket) return;
    socket.emit(event, data);
  }, [socket]);

  return { socket, on, emit, connected: socket?.connected || false };
};

// ── useSocketEvent ─────────────────────────────────────────────
export const useSocketEvent = (event, handler) => {
  const { on } = useSocket();
  useEffect(() => {
    const cleanup = on(event, handler);
    return cleanup;
  }, [event, handler, on]);
};

// ── useProducts ────────────────────────────────────────────────
export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProduct = (slug) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug),
    select: (data) => data.data.product,
    enabled: !!slug,
  });
};

export const useTrending = () => {
  return useQuery({
    queryKey: ['products', 'trending'],
    queryFn: productsApi.getTrending,
    select: (data) => data.data.products,
    staleTime: 10 * 60 * 1000,
  });
};

// ── useCart ────────────────────────────────────────────────────
export const useCart = () => {
  const cartStore = useCartStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart.');
      navigate('/auth/login');
      return;
    }
    cartStore.addItem(product, quantity);
    toast.success(`${product.name} added to cart! 🛒`);
    await userApi.updateCart({ productId: product._id, quantity: cartStore.items.find(i => i.product._id === product._id)?.quantity || quantity }).catch(() => {});
  }, [cartStore, isAuthenticated, navigate]);

  const removeFromCart = useCallback(async (productId) => {
    cartStore.removeItem(productId);
    if (isAuthenticated) {
      await userApi.removeFromCart(productId).catch(() => {});
    }
  }, [cartStore, isAuthenticated]);

  const activeItems = isAuthenticated ? cartStore.items : [];

  return {
    items: activeItems,
    isOpen: cartStore.isOpen,
    totalItems: isAuthenticated ? cartStore.getTotalItems() : 0,
    subtotal: isAuthenticated ? cartStore.getSubtotal() : 0,
    mrpTotal: isAuthenticated ? cartStore.getMRPTotal() : 0,
    totalSavings: isAuthenticated ? cartStore.getTotalSavings() : 0,
    addToCart,
    removeFromCart,
    updateQuantity: cartStore.updateQuantity,
    clearCart: cartStore.clearCart,
    toggleCart: cartStore.toggleCart,
    openCart: cartStore.openCart,
    closeCart: cartStore.closeCart,
  };
};

// ── useWishlist ─────────────────────────────────────────────────
export const useWishlist = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wishlist'],
    queryFn: userApi.getWishlist,
    select: (data) => data.data.items,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (productId) => userApi.addWishlist({ productId }),
    onSuccess: () => queryClient.invalidateQueries(['wishlist']),
  });

  const removeMutation = useMutation({
    mutationFn: (productId) => userApi.removeWishlist(productId),
    onSuccess: () => queryClient.invalidateQueries(['wishlist']),
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    addToWishlist: (productId) => addMutation.mutate(productId),
    removeFromWishlist: (productId) => removeMutation.mutate(productId),
    isAuthenticated,
  };
};

// ── useOrders ──────────────────────────────────────────────────
export const useMyOrders = (params = {}) => {
  return useQuery({
    queryKey: ['orders', 'my', params],
    queryFn: () => ordersApi.getMyOrders(params),
    select: (data) => data.data,
  });
};

export const useOrder = (id) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
    select: (data) => data.data.order,
    enabled: !!id,
    refetchInterval: (data) => {
      // Poll every 15s for active orders
      const active = ['confirmed', 'distributor_ordered', 'picked_up', 'out_for_delivery'];
      return active.includes(data?.status) ? 15000 : false;
    },
  });
};

// ── useCountUp (animated counter) ─────────────────────────────
export const useCountUp = (target, duration = 1500) => {
  const [count, setCount] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    if (!target) return;
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startValue + (target - startValue) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
};

// ── useIntersectionObserver ────────────────────────────────────
export const useInView = (options = {}) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1, ...options }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
};

// ── useDebounce ────────────────────────────────────────────────
export const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// ── useLocalStorage ────────────────────────────────────────────
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) { console.error(error); }
  };

  return [storedValue, setValue];
};

// ── useMediaQuery ─────────────────────────────────────────────
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

export const useIsMobile = () => useMediaQuery('(max-width: 768px)');

// ── useClickOutside ────────────────────────────────────────────
export const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

