import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { dashboardApi } from "../dashboard/dashboardApi";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Filter,
  X,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Download,
  ListFilter,
  Columns3,
  Shield,
  ShieldCheck,
  Globe,
  Bell,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  MoreVertical,
  Ban,
  Undo2,
  Trash2,
  ShieldAlert,
  UserCheck,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  customersActions,
  selectCustomers,
  selectCustomersStatus,
  selectCustomersError,
  selectSelectedCustomerId,
  selectCustomersTotal,
  selectActionStatus,
  selectActionError,
} from "./customersSlice";
import type { Customer } from "./customersApi";
import { useNavigate, useLocation } from "react-router-dom";
import { NATIONALITY_CHOICES } from "../../../constants/nationalities";


/* --- Column visibility --- */
type ColumnKey =
  | "index"
  | "customer"
  | "status"
  | "role"
  | "verified"
  | "phone"
  | "googleLinked"
  | "language"
  | "newsletter"
  | "joined"
  | "nationality"
  | "actions";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  icon?: React.ReactNode;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "index", label: "#", defaultVisible: true, alwaysVisible: true },
  { key: "customer", label: "Customer", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "role", label: "Role", icon: <Shield size={12} />, defaultVisible: true },
  {
    key: "verified",
    label: "Verified",
    icon: <ShieldCheck size={12} />,
    defaultVisible: true,
  },
  { key: "phone", label: "Phone", icon: <Phone size={12} />, defaultVisible: false },
  { key: "googleLinked", label: "Google", icon: <Globe size={12} />, defaultVisible: false },
  { key: "language", label: "Language", icon: <Globe size={12} />, defaultVisible: false },
  { key: "newsletter", label: "Newsletter", icon: <Bell size={12} />, defaultVisible: false },
  { key: "joined", label: "Joined", icon: <Calendar size={12} />, defaultVisible: true },
  { key: "nationality", label: "Nationality", icon: <Globe size={12} />, defaultVisible: true, alwaysVisible: true },
  { key: "actions", label: "Actions", defaultVisible: true, alwaysVisible: true },
];

type StatusFilter = "All" | "Active" | "Blocked";
type RoleFilter = "All" | "user" | "admin";

/* ─────────────────────────────
   Memo Sub-components
───────────────────────────── */

