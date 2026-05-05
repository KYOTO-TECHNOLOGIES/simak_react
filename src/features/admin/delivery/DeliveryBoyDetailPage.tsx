import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Truck,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Pencil,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Package,
  Clock,
  ExternalLink,
} from "lucide-react";
import { deliveryApi, type DeliveryBoyUser } from "../../delivery/deliveryApi";
import { ordersApi, type OrderDto } from "../orders/ordersApi";

/* ─── UAE emirates ─── */
const EMIRATES = [
  { value: "abu_dhabi", label: "Abu Dhabi" },
  { value: "dubai", label: "Dubai" },
  { value: "sharjah", label: "Sharjah" },
  { value: "ajman", label: "Ajman" },
  { value: "umm_al_quwain", label: "Umm Al Quwain" },
  { value: "fujairah", label: "Fujairah" },
  { value: "ras_al_khaimah", label: "Ras Al Khaimah" },
];

/* ─── Helpers ─── */
const InfoField: React.FC<{ label: string; value?: string | null; children?: React.ReactNode }> = ({
  label,
  value,
  children,
}) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide">{label}</p>
    {children ?? <p className="text-sm font-bold text-[#18181B]">{value || "—"}</p>}
  </div>
);

/* ─── Edit Modal ─── */
interface EditModalProps {
  boy: DeliveryBoyUser;
  onClose: () => void;
  onSaved: (updated: DeliveryBoyUser) => void;
}

