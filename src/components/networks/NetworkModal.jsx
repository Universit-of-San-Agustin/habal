import { useState } from "react";
import { X } from "lucide-react";

const ZONES = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];

export default function NetworkModal({ network, onClose, onSave }) {
  const [form, setForm] = useState(network || {
    name: "", owner_name: "", owner_email: "", owner_phone: "",
    facebook_page_url: "", zone: "Jaro", status: "pending",
    wallet_balance: 0, wallet_threshold: 5000, active_rider_seats: 30,
    subscription_status: "inactive", notes: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{network ? "Edit Network" : "Add Network"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 font-medium mb-1 block">Network Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Owner Name *</label>
              <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Owner Phone</label>
              <input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Zone *</label>
              <select value={form.zone} onChange={e => set("zone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {["pending","approved","suspended","banned"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Wallet Balance (₱)</label>
              <input type="number" value={form.wallet_balance} onChange={e => set("wallet_balance", parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Active Rider Seats</label>
              <input type="number" value={form.active_rider_seats} onChange={e => set("active_rider_seats", parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Subscription</label>
              <select value={form.subscription_status} onChange={e => set("subscription_status", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {["active","inactive","trial"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 font-medium mb-1 block">Facebook Page URL</label>
              <input value={form.facebook_page_url} onChange={e => set("facebook_page_url", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 font-medium mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.name && form.owner_name) onSave({ ...form, verified_badge: form.status === "approved" }); }}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >Save Network</button>
        </div>
      </div>
    </div>
  );
}