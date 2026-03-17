import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { COLORS } from "../components/shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;

export default function ProfileRatings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      base44.entities.Booking.filter({ 
        customer_phone: user.email,
        customer_rating: { $gte: 1 }
      }, "-created_date", 50)
        .then(bookings => {
          setRatings(bookings || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  const goBack = () => window.history.back();

  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + (r.customer_rating || 0), 0) / ratings.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 rounded-full animate-spin" 
          style={{ borderWidth: "3px", borderColor: "#EBF9FE", borderTopColor: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-bold text-white text-lg">My Ratings</h1>
        </div>
        {avgRating && (
          <div className="bg-white/20 rounded-2xl px-5 py-4 border border-white/30">
            <div className="text-white/70 text-xs mb-1">Your Average Rating</div>
            <div className="flex items-center gap-2">
              <div className="text-4xl font-black text-white">{avgRating}</div>
              <div className="flex">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className="w-5 h-5" 
                    style={{ color: n <= parseFloat(avgRating) ? "#fbbf24" : "#ffffff40", fill: n <= parseFloat(avgRating) ? "#fbbf24" : "none" }} />
                ))}
              </div>
            </div>
            <div className="text-white/60 text-xs mt-2">{ratings.length} reviews submitted</div>
          </div>
        )}
      </div>

      {/* Ratings List */}
      <div className="px-4 pt-4 space-y-3">
        {ratings.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-300">
            <Star className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm text-gray-400 font-medium">No ratings yet</p>
            <p className="text-xs text-gray-300 mt-1">Complete a ride and rate your experience</p>
          </div>
        ) : (
          ratings.map(rating => (
            <div key={rating.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "#EBF9FE" }}>
                    🏍
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{rating.rider_name || "Rider"}</div>
                    <div className="text-xs text-gray-400">{rating.booking_id}</div>
                  </div>
                </div>
                <div className="flex">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className="text-sm" 
                      style={{ color: n <= rating.customer_rating ? "#fbbf24" : "#e5e7eb" }}>★</span>
                  ))}
                </div>
              </div>
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full" style={{ background: PRIMARY }} />
                  <span className="truncate">{rating.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-2.5 h-2.5 text-amber-400" />
                  <span className="truncate">{rating.dropoff_address}</span>
                </div>
              </div>
              {rating.customer_feedback && (
                <div className="bg-gray-50 rounded-xl px-3 py-2 mt-2">
                  <div className="text-xs text-gray-600 italic">"{rating.customer_feedback}"</div>
                </div>
              )}
              <div className="text-[10px] text-gray-300 mt-2">
                {rating.created_date ? new Date(rating.created_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}