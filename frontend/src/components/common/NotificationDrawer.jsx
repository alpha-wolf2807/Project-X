import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUIStore, useNotifStore } from '@store/index';
import { notificationsApi } from '@services/api';
import { Button } from '@components/common/GlobalLoader';

export default function NotificationDrawer() {
  const { notifPanelOpen, closeNotifPanel } = useUIStore();
  const { notifications, unreadCount, setNotifications, setUnreadCount, markAllRead, markRead } = useNotifStore();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ page: 1, limit: 50 }),
    enabled: false,
  });

  useEffect(() => {
    if (data?.data) {
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unreadCount || 0);
    }
  }, [data, setNotifications, setUnreadCount]);

  useEffect(() => {
    if (notifPanelOpen) {
      refetch();
    }
  }, [notifPanelOpen, refetch]);

  useEffect(() => {
    if (notifPanelOpen && unreadCount > 0) {
      notificationsApi.readAll().then(() => {
        markAllRead();
      }).catch(() => {
        // silent
      });
    }
  }, [notifPanelOpen, unreadCount, markAllRead]);

  const hasNotifications = notifications?.length > 0;

  return (
    <AnimatePresence>
      {notifPanelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={closeNotifPanel}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-surface-1 border-l border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-brand-400" />
                <div>
                  <p className="text-lg font-bold text-white">Notifications</p>
                  <p className="text-white/50 text-sm">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={closeNotifPanel} className="btn-ghost p-2 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-full overflow-y-auto p-4 space-y-3">
              {isFetching && !hasNotifications ? (
                <div className="text-white/50 text-sm">Loading notifications…</div>
              ) : !hasNotifications ? (
                <div className="text-center py-16 text-white/50">
                  <CheckCircle2 className="mx-auto mb-4 w-10 h-10 text-brand-400" />
                  <p className="text-sm">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const id = notification._id || notification.id;
                  return (
                    <div key={id} className="rounded-3xl border border-white/10 bg-surface-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{notification.title}</p>
                          <p className="text-white/50 text-xs mt-1">{new Date(notification.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        {!notification.isRead && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] bg-brand-500/15 text-brand-300">new</span>
                        )}
                      </div>
                      <p className="text-white/70 text-sm mt-3">{notification.body}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 p-4 bg-surface-2">
              <Button variant="secondary" className="w-full" onClick={closeNotifPanel}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
