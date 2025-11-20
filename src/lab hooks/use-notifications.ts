import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface INotification {
  _id: string;
  title: string;
  message: string;
  type: "critical" | "warning" | "info" | "success";
  category?: string;
  read: boolean;
  createdAt: string;
}

interface Options {
  pollMs?: number;
  unreadOnly?: boolean;
  limit?: number;
}

export function useNotifications(opts: Options = {}) {
  const { pollMs = 30000, unreadOnly = false, limit = 50 } = opts;
  const [items, setItems] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<INotification[]>(
        `/lab/notifications?limit=${limit}${unreadOnly ? "&unread=true" : ""}`
      );
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // swallow
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    if (pollMs > 0) {
      timerRef.current = window.setInterval(fetchList, pollMs);
    }
    // Listen for global refresh event to immediately update the list
    const onRefresh = () => fetchList();
    window.addEventListener("notifications:refresh", onRefresh as any);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.removeEventListener("notifications:refresh", onRefresh as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly, limit, pollMs]);

  const unreadCount = useMemo(() => items.filter(n => !n.read).length, [items]);

  const markAsRead = async (id: string) => {
    try {
      setItems(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
      await api.patch(`/lab/notifications/${id}/read`);
      try { window.dispatchEvent(new Event("notifications:refresh")); } catch {}
    } catch (e) {
      // rollback on error
      setItems(prev => prev.map(n => (n._id === id ? { ...n, read: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    const unread = items.filter(n => !n.read);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    await Promise.allSettled(unread.map(n => api.patch(`/lab/notifications/${n._id}/read`)));
    try { window.dispatchEvent(new Event("notifications:refresh")); } catch {}
  };

  return { items, loading, unreadCount, refresh: fetchList, markAsRead, markAllAsRead };
}

// Helper to programmatically trigger a refresh from anywhere in the app
export const triggerNotificationsRefresh = () => {
  try {
    window.dispatchEvent(new Event("notifications:refresh"));
  } catch {
    // ignore
  }
};
