import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function NetworkHealthTable({ networks, loading }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Network Health</h3>
        <Link to={createPageUrl("Networks")} className="text-xs text-orange-400 hover:text-orange-300">View all →</Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : networks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No networks yet</div>
      ) : (
        <div className="space-y-2">
          {networks.map(n => (
            <div key={n.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                {n.verified_badge
                  ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                }
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{n.name}</div>
                  <div className="text-xs text-gray-400">{n.zone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span className="text-xs text-gray-400">₱{(n.wallet_balance || 0).toLocaleString()}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  n.status === "approved" ? "bg-green-500/10 text-green-400" :
                  n.status === "suspended" ? "bg-red-500/10 text-red-400" :
                  "bg-yellow-500/10 text-yellow-400"
                }`}>{n.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}