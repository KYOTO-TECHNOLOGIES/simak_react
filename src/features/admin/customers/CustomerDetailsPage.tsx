import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Shield, ShieldAlert, UserCheck, Ban, Undo2, MapPin, User, Globe } from "lucide-react";
import { useDispatch } from "react-redux";
import { customersApi, type Customer, type UserDto } from "./customersApi";
import { customersActions } from "./customersSlice";
import { normalizeMediaUrl } from "../../../utils/media";

function mapUserDtoToCustomer(dto: UserDto): Customer {
  const firstName = dto.first_name || "";
  const lastName = dto.last_name || "";
  let name = `${firstName} ${lastName}`.trim();
  if (!name) name = dto.full_name || dto.phone_number || "Unknown";
  const normalizedStatus = (dto.status || "").toLowerCase();
  const isBlocked =
    normalizedStatus === "blocked" ||
    normalizedStatus === "inactive" ||
    normalizedStatus === "suspended" ||
    dto.is_active === false ||
    dto.isActive === false;
  return {
    id: String(dto.id),
    name,
    email: dto.email || "",
    phone: dto.phone_number || "",
    role: dto.role,
    status: isBlocked ? "Blocked" : "Active",
    isDeleted: !!dto.deleted_at,
    isEmailVerified: dto.is_email_verified,
    isPhoneVerified: dto.is_phone_verified,
    googleLinked: !!dto.google_id,
    profilePicture: normalizeMediaUrl(dto.profile?.profile_picture),
    dateOfBirth: dto.profile?.date_of_birth ?? null,
    gender: dto.profile?.gender ?? null,
    preferredLanguage: dto.profile?.preferred_language ?? "en",
    newsletterSubscribed: dto.profile?.newsletter_subscribed ?? false,
    notificationEnabled: dto.profile?.notification_enabled ?? false,
    lastLoginAt: dto.last_login_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    deletedAt: dto.deleted_at,
    addresses: dto.addresses ?? [],
  };
}

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${className}`}>{children}</span>
);

const InfoField: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide">{label}</p>
    {children ?? <p className="text-sm font-bold text-[#18181B]">{value}</p>}
  </div>
);

const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await customersApi.details(String(id || ""));
      setCustomer(mapUserDtoToCustomer(raw));
    } catch (e: any) {
      setError(e?.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusBadge = useMemo(() => {
    if (!customer) return null;
    return customer.status === "Active" ? (
      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">Active</Badge>
    ) : (
      <Badge className="bg-rose-50 text-rose-600 border-rose-100">Blocked</Badge>
    );
  }, [customer]);

  const doAction = useCallback(async (actionType: "block" | "unblock" | "softDelete" | "restore" | "setRole", payload?: any) => {
    if (!customer) return;
    setActionBusy(true);
    try {
      dispatch(customersActions.actionRequest({ type: actionType, id: customer.id, payload }));
      await load();
    } finally {
      setActionBusy(false);
    }
  }, [customer, dispatch, load]);

  return (
    <div className="min-h-screen w-full text-[#18181B] bg-[#FDFDFD]">
      <div className="  mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/users")}
              className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-gray-50 transition-colors"
              title="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-[#EEEEEE] overflow-hidden">
                {customer?.profilePicture ? (
                  <img src={customer.profilePicture} alt={customer?.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-[#A1A1AA]" />
                )}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">
                  {customer?.name || "User"}
                </h1>
                <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">User Details</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge}
            <Badge className={customer?.role === "admin" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-600 border-gray-200"}>
              {customer?.role || "role"}
            </Badge>
          </div>
        </div>

        {loading && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl">Loading…</div>}
        {error && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl text-rose-600">{error}</div>}
        {customer && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoField label="Name" value={customer.name} />
                <InfoField label="Email" value={customer.email || "—"} />
                <InfoField label="Phone" value={customer.phone || "—"} />
                <InfoField label="Role" value={customer.role} />
                <InfoField label="Joined" value={new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} />
                <InfoField label="Last Login" value={customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"} />
                <InfoField label="DOB" value={customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : "—"} />
                <InfoField label="Gender" value={customer.gender || "—"} />
                <InfoField label="Language">
                  <span className="text-xs font-bold flex items-center gap-2"><Globe size={12} /> {customer.preferredLanguage?.toUpperCase() || "—"}</span>
                </InfoField>
                <InfoField label="Newsletter">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.newsletterSubscribed ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#A1A1AA]"}`}>
                    {customer.newsletterSubscribed ? "Subscribed" : "Not Subscribed"}
                  </span>
                </InfoField>
                <InfoField label="Notifications">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.notificationEnabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#A1A1AA]"}`}>
                    {customer.notificationEnabled ? "Enabled" : "Disabled"}
                  </span>
                </InfoField>
                <InfoField label="Updated At" value={new Date(customer.updatedAt).toLocaleString()} />
                <InfoField label="Deleted At" value={customer.deletedAt ? new Date(customer.deletedAt).toLocaleString() : "—"} />
              </div>

              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-3">Addresses</h3>
                {customer.addresses.length ? (
                  <div className="space-y-3">
                    {customer.addresses.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 border-b border-[#EEEEEE] last:border-0 pb-3">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center">
                          <MapPin size={14} className="text-[#A1A1AA]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{a.label} {a.is_default ? "(Default)" : ""}</p>
                          <p className="text-[11px] text-[#52525B]">{a.full_name} · {a.phone_number}</p>
                          <p className="text-[11px] text-[#A1A1AA]">
                            {a.building_name ? `${a.building_name}, ` : ""}{a.flat_villa_number ? `${a.flat_villa_number}, ` : ""}
                            {a.street_address}, {a.area}, {a.city}, {a.emirate}, {a.country}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#A1A1AA] italic">No addresses.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Actions</h3>
                {customer.status === "Active" ? (
                  <button
                    disabled={actionBusy}
                    onClick={() => doAction("block")}
                    className="w-full py-2.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-40"
                  >
                    <Ban size={14} className="inline mr-1" /> Block User
                  </button>
                ) : (
                  <button
                    disabled={actionBusy}
                    onClick={() => doAction("unblock")}
                    className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <UserCheck size={14} className="inline mr-1" /> Unblock User
                  </button>
                )}
                <div className="relative">
                  <button
                    disabled={actionBusy}
                    onClick={() => setRoleOpen((v) => !v)}
                    className="w-full py-2.5 bg-white border border-[#EEEEEE] rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={14} /> Set Role
                  </button>
                  {roleOpen && (
                    <div className="absolute right-0 mt-2 w-full bg-white border border-[#EEEEEE] rounded-xl shadow-xl p-2">
                      {(["admin", "user"] as const).map((r) => (
                        <button
                          key={r}
                          disabled={actionBusy || customer.role === r}
                          onClick={() => { setRoleOpen(false); doAction("setRole", { role: r }); }}
                          className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg hover:bg-[#FAFAFA] ${customer.role === r ? "text-blue-600" : "text-[#52525B]"}`}
                        >
                          <Shield size={12} /> {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {customer.isDeleted ? (
                  <button
                    disabled={actionBusy}
                    onClick={() => doAction("restore")}
                    className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100"
                  >
                    <Undo2 size={14} className="inline mr-1" /> Restore User
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
