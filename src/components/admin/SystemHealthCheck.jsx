import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { isDemoMode, readDemoStore } from "@/lib/demoStore";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

const PRIMARY = "#4DC8F0";

export default function SystemHealthCheck() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);

  const runHealthCheck = async () => {
    setChecking(true);
    const demoMode = isDemoMode();
    const checks = {
      entities: { status: "checking", message: "" },
      booking_system: { status: "checking", message: "" },
      dispatch_system: { status: "checking", message: "" },
      real_time: { status: "checking", message: "" },
    };
    setResults({ ...checks });

    if (demoMode) {
      const store = readDemoStore();
      const activeBookings = (store.bookings || []).filter((booking) => ["pending", "searching", "assigned", "otw", "arrived", "in_progress"].includes(booking.status));
      const liveRiders = (store.riders || []).filter((rider) => rider.lat != null && rider.lng != null);
      const primaryDemoRider = (store.riders || []).find((rider) => rider.is_primary_demo_rider);

      checks.entities = {
        status: "pass",
        message: `✓ Demo store ready: ${store.bookings?.length || 0} bookings, ${store.riders?.length || 0} riders, ${store.events?.length || 0} events`
      };
      checks.booking_system = {
        status: "pass",
        message: `✓ ${activeBookings.length} active or pending demo bookings available`
      };
      checks.dispatch_system = {
        status: primaryDemoRider || store.riders.length > 0 ? "pass" : "checking",
        message: primaryDemoRider
          ? `✓ Demo rider ready: ${primaryDemoRider.full_name}`
          : "⚠ Open Rider view once to register the primary demo rider"
      };
      checks.real_time = {
        status: liveRiders.length > 0 ? "pass" : "checking",
        message: liveRiders.length > 0
          ? `✓ ${liveRiders.length} riders have live coordinates for maps`
          : "⚠ Start simulation or rider GPS to generate live coordinates"
      };

      setResults(checks);
      setChecking(false);
      return;
    }

    // Check 1: Entity access
    try {
      const bookings = await base44.entities.Booking.filter({}, "-created_date", 1);
      const riders = await base44.entities.Rider.filter({}, "-created_date", 1);
      const networks = await base44.entities.Network.filter({}, "-created_date", 1);
      checks.entities = {
        status: "pass",
        message: `✓ Bookings: ${bookings?.length || 0}, Riders: ${riders?.length || 0}, Networks: ${networks?.length || 0}`
      };
    } catch (err) {
      checks.entities = { status: "fail", message: `✗ ${err.message}` };
    }

    // Check 2: Booking system
    try {
      const pendingBookings = await base44.entities.Booking.filter({ status: "pending" }, "-created_date", 5);
      checks.booking_system = {
        status: "pass",
        message: `✓ ${pendingBookings?.length || 0} pending bookings found`
      };
    } catch (err) {
      checks.booking_system = { status: "fail", message: `✗ ${err.message}` };
    }

    // Check 3: Dispatch functions (with temporary test booking)
    try {
      // Create a temporary test booking for dispatch validation
      const testBooking = await base44.entities.Booking.create({
        booking_id: `health-check-${Date.now()}`,
        customer_name: "Health Check Test",
        customer_phone: "+63-900-000-0000",
        pickup_address: "Iloilo City Hall, Iloilo City, Iloilo",
        dropoff_address: "SM City Iloilo, Iloilo City",
        zone: "City Proper",
        status: "pending",
        payment_method: "cash",
      });

      // Test matchRider function
      const matchResponse = await base44.functions.invoke("matchRider", { booking_id: testBooking.id });
      
      // Test notifyRidersOfBooking function
      const notifyResponse = await base44.functions.invoke("notifyRidersOfBooking", { booking_id: testBooking.id });

      // Cleanup: Delete test booking
      await base44.entities.Booking.delete(testBooking.id).catch(() => {});

      const matchSuccess = matchResponse?.data?.matched !== undefined || matchResponse?.data?.error?.includes("not found") === false;
      const notifySuccess = notifyResponse?.data?.notified !== undefined || notifyResponse?.data?.error?.includes("not found") === false;

      checks.dispatch_system = {
        status: matchSuccess && notifySuccess ? "pass" : "warning",
        message: matchSuccess && notifySuccess 
          ? "✓ Dispatch functions validated with test booking"
          : "⚠ Dispatch functions accessible but may need active riders"
      };
    } catch (err) {
      checks.dispatch_system = { status: "fail", message: `✗ ${err.message}` };
    }

    // Check 4: Real-time data
    try {
      const locations = await base44.entities.RiderLocation.filter({}, "-updated_date", 5);
      checks.real_time = {
        status: "pass",
        message: `✓ ${locations?.length || 0} active location records`
      };
    } catch (err) {
      checks.real_time = { status: "fail", message: `✗ ${err.message}` };
    }

    setResults(checks);
    setChecking(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-base">System Health Check</h3>
          <p className="text-xs text-gray-500 mt-0.5">Verify platform stability</p>
        </div>
        <button onClick={runHealthCheck} disabled={checking}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2"
          style={{ background: PRIMARY }}>
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Run Check"}
        </button>
      </div>

      {results && (
        <div className="space-y-2">
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
              {result.status === "pass" && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />}
              {result.status === "fail" && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
              {result.status === "checking" && <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 capitalize">{key.replace(/_/g, " ")}</div>
                <div className="text-xs text-gray-600 mt-1">{result.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!results && (
        <div className="text-center py-8 text-gray-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Run Check" to verify system health</p>
        </div>
      )}
    </div>
  );
}