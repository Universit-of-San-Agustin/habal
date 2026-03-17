import { useEffect, useState } from "react";
import { X, Bell, CheckCircle, Bike, MapPin, AlertCircle } from "lucide-react";

const PRIMARY = "#4DC8F0";

// Usage: useToast hook + <ToastContainer toasts={toasts} onDismiss={dismiss} />

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return { toasts, addToast, dismiss };
}

const ICONS = {
  info:    <Bell className="w-4 h-4 text-white" />,
  success: <CheckCircle className="w-4 h-4 text-white" />,
  rider:   <Bike className="w-4 h-4 text-white" />,
  location:<MapPin className="w-4 h-4 text-white" />,
  alert:   <AlertCircle className="w-4 h-4 text-white" />,
};

const BG = {
  info:    PRIMARY,
  success: "#10b981",
  rider:   PRIMARY,
  location:"#f59e0b",
  alert:   "#ef4444",
};

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
      style={{ fontFamily: "'Poppins', sans-serif" }}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const bg = BG[toast.type] || PRIMARY;

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg text-white"
      style={{
        background: bg,
        boxShadow: `0 4px 20px ${bg}55`,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        {ICONS[toast.type] || ICONS.info}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && <div className="text-xs font-bold leading-tight">{toast.title}</div>}
        <div className="text-xs opacity-90 leading-snug mt-0.5">{toast.message}</div>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}