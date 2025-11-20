
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, CheckCircle, X, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface INotification {
  _id: string;
  title: string;
  message: string;
  type: "critical" | "warning" | "info" | "success";
  category?: string;
  read: boolean;
  createdAt: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverPaging, setServerPaging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // fetch with pagination
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (search.trim()) params.set('q', search.trim());
        const { data } = await api.get(`/lab/notifications?${params.toString()}`);
        if (Array.isArray(data)) {
          setServerPaging(false);
          setNotifications(data);
          const tot = data.length;
          setTotal(tot); setTotalPages(Math.max(1, Math.ceil(tot/limit)));
        } else if (data && Array.isArray(data.data)) {
          setServerPaging(true);
          setNotifications(data.data);
          setTotal(Number(data.total)||0); setTotalPages(Number(data.totalPages)||1);
        } else {
          setServerPaging(false); setNotifications([]); setTotal(0); setTotalPages(1);
        }
      } catch (err) {
        console.error(err);
        setNotifications([]); setTotal(0); setTotalPages(1); setServerPaging(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, limit, search]);

  // helper to update cached state
  const updateLocal = (id: string, changes: Partial<INotification>) =>
    setNotifications(prev => prev.map(n => (n._id === id ? { ...n, ...changes } : n)));

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "critical": return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "info": return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "critical": return "destructive";
      case "warning": return "default";
      case "success": return "secondary";
      case "info": return "outline";
      default: return "outline";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "medical": return "bg-red-100 text-red-800";
      case "equipment": return "bg-purple-100 text-purple-800";
      case "results": return "bg-green-100 text-green-800";
      case "inventory": return "bg-yellow-100 text-yellow-800";
      case "research": return "bg-blue-100 text-blue-800";
      case "appointments": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      updateLocal(notificationId, { read: true });
      await api.patch(`/lab/notifications/${notificationId}/read`);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = () => {
    notifications.forEach(n => { if (!n.read) markAsRead(n._id); });
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimestamp = (timestampStr: string) => {
    const timestamp = new Date(timestampStr);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All notifications read"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input className="border rounded px-2 py-1 text-sm" placeholder="Search..." value={search} onChange={e=> { setPage(1); setSearch(e.target.value); }} />
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notification, idx) => (
          <Card 
            key={notification._id} 
            className={`transition-all ${!notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-xs text-gray-500 w-8 text-right">{(page-1)*limit + idx + 1}</div>
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h3>
                      <Badge variant={getNotificationBadge(notification.type) as any}>
                        {notification.type}
                      </Badge>
                      <Badge className={getCategoryColor(notification.category)}>
                        {notification.category}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!notification.read && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => markAsRead(notification._id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Read
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => deleteNotification(notification._id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${Math.min((page-1)*limit+1, Math.max(0, total))}-${Math.min(page*limit, Math.max(0, total))} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <select className="px-2 py-1 border rounded text-sm" value={limit} onChange={(e)=> { setPage(1); setLimit(parseInt(e.target.value) || 10); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <Button variant="outline" size="sm" onClick={()=> setPage(1)} disabled={page<=1}>First</Button>
          <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
          <div className="px-2 text-sm">Page {page} / {totalPages}</div>
          <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</Button>
          <Button variant="outline" size="sm" onClick={()=> setPage(totalPages)} disabled={page>=totalPages}>Last</Button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
