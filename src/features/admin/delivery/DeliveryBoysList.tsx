import React, { useEffect, useState } from "react";
import {
  Truck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deliveryApi, type DeliveryBoyUser } from "../../delivery/deliveryApi";
import { getApiErrorMessage } from "../../../utils/apiError";
import { toUaeE164, validateUaeMobile } from "../../../utils/uaePhone";
import UaePhoneInput from "../../../components/ui/UaePhoneInput";

const EMIRATES = [
  { value: "abu_dhabi", label: "Abu Dhabi" },
  { value: "dubai", label: "Dubai" },
  { value: "sharjah", label: "Sharjah" },
  { value: "ajman", label: "Ajman" },
  { value: "umm_al_quwain", label: "Umm Al Quwain" },
  { value: "fujairah", label: "Fujairah" },
  { value: "ras_al_khaimah", label: "Ras Al Khaimah" },
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  assigned_emirates: [] as string[],
  vehicle_number: "",
  identity_number: "",
  emergency_contact: "",
  notes: "",
  is_available: true,
};

type FormState = typeof EMPTY_FORM;

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [phoneLocal, setPhoneLocal] = useState("");
  const [emergencyPhoneLocal, setEmergencyPhoneLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null);

  const set = (field: keyof FormState, value: any) =>
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
    setErr(null);

    if (!form.first_name.trim()) {
      setErr("First name is required.");
      return;
    }

    const phoneRequired = !form.email.trim();
    const nextPhoneError = validateUaeMobile(phoneLocal, { required: phoneRequired });
    const nextEmergencyError = emergencyPhoneLocal
      ? validateUaeMobile(emergencyPhoneLocal)
      : null;

    setPhoneError(nextPhoneError);
    setEmergencyPhoneError(nextEmergencyError);

    if (!form.email.trim() && !phoneLocal) {
      setErr("Email or UAE phone number is required.");
      return;
    }
    if (nextPhoneError || nextEmergencyError) {
      setErr(nextPhoneError || nextEmergencyError);
      return;
    }

    const phoneE164 = toUaeE164(phoneLocal);
    const emergencyE164 = emergencyPhoneLocal ? toUaeE164(emergencyPhoneLocal) : undefined;

    setSaving(true);
    try {
      await deliveryApi.adminCreateDeliveryBoy({
        ...form,
        email: form.email.trim() || undefined,
        phone_number: phoneE164 || undefined,
        vehicle_number: form.vehicle_number.trim() || undefined,
        identity_number: form.identity_number.trim() || undefined,
        emergency_contact: emergencyE164,
        notes: form.notes.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e, "Failed to create delivery boy."));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full text-sm border border-[#EEEEEE] rounded-lg px-3 py-2 bg-white outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-100 placeholder:text-gray-300";
  const labelCls = "block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEEE]">
          <h2 className="text-sm font-bold">Add Delivery Boy</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-8 py-6 space-y-8 custom-scrollbar">
          {/* Name */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className={labelCls}>First Name <span className="text-rose-400">*</span></label>
              <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Ahmed" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Ali" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="delivery@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Phone Number</label>
              <UaePhoneInput
                id="create-delivery-boy-phone"
                value={phoneLocal}
                onChange={(local) => {
                  setPhoneLocal(local);
                  if (phoneError) setPhoneError(validateUaeMobile(local, { required: !form.email.trim() }));
                }}
                error={phoneError}
                disabled={saving}
              />
            </div>
          </div>
          <p className="text-[10px] text-[#A1A1AA] -mt-6 px-1">At least one of email or UAE mobile is required.</p>

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
              <input className={inputCls} value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} placeholder="ABC123" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Identity Number</label>
              <input className={inputCls} value={form.identity_number} onChange={(e) => set("identity_number", e.target.value)} placeholder="784-1234-5678-9" />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-1.5">
            <label className={labelCls}>Emergency Contact (UAE mobile)</label>
            <UaePhoneInput
              id="create-delivery-boy-emergency"
              value={emergencyPhoneLocal}
              onChange={(local) => {
                setEmergencyPhoneLocal(local);
                if (emergencyPhoneError) setEmergencyPhoneError(local ? validateUaeMobile(local) : null);
              }}
              error={emergencyPhoneError}
              disabled={saving}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Add any additional details about the delivery boy…" />
          </div>

          {/* Available toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-900">Available for delivery</span>
              <p className="text-[10px] text-slate-400">Allow this boy to receive new delivery assignments</p>
            </div>
            <button
              type="button"
              onClick={() => set("is_available", !form.is_available)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                form.is_available ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`${
                  form.is_available ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm`}
              />
            </button>
          </div>

          {err && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-600 whitespace-pre-line">{err}</p>
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
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating…</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Create Boy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const LIMIT = 10;

const DeliveryBoysList: React.FC = () => {
  const navigate = useNavigate();
  const [allBoys, setAllBoys] = useState<DeliveryBoyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryApi.adminListDeliveryBoys();
      setAllBoys(data);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load delivery boys"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── client-side search + pagination ── */
  const filtered = allBoys.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${b.first_name} ${b.last_name} ${b.full_name}`.toLowerCase();
    return name.includes(q) || b.email?.toLowerCase().includes(q) || b.phone_number?.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * LIMIT, currentPage * LIMIT);
  const visibleStart = filtered.length === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  const visibleEnd = Math.min(currentPage * LIMIT, filtered.length);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#18181B]">Delivery Boys</h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            {allBoys.length} registered delivery personnel
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} /> Add Boy
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 flex items-center justify-center gap-2 rounded-lg border border-[#EEEEEE] text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white border border-[#EEEEEE] rounded-2xl overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-[#EEEEEE]">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#EEEEEE] rounded-lg bg-[#FAFAFA] outline-none focus:border-gray-300 focus:bg-white"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-[#A1A1AA]">
            <Loader2 size={24} className="animate-spin" /> <span className="text-sm">Loading…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle size={24} className="text-rose-400" />
            <p className="text-sm text-rose-600">{error}</p>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#EEEEEE] text-sm hover:bg-gray-50">
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#A1A1AA]">
            <Users size={32} />
            <p className="text-sm">{search ? "No results found." : "No delivery boys yet."}</p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800"
              >
                <Plus size={13} /> Add First Delivery Boy
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#FAFAFA]">
                  <th className="text-left text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-5 py-3">#</th>
                  <th className="text-left text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-5 py-3">Name / Contact</th>
                  <th className="text-left text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-5 py-3 hidden md:table-cell">Emirates</th>
                  <th className="text-left text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Vehicle</th>
                  <th className="text-left text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Availability</th>
                  <th className="text-left text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Active</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {paginated.map((boy, idx) => {
                  const displayName =
                    boy.full_name || `${boy.first_name} ${boy.last_name}`.trim() || boy.email;
                  return (
                    <tr
                      key={boy.id}
                      onClick={() => navigate(`/admin/delivery/boys/${boy.id}`)}
                      className="hover:bg-[#FBFBFA] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 text-xs font-mono text-[#A1A1AA]">
                        {(currentPage - 1) * LIMIT + idx + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-xs font-black text-cyan-700 shrink-0">
                            {(displayName[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#18181B]">{displayName}</p>
                            <p className="text-[10px] text-[#A1A1AA] mt-0.5 flex items-center gap-1">
                              <Phone size={9} /> {boy.phone_number || boy.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {boy.delivery_profile?.assigned_emirates_display?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {boy.delivery_profile.assigned_emirates_display.map((e) => (
                              <span key={e} className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                                <MapPin size={9} /> {e}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#D4D4D8] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-xs text-[#52525B]">
                          {boy.delivery_profile?.vehicle_number || <span className="text-[#D4D4D8]">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          boy.delivery_profile?.is_available
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}>
                          <Truck size={9} />
                          {boy.delivery_profile?.is_available ? "Available" : "Unavailable"}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {boy.is_active
                          ? <CheckCircle2 size={15} className="text-emerald-500" />
                          : <XCircle size={15} className="text-rose-400" />
                        }
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/delivery/boys/${boy.id}`); }}
                          className="p-2 rounded-lg text-[#A1A1AA] hover:bg-black hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="p-4 border-t border-[#EEEEEE] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="text-[11px] text-[#A1A1AA] font-medium">
              Showing {visibleStart}–{visibleEnd} of {filtered.length} delivery boys
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-[#FAFAFA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold px-2">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
                className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-[#FAFAFA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryBoysList;