function EditModal({ boy, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    first_name: boy.first_name ?? "",
    last_name: boy.last_name ?? "",
    email: boy.email ?? "",
    phone_number: boy.phone_number ?? "",
    is_active: boy.is_active,
    is_available: boy.delivery_profile?.is_available ?? true,
    assigned_emirates: boy.delivery_profile?.assigned_emirates ?? [],
    vehicle_number: boy.delivery_profile?.vehicle_number ?? "",
    identity_number: boy.delivery_profile?.identity_number ?? "",
    emergency_contact: boy.delivery_profile?.emergency_contact ?? "",
    notes: boy.delivery_profile?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (field: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleEmirate = (val: string) =>
    setForm((prev) => ({
      ...prev,
      assigned_emirates: prev.assigned_emirates.includes(val)
        ? prev.assigned_emirates.filter((e) => e !== val)
        : [...prev.assigned_emirates, val],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const updated = await deliveryApi.adminUpdateDeliveryBoy(boy.id, {
        ...form,
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
        vehicle_number: form.vehicle_number.trim() || undefined,
        identity_number: form.identity_number.trim() || undefined,
        emergency_contact: form.emergency_contact.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;
      if (data && typeof data === "object") {
        setErr(
          Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ")
        );
      } else {
        setErr(e?.message || "Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full text-sm border border-[#EEEEEE] rounded-lg px-3 py-2 bg-white outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-100 placeholder:text-gray-300";
  const labelCls = "block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEEE]">
          <h2 className="text-sm font-bold">Edit Delivery Boy</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-8 py-6 space-y-8 custom-scrollbar">
          {/* Name */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className={labelCls}>First Name</label>
              <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
            </div>
          </div>

          {/* Emirates */}
          <div className="space-y-3">
            <label className={labelCls}>Assigned Emirates</label>
            <div className="flex flex-wrap gap-2.5">
              {EMIRATES.map((em) => {
                const isSelected = form.assigned_emirates.includes(em.value);
                return (
                  <button
                    key={em.value}
                    type="button"
                    onClick={() => toggleEmirate(em.value)}
                    className={`px-4 py-2 text-[11px] font-bold rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#18181B] text-white border-[#18181B] shadow-lg shadow-black/10"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
                    {em.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle + Identity */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className={labelCls}>Vehicle Number</label>
              <input className={inputCls} value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} placeholder="e.g. AUH-2001" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Identity Number</label>
              <input className={inputCls} value={form.identity_number} onChange={(e) => set("identity_number", e.target.value)} placeholder="e.g. 784-1234-..." />
            </div>
          </div>

          {/* Emergency */}
          <div className="space-y-1.5">
            <label className={labelCls}>Emergency Contact</label>
            <input className={inputCls} value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-900">Available for delivery</span>
                <p className="text-[10px] text-slate-400">Can receive new delivery assignments</p>
              </div>
              <button
                type="button"
                onClick={() => set("is_available", !form.is_available)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                  form.is_available ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span className={`${form.is_available ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-900">Account active</span>
                <p className="text-[10px] text-slate-400">Enable or disable this boy's account</p>
              </div>
              <button
                type="button"
                onClick={() => set("is_active", !form.is_active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                  form.is_active ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span className={`${form.is_active ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm`} />
              </button>
            </div>
          </div>

          {err && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
              <XCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs font-medium text-rose-600">{err}</p>
            </div>
          )}
        </form>

        <div className="px-8 py-6 border-t border-slate-100 flex gap-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 border border-slate-200 bg-white rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={saving}
            className="flex-[2] py-4 bg-[#18181B] text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? "Saving Changes…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
const DeliveryBoyDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [boy, setBoy] = useState<DeliveryBoyUser | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boyData, ordersData] = await Promise.all([
        deliveryApi.adminGetDeliveryBoyDetail(Number(id)),
        ordersApi.list({ delivery_assignment__delivery_boy: id, limit: 100 })
      ]);
      setBoy(boyData);
      setOrders(ordersData.results || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const displayName = boy
    ? boy.full_name || `${boy.first_name} ${boy.last_name}`.trim() || boy.email
    : "";

  return (
    <div className="min-h-screen w-full text-[#18181B] bg-[#FDFDFD]">
      <div className="  mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/delivery/boys")}
              className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-lg font-black text-cyan-700">
                {displayName?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h1 className="text-xl font-black">{displayName || "Delivery Boy"}</h1>
                <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Delivery Boy Details</p>
              </div>
            </div>
          </div>
          {boy && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>

        {loading && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl text-sm text-[#A1A1AA]">Loading…</div>}
        {error && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl text-sm text-rose-600">{error}</div>}

        {boy && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoField label="First Name" value={boy.first_name} />
                <InfoField label="Last Name" value={boy.last_name} />
                <InfoField label="Email">
                  <span className="text-sm font-bold flex items-center gap-1.5">
                    <Mail size={12} className="text-[#A1A1AA]" /> {boy.email || "—"}
                  </span>
                </InfoField>
                <InfoField label="Phone">
                  <span className="text-sm font-bold flex items-center gap-1.5">
                    <Phone size={12} className="text-[#A1A1AA]" /> {boy.phone_number || "—"}
                  </span>
                </InfoField>
                <InfoField label="Account Status">
                  {boy.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                      <XCircle size={11} /> Inactive
                    </span>
                  )}
                </InfoField>
                <InfoField label="Availability">
                  {boy.delivery_profile?.is_available ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                      <Truck size={11} /> Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                      <Truck size={11} /> Unavailable
                    </span>
                  )}
                </InfoField>
              </div>

              {/* Delivery Profile */}
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2">
                  Delivery Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField label="Vehicle Number" value={boy.delivery_profile?.vehicle_number || null} />
                  <InfoField label="Identity Number" value={boy.delivery_profile?.identity_number || null} />
                  <InfoField label="Emergency Contact" value={boy.delivery_profile?.emergency_contact || null} />
                  <InfoField label="Notes" value={boy.delivery_profile?.notes || null} />
                </div>

                <InfoField label="Assigned Emirates">
                  {boy.delivery_profile?.assigned_emirates_display?.length ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {boy.delivery_profile.assigned_emirates_display.map((em) => (
                        <span
                          key={em}
                          className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        >
                          <MapPin size={10} /> {em}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-[#18181B]">—</p>
                  )}
                </InfoField>
              </div>

              {/* Orders History */}
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                    Orders History
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {orders.length} Orders
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 space-y-2">
                    <Package size={24} className="opacity-20" />
                    <p className="text-xs italic">No orders handled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((o) => (
                      <div
                        key={o.id}
                        className="p-4 border border-[#EEEEEE] rounded-2xl hover:border-slate-300 transition-all group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900">ORD-{o.id}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                o.status === "DELIVERED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                o.status === "CANCELLED" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-amber-50 text-amber-600 border-amber-100"
                              }`}>
                                {o.status}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                              <Clock size={10} /> {new Date(o.created_at).toLocaleDateString("en-AE", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs font-black text-slate-900">AED {parseFloat(o.total_amount).toFixed(2)}</p>
                              <p className="text-[10px] text-slate-400">{o.shipping_address_details?.city}, {o.shipping_address_details?.area}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/admin/orders/${o.id}`)}
                              className="p-2 bg-slate-50 text-slate-400 hover:bg-black hover:text-white rounded-xl transition-all"
                              title="View Order Details"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Cancellation Request Flag */}
                        {o.delivery_cancel_request && (
                          <div className={`mt-3 p-2.5 rounded-xl border text-[10px] font-bold flex items-center gap-2 ${
                            o.delivery_cancel_request.status === "APPROVED" ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-amber-50 border-amber-100 text-amber-600"
                          }`}>
                            <XCircle size={12} />
                            <span>Cancellation {o.delivery_cancel_request.status}: {o.delivery_cancel_request.reason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: quick actions / status */}
            <div className="space-y-6">
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Quick Actions</h3>
                <button
                  onClick={() => setEditOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800"
                >
                  <Pencil size={13} /> Edit Profile
                </button>
                <button
                  onClick={() => navigate("/admin/delivery/boys")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#EEEEEE] text-xs font-bold rounded-lg hover:bg-gray-50"
                >
                  <ChevronLeft size={13} /> Back to List
                </button>
              </div>

              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Status Summary</h3>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Account</span>
                  {boy.is_active
                    ? <span className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Active</span>
                    : <span className="font-bold text-rose-500 flex items-center gap-1"><XCircle size={12} /> Inactive</span>
                  }
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">On duty</span>
                  {boy.delivery_profile?.is_available
                    ? <span className="font-bold text-green-600 flex items-center gap-1"><ToggleRight size={14} /> Yes</span>
                    : <span className="font-bold text-gray-400 flex items-center gap-1"><ToggleLeft size={14} /> No</span>
                  }
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Emirates</span>
                  <span className="font-bold text-gray-800">
                    {boy.delivery_profile?.assigned_emirates?.length ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editOpen && boy && (
        <EditModal
          boy={boy}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setBoy(updated)}
        />
      )}
    </div>
  );
};

export default DeliveryBoyDetailPage;
