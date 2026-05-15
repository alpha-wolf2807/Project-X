/**
 * CARTEX — Cart Store (Zustand)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingIdx = items.findIndex((i) => i.product._id === product._id);

        if (existingIdx > -1) {
          const updated = [...items];
          updated[existingIdx].quantity = Math.min(updated[existingIdx].quantity + quantity, 50);
          set({ items: updated });
        } else {
          set({ items: [...items, { product, quantity, priceAtAdd: product.effectivePrice || product.price }] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product._id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product._id === productId ? { ...i, quantity: Math.min(quantity, 50) } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // Computed
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + (i.product.effectivePrice || i.product.price) * i.quantity, 0),
      getMRPTotal: () => get().items.reduce((sum, i) => sum + i.product.mrp * i.quantity, 0),
      getTotalSavings: () => get().getMRPTotal() - get().getSubtotal(),
    }),
    {
      name: 'Cartex-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * CARTEX — UI Store (Zustand)
 */
export const useUIStore = create((set, get) => ({
  theme: 'dark',
  sidebarOpen: false,
  searchOpen: false,
  notifPanelOpen: false,
  globalLoading: false,
  modals: {},

  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  toggleNotifPanel: () => set((s) => ({ notifPanelOpen: !s.notifPanelOpen })),
  closeNotifPanel: () => set({ notifPanelOpen: false }),
  setGlobalLoading: (v) => set({ globalLoading: v }),
  openModal: (key, data = {}) => set((s) => ({ modals: { ...s.modals, [key]: { open: true, data } } })),
  closeModal: (key) => set((s) => ({ modals: { ...s.modals, [key]: { open: false, data: {} } } })),
  isModalOpen: (key) => get().modals[key]?.open || false,
  getModalData: (key) => get().modals[key]?.data || {},
}));

/**
 * CARTEX — Notification Store (Zustand)
 */
export const useNotifStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications].slice(0, 50),
    unreadCount: s.unreadCount + 1,
  })),

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n._id === id ? { ...n, isRead: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),
}));


