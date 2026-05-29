import React, { useEffect, useMemo, useState, useRef } from "react";
import { dashboardApi } from "../dashboard/dashboardApi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Filter,
  Eye,
  XCircle,
  Download,
  Package,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  ListFilter,
  Columns3,
  Calendar,
  MapPin,
  CreditCard,
  Hash,
  MessageSquare,
  Send,
  TrendingUp,
  PieChart,
  LineChart,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { FEATURE_ORDERS_ANALYTICS } from "../../../config/constants";

import {
  ordersActions,
  selectOrders,
  selectOrdersStatus,
  selectOrdersError,
  selectOrdersTotal,
} from "./ordersSlice";
import type { Order, OrderStatus, PaymentStatus } from "./ordersSlice";

/* --- FILTER TYPES --- */
type FilterOrderStatus = OrderStatus | "All";

/* --- Column definitions --- */
type ColumnKey =
  | "index"
  | "order"
  | "customer"
  | "items"
  | "total"
  | "payment"
  | "status"
  | "deliveryDate"
  | "deliverySlot"
  | "city"
  | "paymentMethod"
  | "transactionId"
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
  { key: "order", label: "Order / Date", defaultVisible: true },
  { key: "customer", label: "Customer", defaultVisible: true },
  { key: "items", label: "Items", defaultVisible: true },
  { key: "total", label: "Total", defaultVisible: true },
  { key: "payment", label: "Payment", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "deliveryDate", label: "Delivery Date", icon: <Calendar size={12} />, defaultVisible: false },
  { key: "deliverySlot", label: "Delivery Slot", icon: <Clock size={12} />, defaultVisible: false },
  { key: "city", label: "City", icon: <MapPin size={12} />, defaultVisible: false },
  { key: "paymentMethod", label: "Pay Method", icon: <CreditCard size={12} />, defaultVisible: false },
  { key: "transactionId", label: "Transaction ID", icon: <Hash size={12} />, defaultVisible: false },
  { key: "actions", label: "Actions", defaultVisible: true, alwaysVisible: true },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* --- MAIN COMPONENT --- */
