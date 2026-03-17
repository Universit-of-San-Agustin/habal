import { useState } from "react";
import { X } from "lucide-react";

const ZONES = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];

export default function RiderModal({ rider, networks, onClose, onSave }) {
  const [form, setForm] = useState(rider || {
    full_name: "", phone: "", email: "", network_id: "", network_name: "",
    role: "rider", status: "pending", zone: "Jaro",
    plate_number: "", motorcycle_make: "", motorcycle_model: "",
    emergency_contact_name: "", emergency_contact_phone: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{rider ? "Edit Rider" : "Add Rider"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Full Name *</label>
              <input value={form.full_name} onChange={e => set("full_name", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Phone *</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Network *</label>
              <select value={form.network_id} onChange={e => {
                const n = networks.find(x => x.id === e.target.value);
                set("network_id", e.target.value);
                set("network_name", n?.name || "");
                set("zone", n?.zone || form.zone);
              }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                <option value="">Select network...</option>
                {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Role</label>
              <select value={form.role} onChange={e => set("role", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {["rider","dispatcher","network_owner"].map(r => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {["pending","active","suspended","banned"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Zone</label>
              <select value={form.zone} onChange={e => set("zone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Plate Number</label>
              <input value={form.plate_number} onChange={e => set("plate_number", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Motorcycle Make</label>
              <input value={form.motorcycle_make} onChange={e => set("motorcycle_make", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Model</label>
              <input value={form.motorcycle_model} onChange={e => set("motorcycle_model", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Emergency Contact</label>
              <input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Emergency Phone</label>
              <input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.full_name && form.phone) onSave(form); }}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >Save Rider</button>
        </div>
      </div>
    </div>
  );
}