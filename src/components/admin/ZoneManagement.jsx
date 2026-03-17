import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Check, X, MapPin, DollarSign } from "lucide-react";

const PRIMARY = "#4DC8F0";
const ZONES = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];

const EMPTY_FORM = {
  name: "",
  description: "",
  is_premium: false,
  monthly_territory_fee: 0,
  status: "available",
  volume_level: "medium",
};

export default function ZoneManagement() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const zns = await base44.entities.Zone.list("-created_date", 20).catch(() => []);
    setZones(zns || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (zone) => {
    setEditingId(zone.id);
    setForm({ ...EMPTY_FORM, ...zone });
    setShowCreate(false);
  };

  const startCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const cancel = () => { setEditingId(null); setShowCreate(false); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    if (editingId) {
      await base44.entities.Zone.update(editingId, form).catch(() => {});
    } else {
      await base44.entities.Zone.create(form).catch(() => {});
    }
    setSaving(false);
    cancel();
    load();
  };

  const statusColor = {
    available: "bg-green-50 text-green-600",
    assigned: "bg-blue-50 text-blue-600",
    locked: "bg-gray-100 text-gray-500",
  };

  const volumeColor = {
    low: "text-gray-400",
    medium: "text-amber-500",
    high: "text-red-500",
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-3">
      {/* Add Zone button */}
      <button onClick={startCreate}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-colors"
        style={{ borderColor: PRIMARY, color: PRIMARY }}>
        <Plus className="w-4 h-4" /> Add Zone
      </button>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: `0 2px 12px rgba(77,200,240,0.1)` }}>
          <div className="text-sm font-bold text-gray-900 mb-3">{editingId ? "Edit Zone" : "New Zone"}</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Zone Name</label>
              <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#4DC8F0]">
                <option value="">Select zone…</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description…"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#4DC8F0]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#4DC8F0]">
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Volume</label>
                <select value={form.volume_level} onChange={e => setForm(f => ({ ...f, volume_level: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#4DC8F0]">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Monthly Territory Fee (₱)</label>
              <input type="number" value={form.monthly_territory_fee} onChange={e => setForm(f => ({ ...f, monthly_territory_fee: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#4DC8F0]" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="premium" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
              <label htmlFor="premium" className="text-sm text-gray-700">Premium Zone</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving || !form.name}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: PRIMARY }}>
              <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} className="flex-1 py-2.5 rounded-xl text-gray-500 text-sm font-medium border border-gray-200 flex items-center justify-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Zone list */}
      {loading && <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} /></div>}
      {!loading && zones.length === 0 && (
        <div className="flex flex-col items-center py-12 text-gray-300">
          <MapPin className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">No zones configured yet</p>
        </div>
      )}
      {zones.map(z => (
        <div key={z.id} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: `0 2px 10px rgba(77,200,240,0.07)` }}>
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
              <span className="font-bold text-gray-900 text-sm">{z.name}</span>
              {z.is_premium && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white" style={{ background: "#f59e0b" }}>Premium</span>}
            </div>
            <button onClick={() => startEdit(z)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#EBF9FE" }}>
              <Edit2 className="w-3 h-3" style={{ color: PRIMARY }} />
            </button>
          </div>
          {z.description && <p className="text-xs text-gray-400 mb-2 ml-6">{z.description}</p>}
          <div className="flex items-center gap-3 ml-6 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[z.status] || "bg-gray-50 text-gray-500"}`}>{z.status}</span>
            <span className={`text-xs font-medium capitalize ${volumeColor[z.volume_level] || ""}`}>Volume: {z.volume_level}</span>
            {z.monthly_territory_fee > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5"><DollarSign className="w-3 h-3" />₱{z.monthly_territory_fee?.toLocaleString()}/mo</span>
            )}
          </div>
          {z.assigned_network_name && (
            <div className="mt-2 ml-6 text-xs text-gray-500">Assigned to: <span className="font-semibold text-gray-700">{z.assigned_network_name}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}