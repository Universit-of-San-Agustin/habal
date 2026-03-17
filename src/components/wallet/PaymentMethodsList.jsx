import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CreditCard, Smartphone, Building2, Plus, Trash2, CheckCircle, Star } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const TYPE_CONFIG = {
  card:  { icon: <CreditCard className="w-5 h-5" />, color: "#6366f1", bg: "#eef2ff", label: "Credit/Debit Card" },
  gcash: { icon: <Smartphone className="w-5 h-5" />, color: "#0ea5e9", bg: "#e0f2fe", label: "GCash" },
  maya:  { icon: <Smartphone className="w-5 h-5" />, color: "#10b981", bg: "#d1fae5", label: "Maya" },
  bank:  { icon: <Building2 className="w-5 h-5" />, color: "#f59e0b", bg: "#fef3c7", label: "Bank Transfer" },
};

export default function PaymentMethodsList({ user, onClose }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("card");
  const [form, setForm] = useState({ label: "", last_four: "", card_brand: "Visa", account_name: "", account_number_masked: "", expires: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.PaymentMethod.filter({ user_id: user.id || user.email }, "-created_date", 20)
      .then(d => setMethods(d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleAdd = async () => {
    if (!form.label) return;
    setSaving(true);
    const m = await base44.entities.PaymentMethod.create({
      user_id: user.id || user.email,
      user_email: user.email,
      type: addType,
      label: form.label,
      last_four: form.last_four,
      card_brand: form.card_brand,
      account_name: form.account_name,
      account_number_masked: form.account_number_masked,
      expires: form.expires,
      is_default: methods.length === 0,
      is_verified: false,
    });
    setMethods(prev => [m, ...prev]);
    setShowAdd(false);
    setForm({ label: "", last_four: "", card_brand: "Visa", account_name: "", account_number_masked: "", expires: "" });
    setSaving(false);
  };

  const handleSetDefault = async (id) => {
    await Promise.all(methods.map(m =>
      base44.entities.PaymentMethod.update(m.id, { is_default: m.id === id })
    ));
    setMethods(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
  };

  const handleDelete = async (id) => {
    await base44.entities.PaymentMethod.delete(id);
    setMethods(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl max-h-[85vh] flex flex-col max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
          <h2 className="font-bold text-gray-900 text-lg mt-2">Payment Methods</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold mt-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }} /></div>
          ) : (
            <>
              {methods.length === 0 && !showAdd && (
                <div className="text-center py-10 text-gray-300">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-gray-400">No payment methods yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add a card or mobile wallet</p>
                </div>
              )}

              {/* Methods list */}
              <div className="space-y-2 mb-4">
                {methods.map(m => {
                  const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.card;
                  return (
                    <div key={m.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                          {m.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: PRIMARY }}>Default</span>}
                          {m.is_verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {m.last_four ? `${m.card_brand || ""} •••• ${m.last_four}` : m.account_number_masked || cfg.label}
                          {m.expires ? ` · Exp ${m.expires}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!m.is_default && (
                          <button onClick={() => handleSetDefault(m.id)} title="Set as default"
                            className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: PRIMARY_BG }}>
                            <Star className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(m.id)} className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add form */}
              {showAdd ? (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-4">
                  <div className="text-sm font-bold text-gray-700 mb-1">Add New Method</div>
                  {/* Type tabs */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => setAddType(key)}
                        className="py-2 rounded-xl text-xs font-semibold transition-all"
                        style={addType === key ? { background: PRIMARY, color: "#fff" } : { background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb" }}>
                        {cfg.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={`Label (e.g. My ${TYPE_CONFIG[addType]?.label})`}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "#fff", border: "1.5px solid #e2ecf2" }} />
                  {addType === "card" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={form.card_brand} onChange={e => setForm(f => ({ ...f, card_brand: e.target.value }))}
                          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none bg-white" style={{ border: "1.5px solid #e2ecf2" }}>
                          {["Visa", "Mastercard", "JCB", "Amex"].map(b => <option key={b}>{b}</option>)}
                        </select>
                        <input value={form.last_four} onChange={e => setForm(f => ({ ...f, last_four: e.target.value.slice(0,4) }))}
                          placeholder="Last 4 digits" maxLength={4}
                          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                          style={{ background: "#fff", border: "1.5px solid #e2ecf2" }} />
                      </div>
                      <input value={form.expires} onChange={e => setForm(f => ({ ...f, expires: e.target.value }))}
                        placeholder="Expiry MM/YY"
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: "#fff", border: "1.5px solid #e2ecf2" }} />
                    </>
                  )}
                  {(addType === "gcash" || addType === "maya") && (
                    <input value={form.account_number_masked} onChange={e => setForm(f => ({ ...f, account_number_masked: e.target.value }))}
                      placeholder="Mobile number (+63...)"
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={{ background: "#fff", border: "1.5px solid #e2ecf2" }} />
                  )}
                  {addType === "bank" && (
                    <>
                      <input value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                        placeholder="Account name"
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: "#fff", border: "1.5px solid #e2ecf2" }} />
                      <input value={form.account_number_masked} onChange={e => setForm(f => ({ ...f, account_number_masked: e.target.value }))}
                        placeholder="Account number (masked, e.g. •••• 1234)"
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: "#fff", border: "1.5px solid #e2ecf2" }} />
                    </>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500">Cancel</button>
                    <button onClick={handleAdd} disabled={saving || !form.label}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                      {saving ? "Saving..." : "Add Method"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)}
                  className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:border-blue-200 hover:text-blue-400 transition-colors">
                  <Plus className="w-4 h-4" /> Add Payment Method
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}