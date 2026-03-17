import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronDown, ChevronUp, Send, CheckCircle } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const FAQS = [
  { q: "How do I book a ride?", a: "Open the app, tap 'Where to?', enter your destination, review the fare estimate and tap 'Book Now'." },
  { q: "How is the fare calculated?", a: "Fare is based on distance and zone. You'll see the estimated fare before confirming your booking." },
  { q: "What payment methods are accepted?", a: "Currently Cash and GCash are accepted. More payment options are coming soon." },
  { q: "Can I cancel a booking?", a: "Yes, you can cancel before your rider starts the trip. Frequent cancellations may affect your account." },
  { q: "How do I rate my rider?", a: "After your trip is completed, a rating screen will appear. Your feedback helps us maintain quality service." },
  { q: "What if my rider doesn't arrive?", a: "You can contact your rider via in-app chat or cancel and rebook. For persistent issues, submit a support ticket." },
  { q: "How do I update my profile?", a: "Go to Profile tab and tap on the field you want to update." },
  { q: "Is my location shared with the rider?", a: "Yes, your pickup location is shared with the assigned rider only for navigation purposes." },
];

export default function SupportScreen({ user, onBack }) {
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState("faq"); // faq | ticket
  const [form, setForm] = useState({ category: "booking_issue", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.subject || !form.message) return;
    setSubmitting(true);
    await base44.entities.SupportTicket.create({
      customer_id: user?.id || user?.email,
      customer_name: user?.full_name || "Customer",
      customer_email: user?.email,
      category: form.category,
      subject: form.subject,
      message: form.message,
      status: "open",
      priority: "medium",
    }).catch(() => {});
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm({ category: "booking_issue", subject: "", message: "" }); }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Help & Support</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-100 bg-white" style={{ boxShadow: "0 2px 8px rgba(77,200,240,0.05)" }}>
        {[{ id: "faq", label: "💬 FAQ" }, { id: "ticket", label: "🎫 Submit Ticket" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-3.5 text-sm font-semibold transition-all"
            style={tab === t.id
              ? { color: PRIMARY, borderBottom: `2.5px solid ${PRIMARY}` }
              : { color: "#b0bec5" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 fade-in">
        {/* FAQ */}
        {tab === "faq" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-4">Frequently asked questions. Tap to expand.</p>
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left">
                  <span className="text-sm font-semibold text-gray-800 pr-4">{faq.q}</span>
                  {expanded === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {expanded === i && (
                  <div className="px-4 pb-4">
                    <div className="h-px bg-gray-100 mb-3" />
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Contact buttons */}
            <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Still need help?</p>
              <div className="space-y-2">
                {[
                  { icon: "📞", label: "Call Support", sub: "+63 (33) 300-HABAL" },
                  { icon: "📧", label: "Email Us", sub: "support@habal.app" },
                  { icon: "💬", label: "Live Chat", sub: "Available 7am–10pm" },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: PRIMARY_BG }}>
                      {c.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{c.label}</div>
                      <div className="text-xs text-gray-400">{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit Ticket */}
        {tab === "ticket" && (
          <div className="space-y-4">
            {submitted ? (
              <div className="flex flex-col items-center py-16">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: PRIMARY_BG }}>
                  <CheckCircle className="w-10 h-10" style={{ color: PRIMARY }} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Ticket Submitted!</h3>
                <p className="text-sm text-gray-400 text-center">Our support team will respond within 24 hours.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-gray-800 focus:outline-none transition-all"
                    style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }}>
                    <option value="booking_issue">Booking Issue</option>
                    <option value="payment">Payment Problem</option>
                    <option value="rider_complaint">Rider Complaint</option>
                    <option value="app_bug">App Bug</option>
                    <option value="account">Account Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Subject</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-gray-800 focus:outline-none transition-all"
                    style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }}
                    onFocus={e => { e.target.style.borderColor = PRIMARY; e.target.style.boxShadow = "0 0 0 3px rgba(77,200,240,0.15)"; }}
                    onBlur={e =>  { e.target.style.borderColor = "#e2ecf2"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Message</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    rows={5}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-gray-800 focus:outline-none transition-all resize-none"
                    style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }}
                    onFocus={e => { e.target.style.borderColor = PRIMARY; e.target.style.boxShadow = "0 0 0 3px rgba(77,200,240,0.15)"; }}
                    onBlur={e =>  { e.target.style.borderColor = "#e2ecf2"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <button onClick={handleSubmit} disabled={submitting || !form.subject || !form.message}
                  className="w-full py-4 rounded-full font-bold text-white text-sm disabled:opacity-55 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: "0 4px 20px rgba(77,200,240,0.35)" }}>
                  {submitting
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Send className="w-4 h-4" /> Submit Ticket</>}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}