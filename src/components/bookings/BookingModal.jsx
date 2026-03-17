import { useState } from "react";
import { X } from "lucide-react";

const ZONES = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];

export default function BookingModal({ networks, onClose, onSave }) {
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", pickup_address: "", dropoff_address: "",
    zone: "Jaro", network_id: "", network_name: "", payment_method: "cash", fare_estimate: "", notes: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">New Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Customer Name *</label>
              <input value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Phone *</label>
              <input value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Pickup Address *</label>
            <input value={form.pickup_address} onChange={e => set("pickup_address", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Dropoff Address *</label>
            <input value={form.dropoff_address} onChange={e => set("dropoff_address", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Zone *</label>
              <select value={form.zone} onChange={e => set("zone", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Assign to Network</label>
              <select value={form.network_id} onChange={e => {
                const n = networks.find(x => x.id === e.target.value);
                set("network_id", e.target.value);
                set("network_name", n?.name || "");
              }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                <option value="">Auto-assign</option>
                {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Fare Estimate (₱)</label>
              <input type="number" value={form.fare_estimate} onChange={e => set("fare_estimate", parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Payment</label>
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.customer_name && form.pickup_address && form.dropoff_address) onSave(form); }}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >Create Booking</button>
        </div>
      </div>
    </div>
  );
}