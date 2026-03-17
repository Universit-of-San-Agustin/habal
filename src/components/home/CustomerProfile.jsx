import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, User, Phone, Mail, Save, LogOut } from "lucide-react";

export default function CustomerProfile({ user, onBack }) {
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ phone });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h2 className="font-bold text-gray-900 text-lg">My Profile</h2>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <User className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="text-lg font-bold text-gray-900">{user?.full_name}</div>
        <div className="text-sm text-gray-400">Customer</div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl text-gray-500 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span>{user?.full_name}</span>
            <span className="ml-auto text-xs text-gray-400">Managed by account</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl text-gray-500 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{user?.email}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus-within:border-emerald-500">
            <Phone className="w-4 h-4 text-gray-400" />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+63 900 000 0000"
              className="flex-1 bg-transparent text-gray-800 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>

        <button
          onClick={() => base44.auth.logout()}
          className="w-full py-3 border border-gray-200 text-gray-500 font-medium rounded-xl text-sm flex items-center justify-center gap-2 mt-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}