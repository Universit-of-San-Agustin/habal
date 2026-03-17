import { useState, useEffect, useRef } from "react";
import { Bell, Minimize2, GripVertical, MapPin, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { readDemoStore, DEMO_EVENT } from "@/lib/demoStore";
import { COLORS } from "../shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;

export default function DispatchActivityFeed() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const widgetRef = useRef(null);
  const autoHideTimer = useRef(null);
  const seenEventsRef = useRef(new Set());

  // Auto-hide behavior
  useEffect(() => {
    const resetAutoHide = () => {
      setOpacity(1);
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      autoHideTimer.current = setTimeout(() => setOpacity(0.6), 10000);
    };
    
    if (!isMinimized) {
      resetAutoHide();
      window.addEventListener('mousemove', resetAutoHide);
      return () => {
        window.removeEventListener('mousemove', resetAutoHide);
        if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      };
    }
  }, [isMinimized]);

  // Dragging logic
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleDragStart = (e) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  // Poll for booking events
  useEffect(() => {
    const processEvents = (events = []) => {
      const incoming = events
        .filter(e => !seenEventsRef.current.has(e.id))
        .slice(0, 20)
        .map(e => ({
          id: e.id,
          type: e.type || e.event_type,
          actor: e.actor || e.actor_name || "System",
          booking: e.booking_id,
          message: e.message,
          timestamp: e.timestamp || e.created_date,
          isNew: true,
        }));
      if (incoming.length > 0) {
        setActivities(prev => [...incoming, ...prev].slice(0, 30));
        setUnreadCount(prev => prev + incoming.length);
        incoming.forEach(a => seenEventsRef.current.add(a.id));
      }
    };

    // Load initial store events
    processEvents(readDemoStore().events);

    // Listen for live updates
    const onUpdate = (e) => processEvents(e.detail?.events || []);
    window.addEventListener(DEMO_EVENT, onUpdate);
    return () => window.removeEventListener(DEMO_EVENT, onUpdate);
  }, []);

  const handleExpand = () => {
    setIsMinimized(false);
    setUnreadCount(0);
  };

  // Minimized state
  if (isMinimized) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-[9997] cursor-move"
        style={{
          left: position.x,
          top: position.y,
          opacity: opacity,
          transition: isDragging ? 'none' : 'opacity 0.3s',
        }}
        onMouseDown={handleDragStart}>
        <button
          onClick={handleExpand}
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-white relative"
          style={{ 
            background: `linear-gradient(135deg, #6366f1 0%, #6366f1dd 100%)`,
            boxShadow: `0 6px 20px #6366f160`,
          }}>
          <Bell className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </div>
          )}
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div
      ref={widgetRef}
      className="fixed z-[9997] w-80"
      style={{
        left: position.x,
        top: position.y,
        opacity: opacity,
        transition: isDragging ? 'none' : 'opacity 0.3s',
        cursor: isDragging ? 'grabbing' : 'default',
      }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[500px] flex flex-col">
        {/* Header - Draggable */}
        <div 
          className="px-4 py-3 border-b border-gray-100 cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ background: "#eef2ff" }}
          onMouseDown={handleDragStart}>
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-100">
              <Bell className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900">Dispatch Activity</div>
              <div className="text-[10px] text-gray-400">Real-time events</div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <Minimize2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="flex-1 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-semibold text-gray-400">No recent activity</p>
              <p className="text-xs text-gray-400 mt-1">Events will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  const eventConfig = {
    BOOKING_CREATED: { icon: MapPin, color: "#3b82f6", bg: "#eff6ff", label: "New Booking" },
    BOOKING_ROUTED_TO_NETWORK: { icon: User, color: "#8b5cf6", bg: "#f5f3ff", label: "Routed to Network" },
    RIDER_ASSIGNED: { icon: User, color: "#10b981", bg: "#f0fdf4", label: "Rider Assigned" },
    RIDER_ACCEPTED: { icon: CheckCircle, color: "#10b981", bg: "#f0fdf4", label: "Rider Accepted" },
    RIDER_DECLINED: { icon: XCircle, color: "#ef4444", bg: "#fef2f2", label: "Rider Declined" },
    RIDER_ARRIVED: { icon: MapPin, color: "#f59e0b", bg: "#fffbeb", label: "Rider Arrived" },
    TRIP_STARTED: { icon: MapPin, color: "#6366f1", bg: "#eef2ff", label: "Trip Started" },
    TRIP_ENDED: { icon: CheckCircle, color: "#10b981", bg: "#f0fdf4", label: "Trip Ended" },
    COMPLETION_CONFIRMED: { icon: CheckCircle, color: "#10b981", bg: "#f0fdf4", label: "Completed" },
    BOOKING_CANCELLED: { icon: XCircle, color: "#ef4444", bg: "#fef2f2", label: "Cancelled" },
  };

  const config = eventConfig[activity.type] || { 
    icon: Clock, 
    color: "#6b7280", 
    bg: "#f9fafb", 
    label: activity.type 
  };
  const Icon = config.icon;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(activity.timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  })();

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: config.bg }}>
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{config.label}</span>
            {activity.isNew && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded uppercase">New</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {activity.actor} · {activity.booking?.slice(0, 8) || "—"}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{timeAgo}</div>
        </div>
      </div>
    </div>
  );
}