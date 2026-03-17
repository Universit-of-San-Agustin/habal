import { useState } from "react";
import { Calendar, Clock, X, ChevronLeft } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

export default function ScheduleRideModal({ onConfirm, onCancel }) {
  const now = new Date();
  // Default to 1 hour from now
  const defaultDate = new Date(now.getTime() + 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, "0");
  const toDateInput = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const toTimeInput = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [date, setDate] = useState(toDateInput(defaultDate));
  const [time, setTime] = useState(toTimeInput(defaultDate));

  const minDate = toDateInput(now);
  const scheduled = new Date(`${date}T${time}`);
  const isValid = scheduled > new Date(now.getTime() + 5 * 60 * 1000); // at least 5 min from now

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(scheduled.toISOString());
  };

  const formatPreview = () => {
    if (!date || !time) return "";
    return scheduled.toLocaleString("en-PH", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 max-w-md mx-auto slide-up">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">Schedule a Ride</h2>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date
            </label>
            <input type="date" value={date} min={minDate}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl text-sm text-gray-800 font-semibold focus:outline-none"
              style={{ background: "#f8fbfd", border: `1.5px solid ${PRIMARY}40` }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time
            </label>
            <input type="time" value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl text-sm text-gray-800 font-semibold focus:outline-none"
              style={{ background: "#f8fbfd", border: `1.5px solid ${PRIMARY}40` }} />
          </div>
        </div>

        {date && time && (
          <div className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3" style={{ background: PRIMARY_BG }}>
            <span className="text-2xl">🕐</span>
            <div>
              <div className="text-xs font-bold" style={{ color: PRIMARY_DARK }}>Scheduled for</div>
              <div className="font-bold text-gray-800 text-sm">{formatPreview()}</div>
            </div>
          </div>
        )}

        {!isValid && date && time && (
          <p className="text-xs text-red-400 text-center mb-3">Please schedule at least 5 minutes from now.</p>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 text-sm">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!isValid}
            className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}