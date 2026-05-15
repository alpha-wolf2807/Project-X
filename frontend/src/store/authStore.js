/**
 * CARTEX — Auth Store (Zustand)
 *
 * Persists user data in localStorage (except sensitive tokens).
 * Access token stored in memory only (XSS protection).
 * Refresh token stored in httpOnly cookie (set by server).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────
      user: null,
      accessToken: null, // In-memory only, NOT persisted
      isAuthenticated: false,
      isLoading: false,

      // ── Actions ────────────────────────────────────────────
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (token) => set({ accessToken: token }),

      login: (user, accessToken) => set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      }),

      logout: () => set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      }),

      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates },
      })),

      setLoading: (isLoading) => set({ isLoading }),

      // ── Selectors ──────────────────────────────────────────
      isAdmin: () => get().user?.role === 'admin',
      isDistributor: () => get().user?.role === 'distributor',
      isDelivery: () => get().user?.role === 'delivery',
      isCustomer: () => get().user?.role === 'customer',
      isSupport: () => get().user?.role === 'support',
      getRole: () => get().user?.role,
    }),
    {
      name: 'projectx-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive data
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // accessToken intentionally NOT persisted
      }),
    }
  )
);

