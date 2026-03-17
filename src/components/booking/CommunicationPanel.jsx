import { useState } from "react";
import { MessageCircle, Phone, FileText, X } from "lucide-react";
import ChatPanel from "../chat/ChatPanel";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";

/**
 * CommunicationPanel - Unified Customer ↔ Rider communication interface
 * 
 * Features:
 * - Real-time chat
 * - Phone call via device dialer
 * - Booking notes display
 * 
 * Usage:
 * <CommunicationPanel
 *   booking={activeBooking}
 *   currentUser={user}
 *   userRole="customer" // or "rider"
 * />
 */
export default function CommunicationPanel({ booking, currentUser, userRole, onClose }) {
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  if (!booking) return null;

  // Determine contact details based on role
  const isCustomer = userRole === "customer";
  const contactName = isCustomer ? booking.rider_name : booking.customer_name;
  const contactPhone = isCustomer ? booking.rider_phone : booking.customer_phone;
  const contactRole = isCustomer ? "Rider" : "Customer";

  // Phone call handler - opens device dialer
  const handleCall = () => {
    if (!contactPhone) {
      alert(`${contactRole} phone number not available`);
      return;
    }
    
    // Format phone number (remove spaces, ensure proper format)
    const cleanPhone = contactPhone.replace(/\s+/g, "");
    const telUrl = `tel:${cleanPhone}`;
    
    console.log(`📞 CALL: Opening dialer for ${contactRole}`, { phone: cleanPhone });
    
    // Open device dialer
    window.location.href = telUrl;
  };

  if (showChat) {
    return (
      <ChatPanel
        bookingId={booking.booking_id || booking.id}
        currentUser={currentUser}
        senderRole={userRole}
        onClose={() => setShowChat(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-gray-100"
        style={{ boxShadow: "0 2px 12px rgba(77,200,240,0.12)" }}>
        <div>
          <div className="font-bold text-gray-900 text-base">Communication</div>
          <div className="text-xs text-gray-400">Booking #{booking.booking_id || booking.id?.slice(0, 8)}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Contact Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 border border-blue-200/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
              {isCustomer ? "🏍" : "👤"}
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-sm">{contactName || `${contactRole} Not Assigned`}</div>
              <div className="text-xs text-gray-500 mt-0.5">{contactRole}</div>
            </div>
          </div>
          {contactPhone && (
            <div className="text-xs text-gray-600 font-mono bg-white/60 px-3 py-2 rounded-lg">
              📞 {contactPhone}
            </div>
          )}
        </div>

        {/* Communication Options */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</div>
          
          {/* Chat Button */}
          <button
            onClick={() => setShowChat(true)}
            className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 hover:shadow-md hover:border-blue-300 transition-all">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: PRIMARY + "20" }}>
              <MessageCircle className="w-5 h-5" style={{ color: PRIMARY }} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-900 text-sm">Chat with {contactRole}</div>
              <div className="text-xs text-gray-500 mt-0.5">Send instant messages</div>
            </div>
          </button>

          {/* Call Button */}
          <button
            onClick={handleCall}
            disabled={!contactPhone}
            className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 hover:shadow-md hover:border-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-900 text-sm">Call {contactRole}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {contactPhone ? "Opens device dialer" : "Phone number not available"}
              </div>
            </div>
          </button>

          {/* Booking Notes */}
          {(booking.notes || !isCustomer) && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 hover:shadow-md hover:border-amber-300 transition-all">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-gray-900 text-sm">
                  {isCustomer ? "Your Notes" : "Customer Notes"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {booking.notes ? "Tap to view" : "No notes added"}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Notes Display */}
        {showNotes && booking.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 slide-up">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <div className="font-bold text-amber-900 text-sm">
                {isCustomer ? "Your Notes" : "Customer Notes"}
              </div>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed bg-white/50 rounded-xl p-3">
              {booking.notes}
            </div>
          </div>
        )}

        {/* Trip Details */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trip Details</div>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" style={{ background: PRIMARY }} />
              <div className="flex-1">
                <div className="text-gray-400 text-[10px] uppercase font-bold">Pickup</div>
                <div className="text-gray-700 font-medium">{booking.pickup_address}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 bg-amber-400" />
              <div className="flex-1">
                <div className="text-gray-400 text-[10px] uppercase font-bold">Dropoff</div>
                <div className="text-gray-700 font-medium">{booking.dropoff_address}</div>
              </div>
            </div>
          </div>
          {booking.fare_estimate && (
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-500">Estimated Fare</span>
              <span className="font-bold text-gray-900">₱{booking.fare_estimate}</span>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <div className="text-lg flex-shrink-0">🔒</div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900 text-xs mb-1">Privacy Protected</div>
              <div className="text-xs text-blue-700 leading-relaxed">
                Contact information is only shared between you and your {isCustomer ? "rider" : "customer"} for this trip.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}