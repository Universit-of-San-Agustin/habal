import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusBadge from "../shared/StatusBadge";

export default function RecentBookings({ bookings, loading }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Recent Bookings</h3>
        <Link to={createPageUrl("Bookings")} className="text-xs text-orange-400 hover:text-orange-300">View all →</Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No bookings yet</div>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{b.customer_name}</div>
                <div className="text-xs text-gray-400 truncate">{b.pickup_address} → {b.dropoff_address}</div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span className="text-xs text-gray-500">{b.zone}</span>
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}