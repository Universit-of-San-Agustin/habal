import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Shield, Pencil, Users } from "lucide-react";
import StatusBadge from "../shared/StatusBadge";

export default function NetworkDetail({ network, onClose, onUpdate, onEdit }) {
  const [riders, setRiders] = useState([]);

  useEffect(() => {
    base44.entities.Rider.filter({ network_id: network.id }).then(setRiders);
  }, [network.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{network.name}</h2>
                {network.verified_badge && <Shield className="w-4 h-4 text-green-400" />}
              </div>
              <StatusBadge status={network.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg"><Pencil className="w-4 h-4" /></button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Owner", value: network.owner_name },
              { label: "Phone", value: network.owner_phone || "—" },
              { label: "Zone", value: network.zone },
              { label: "Subscription", value: network.subscription_status },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-sm text-white font-medium mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          {/* KPI metrics */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Performance KPIs</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{network.avg_rating?.toFixed(1) || "—"}</div>
                <div className="text-xs text-gray-400">Avg Rating</div>
                <div className={`text-xs mt-1 ${(network.avg_rating || 0) >= 4.6 ? "text-green-400" : "text-red-400"}`}>
                  {(network.avg_rating || 0) >= 4.6 ? "✓ SLA met" : "⚠ Below 4.6"}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{network.strikes || 0}</div>
                <div className="text-xs text-gray-400">Strikes</div>
              </div>
              <div className={`bg-gray-800 rounded-lg p-3 text-center border ${(network.wallet_balance || 0) < (network.wallet_threshold || 5000) ? "border-red-500/30" : "border-transparent"}`}>
                <div className={`text-lg font-bold ${(network.wallet_balance || 0) < (network.wallet_threshold || 5000) ? "text-red-400" : "text-green-400"}`}>
                  ₱{(network.wallet_balance || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Wallet</div>
              </div>
            </div>
          </div>

          {/* Riders list */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Riders ({riders.length})</h4>
            </div>
            <div className="space-y-2">
              {riders.length === 0 ? (
                <div className="text-xs text-gray-500 py-4 text-center">No riders in this network yet</div>
              ) : riders.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm text-white">{r.full_name}</div>
                    <div className="text-xs text-gray-400">{r.plate_number || "No plate"} · {r.phone}</div>
                  </div>
                  <StatusBadge status={r.online_status} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            {network.status === "pending" && (
              <button onClick={() => onUpdate(network.id, { status: "approved", verified_badge: true })}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                ✓ Approve Network
              </button>
            )}
            {network.status === "approved" && (
              <button onClick={() => onUpdate(network.id, { status: "suspended" })}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 rounded-lg text-sm font-medium">
                Suspend
              </button>
            )}
            {network.status === "suspended" && (
              <button onClick={() => onUpdate(network.id, { status: "approved" })}
                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium">
                Reinstate
              </button>
            )}
            <button onClick={() => onUpdate(network.id, { strikes: (network.strikes || 0) + 1 })}
              className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-medium">
              + Issue Strike
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}