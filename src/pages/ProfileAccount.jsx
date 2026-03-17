import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, User, Mail, Phone, Calendar, Save } from "lucide-react";
import { COLORS } from "../components/shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;
const PRIMARY_BG = COLORS.primaryBg;

export default function ProfileAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm({ full_name: u.full_name || "", phone: u.phone || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form).catch(() => {});
    const updated = await base44.auth.me();
    setUser(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const goBack = () => window.history.back();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 rounded-full animate-spin" 
          style={{ borderWidth: "3px", borderColor: PRIMARY_BG, borderTopColor: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-bold text-white text-lg">Account Info</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-bold text-white">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <div className="text-white font-bold text-base">{user?.full_name || "User"}</div>
            <div className="text-white/70 text-xs mt-0.5">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Full Name
          </label>
          <input
            value={form.full_name}
            onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none"
            onFocus={e => e.target.style.borderColor = PRIMARY}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email (read-only)
          </label>
          <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500">
            {user?.email}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Member Since
          </label>
          <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500">
            {user?.created_date ? new Date(user.created_date).toLocaleDateString("en-PH", { month: "long", year: "numeric" }) : "—"}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !form.full_name}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
          {saved ? "✓ Saved!" : saving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}