const QuickStat = memo(function QuickStat({
  label,
  value,
  sub,
  icon,
  onClick,
  active = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-5 bg-white border rounded-2xl shadow-sm transition-all ${onClick ? "cursor-pointer hover:shadow-md" : ""
        } ${active ? "border-black ring-1 ring-black/5" : "border-[#EEEEEE] hover:border-[#D4D4D8]"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{label}</p>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mt-1 tracking-tight">{value}</h3>
      <p className="text-[11px] text-emerald-600 font-medium mt-1">{sub}</p>
    </div>
  );
});

const InfoField = memo(function InfoField({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-[#A1A1AA]">{icon}</span>}
        <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{label}</p>
      </div>
      {children || <p className="text-sm font-bold">{value}</p>}
    </div>
  );
});

/* ── Action Dropdown for each row ── */
const ActionDropdown = memo(function ActionDropdown({
  customer,
  onAction,
}: {
  customer: Customer;
  onAction: (actionType: string, id: string, payload?: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRoleOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); setRoleOpen(false); setConfirmDelete(false); }}
        className="p-2 hover:bg-black hover:text-white rounded-lg transition-colors text-[#A1A1AA]"
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-[#EEEEEE] shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Block / Unblock */}
          <button
            onClick={() => {
              onAction(customer.status === "Active" ? "block" : "unblock", customer.id);
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-[#FAFAFA] transition-colors text-left"
          >
            {customer.status === "Active" ? (
              <><Ban size={14} className="text-rose-500" /> Block User</>
            ) : (
              <><UserCheck size={14} className="text-emerald-500" /> Unblock User</>
            )}
          </button>

          {/* Set Role */}
          <div className="relative">
            <button
              onClick={() => setRoleOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:bg-[#FAFAFA] transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <ShieldAlert size={14} className="text-blue-500" /> Set Role
              </span>
              <ChevronRight size={12} className="text-[#A1A1AA]" />
            </button>
            {roleOpen && (
              <div className="absolute left-full top-0 ml-1 w-40 bg-white rounded-xl border border-[#EEEEEE] shadow-xl z-50 py-1.5">
                {(["admin", "user"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onAction("setRole", customer.id, { role: r });
                      setOpen(false);
                      setRoleOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium hover:bg-[#FAFAFA] transition-colors text-left ${customer.role === r ? "text-blue-600 font-bold" : ""}`}
                  >
                    <Shield size={12} /> {r.charAt(0).toUpperCase() + r.slice(1)}
                    {customer.role === r && <span className="ml-auto text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-[#EEEEEE] my-1" />

          {/* Delete / Restore */}
          {customer.isDeleted ? (
            <button
              onClick={() => {
                onAction("restore", customer.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-emerald-50 text-emerald-600 transition-colors text-left"
            >
              <Undo2 size={14} /> Restore User
            </button>
          ) : confirmDelete ? (
            <div className="px-4 py-2.5 space-y-2">
              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle size={12} /> Confirm delete?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onAction("softDelete", customer.id);
                    setOpen(false);
                    setConfirmDelete(false);
                  }}
                  className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 bg-gray-100 rounded-lg text-[10px] font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-rose-50 text-rose-600 transition-colors text-left"
            >
              <Trash2 size={14} /> Soft Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
});

const CustomerRow = memo(function CustomerRow({
  customer,
  index,
  page,
  limit,
  isVisible,
  onView,
  onAction,
  joinedLabel,
}: {
  customer: Customer;
  index: number;
  page: number;
  limit: number;
  isVisible: (k: ColumnKey) => boolean;
  onView: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onAction: (actionType: string, id: string, payload?: any) => void;
  joinedLabel: string;
}) {
  const navigate = useNavigate();
  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [role='button']")) return;
    navigate(`/admin/users/${customer.id}`);
  };
  return (
    <tr onClick={handleRowClick} className={`group hover:bg-[#FBFBFA] transition-colors cursor-pointer ${customer.isDeleted ? "opacity-50" : ""}`}>
      {isVisible("index") && (
        <td className="px-5 py-4 text-xs font-mono text-[#A1A1AA] text-center">
          {(page - 1) * limit + index + 1}
        </td>
      )}

      {isVisible("customer") && (
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            {customer.profilePicture ? (
              <img
                src={customer.profilePicture}
                alt={customer.name}
                className="w-9 h-9 rounded-xl object-cover border border-[#EEEEEE]"
                loading="lazy"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold border border-[#EEEEEE]">
                {customer.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <p className="text-xs font-bold flex items-center gap-1.5">
                {customer.name}
                {customer.isDeleted && (
                  <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Deleted</span>
                )}
              </p>
              <p className="text-[10px] text-[#A1A1AA]">{customer.email || "—"}</p>
            </div>
          </div>
        </td>
      )}

      {isVisible("status") && (
        <td className="px-5 py-4">
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${customer.status === "Active"
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
          >
            {customer.status}
          </span>
        </td>
      )}

      {isVisible("role") && (
        <td className="px-5 py-4 hidden md:table-cell">
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${customer.role === "admin"
              ? "bg-blue-50 text-blue-600 border-blue-100"
              : customer.role === "staff"
                ? "bg-amber-50 text-amber-600 border-amber-100"
                : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
          >
            {customer.role}
          </span>
        </td>
      )}

      {isVisible("verified") && (
        <td className="px-5 py-4 hidden lg:table-cell">
          <div className="flex items-center gap-2">
            <span
              title="Email"
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${customer.isEmailVerified ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-[#A1A1AA]"
                }`}
            >
              ✉ {customer.isEmailVerified ? "✓" : "✗"}
            </span>
            <span
              title="Phone"
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${customer.isPhoneVerified ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-[#A1A1AA]"
                }`}
            >
              ☎ {customer.isPhoneVerified ? "✓" : "✗"}
            </span>
          </div>
        </td>
      )}

      {isVisible("phone") && (
        <td className="px-5 py-4 hidden lg:table-cell">
          <span className="text-xs font-medium text-[#52525B]">{customer.phone || "—"}</span>
        </td>
      )}

      {isVisible("googleLinked") && (
        <td className="px-5 py-4">
          {customer.googleLinked ? (
            <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              Linked
            </span>
          ) : (
            <span className="text-[10px] text-[#A1A1AA]">—</span>
          )}
        </td>
      )}

      {isVisible("language") && (
        <td className="px-5 py-4">
          <span className="text-xs font-medium text-[#52525B] uppercase">
            {customer.preferredLanguage}
          </span>
        </td>
      )}

      {isVisible("newsletter") && (
        <td className="px-5 py-4">
          {customer.newsletterSubscribed ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <XCircle size={14} className="text-[#D4D4D8]" />
          )}
        </td>
      )}

      {isVisible("joined") && (
        <td className="px-5 py-4 hidden lg:table-cell">
          <span className="text-xs text-[#52525B] font-medium">{joinedLabel}</span>
        </td>
      )}

      {isVisible("nationality") && (
        <td className="px-5 py-4">
          <span className="text-xs font-medium text-[#52525B] uppercase">
            {customer.nationality || "—"}
          </span>
        </td>
      )}

      {isVisible("actions") && (
        <td className="px-5 py-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              data-id={customer.id}
              onClick={onView}
              className="p-2 hover:bg-black hover:text-white rounded-lg transition-colors text-[#A1A1AA]"
              title="View Details"
            >
              <Eye size={16} />
            </button>
            <ActionDropdown customer={customer} onAction={onAction} />
          </div>
        </td>
      )}
    </tr>
  );
});

const CustomerDetailPanel = memo(function CustomerDetailPanel({
  customer,
  onClose,
  onAction,
}: {
  customer: Customer;
  onClose: () => void;
  onAction: (actionType: string, id: string, payload?: any) => void;
}) {
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-60 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#EEEEEE] flex justify-between items-center bg-white sticky top-0">
          <div className="flex items-center gap-3">
            {customer.profilePicture ? (
              <img
                src={customer.profilePicture}
                alt={customer.name}
                className="w-12 h-12 rounded-xl object-cover border border-[#EEEEEE]"
                loading="lazy"
              />
            ) : (
              <div className="p-2.5 bg-gray-900 text-white rounded-xl">
                <User size={18} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                {customer.name}
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${customer.role === "admin"
                    ? "bg-blue-50 text-blue-600"
                    : customer.role === "staff"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-gray-50 text-gray-500"
                    }`}
                >
                  {customer.role}
                </span>
                {customer.isDeleted && (
                  <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                    Deleted
                  </span>
                )}
              </h2>
              <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
                User Details · ID: {customer.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Banner */}
          <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#EEEEEE] flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase">Account Status</p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${customer.status === "Active"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${customer.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                  />
                  {customer.status}
                </span>
              </div>
            </div>
            {customer.deletedAt && (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                DELETED
              </span>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoField label="Email" value={customer.email || "—"} icon={<Mail size={12} />} />
            <InfoField label="Phone" value={customer.phone || "—"} icon={<Phone size={12} />} />
            <InfoField label="Email Verified" icon={<ShieldCheck size={12} />}>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.isEmailVerified ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#A1A1AA]"
                  }`}
              >
                {customer.isEmailVerified ? "Verified ✓" : "Unverified ✗"}
              </span>
            </InfoField>
            <InfoField label="Phone Verified" icon={<ShieldCheck size={12} />}>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.isPhoneVerified ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#A1A1AA]"
                  }`}
              >
                {customer.isPhoneVerified ? "Verified ✓" : "Unverified ✗"}
              </span>
            </InfoField>
          </div>

          {/* Profile Info */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-4">
              Profile Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoField
                label="Date of Birth"
                value={
                  customer.dateOfBirth
                    ? new Date(customer.dateOfBirth).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                    : "—"
                }
              />
              <InfoField label="Gender" value={customer.gender || "—"} />
              <InfoField label="Nationality" value={customer.nationality || "—"} />
              <InfoField label="Language" value={customer.preferredLanguage.toUpperCase()} />
              <InfoField label="Google Linked">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.googleLinked ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-[#A1A1AA]"
                    }`}
                >
                  {customer.googleLinked ? "Linked ✓" : "Not Linked"}
                </span>
              </InfoField>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-4">
              Preferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoField label="Newsletter">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.newsletterSubscribed ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#A1A1AA]"
                    }`}
                >
                  {customer.newsletterSubscribed ? "Subscribed" : "Not Subscribed"}
                </span>
              </InfoField>
              <InfoField label="Notifications">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.notificationEnabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#A1A1AA]"
                    }`}
                >
                  {customer.notificationEnabled ? "Enabled" : "Disabled"}
                </span>
              </InfoField>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-4">
              Activity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoField
                label="Last Login"
                value={
                  customer.lastLoginAt
                    ? new Date(customer.lastLoginAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "Never"
                }
              />
              <InfoField
                label="Joined"
                value={new Date(customer.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              />
              <InfoField
                label="Last Updated"
                value={new Date(customer.updatedAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              />
              {customer.deletedAt && (
                <InfoField
                  label="Deleted At"
                  value={new Date(customer.deletedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
              )}
            </div>
          </div>

          {/* Addresses */}
          <div>
            <button
              onClick={() => setShowAddresses((v) => !v)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-4 w-full text-left hover:text-[#52525B] transition-colors"
            >
              <MapPin size={12} />
              Addresses ({customer.addresses?.length || 0})
              <ChevronRight
                size={12}
                className={`ml-auto transition-transform ${showAddresses ? "rotate-90" : ""}`}
              />
            </button>
            {showAddresses && (
              <div className="space-y-3">
                {(!customer.addresses || customer.addresses.length === 0) ? (
                  <p className="text-xs text-[#A1A1AA] italic">No addresses found.</p>
                ) : (
                  customer.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${addr.is_default
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-[#EEEEEE] bg-[#FAFAFA]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">
                          {addr.label || "Address"}
                          {addr.is_default && (
                            <span className="ml-2 text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">
                              Default
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-[#52525B]">{addr.full_name}</p>
                      <p className="text-[#71717A]">
                        {[addr.flat_villa_number, addr.building_name, addr.street_address]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="text-[#71717A]">
                        {[addr.area, addr.city, addr.emirate, addr.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {addr.phone_number && (
                        <p className="text-[#A1A1AA] text-[10px]">📞 {addr.phone_number}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t border-[#EEEEEE] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Block / Unblock */}
            <button
              onClick={() => {
                onAction(customer.status === "Active" ? "block" : "unblock", customer.id);
                onClose();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${customer.status === "Active"
                ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                }`}
            >
              {customer.status === "Active" ? (
                <><Ban size={13} /> Block</>
              ) : (
                <><UserCheck size={13} /> Unblock</>
              )}
            </button>

            {/* Set Role */}
            <div className="relative">
              <button
                onClick={() => setShowRolePicker((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all"
              >
                <ShieldAlert size={13} /> Set Role <ChevronRight size={10} />
              </button>
              {showRolePicker && (
                <div className="absolute bottom-full mb-1 left-0 w-40 bg-white rounded-xl border border-[#EEEEEE] shadow-xl z-50 py-1.5">
                  {(["admin", "user"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        onAction("setRole", customer.id, { role: r });
                        setShowRolePicker(false);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium hover:bg-[#FAFAFA] transition-colors text-left ${customer.role === r ? "text-blue-600 font-bold" : ""}`}
                    >
                      <Shield size={12} /> {r.charAt(0).toUpperCase() + r.slice(1)}
                      {customer.role === r && <span className="ml-auto text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete / Restore */}
            {customer.isDeleted ? (
              <button
                onClick={() => {
                  onAction("restore", customer.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all"
              >
                <Undo2 size={13} /> Restore
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to soft-delete this user?")) {
                    onAction("softDelete", customer.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all ml-auto"
              >
                <Trash2 size={13} /> Soft Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

/* --- MAIN COMPONENT --- */
const CustomerManagement: React.FC = () => {
  const dispatch = useDispatch();

  const customers = useSelector(selectCustomers);
  const totalCount = useSelector(selectCustomersTotal);
  const status = useSelector(selectCustomersStatus);
  const error = useSelector(selectCustomersError);
  const selectedCustomerId = useSelector(selectSelectedCustomerId);
  const actionStatus = useSelector(selectActionStatus);
  const actionError = useSelector(selectActionError);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (actionStatus === "succeeded") {
      setToast({ type: "success", message: "Action completed successfully!" });
      dispatch(customersActions.actionReset());
    } else if (actionStatus === "failed") {
      setToast({ type: "error", message: actionError || "Action failed." });
      dispatch(customersActions.actionReset());
    }
  }, [actionStatus, actionError, dispatch]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 2000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Prefill phone filter from URL ?phone= query
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const phone = params.get("phone");
      if (phone) {
        setPhoneFilter(phone);
        setPage(1);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const init = {} as Record<ColumnKey, boolean>;
    COLUMNS.forEach((c) => (init[c.key] = c.defaultVisible));
    return init;
  });

  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setIsColumnsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleColumn = useCallback((key: ColumnKey) => {
    const col = COLUMNS.find((c) => c.key === key);
    if (col?.alwaysVisible) return;
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isVisible = useCallback((key: ColumnKey) => !!visibleColumns[key], [visibleColumns]);

  const roleQueryValue = useMemo(() => {
    if (roleFilter === "All") return undefined;
    return roleFilter;
  }, [roleFilter]);

  // Fetch the current page from the backend using server-supported filters.
  useEffect(() => {
    const offset = (page - 1) * limit;

    let is_email_verified: boolean | undefined = undefined;
    let is_phone_verified: boolean | undefined = undefined;
    if (verifiedFilter === "email") is_email_verified = true;
    else if (verifiedFilter === "phone") is_phone_verified = true;
    else if (verifiedFilter === "both") {
      is_email_verified = true;
      is_phone_verified = true;
    } else if (verifiedFilter === "none") {
      is_email_verified = false;
      is_phone_verified = false;
    }

    dispatch(
      customersActions.fetchCustomersRequest({
        q: debouncedSearch || undefined,
        search: debouncedSearch || undefined,
        is_active:
          statusFilter === "All"
            ? undefined
            : statusFilter === "Active"
              ? true
              : false,
        role: roleQueryValue,
        is_email_verified,
        is_phone_verified,
        nationality: nationalityFilter || undefined,
        page,
        limit,
        offset,
      })
    );
  }, [dispatch, debouncedSearch, statusFilter, roleQueryValue, verifiedFilter, nationalityFilter, page, limit]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("All");
    setRoleFilter("All");
    setVerifiedFilter("");
    setPhoneFilter("");
    setNationalityFilter("");
    setPage(1);
  }, []);


  // User counts from API
  const [userCounts, setUserCounts] = useState({
    total_users: 0,
    active: 0,
    blocked: 0,
    admins: 0,
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setCountsLoading(true);
    setCountsError(null);
    dashboardApi.fetchUsersCount()
      .then((res: any) => {
        if (mounted) {
          const data = res.data || res;
          setUserCounts({
            total_users: data.total_users ?? 0,
            active: data.active ?? 0,
            blocked: data.blocked ?? 0,
            admins: data.admins ?? 0,
          });
        }
      })
      .catch(() => {
        if (mounted) setCountsError("Failed to load user counts");
      })
      .finally(() => {
        if (mounted) setCountsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // Apply local filters on current page data (only for fields not handled by server)
  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (phoneFilter) {
      const pf = phoneFilter.toLowerCase();
      result = result.filter((c) => (c.phone ?? "").toLowerCase().includes(pf));
    }

    return result;
  }, [customers, phoneFilter]);

  const displayedCustomers = filteredCustomers;

  // If phone filter is present in URL and exactly one match, open details panel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("phone");
    if (phone && displayedCustomers.length === 1) {
      dispatch(customersActions.setSelectedCustomerId(displayedCustomers[0].id));
    }
  }, [displayedCustomers, dispatch]);

  const navigate = useNavigate();
  const location = useLocation();
  const selectedCustomer = useMemo(
    () => displayedCustomers.find((c) => c.id === selectedCustomerId) ?? null,
    [displayedCustomers, selectedCustomerId]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const visibleStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = totalCount === 0 ? 0 : Math.min((page - 1) * limit + displayedCustomers.length, totalCount);

  // Pre-format dates for table (avoid repeated new Date per cell)
  const formattedDates = useMemo(() => {
    const map = new Map<string, { joined: string; lastLogin: string }>();
    for (const c of displayedCustomers) {
      const joined = new Date(c.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const lastLogin = c.lastLoginAt
        ? new Date(c.lastLoginAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        : "Never";
      map.set(c.id, { joined, lastLogin });
    }
    return map;
  }, [displayedCustomers]);

  // View handler navigates to full-page user details
  const onViewCustomer = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const id = (e.currentTarget.dataset.id as string) || "";
      if (id) navigate(`/admin/users/${id}`);
    },
    [navigate]
  );

  // If navigated with ?phone=..., auto open details page when unique
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phone = params.get("phone");
    if (!phone) return;
    const matches = displayedCustomers.filter((c: Customer) => c.phone && c.phone.includes(phone));
    if (matches.length === 1) {
      navigate(`/admin/users/${matches[0].id}`, { replace: true });
    }
  }, [location.search, displayedCustomers, navigate]);

  const onClosePanel = useCallback(() => {
    dispatch(customersActions.setSelectedCustomerId(null));
  }, [dispatch]);

  // Export handler (non-blocking-ish)
  const handleExport = useCallback(() => {
    window.setTimeout(() => {
      const headers = ["Name", "Email", "Status", "Role", "Phone", "Verified", "Joined"];
      const rows = displayedCustomers.map((c) => [
        c.name,
        c.email,
        c.status,
        c.role,
        c.phone || "",
        `Email: ${c.isEmailVerified}, Phone: ${c.isPhoneVerified}`,
        new Date(c.createdAt).toLocaleDateString(),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) =>
          r
            .map((cell) => {
              const val = String(cell ?? "");
              return val.includes(",") ? `"${val.replaceAll('"', '""')}"` : val;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `customers_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
  }, [displayedCustomers]);

  // Action handler for block/unblock/softDelete/restore/setRole
  const onAction = useCallback(
    (actionType: string, id: string, payload?: any) => {
      dispatch(customersActions.actionRequest({ type: actionType, id, payload }));
    },
    [dispatch]
  );

  return (
    <div className="min-h-screen w-full space-y-6 text-[#18181B] bg-[#FDFDFD]">
      {/* --- TOAST --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-100"
          >
            <div
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-xl ${toast.type === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-700"
                : "bg-rose-50/90 border-rose-200 text-rose-700"
                }`}
            >
              {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PAGE HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">Customers</h1>
          <p className="text-[#71717A] text-sm mt-1">Manage users and their accounts.</p>
        </div>
      </div>

      {/* --- QUICK STATS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Total Users"
          value={countsLoading ? "..." : `${userCounts.total_users}`}
          sub={countsError ? countsError : "All registered"}
          icon={<User size={16} className="text-[#A1A1AA]" />}
          onClick={handleReset}
        />
        <QuickStat
          label="Active"
          value={countsLoading ? "..." : `${userCounts.active}`}
          sub={countsError ? countsError : "Active accounts"}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
          onClick={() => {
            setStatusFilter("Active");
            setRoleFilter("All");
            setPage(1);
          }}
          active={statusFilter === "Active"}
        />
        <QuickStat
          label="Blocked"
          value={countsLoading ? "..." : `${userCounts.blocked}`}
          sub={countsError ? countsError : "Suspended"}
          icon={<XCircle size={16} className="text-rose-500" />}
          onClick={() => {
            setStatusFilter("Blocked");
            setRoleFilter("All");
            setPage(1);
          }}
          active={statusFilter === "Blocked"}
        />
        <QuickStat
          label="Admins"
          value={countsLoading ? "..." : `${userCounts.admins}`}
          sub={countsError ? countsError : "Admin role"}
          icon={<Shield size={16} className="text-blue-500" />}
          onClick={() => {
            setRoleFilter("admin");
            setStatusFilter("All");
            setPage(1);
          }}
          active={roleFilter === "admin"}
        />
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#EEEEEE] flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsFilterOpen((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${isFilterOpen ? "bg-black text-white border-black" : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"
                }`}
            >
              <Filter size={14} /> {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </button>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={columnsRef}>
              <button
                onClick={() => setIsColumnsOpen((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${isColumnsOpen ? "bg-black text-white border-black" : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"
                  }`}
              >
                <Columns3 size={14} /> Columns
              </button>

              {isColumnsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#EEEEEE] shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="px-4 py-2 text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">
                    Toggle Columns
                  </p>

                  {COLUMNS.filter((c) => !c.alwaysVisible).map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="w-3.5 h-3.5 rounded border-[#D4D4D8] text-black focus:ring-black/20 accent-black"
                      />
                      <span className="flex items-center gap-2 text-xs font-medium text-[#52525B]">
                        {col.icon}
                        {col.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-[#EEEEEE] rounded-lg text-xs font-bold hover:bg-[#FAFAFA] transition-colors"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {status === "loading" && customers.length === 0 && (
          <div className="p-6 text-sm text-[#71717A]">Loading customers…</div>
        )}
        {status === "failed" && (
          <div className="p-6 text-sm text-rose-600">{error || "Failed to load customers"}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-250">
            <thead className="bg-[#FAFAFA]">
              <tr className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">
                {isVisible("index") && <th className="px-5 py-4 w-12 text-center text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">#</th>}
                {isVisible("customer") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">Customer</th>}
                {isVisible("status") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">Status</th>}
                {isVisible("role") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden md:table-cell">Role</th>}
                {isVisible("verified") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden lg:table-cell">Verified</th>}
                {isVisible("phone") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden lg:table-cell">Phone</th>}
                {isVisible("googleLinked") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden xl:table-cell">Google</th>}
                {isVisible("language") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden xl:table-cell">Lang</th>}
                {isVisible("newsletter") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden xl:table-cell">Mail</th>}
                {isVisible("joined") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE] hidden lg:table-cell">Joined</th>}
                {isVisible("nationality") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">Nationality</th>}
                {isVisible("actions") && <th className="px-5 py-4 text-right text-xs font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">Actions</th>}
              </tr>

              {isFilterOpen && (
                <tr className="bg-white border-b border-[#EEEEEE] animate-in fade-in slide-in-from-top-1 duration-200">
                  {isVisible("index") && (
                    <td className="px-5 py-3 text-center">
                      <ListFilter size={14} className="text-[#D4D4D8] mx-auto" />
                    </td>
                  )}

                  {isVisible("customer") && (
                    <td className="px-5 py-3">
                      <div className="relative">
                        <Search
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
                          size={12}
                        />
                        <input
                          type="text"
                          placeholder="Name / email..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                          }}
                          className="w-full pl-7 pr-2 py-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                        />
                      </div>
                    </td>
                  )}

                  {isVisible("status") && (
                    <td className="px-5 py-3">
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value as StatusFilter);
                          setPage(1);
                        }}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>
                  )}

                  {isVisible("role") && (
                    <td className="px-5 py-3">
                      <select
                        value={roleFilter}
                        onChange={(e) => {
                          setRoleFilter(e.target.value as RoleFilter);
                          setPage(1);
                        }}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="All">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  )}

                  {isVisible("verified") && (
                    <td className="px-5 py-3">
                      <select
                        value={verifiedFilter}
                        onChange={(e) => {
                          setVerifiedFilter(e.target.value);
                          setPage(1);
                        }}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="">All</option>
                        <option value="email">Email ✓</option>
                        <option value="phone">Phone ✓</option>
                        <option value="both">Both ✓</option>
                        <option value="none">None ✗</option>
                      </select>
                    </td>
                  )}

                  {isVisible("phone") && (
                    <td className="px-5 py-3">
                      <div className="relative">
                        <Search
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
                          size={12}
                        />
                        <input
                          type="text"
                          placeholder="Phone..."
                          value={phoneFilter}
                          onChange={(e) => {
                            setPhoneFilter(e.target.value);
                            setPage(1);
                          }}
                          className="w-full pl-7 pr-2 py-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                        />
                      </div>
                    </td>
                  )}

                  {isVisible("googleLinked") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] italic">—</div>
                    </td>
                  )}
                  {isVisible("language") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] italic">—</div>
                    </td>
                  )}
                  {isVisible("newsletter") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] italic">—</div>
                    </td>
                  )}
                  {isVisible("joined") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] italic">—</div>
                    </td>
                  )}
                  {isVisible("nationality") && (
                    <td className="px-5 py-3">
                      <select
                        value={nationalityFilter}
                        onChange={(e) => {
                          setNationalityFilter(e.target.value);
                          setPage(1);
                        }}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="">All Nations</option>
                        {NATIONALITY_CHOICES.map((n) => (
                          <option key={n.code} value={n.code}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}

                  {isVisible("actions") && (
                    <td className="px-5 py-3 text-right">
                      <button onClick={handleReset} className="text-[10px] font-bold text-rose-500 hover:underline px-2">
                        Clear
                      </button>
                    </td>
                  )}
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-[#EEEEEE]">
              {status === "loading" && customers.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-10 w-32 bg-gray-100 rounded-xl" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-16 bg-gray-100 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-14 bg-gray-100 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-16 bg-gray-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 bg-gray-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-8 w-8 bg-gray-100 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
                : displayedCustomers.map((c, index) => {
                  const fd = formattedDates.get(c.id);
                  return (
                    <CustomerRow
                      key={c.id}
                      customer={c}
                      index={index}
                      page={page}
                      limit={limit}
                      isVisible={isVisible}
                      onView={onViewCustomer}
                      onAction={onAction}
                      joinedLabel={fd?.joined ?? "—"}
                    />
                  );
                })}
            </tbody>
          </table>

          {status !== "loading" && displayedCustomers.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <User className="mx-auto text-[#D4D4D8]" size={32} />
              <p className="text-sm font-bold text-[#18181B]">No matching results</p>
              <button onClick={handleReset} className="text-xs font-bold underline text-[#A1A1AA] hover:text-black">
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* --- PAGINATION --- */}
        <div className="p-4 border-t border-[#EEEEEE] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-[#A1A1AA] font-medium">
              Showing {visibleStart}-{visibleEnd} of {totalCount} users
            </div>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="p-1.5 bg-[#F9F9F9] border border-[#EEEEEE] rounded-lg text-xs outline-none focus:border-[#D4D4D8]"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || status === "loading"}
              className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages || status === "loading"}
              className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* --- CUSTOMER DETAILS SLIDE-OVER --- */}
      {selectedCustomer && <CustomerDetailPanel customer={selectedCustomer} onClose={onClosePanel} onAction={onAction} />}
    </div>
  );
};

export default CustomerManagement;