const OrderManagement: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const orders = useSelector(selectOrders);
  const totalCount = useSelector(selectOrdersTotal);
  const status = useSelector(selectOrdersStatus);
  const error = useSelector(selectOrdersError);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterOrderStatus>("All");
  const [customerFilter, setCustomerFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [deliveryDateFilter, setDeliveryDateFilter] = useState("");
  const [deliverySlotFilter, setDeliverySlotFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [transactionIdFilter, setTransactionIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedCustomer = useDebounce(customerFilter, 2000);

  // Analytics state
  const [anaLoading, setAnaLoading] = useState(true);
  const [anaError, setAnaError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

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

  // Reset to page 1 when server-side filters change
  useEffect(() => { setPage(1); }, [debouncedCustomer, statusFilter]);

  // Main API Fetch Effect — customer + status go to the server
  useEffect(() => {
    const offset = (page - 1) * limit;
    const q = debouncedCustomer || undefined;
    dispatch(
      ordersActions.fetchOrdersRequest({
        q,
        search: q,
        status: statusFilter === "All" ? undefined : statusFilter,
        page,
        limit,
        offset,
      })
    );
  }, [dispatch, debouncedCustomer, statusFilter, page, limit]);

  // Fetch dashboard analytics
  useEffect(() => {
    if (!FEATURE_ORDERS_ANALYTICS) return;
    const fetchAna = async () => {
      setAnaLoading(true);
      setAnaError(null);
      try {
        const data = await (await import("./ordersApi")).ordersApi.getDashboardAnalytics();
        const normalized = (data as any).users || (data as any).orders
          ? {
            total_orders: (data as any).orders?.total ?? 0,
            paid_last_30_days: (data as any).orders?.paid_last_30_days ?? 0,
            average_order_value: String((data as any).orders?.avg_order_value ?? "0"),
            total_revenue: String((data as any).revenue?.total ?? "0"),
            revenue_per_day: (data as any).revenue?.per_day ?? [],
            orders_by_status: (data as any).orders?.by_status ?? [],
            top_products: (data as any).top_products ?? [],
          }
          : {
            total_orders: (data as any).total_orders ?? 0,
            paid_last_30_days: (data as any).paid_last_30_days ?? 0,
            average_order_value: String((data as any).average_order_value ?? "0"),
            total_revenue: String((data as any).total_revenue ?? "0"),
            revenue_per_day: (data as any).revenue_per_day ?? [],
            orders_by_status: (data as any).orders_by_status ?? [],
            top_products: (data as any).top_products ?? [],
          };
        setAnalytics(normalized);
      } catch (e) {
        setAnaError("Failed to load analytics");
      } finally {
        setAnaLoading(false);
      }
    };
    fetchAna();
  }, []);

  const handleReset = () => {
    setStatusFilter("All");
    setCustomerFilter("");
    setCityFilter("");
    setDeliveryDateFilter("");
    setDeliverySlotFilter("");
    setPaymentMethodFilter("");
    setTransactionIdFilter("");
    setPage(1);
  };

  // Apply local filters on current page data (same pattern as product page)
  // Note: customerFilter is server-side, so not included here
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (cityFilter) {
      result = result.filter((o) =>
        o.shippingAddress.city.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }
    if (deliveryDateFilter) {
      result = result.filter((o) =>
        o.deliveryDate?.startsWith(deliveryDateFilter)
      );
    }
    if (deliverySlotFilter) {
      result = result.filter((o) =>
        String(o.deliverySlot || "").toLowerCase().includes(deliverySlotFilter.toLowerCase())
      );
    }
    if (paymentMethodFilter) {
      result = result.filter((o) =>
        o.paymentMethod.toLowerCase().includes(paymentMethodFilter.toLowerCase())
      );
    }
    if (transactionIdFilter) {
      result = result.filter((o) =>
        o.payment?.transactionId?.toLowerCase().includes(transactionIdFilter.toLowerCase())
      );
    }
    return result;
  }, [orders, cityFilter, deliveryDateFilter, deliverySlotFilter, paymentMethodFilter, transactionIdFilter]);

  const displayedOrders = filteredOrders;

  // Order counts from API
  const [orderCounts, setOrderCounts] = useState({
    total_orders: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    total_revenue: "0.00",
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setCountsLoading(true);
    setCountsError(null);
    dashboardApi.fetchOrdersCount()
      .then((res: any) => {
        if (mounted) {
          const data = res.data || res;
          setOrderCounts({
            total_orders: data.total_orders ?? 0,
            processing: data.processing ?? 0,
            shipped: data.shipped ?? 0,
            delivered: data.delivered ?? 0,
            total_revenue: data.total_revenue ?? "0.00",
          });
        }
      })
      .catch(() => {
        if (mounted) setCountsError("Failed to load order counts");
      })
      .finally(() => {
        if (mounted) setCountsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const uniqueSlots = useMemo(() =>
    [...new Set(orders.map((o) => o.deliverySlot).filter(Boolean) as string[])],
    [orders]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const visibleStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = totalCount === 0 ? 0 : Math.min((page - 1) * limit + displayedOrders.length, totalCount);

  const handleExport = () => {
    const headers = ["Order ID", "Customer", "Items", "Total", "Status", "Date", "Payment", "Payment Method"];
    const rows = orders.map(o => [
      o.orderNumber,
      o.shippingAddress.fullName || "",
      o.items.length,
      o.total,
      o.status,
      new Date(o.createdAt).toLocaleDateString(),
      o.paymentStatus,
      o.paymentMethod
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
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full space-y-6 text-[#18181B] bg-[#FDFDFD]">
      {/* --- PAGE HEADER --- */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">Orders</h1>
        <p className="text-[#71717A] text-sm mt-1">Track and manage all customer orders.</p>
      </div>

      {/* --- ANALYTICS --- */}
      {FEATURE_ORDERS_ANALYTICS && (
        <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Orders Analytics</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-[#71717A]">
              <TrendingUp size={14} /> Last 30 days
            </div>
          </div>
          {anaLoading ? (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
              <div className="lg:col-span-3 h-28 bg-gray-50 rounded-xl" />
              <div className="lg:col-span-5 h-44 bg-gray-50 rounded-xl" />
              <div className="lg:col-span-4 h-44 bg-gray-50 rounded-xl" />
            </div>
          ) : anaError ? (
            <div className="p-6 text-sm text-rose-600">{anaError}</div>
          ) : analytics ? (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4">
                <KpiCard icon={<ShoppingBag size={16} />} label="Total Orders" value={String(analytics.total_orders)} />
                <KpiCard icon={<DollarSign size={16} />} label="Revenue" value={`AED ${Number(analytics.total_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                <KpiCard icon={<CreditCard size={16} />} label="Paid (30d)" value={String(analytics.paid_last_30_days || 0)} />
                <KpiCard icon={<LineChart size={16} />} label="Avg Order" value={`AED ${Number(analytics.average_order_value || 0).toFixed(2)}`} />
              </div>

              <div className="lg:col-span-5 bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#71717A]"><LineChart size={14} /> Revenue (last 30d)</div>
                </div>
                <div className="h-40 relative">
                  <RevenueLine data={analytics.revenue_per_day || []} />
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-[#EEEEEE] rounded-2xl p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#71717A] mb-3"><PieChart size={14} /> Orders by Status</div>
                <StatusBars items={(analytics.orders_by_status || []).map((s: any) => ({
                  label: (s.status || s.name || "").toString(),
                  count: Number(s.count || s.value || 0),
                }))} />
              </div>

              {Array.isArray(analytics.top_products) && analytics.top_products.length > 0 && (
                <div className="lg:col-span-12 bg-white border border-[#EEEEEE] rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#71717A] mb-3"><BarChart3 size={14} /> Top Products</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="py-2 text-left px-2">Product</th>
                          <th className="py-2 text-left px-2">Qty</th>
                          <th className="py-2 text-left px-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F4F4F5]">
                        {analytics.top_products.slice(0, 10).map((p: any, idx: number) => (
                          <tr key={`${p.product_id || p.id}-${idx}`} className="hover:bg-[#FBFBFA]">
                            <td className="px-2 py-2 font-bold text-[#18181B]">{p.name || p.product_name}</td>
                            <td className="px-2 py-2">{p.total_quantity ?? p.sales ?? 0}</td>
                            <td className="px-2 py-2 font-black text-cyan-600">
                              AED {Number(p.total_revenue ?? p.revenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* --- STATS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <QuickStat
          label="Total Revenue"
          value={countsLoading ? "..." : `AED ${Number(orderCounts.total_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          sub={countsError ? countsError : "Total earnings"}
          icon={<DollarSign size={16} className="text-emerald-500" />}
        />
        <QuickStat
          label="Total Orders"
          value={countsLoading ? "..." : `${orderCounts.total_orders}`}
          sub={countsError ? countsError : "All received"}
          icon={<ShoppingBag size={16} className="text-[#A1A1AA]" />}
        />
        <QuickStat
          label="Processing"
          value={countsLoading ? "..." : `${orderCounts.processing}`}
          sub={countsError ? countsError : "Awaiting fulfillment"}
          icon={<Clock size={16} className="text-amber-500" />}
        />
        <QuickStat
          label="Shipped"
          value={countsLoading ? "..." : `${orderCounts.shipped}`}
          sub={countsError ? countsError : "In transit"}
          icon={<Truck size={16} className="text-blue-500" />}
        />
        <QuickStat
          label="Delivered"
          value={countsLoading ? "..." : `${orderCounts.delivered}`}
          sub={countsError ? countsError : "Completed"}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
        />
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-sm overflow-hidden">
        {/* Status Tabs */}
        <div className="px-4 pt-4 flex items-center gap-1.5 border-b border-[#EEEEEE] overflow-x-auto overflow-y-hidden scrollbar-none snap-x active:cursor-grabbing pb-0">
          {([
            { key: "All" as const, label: "All" },
            { key: "PENDING" as const, label: "Pending" },
            { key: "PAID" as const, label: "Paid" },
            { key: "PROCESSING" as const, label: "Processing" },
            { key: "SHIPPED" as const, label: "Shipped" },
            { key: "DELIVERED" as const, label: "Delivered" },
            { key: "CANCELLED" as const, label: "Cancelled" },
          ] as { key: FilterOrderStatus; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`text-[11px] font-bold px-4 py-2.5 border-b-2 transition-all duration-200 -mb-px whitespace-nowrap snap-start ${statusFilter === tab.key
                ? "border-black text-black"
                : "border-transparent text-[#71717A] hover:text-[#18181B]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-[#EEEEEE] flex flex-col md:flex-row justify-start items-center gap-4 bg-white">
          <div className="flex items-center gap-2 w-full md:w-auto justify-start">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${isFilterOpen
                ? "bg-black text-white border-black"
                : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"
                }`}
            >
              <Filter size={14} /> {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </button>

            <div className="relative" ref={columnsRef}>
              <button
                onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${isColumnsOpen
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"
                  }`}
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
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Loading / Error states */}
        {status === "loading" && orders.length === 0 && (
          <div className="p-6 text-sm text-[#71717A]">Loading orders…</div>
        )}
        {status === "failed" && (
          <div className="p-6 text-sm text-rose-600">{error || "Failed to load orders"}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-225">
            <thead className="bg-[#FAFAFA]">
              <tr className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">
                {isVisible("index") && <th className="px-5 py-4 w-12 text-center">#</th>}
                {isVisible("order") && <th className="px-5 py-4">Order / Date</th>}
                {isVisible("customer") && <th className="px-5 py-4">Customer</th>}
                {isVisible("items") && <th className="px-5 py-4 hidden md:table-cell">Items</th>}
                {isVisible("total") && <th className="px-5 py-4">Total</th>}
                {isVisible("payment") && <th className="px-5 py-4 hidden lg:table-cell">Payment</th>}
                {isVisible("status") && <th className="px-5 py-4">Status</th>}
                {isVisible("deliveryDate") && <th className="px-5 py-4 hidden xl:table-cell">Delivery Date</th>}
                {isVisible("deliverySlot") && <th className="px-5 py-4 hidden xl:table-cell">Delivery Slot</th>}
                {isVisible("city") && <th className="px-5 py-4 hidden lg:table-cell">City</th>}
                {isVisible("paymentMethod") && <th className="px-5 py-4 hidden lg:table-cell">Pay Method</th>}
                {isVisible("transactionId") && <th className="px-5 py-4 hidden xl:table-cell">Transaction ID</th>}
                {isVisible("actions") && <th className="px-5 py-4 text-right">Actions</th>}
              </tr>

              {isFilterOpen && (
                <tr className="bg-white border-b border-[#EEEEEE] animate-in fade-in slide-in-from-top-1 duration-200">
                  {isVisible("index") && (
                    <td className="px-5 py-3 text-center">
                      <ListFilter size={14} className="text-[#D4D4D8] mx-auto" />
                    </td>
                  )}
                  {isVisible("order") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] font-medium italic">—</div>
                    </td>
                  )}
                  {isVisible("customer") && (
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder="Customer..."
                        value={customerFilter}
                        onChange={(e) => setCustomerFilter(e.target.value)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                      />
                    </td>
                  )}
                  {isVisible("items") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] font-medium italic">—</div>
                    </td>
                  )}
                  {isVisible("total") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] font-medium italic">—</div>
                    </td>
                  )}
                  {isVisible("payment") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] font-medium italic">—</div>
                    </td>
                  )}
                  {isVisible("status") && (
                    <td className="px-5 py-3">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as FilterOrderStatus)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="All">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  )}
                  {isVisible("deliveryDate") && (
                    <td className="px-5 py-3">
                      <input
                        type="date"
                        value={deliveryDateFilter}
                        onChange={(e) => setDeliveryDateFilter(e.target.value)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                      />
                    </td>
                  )}
                  {isVisible("deliverySlot") && (
                    <td className="px-5 py-3">
                      <select
                        value={deliverySlotFilter}
                        onChange={(e) => setDeliverySlotFilter(e.target.value)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="">All Slots</option>
                        {uniqueSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {isVisible("city") && (
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder="City..."
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                      />
                    </td>
                  )}
                  {isVisible("paymentMethod") && (
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder="Pay method..."
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                      />
                    </td>
                  )}
                  {isVisible("transactionId") && (
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder="TXN ID..."
                        value={transactionIdFilter}
                        onChange={(e) => setTransactionIdFilter(e.target.value)}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                      />
                    </td>
                  )}
                  {isVisible("actions") && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={handleReset}
                        className="text-[10px] font-bold text-rose-500 hover:underline px-2"
                      >
                        Clear
                      </button>
                    </td>
                  )}
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-[#EEEEEE]">
              {status === "loading" && orders.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-10 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-14 bg-gray-100 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-20 bg-gray-100 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="h-8 w-8 bg-gray-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
                : displayedOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="group hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    {isVisible("index") && (
                      <td className="px-5 py-4 text-xs font-mono text-[#A1A1AA] text-center">
                        {(page - 1) * limit + index + 1}
                      </td>
                    )}

                    {isVisible("order") && (
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold font-mono text-black">{order.orderNumber}</p>
                        <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                    )}

                    {isVisible("customer") && (
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold">{order.shippingAddress.fullName || "—"}</p>
                        <p className="text-[10px] text-[#A1A1AA]">{order.shippingAddress.phoneNumber || "—"}</p>
                      </td>
                    )}

                    {isVisible("items") && (
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs font-bold text-[#52525B]">
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                    )}

                    {isVisible("total") && (
                      <td className="px-5 py-4">
                        <span className="text-sm font-black">
                          AED {order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    )}

                    {isVisible("payment") && (
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <PaymentBadge status={order.paymentStatus} />
                      </td>
                    )}

                    {isVisible("status") && (
                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    )}

                    {isVisible("deliveryDate") && (
                      <td className="px-5 py-4 hidden xl:table-cell">
                        <span className="text-xs text-[#52525B] font-medium">
                          {order.deliveryDate
                            ? new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                            : "—"}
                        </span>
                      </td>
                    )}

                    {isVisible("deliverySlot") && (
                      <td className="px-5 py-4 hidden xl:table-cell">
                        <span className="text-xs text-[#52525B] font-medium">
                          {order.deliverySlot || "—"}
                        </span>
                      </td>
                    )}

                    {isVisible("city") && (
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-xs text-[#52525B] font-medium">
                          {order.shippingAddress.city || "—"}
                        </span>
                      </td>
                    )}

                    {isVisible("paymentMethod") && (
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-bold uppercase bg-[#F4F4F5] text-[#52525B] px-2.5 py-1 rounded-full">
                          {order.paymentMethod}
                        </span>
                      </td>
                    )}

                    {isVisible("transactionId") && (
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-mono text-[#A1A1AA]">
                          {order.payment?.transactionId || "—"}
                        </span>
                      </td>
                    )}

                    {isVisible("actions") && (
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/orders/${order.id}`);
                          }}
                          className="p-2 text-[#A1A1AA] hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>

          {status !== "loading" && displayedOrders.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <ShoppingBag className="mx-auto text-[#D4D4D8]" size={32} />
              <p className="text-sm font-bold text-[#18181B]">No orders found</p>
              <p className="text-xs text-[#A1A1AA]">Orders will appear here as customers place them.</p>
              <button
                onClick={handleReset}
                className="text-xs font-bold underline text-[#A1A1AA] hover:text-black"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* --- PAGINATION --- */}
        <div className="p-4 border-t border-[#EEEEEE] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-[#A1A1AA] font-medium">
              Showing {visibleStart}-{visibleEnd} of {totalCount} orders
            </div>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
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

      {/* --- ORDER DETAILS SLIDE-OVER --- */}
      {selectedOrder && (
        <OrderDetailsPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

/* --- SUBCOMPONENTS --- */
const KpiCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-white border border-[#EEEEEE] rounded-2xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">{label}</p>
        <p className="text-lg font-black text-[#18181B] mt-1">{value}</p>
      </div>
      <div className="text-[#D4D4D8]">{icon}</div>
    </div>
  </div>
);

const RevenueLine: React.FC<{ data: Array<{ date: string; total_amount: string }> }> = ({ data }) => {
  const points = (data || []).map((d) => ({
    x: new Date(d.date).getTime(),
    y: Number(d.total_amount || 0),
  })).sort((a, b) => a.x - b.x);
  const ys = points.map((p) => p.y);
  const minY = Math.min(0, ...ys, 0);
  const maxY = Math.max(...ys, 1);
  const xs = points.map((p) => p.x);
  const minX = xs[0] ?? Date.now();
  const maxX = xs[xs.length - 1] ?? (minX + 1);
  const W = 600; const H = 140; const P = 8;
  const scaleX = (x: number) => P + ((x - minX) / (maxX - minX || 1)) * (W - P * 2);
  const scaleY = (y: number) => H - P - ((y - minY) / (maxY - minY || 1)) * (H - P * 2);
  const path = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x)} ${scaleY(p.y)}`).join(" ")
    : `M ${P} ${H - P} L ${W - P} ${H - P}`;
  const area = points.length
    ? `M ${scaleX(points[0].x)} ${H - P} ` + points.map((p) => `L ${scaleX(p.x)} ${scaleY(p.y)}`).join(" ") + ` L ${scaleX(points[points.length - 1].x)} ${H - P} Z`
    : `M ${P} ${H - P} L ${W - P} ${H - P} L ${W - P} ${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#revGrad)" />
      <path d={path} stroke="#06b6d4" strokeWidth="2.5" fill="none" />
    </svg>
  );
};

const StatusBars: React.FC<{ items: Array<{ label: string; count: number }> }> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const palette: Record<string, string> = {
    pending: "bg-amber-400",
    paid: "bg-emerald-500",
    processing: "bg-indigo-500",
    shipped: "bg-cyan-500",
    delivered: "bg-emerald-600",
    cancelled: "bg-rose-500",
  };
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = Math.round((it.count / total) * 100);
        const key = it.label.toLowerCase();
        const color = palette[key] || "bg-slate-400";
        return (
          <div key={it.label}>
            <div className="flex justify-between text-[10px] font-bold text-[#71717A] mb-1">
              <span className="capitalize">{it.label.toLowerCase()}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2.5 bg-[#F4F4F5] rounded-full overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── ORDER DETAILS SLIDE-OVER ── */
const OrderDetailsPanel = ({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) => {
  const dispatch = useDispatch();
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("")
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;
    setIsUpdating(true);
    dispatch(ordersActions.updateStatusRequest({
      id: order.id,
      status: selectedStatus,
      ...(statusNotes.trim() ? { notes: statusNotes.trim() } : {}),
    }));
    setIsStatusOpen(false);
    setSelectedStatus("");
    setStatusNotes("");
    setIsUpdating(false);
  };

  const statusOptions: OrderStatus[] = [
    "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-60 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-[#EEEEEE] flex justify-between items-center bg-white sticky top-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-900 text-white rounded-xl">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black">{order.orderNumber}</h2>
              <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
                Order Details
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-gray-50 transition-colors"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#EEEEEE] space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-[#A1A1AA] uppercase">Current Status</p>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
              >
                Update Status <ChevronDown size={14} className={`transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isStatusOpen && (
              <div className="border-t border-[#EEEEEE] pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide block mb-1.5">New Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedStatus(s)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${selectedStatus === s
                          ? 'bg-black text-white border-black'
                          : order.status === s
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}
                        disabled={order.status === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={10} /> Admin Notes <span className="text-[#D4D4D8] font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="e.g. Handed over to courier..."
                    rows={2}
                    className="w-full p-3 bg-white border border-[#EEEEEE] rounded-lg text-xs outline-none resize-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-all placeholder:text-gray-300"
                  />
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || isUpdating}
                  className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Send size={12} />
                  {isUpdating ? 'Updating...' : selectedStatus ? `Update to "${selectedStatus}"` : 'Select a status above'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoField label="Customer" value={order.shippingAddress.fullName || "—"} />
            <InfoField label="Phone" value={order.shippingAddress.phoneNumber || "—"} />
            <InfoField label="City" value={order.shippingAddress.city || "—"} />
            <InfoField label="Area" value={order.shippingAddress.area || "—"} />
            <InfoField label="Address" value={order.shippingAddress.streetAddress || "—"} />
            <InfoField label="Emirate" value={order.shippingAddress.emirate || "—"} />
            <InfoField label="Payment Method" value={order.paymentMethod} />
            <InfoField label="Payment">
              <PaymentBadge status={order.paymentStatus} />
            </InfoField>
            <InfoField
              label="Order Date"
              value={new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2">
              Purchased Items
            </h4>
            {order.items?.length > 0 ? (
              order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b border-dashed border-[#EEEEEE] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] flex items-center justify-center">
                      <Package size={16} className="text-[#A1A1AA]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{item.productName || "Unknown Product"}</p>
                      <p className="text-[10px] text-[#A1A1AA]">
                        Qty: {item.quantity || 0} {item.productUnitDisplay === '100g' ? 'x 100g' : (item.productUnitDisplay || "")} · AED {(item.price || 0).toFixed(2)}/{item.productUnitDisplay || "ea"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">AED {(item.subtotal || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#A1A1AA] italic">No items in this order.</p>
            )}

            <div className="pt-4 space-y-2 border-t border-[#EEEEEE]">
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-bold">Total Amount</span>
                <span className="text-xl font-black text-emerald-600">
                  AED {(order.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ── BADGE COMPONENTS ── */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    PENDING: "bg-gray-50 text-gray-600 border-gray-200",
    PAID: "bg-green-50 text-green-700 border-green-200",
    PROCESSING: "bg-amber-50 text-amber-600 border-amber-100",
    SHIPPED: "bg-indigo-50 text-indigo-600 border-indigo-100",
    DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
    CANCELLED: "bg-rose-50 text-rose-600 border-rose-100",
  };
  const dots: Record<OrderStatus, string> = {
    PENDING: "bg-gray-400",
    PAID: "bg-green-600",
    PROCESSING: "bg-amber-500",
    SHIPPED: "bg-indigo-500",
    DELIVERED: "bg-emerald-500",
    CANCELLED: "bg-rose-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    Paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Pending: "bg-amber-50 text-amber-600 border-amber-100",
    Refunded: "bg-violet-50 text-violet-600 border-violet-100",
    Failed: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return (
    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border ${styles[status]}`}>
      {status}
    </span>
  );
}

function InfoField({ label, value, children }: { label: string; value?: string | number; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide">{label}</p>
      {children ?? <p className="text-sm font-bold text-[#18181B]">{value}</p>}
    </div>
  );
}

function QuickStat({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-white border border-[#EEEEEE] rounded-2xl shadow-sm hover:border-[#D4D4D8] transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{label}</p>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mt-1 tracking-tight">{value}</h3>
      <p className="text-[11px] text-emerald-600 font-medium mt-1">{sub}</p>
    </div>
  );
}

export default OrderManagement;