import { CheckCircle, MapPin, Clock, CreditCard, X } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function ReceiptModal({ item, type, onClose }) {
  // type: "ride" | "wallet"
  const isRide = type === "ride";

  const formatDate = (d) => d ? new Date(d).toLocaleString("en-PH", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) : "—";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            {isRide ? <span className="text-3xl">🏍</span> : <span className="text-3xl">💳</span>}
          </div>
          <div className="text-white font-black text-2xl mb-1">
            {isRide ? `₱${item.fare_estimate}` : `${(item.type === "credit" || item.type === "refund") ? "+" : "-"}₱${item.amount}`}
          </div>
          <div className="text-white/70 text-xs font-medium">
            {isRide ? "Ride Receipt" : item.description || "Wallet Transaction"}
          </div>
        </div>

        {/* Dashed separator */}
        <div className="relative">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100" />
          <div className="border-t-2 border-dashed border-gray-100 mx-4" />
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-3">
          {isRide ? (
            <>
              <Row label="Booking ID" value={item.booking_id || item.id?.slice(0,10).toUpperCase()} mono />
              <Row label="Date & Time" value={formatDate(item.created_date)} />
              <Row label="Pickup" value={item.pickup_address} icon={<div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: PRIMARY }} />} />
              <Row label="Drop-off" value={item.dropoff_address} icon={<MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />} />
              {item.rider_name && <Row label="Rider" value={item.rider_name} />}
              <Row label="Payment" value={(item.payment_method || "cash").toUpperCase()} />
              <Row label="Status" value={item.status?.toUpperCase()} colored />
            </>
          ) : (
            <>
              <Row label="Transaction ID" value={item.id?.slice(0,14).toUpperCase()} mono />
              <Row label="Date & Time" value={formatDate(item.created_date)} />
              <Row label="Type" value={item.type?.toUpperCase()} colored />
              <Row label="Description" value={item.description || "—"} />
              {item.balance_after != null && <Row label="Balance After" value={`₱${Number(item.balance_after).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />}
              {item.performed_by && <Row label="By" value={item.performed_by} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={HABAL_LOGO} alt="Habal" className="w-5 h-5 object-contain" onError={e => { e.target.style.display="none"; }} />
            <span className="text-xs text-gray-400 font-semibold">Habal-Habal Official Receipt</span>
          </div>
          <button onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, colored, icon }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <div className="flex items-start gap-1">
        {icon}
        <span className={`text-xs font-semibold text-right leading-snug ${mono ? "font-mono" : ""} ${colored ? "text-emerald-600" : "text-gray-700"}`}>
          {value || "—"}
        </span>
      </div>
    </div>
  );
}