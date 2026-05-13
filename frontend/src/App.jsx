/**
 * PROJECT-X — App Router
 *
 * 5 separate portals with RBAC route protection.
 * Lazy loading for code splitting by portal.
 */

import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { connectSocket } from '@services/socket';
import { useSocketEvent } from '@hooks/index';
import { useNotifStore } from '@store/index';
import GlobalLoader from '@components/common/GlobalLoader';

// ── Lazy-load portals (code splitting) ────────────────────────
// Auth
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'));

// Customer Portal
const CustomerLayout = lazy(() => import('@pages/customer/CustomerLayout'));
const HomePage = lazy(() => import('@pages/customer/HomePage'));
const ProductsPage = lazy(() => import('@pages/customer/ProductsPage'));
const ProductDetailPage = lazy(() => import('@pages/customer/ProductDetailPage'));
const CartPage = lazy(() => import('@pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('@pages/customer/CheckoutPage'));
const OrdersPage = lazy(() => import('@pages/customer/OrdersPage'));
const OrderDetailPage = lazy(() => import('@pages/customer/OrderDetailPage'));
const ProfilePage = lazy(() => import('@pages/customer/ProfilePage'));
const WishlistPage = lazy(() => import('@pages/customer/WishlistPage'));
const ComplaintsPage = lazy(() => import('@pages/customer/ComplaintsPage'));
const WalletPage = lazy(() => import('@pages/customer/WalletPage'));

// Admin Portal
const AdminLayout = lazy(() => import('@pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('@pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('@pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('@pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('@pages/admin/AdminAnalytics'));
const AdminCoupons = lazy(() => import('@pages/admin/AdminCoupons'));
const AdminZones = lazy(() => import('@pages/admin/AdminZones'));
const AdminComplaints = lazy(() => import('@pages/admin/AdminComplaints'));
const AdminAuditLogs = lazy(() => import('@pages/admin/AdminAuditLogs'));
const AdminCategories = lazy(() => import('@pages/admin/AdminCategories'));

// Distributor Portal
const DistributorLayout = lazy(() => import('@pages/distributor/DistributorLayout'));
const DistributorDashboard = lazy(() => import('@pages/distributor/DistributorDashboard'));
const DistributorOrders = lazy(() => import('@pages/distributor/DistributorOrders'));
const DistributorTeam = lazy(() => import('@pages/distributor/DistributorTeam'));
const DistributorInventory = lazy(() => import('@pages/distributor/DistributorInventory'));

// Delivery Portal
const DeliveryLayout = lazy(() => import('@pages/delivery/DeliveryLayout'));
const DeliveryDashboard = lazy(() => import('@pages/delivery/DeliveryDashboard'));
const DeliveryActive = lazy(() => import('@pages/delivery/DeliveryActive'));
const DeliveryHistory = lazy(() => import('@pages/delivery/DeliveryHistory'));
const DeliveryEarnings = lazy(() => import('@pages/delivery/DeliveryEarnings'));

// Support Portal
const SupportLayout = lazy(() => import('@pages/support/SupportLayout'));
const SupportDashboard = lazy(() => import('@pages/support/SupportDashboard'));
const SupportComplaints = lazy(() => import('@pages/support/SupportComplaints'));
const SupportComplaintDetail = lazy(() => import('@pages/support/SupportComplaintDetail'));

// ── Route Guards ──────────────────────────────────────────────
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const roleHome = {
      admin: '/admin/dashboard',
      distributor: '/distributor/dashboard',
      delivery: '/delivery/dashboard',
      customer: '/',
      support: '/support/dashboard',
    };
    return <Navigate to={roleHome[user?.role] || '/'} replace />;
  }
  return <Outlet />;
};

const PublicRoute = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const roleHome = {
      admin: '/admin/dashboard',
      distributor: '/distributor/dashboard',
      delivery: '/delivery/dashboard',
      customer: '/',
      support: '/support/dashboard',
    };
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }
  return <Outlet />;
};

// ── Socket Notification Setup ─────────────────────────────────
const SocketSetup = () => {
  const { isAuthenticated } = useAuthStore();
  const { addNotification } = useNotifStore();

  useEffect(() => {
    if (isAuthenticated) connectSocket();
  }, [isAuthenticated]);

  useSocketEvent('notification:new', (notif) => {
    addNotification(notif);
  });

  return null;
};

// ── App ────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <SocketSetup />
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          {/* ── Public Auth Routes ─────────────────────────── */}
          <Route element={<PublicRoute />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* ── Customer Portal ────────────────────────────── */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />

            {/* Protected customer routes */}
            <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/wallet" element={<WalletPage />} />
            </Route>
          </Route>

          {/* ── Admin Portal ───────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/zones" element={<AdminZones />} />
              <Route path="/admin/complaints" element={<AdminComplaints />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
            </Route>
          </Route>

          {/* ── Distributor Portal ─────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['distributor']} />}>
            <Route element={<DistributorLayout />}>
              <Route path="/distributor/dashboard" element={<DistributorDashboard />} />
              <Route path="/distributor/orders" element={<DistributorOrders />} />
              <Route path="/distributor/team" element={<DistributorTeam />} />
              <Route path="/distributor/inventory" element={<DistributorInventory />} />
            </Route>
          </Route>

          {/* ── Delivery Portal ────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['delivery']} />}>
            <Route element={<DeliveryLayout />}>
              <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
              <Route path="/delivery/active" element={<DeliveryActive />} />
              <Route path="/delivery/history" element={<DeliveryHistory />} />
              <Route path="/delivery/earnings" element={<DeliveryEarnings />} />
            </Route>
          </Route>

          {/* ── Support Portal ─────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['support', 'admin']} />}>
            <Route element={<SupportLayout />}>
              <Route path="/support/dashboard" element={<SupportDashboard />} />
              <Route path="/support/complaints" element={<SupportComplaints />} />
              <Route path="/support/complaints/:id" element={<SupportComplaintDetail />} />
            </Route>
          </Route>

          {/* ── Fallback ───────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
