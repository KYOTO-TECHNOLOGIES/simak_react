import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CreditCard, Wallet, Banknote, RefreshCcw,
  Search, Filter, Download, ChevronRight,
  AlertCircle, Clock,
  Receipt, Landmark,
  ListOrdered, Undo2, HandCoins,
  ChevronLeft, Columns3, Eye, ArrowLeft, ExternalLink,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

import {
  paymentsActions,
  selectPayments,
  selectPaymentsStatus,
  selectPaymentsError,
  selectPaymentsTotal,
  selectDetailedPayment,
  selectRefundStatus,
  selectActionLoading,
} from "./paymentsSlice";
import type { Payment, PaymentStatus, PaymentMethod } from "./paymentsSlice";
import { useDebounce } from "../../../hooks/useDebounce";
import { useToast } from "../../../components/ui/Toast";
import { paymentMethodToApiValue } from "../../../utils/payment";

/* --- COLUMN VISIBILITY --- */
type ColumnKey = "paymentId" | "order" | "customer" | "amount" | "method" | "status" | "date" | "orderStatus";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "paymentId", label: "Payment ID", defaultVisible: true, alwaysVisible: true },
  { key: "order", label: "Order", defaultVisible: true },
  { key: "customer", label: "Customer", defaultVisible: true },
  { key: "amount", label: "Amount", defaultVisible: true },
  { key: "method", label: "Method", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "date", label: "Date", defaultVisible: true },
  { key: "orderStatus", label: "Order Status", defaultVisible: false },
];

/* --- TYPES --- */
type ViewType = "payments" | "refunds" | "cod";

