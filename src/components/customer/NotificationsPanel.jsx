import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCheck, Bike, CreditCard, AlertCircle, Info } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_BG = "#EBF9FE";

const ICON_MAP = {
  booking: { icon: "📋", bg: "#EBF9FE", color: PRIMARY },
  trip:    { icon: "🏍", bg: "#f0fdf4", color: "#10b981" },
  payment: { icon: "💳", bg: "#faf5ff", color: "#8b5cf6" },
  alert:   { icon: "⚠️", bg: "#fff7ed", color: "#f59e0b" },
  system:  { icon: "ℹ️", bg: "#f8fafc", color: "#64748b" },
  promotion: { icon: "🎉", bg: "#fef9c3", color: "#ca8a04" },
};

export default function NotificationsPanel({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    base44.entities.Notification.filter({ user_id: user.email }, "-created_date", 30)
      .then(n => { setNotifications(n || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read_status);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read_status: true })));
    setNotifications(ns => ns.map(n => ({ ...n, read_status: true })));
  };

  const unreadCount = notifications.filter(n => !n.read_status).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: "2.5px", borderStyle: "solid", borderColor: PRIMARY_BG, borderTopColor: PRIMARY }} />
      <p className="text-xs text-gray-400">Loading notifications...</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto pb-24 fade-in">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notifications</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: PRIMARY }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold" style={{ color: PRIMARY }}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-300">
          <Bell className="w-14 h-14 mb-3 opacity-30" />
          <p className="text-sm text-gray-400">No notifications yet</p>
          <p className="text-xs text-gray-300 mt-1">We'll notify you about your trips</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {notifications.map(n => {
            const cfg = ICON_MAP[n.type] || ICON_MAP.system;
            return (
              <div key={n.id}
                className={`flex items-start gap-3 bg-white border rounded-2xl px-4 py-3.5 shadow-sm transition-all ${!n.read_status ? "border-l-4" : "border-gray-100"}`}
                style={!n.read_status ? { borderLeftColor: PRIMARY, borderTopColor: "#f0f4f8", borderRightColor: "#f0f4f8", borderBottomColor: "#f0f4f8" } : {}}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: cfg.bg }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</span>
                    {!n.read_status && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: PRIMARY }} />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-gray-300 mt-1">
                    {n.created_date ? new Date(n.created_date).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}