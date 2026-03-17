import { X, Pencil, Bike, Star, AlertTriangle } from "lucide-react";
import StatusBadge from "../shared/StatusBadge";

export default function RiderDetail({ rider, onClose, onUpdate, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <Bike className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{rider.full_name}</h2>
              <StatusBadge status={rider.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg"><Pencil className="w-4 h-4" /></button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Phone", value: rider.phone },
              { label: "Network", value: rider.network_name || "—" },
              { label: "Zone", value: rider.zone || "—" },
              { label: "Role", value: rider.role?.replace(/_/g, " ") },
              { label: "Plate", value: rider.plate_number || "—" },
              { label: "Vehicle", value: `${rider.motorcycle_make || ""} ${rider.motorcycle_model || ""}`.trim() || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-sm text-white font-medium mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xl font-bold text-white">{rider.completed_trips || 0}</div>
              <div className="text-xs text-gray-400">Trips</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-xl font-bold text-white">{rider.avg_rating?.toFixed(1) || "—"}</span>
              </div>
              <div className="text-xs text-gray-400">Rating</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xl font-bold text-orange-400">{rider.strikes || 0}</div>
              <div className="text-xs text-gray-400">Strikes</div>
            </div>
          </div>

          {rider.emergency_contact_name && (
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Emergency Contact</div>
              <div className="text-sm text-white">{rider.emergency_contact_name} — {rider.emergency_contact_phone}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {rider.status === "pending" && (
              <button onClick={() => onUpdate(rider.id, { status: "active" })}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                ✓ Activate
              </button>
            )}
            {rider.status === "active" && (
              <button onClick={() => onUpdate(rider.id, { status: "suspended" })}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 rounded-lg text-sm font-medium">
                Suspend
              </button>
            )}
            {rider.status === "suspended" && (
              <button onClick={() => onUpdate(rider.id, { status: "active" })}
                className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium">
                Reinstate
              </button>
            )}
            <button onClick={() => onUpdate(rider.id, { strikes: (rider.strikes || 0) + 1 })}
              className="px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Issue Strike
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}