/* --- MAIN COMPONENT --- */
const PaymentManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const payments = useSelector(selectPayments);
  const status = useSelector(selectPaymentsStatus);
  const error = useSelector(selectPaymentsError);
  const totalCount = useSelector(selectPaymentsTotal);

  const [currentTab, setCurrentTab] = useState<ViewType>("payments");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "All">("All");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "All">("All");
  const [orderFilter, setOrderFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const debouncedOrderFilter = useDebounce(orderFilter, 1000);
  const debouncedCustomerFilter = useDebounce(customerFilter, 1000);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const init: Record<string, boolean> = {};
    COLUMNS.forEach((c) => (init[c.key] = c.defaultVisible));
    return init as Record<ColumnKey, boolean>;
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

  const toggleColumn = (key: ColumnKey) => {
    const col = COLUMNS.find((c) => c.key === key);
    if (col?.alwaysVisible) return;
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isVisible = (key: ColumnKey) => visibleColumns[key];

  useEffect(() => {
    if (id) return; // Don't fetch list if viewing details

    const params: any = {
      page,
      limit,
      ordering: "-transaction_date",
    };

    const paymentTerm = debouncedSearchTerm.trim();
    const orderTerm = debouncedOrderFilter.trim();
    const customerTerm = debouncedCustomerFilter.trim();

    if (paymentTerm) params.search = paymentTerm;
    if (orderTerm) params.order_id = orderTerm.replace(/^ord[-\s]*/i, "");
    if (customerTerm) params.customer_name = customerTerm;

    if (statusFilter !== "All") {
      const statusMap: Record<PaymentStatus, string> = {
        Pending: "PENDING",
        Success: "SUCCESS",
        Failed: "FAILED",
        Refunded: "REFUNDED",
      };
      params.status = statusMap[statusFilter];
    }

    if (methodFilter !== "All") {
      const mappedMethod = paymentMethodToApiValue(methodFilter);
      if (mappedMethod) params.payment_method = mappedMethod;
    }

    if (amountMin) params.amount_min = amountMin;
    if (amountMax) params.amount_max = amountMax;

    dispatch(paymentsActions.fetchPaymentsRequest(params));
  }, [
    dispatch,
    id,
    page,
    limit,
    debouncedSearchTerm,
    debouncedOrderFilter,
    debouncedCustomerFilter,
    statusFilter,
    methodFilter,
    amountMin,
    amountMax,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setMethodFilter("All");
    setOrderFilter("");
    setCustomerFilter("");
    setAmountMin("");
    setAmountMax("");
    setPage(1);
  };

  const hasActiveFilters = !!(searchTerm || statusFilter !== "All" || methodFilter !== "All" || orderFilter || customerFilter || amountMin || amountMax);

  // Export handler
  const handleExport = () => {
    const headers = ["Payment ID", "Order", "Customer", "Amount", "Method", "Status", "Date"];
    const rows = payments.map(p => [
      p.paymentId,
      p.orderNumber,
      p.customerName,
      p.amount,
      p.paymentMethod,
      p.paymentStatus,
      new Date(p.date).toLocaleDateString()
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(c => {
        const val = String(c || "");
        return val.includes(',') ? `"${val}"` : val;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (id) {
    return <PaymentDetailsView paymentId={parseInt(id)} onBack={() => navigate("/admin/payments")} />;
  }

  return (
    <div className="min-h-screen w-full space-y-6 text-[#18181B] bg-[#FDFDFD]">
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">
            Payments
          </h1>
          <p className="text-[#71717A] text-sm mt-1">
            Track transactions, refunds, and settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEEE] rounded-xl text-xs font-bold hover:bg-[#FAFAFA] transition-colors shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-sm overflow-hidden">
        <nav className="flex items-center gap-1 p-3 border-b border-[#EEEEEE] overflow-x-auto no-scrollbar">
          <NavTab id="payments" active={currentTab} label="All Payments" icon={<ListOrdered size={14} />} onClick={() => { setCurrentTab("payments"); clearFilters(); }} />
          <NavTab id="refunds" active={currentTab} label="Refunds" icon={<Undo2 size={14} />} onClick={() => { setCurrentTab("refunds"); clearFilters(); setStatusFilter("Refunded"); }} />
          <NavTab id="cod" active={currentTab} label="COD Orders" icon={<HandCoins size={14} />} onClick={() => { setCurrentTab("cod"); clearFilters(); setMethodFilter("COD"); }} />
        </nav>

        <main className="min-h-[60vh]">
          <PaymentsListView
            viewType={currentTab}
            payments={payments}
            totalCount={totalCount}
            page={page}
            limit={limit}
            onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
            status={status}
            error={error}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            methodFilter={methodFilter}
            orderFilter={orderFilter}
            customerFilter={customerFilter}
            amountMin={amountMin}
            amountMax={amountMax}
            showFilters={showFilters}
            hasActiveFilters={hasActiveFilters}
            isVisible={isVisible}
            isColumnsOpen={isColumnsOpen}
            visibleColumns={visibleColumns}
            columnsRef={columnsRef}
            onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
            onStatusChange={(v) => { setStatusFilter(v); setPage(1); }}
            onMethodChange={(v) => { setMethodFilter(v); setPage(1); }}
            onOrderFilterChange={(v) => { setOrderFilter(v); setPage(1); }}
            onCustomerFilterChange={(v) => { setCustomerFilter(v); setPage(1); }}
            onAmountMinChange={(v) => { setAmountMin(v); setPage(1); }}
            onAmountMaxChange={(v) => { setAmountMax(v); setPage(1); }}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onToggleColumns={() => setIsColumnsOpen(!isColumnsOpen)}
            onToggleColumn={toggleColumn}
            onClearFilters={clearFilters}
            onPageChange={setPage}
            onSelect={(p) => navigate(`/admin/payments/${p.id}`)}
            onExport={handleExport}
          />
        </main>
      </div>
    </div>
  );
};

/* ── 2. PAYMENTS LIST VIEW ── */
const PaymentsListView = ({
  viewType = "payments",
  payments,
  totalCount,
  page,
  status,
  error,
  searchTerm,
  statusFilter,
  methodFilter,
  orderFilter,
  customerFilter,
  amountMin,
  amountMax,
  showFilters,
  isVisible,
  isColumnsOpen,
  visibleColumns,
  columnsRef,
  onSearchChange,
  onStatusChange,
  onMethodChange,
  onOrderFilterChange,
  onCustomerFilterChange,
  onAmountMinChange,
  onAmountMaxChange,
  onToggleFilters,
  onToggleColumns,
  onToggleColumn,
  onClearFilters,
  onPageChange,
  onLimitChange,
  limit,
  onSelect,
  onExport,
}: {
  viewType?: ViewType;
  payments: Payment[];
  totalCount: number;
  page: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  status: string;
  error: string | null;
  searchTerm: string;
  statusFilter: PaymentStatus | "All";
  methodFilter: PaymentMethod | "All";
  orderFilter: string;
  customerFilter: string;
  amountMin: string;
  amountMax: string;
  showFilters: boolean;
  hasActiveFilters: boolean;
  isVisible: (key: ColumnKey) => boolean;
  isColumnsOpen: boolean;
  visibleColumns: Record<ColumnKey, boolean>;
  columnsRef: React.RefObject<HTMLDivElement | null>;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: PaymentStatus | "All") => void;
  onMethodChange: (v: PaymentMethod | "All") => void;
  onOrderFilterChange: (v: string) => void;
  onCustomerFilterChange: (v: string) => void;
  onAmountMinChange: (v: string) => void;
  onAmountMaxChange: (v: string) => void;
  onToggleFilters: () => void;
  onToggleColumns: () => void;
  onToggleColumn: (key: ColumnKey) => void;
  onClearFilters: () => void;
  onPageChange: (p: number) => void;
  onSelect: (p: Payment) => void;
  onExport: () => void;
}) => {
  const dispatch = useDispatch();
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const visibleStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = totalCount === 0 ? 0 : Math.min((page - 1) * limit + payments.length, totalCount);

  // COD-specific state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const isCod = viewType === "cod";

  const codStatuses = [
    { value: "PENDING", label: "Pending" },
    { value: "SUCCESS", label: "Collected" },
    { value: "FAILED", label: "Failed" },
  ];

  const handleCodStatusSave = (paymentId: number) => {
    if (!selectedStatus) return;
    dispatch(paymentsActions.updatePaymentStatusRequest({ id: paymentId, status: selectedStatus }));
    setEditingId(null);
    setSelectedStatus("");
  };

  return (
    <div className="animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${showFilters ? "bg-black text-white border-black" : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"}`}
          >
            <Filter size={14} /> <span className="hidden sm:inline">{showFilters ? "Hide" : "Filter"}</span>
          </button>

          {/* Column Visibility Dropdown */}
          <div className="relative" ref={columnsRef}>
            <button
              onClick={onToggleColumns}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${isColumnsOpen ? "bg-black text-white border-black" : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"}`}
            >
              <Columns3 size={14} /> <span className="hidden sm:inline">Columns</span>
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
                      onChange={() => onToggleColumn(col.key)}
                      className="w-3.5 h-3.5 rounded border-[#D4D4D8] text-black focus:ring-black/20 accent-black"
                    />
                    <span className="text-xs font-medium text-[#52525B]">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEEE] rounded-xl text-xs font-bold hover:bg-[#FAFAFA] transition-colors"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {status === "loading" && payments.length === 0 && (
        <div className="p-6 text-sm text-[#71717A]">Loading transactions…</div>
      )}
      {status === "failed" && (
        <div className="p-6 text-sm text-rose-600">{error || "Failed to load payments"}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-225">
          <thead>
            <tr className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest bg-[#FAFAFA] border-b border-[#EEEEEE]">
              {isVisible("paymentId") && <th className="px-5 py-4">Payment ID</th>}
              {isVisible("order") && <th className="px-5 py-4">Order</th>}
              {isVisible("customer") && <th className="px-5 py-4">Customer</th>}
              {isVisible("amount") && <th className="px-5 py-4">Amount</th>}
              {isVisible("method") && <th className="px-5 py-4 hidden md:table-cell">Method</th>}
              {isVisible("status") && <th className="px-5 py-4">Status</th>}
              {isVisible("date") && <th className="px-5 py-4 hidden lg:table-cell">Date</th>}
              {isVisible("orderStatus") && <th className="px-5 py-4 hidden xl:table-cell">Order Status</th>}
              <th className="px-5 py-4 text-right">Detail</th>
            </tr>

            {showFilters && (
              <tr className="bg-white border-b border-[#EEEEEE] animate-in slide-in-from-top-1 duration-200">
                {isVisible("paymentId") && (
                  <td className="px-4 py-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={12} />
                      <input
                        type="text"
                        placeholder="Search ID..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE] font-medium"
                      />
                    </div>
                  </td>
                )}
                {isVisible("order") && (
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Order..."
                      value={orderFilter}
                      onChange={(e) => onOrderFilterChange(e.target.value)}
                      className="w-full p-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE] font-medium"
                    />
                  </td>
                )}
                {isVisible("customer") && (
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Customer..."
                      value={customerFilter}
                      onChange={(e) => onCustomerFilterChange(e.target.value)}
                      className="w-full p-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE] font-medium"
                    />
                  </td>
                )}
                {isVisible("amount") && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <input type="number" placeholder="Min" value={amountMin} onChange={(e) => onAmountMinChange(e.target.value)} className="w-1/2 p-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE] font-medium" />
                      <input type="number" placeholder="Max" value={amountMax} onChange={(e) => onAmountMaxChange(e.target.value)} className="w-1/2 p-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE] font-medium" />
                    </div>
                  </td>
                )}
                {isVisible("method") && (
                  <td className="px-4 py-3">
                    <select
                      value={methodFilter}
                      onChange={(e) => onMethodChange(e.target.value as PaymentMethod | "All")}
                      className="w-full p-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE] font-medium"
                    >
                      <option value="All">All Methods</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="COD">COD</option>
                      <option value="NetBanking">NetBanking</option>
                      <option value="Wallet">Wallet</option>
                    </select>
                  </td>
                )}
                {isVisible("status") && (
                  <td className="px-4 py-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => onStatusChange(e.target.value as PaymentStatus | "All")}
                      className="w-full p-1.5 bg-[#F9F9F9] border border-transparent rounded-lg text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE] font-medium"
                    >
                      <option value="All">All Status</option>
                      <option value="Success">Success</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </td>
                )}
                {isVisible("date") && (
                  <td className="px-4 py-3"><div className="text-[10px] text-[#A1A1AA] italic">—</div></td>
                )}
                {isVisible("orderStatus") && (
                  <td className="px-4 py-3"><div className="text-[10px] text-[#A1A1AA] italic">—</div></td>
                )}
                <td className="px-4 py-3 text-right">
                  <button onClick={onClearFilters} className="text-[10px] font-bold text-rose-500 hover:underline px-2">Clear</button>
                </td>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {status === "loading" && payments.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-12 bg-gray-100 rounded" /></td>
                  <td className="px-5 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
                  <td className="px-5 py-4"><div className="h-6 w-6 bg-gray-100 rounded ml-auto" /></td>
                </tr>
              ))
              : payments.map((p) => (
                <tr
                  key={p.id}
                  className="group hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                  onClick={() => onSelect(p)}
                >
                  {isVisible("paymentId") && (
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold">{p.paymentId}</p>
                    </td>
                  )}
                  {isVisible("order") && (
                    <td className="px-5 py-4 text-xs font-mono font-bold text-blue-600">
                      {p.orderNumber}
                    </td>
                  )}
                  {isVisible("customer") && (
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold">{p.customerName}</p>
                      {p.customerEmail && <p className="text-[10px] text-[#A1A1AA]">{p.customerEmail}</p>}
                    </td>
                  )}
                  {isVisible("amount") && (
                    <td className="px-5 py-4 font-mono text-sm font-bold">
                      AED {p.amount.toLocaleString("en-IN")}
                    </td>
                  )}
                  {isVisible("method") && (
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717A]">
                        <MethodIcon method={p.paymentMethod} />
                        {p.paymentMethod}
                      </div>
                    </td>
                  )}
                  {isVisible("status") && (
                    <td className="px-5 py-4">
                      <PaymentStatusBadge status={p.paymentStatus} />
                    </td>
                  )}
                  {isVisible("date") && (
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-[11px] text-[#52525B] font-medium">
                        {new Date(p.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                  )}
                  {isVisible("orderStatus") && (
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border bg-slate-50 text-slate-600 border-slate-100">
                        {p.orderStatus || "—"}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-[#A1A1AA] hover:text-black hover:bg-[#F4F4F5] rounded-lg transition-all inline-block"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {isCod && (
                        editingId === p.id ? (
                          <>
                            <select
                              value={selectedStatus}
                              onChange={(e) => setSelectedStatus(e.target.value)}
                              className="px-2 py-1.5 bg-[#F9F9F9] border border-[#EEEEEE] rounded-lg text-[11px] font-medium outline-none focus:border-[#D4D4D8]"
                            >
                              <option value="">Select status</option>
                              {codStatuses.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCodStatusSave(p.id); }}
                              disabled={!selectedStatus}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingId(null); setSelectedStatus(""); }}
                              className="px-3 py-1.5 bg-[#F4F4F5] text-[#71717A] rounded-lg text-[10px] font-bold hover:bg-[#E4E4E7] transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setSelectedStatus(""); }}
                            className="px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold shadow-sm hover:bg-[#333] transition-colors"
                          >
                            Update
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {status !== "loading" && payments.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <CreditCard className="mx-auto text-[#D4D4D8]" size={32} />
            <p className="text-sm font-bold text-[#18181B]">No transactions found</p>
            <p className="text-xs text-[#A1A1AA]">Payments will appear here as orders are placed.</p>
            <button onClick={onClearFilters} className="text-xs font-bold underline text-[#A1A1AA] hover:text-black">
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-[#EEEEEE] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-4">
          <div className="text-[11px] text-[#A1A1AA] font-medium">
            Showing {visibleStart}-{visibleEnd} of {totalCount} transactions
          </div>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="p-1.5 bg-[#F9F9F9] border border-[#EEEEEE] rounded-lg text-xs outline-none focus:border-[#D4D4D8]"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || status === "loading"}
            className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold px-2">Page {page} of {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || status === "loading"}
            className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── 3. PAYMENT DETAIL VIEW ── */
const PaymentDetailsView = ({
  paymentId,
  onBack,
}: {
  paymentId: number;
  onBack: () => void;
}) => {
  const dispatch = useDispatch();
  const payment = useSelector(selectDetailedPayment);
  const status = useSelector(selectPaymentsStatus);
  const error = useSelector(selectPaymentsError);
  const refundStatus = useSelector(selectRefundStatus);
  const actionLoading = useSelector(selectActionLoading);
  const toast = useToast();

  const [refundAmount, setRefundAmount] = useState("");

  useEffect(() => {
    dispatch(paymentsActions.fetchPaymentDetailsRequest(paymentId));
    dispatch(paymentsActions.fetchRefundStatusRequest(paymentId));
    return () => {
      dispatch(paymentsActions.clearRefundStatus());
    };
  }, [dispatch, paymentId]);

  const handleRefund = () => {
    if (!payment) return;

    if (refundAmount.trim()) {
      const parsed = parseFloat(refundAmount);
      if (Number.isNaN(parsed) || parsed <= 0) {
        toast.error("Please enter a valid refund amount.");
        return;
      }
      if (parsed > payment.amount) {
        toast.error(`Refund amount cannot exceed AED ${payment.amount.toLocaleString("en-IN")}.`);
        return;
      }
    }

    const fils = refundAmount.trim()
      ? Math.round(parseFloat(refundAmount) * 100)
      : undefined;

    dispatch(paymentsActions.createRefundRequest({ paymentId, amount_fils: fils }));
  };

  if (status === "loading" && !payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCcw className="animate-spin text-cyan-600" size={32} />
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Loading Payment Details...</p>
      </div>
    );
  }

  if (status === "failed" || !payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="text-rose-500" size={48} />
        <h3 className="text-xl font-bold">Failed to load payment</h3>
        <p className="text-sm text-zinc-500">{error || "An unexpected error occurred"}</p>
        <button onClick={onBack} className="px-6 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-white border border-zinc-200 rounded-xl transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{payment.paymentId}</h1>
              <PaymentStatusBadge status={payment.paymentStatus} />
            </div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <Clock size={12} />
              {new Date(payment.date).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/admin/orders/${payment.id}`} // Assuming order ID matches or is reachable
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all shadow-md"
          >
            View Order <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Key Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailBox label="Amount" value={`AED ${payment.amount.toLocaleString("en-IN")}`} icon={<Receipt size={14} />} />
              <DetailBox label="Payment Method" value={payment.paymentMethod} icon={<Wallet size={14} />} />
              <DetailBox label="Transaction ID" value={payment.transactionId || "N/A"} icon={<Landmark size={14} />} />
              <DetailBox label="Payment Intent ID" value={payment.ziinaPaymentIntentId || "N/A"} icon={<CreditCard size={14} />} />
            </div>

            <div className="pt-6 border-t border-zinc-100">
              <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest mb-4">Customer Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Name</p>
                  <p className="text-sm font-bold mt-1">{payment.customerName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Email</p>
                  <p className="text-sm font-bold mt-1">{payment.customerEmail}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Phone</p>
                  <p className="text-sm font-bold mt-1">{payment.customerPhone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Refund Section */}
          {payment.paymentStatus === "Success" && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Undo2 size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Process Refund</h3>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Refunds are processed through the payment gateway. Partial refunds are supported by specifying an amount below.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">AED</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={`Full amount: ${payment.amount}`}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-rose-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <button
                  onClick={handleRefund}
                  disabled={actionLoading}
                  className="px-8 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Initiate Refund"}
                </button>
              </div>
            </div>
          )}

          {/* Refund Status */}
          {refundStatus && (
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Refund Status</h4>
              <div className="p-4 bg-zinc-50 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-medium">Refund ID</span>
                  <span className="text-xs font-bold font-mono">{refundStatus.refund_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-medium">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${refundStatus.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {refundStatus.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-medium">Amount</span>
                  <span className="text-xs font-bold">AED {(refundStatus.amount / 100).toFixed(2)}</span>
                </div>
                {refundStatus.processed_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 font-medium">Processed At</span>
                    <span className="text-xs font-bold">{new Date(refundStatus.processed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: JSON Response (Provider Data) */}
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-2xl p-6 shadow-xl overflow-hidden h-full min-h-[400px] flex flex-col">
            <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-4">Provider Response</h4>
            <div className="flex-1 overflow-auto no-scrollbar font-mono text-[11px] text-emerald-400/90 leading-relaxed">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(payment.providerResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── HELPER COMPONENTS ── */
const NavTab = ({ id, active, label, icon, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${active === id
      ? "bg-black text-white shadow-md"
      : "text-[#71717A] hover:bg-[#F4F4F5] hover:text-black"
      }`}
  >
    {icon} {label}
  </button>
);


const MethodIcon = ({ method }: { method: PaymentMethod }) => {
  if (method === "UPI") return <Landmark size={12} />;
  if (method === "COD") return <Banknote size={12} />;
  if (method === "Wallet") return <Wallet size={12} />;
  return <CreditCard size={12} />;
};

const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
  const styles: Record<PaymentStatus, string> = {
    Success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Failed: "bg-rose-50 text-rose-600 border-rose-100",
    Pending: "bg-amber-50 text-amber-600 border-amber-100",
    Refunded: "bg-violet-50 text-violet-600 border-violet-100",
  };
  return (
    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border shadow-sm ${styles[status]}`}>
      {status}
    </span>
  );
};


const DetailBox = ({ label, value, icon }: any) => (
  <div className="p-4 border border-[#EEEEEE] rounded-xl space-y-1.5 shadow-sm bg-white hover:border-gray-300 transition-colors">
    <div className="flex items-center gap-1.5 text-[#A1A1AA] font-bold uppercase tracking-widest text-[9px]">
      {icon} <span>{label}</span>
    </div>
    <p className="text-sm font-bold truncate text-[#18181B]">{value}</p>
  </div>
);

export default PaymentManagement;
