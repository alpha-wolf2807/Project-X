/**
 * CARTEX — Axios API Service
 *
 * Features:
 * - Base URL from env
 * - Auth header injection from Zustand store
 * - Automatic token refresh on 401
 * - Request/response logging in dev
 * - Error normalization
 */

import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@store/authStore';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://CARTEX-j9go.onrender.com';
const normalizedApiUrl = rawApiUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');
const BASE_URL = `${normalizedApiUrl}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send cookies (refresh token)
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Inject access token ─────────────────
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle token refresh ────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data, // Unwrap .data automatically

  async (error) => {
    const originalRequest = error.config;

    // Handle 401 — try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        useAuthStore.getState().setAccessToken(accessToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Error message normalization
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    // Show toast for non-silent errors
    if (!error.config?.silent) {
      if (error.response?.status >= 500) {
        toast.error('Server error. Please try again.');
      } else if (error.response?.status !== 401) {
        // Don't show toast for 401 (handled by refresh)
        toast.error(message);
      }
    }

    return Promise.reject({ message, status: error.response?.status, data: error.response?.data });
  }
);

// ── Typed API calls ──────────────────────────────────────────

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
};

// Products
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  getTrending: () => api.get('/products/trending'),
  getRecommendations: () => api.get('/products/recommendations/me'),
  create: (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/products/${id}`),
  bulkUpload: (data) => api.post('/products/bulk-upload', data),
  toggleFlashSale: (id, data) => api.patch(`/products/${id}/flash-sale`, data),
  toggleOutOfStock: (id) => api.patch(`/products/${id}/out-of-stock`),
  getReviews: (id, params) => api.get(`/products/${id}/reviews`, { params }),
  submitReview: (id, data) => api.post(`/products/${id}/reviews`, data),
};

// Categories
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Orders
export const ordersApi = {
  place: (data) => api.post('/orders', data),
  confirmPayment: (data) => api.post('/orders/confirm-payment', data),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  verifyOTP: (id, data) => api.post(`/orders/${id}/verify-otp`, data),
  cancel: (id, data) => api.post(`/orders/${id}/cancel`, data),
};

// Payments
export const paymentsApi = {
  createRazorpayOrder: (data) => api.post('/payments/create-order', data),
};

// User / Profile
export const userApi = {
  updateProfile: (data) => api.patch('/users/profile', data),
  changePassword: (data) => api.patch('/users/change-password', data),
  uploadAvatar: (data) => api.post('/users/avatar', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getCart: () => api.get('/users/cart'),
  updateCart: (data) => api.post('/users/cart', data),
  removeFromCart: (productId) => api.delete(`/users/cart/${productId}`),
  clearCart: () => api.delete('/users/cart'),
  getWishlist: () => api.get('/users/wishlist'),
  addWishlist: (data) => api.post('/users/wishlist', data),
  removeWishlist: (productId) => api.delete(`/users/wishlist/${productId}`),
  addAddress: (data) => api.post('/users/addresses', data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  getRecentlyViewed: () => api.get('/users/recently-viewed'),
  addRecentlyViewed: (productId) => api.post(`/users/recently-viewed/${productId}`),
  getWallet: () => api.get('/users/wallet'),
};

// Notifications
export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  readAll: () => api.patch('/notifications/read-all'),
  read: (id) => api.patch(`/notifications/${id}/read`),
};

// Complaints
export const complaintsApi = {
  raise: (data) => api.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMy: () => api.get('/complaints/my'),
  getAll: (params) => api.get('/complaints', { params }),
  update: (id, data) => api.patch(`/complaints/${id}`, data),
};

// Coupons
export const couponsApi = {
  validate: (data) => api.post('/coupons/validate', data),
  getAll: () => api.get('/coupons'),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.patch(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
};

// Admin
export const adminApi = {
  createDistributor: (data) => api.post('/admin/distributors', data),
  createDeliveryDude: (data) => api.post('/admin/delivery-dudes', data),
  createSupport: (data) => api.post('/admin/support-agents', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  suspendUser: (id, data) => api.post(`/admin/users/${id}/suspend`, data),
  unsuspendUser: (id) => api.post(`/admin/users/${id}/unsuspend`),
  warnUser: (id, data) => api.post(`/admin/users/${id}/warn`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  broadcastAnnouncement: (data) => api.post('/admin/announce', data),
  processRefund: (orderId, data) => api.post(`/admin/orders/${orderId}/refund`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
  getOrders: () => api.get('/analytics/orders'),
  getProducts: () => api.get('/analytics/products'),
  getCustomers: () => api.get('/analytics/customers'),
  getRefunds: () => api.get('/analytics/refunds'),
  getFraud: () => api.get('/analytics/fraud'),
};

// Chat
export const chatApi = {
  getMessages: (roomId, params) => api.get(`/chat/${roomId}/messages`, { params }),
};

// Distributor
export const distributorApi = {
  getOrders: (params) => api.get('/distributor/orders', { params }),
  assignDelivery: (orderId, data) => api.patch(`/distributor/orders/${orderId}/assign-delivery`, data),
  getDeliveryDudes: () => api.get('/distributor/delivery-dudes'),
  getZoneStats: () => api.get('/distributor/zone-stats'),
};

// Delivery
export const deliveryApi = {
  getMyDeliveries: (params) => api.get('/delivery/my-deliveries', { params }),
  getStats: () => api.get('/delivery/stats'),
};

// Zones
export const zonesApi = {
  getAll: () => api.get('/zones'),
  create: (data) => api.post('/zones', data),
  update: (id, data) => api.put(`/zones/${id}`, data),
  delete: (id) => api.delete(`/zones/${id}`),
};

// Districts
export const districtsApi = {
  getAll: () => api.get('/districts'),
  create: (data) => api.post('/districts', data),
  update: (id, data) => api.put(`/districts/${id}`, data),
  delete: (id) => api.delete(`/districts/${id}`),
};

// Localities
export const localitiesApi = {
  getAll: () => api.get('/localities'),
  getByDistrict: (districtId) => api.get(`/localities/by-district/${districtId}`),
  create: (data) => api.post('/localities', data),
  update: (id, data) => api.put(`/localities/${id}`, data),
  delete: (id) => api.delete(`/localities/${id}`),
};

export default api;

