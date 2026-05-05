import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { deliveryApi, type DeliveryDashboardData } from "./deliveryApi";
import { useSelector } from "react-redux";

const STATUS_COLOR: Record<string, string> = {
  PAID: "bg-green-50 text-green-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
};

function KpiCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-3 group transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${highlight
        ? "border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-cyan-100/40"
        : "border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-gray-200/50"
        }`}
    >
      <div className="flex items-center justify-between z-10">
        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{label}</span>
        <span className={`p-1.5 rounded-lg transition-transform duration-500 group-hover:scale-110 ${highlight ? "bg-cyan-100/50 text-cyan-600" : "bg-gray-50 text-gray-400"}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-black tracking-tight z-10 ${highlight ? "text-cyan-900" : "text-gray-900"}`}>
        {value}
      </p>
      {highlight && (
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl group-hover:bg-cyan-400/20 transition-all duration-500" />
      )}
    </div>
  );
}

const DeliveryDashboard: React.FC = () => {
  const { user } = useSelector((state: any) => state.auth);
  const [data, setData] = useState<DeliveryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await deliveryApi.getDashboard();
      setData(d);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const profile = data?.delivery_boy;
  const kpi = data?.kpis;
  const recent = data?.recent_assigned_orders ?? [];

  return (
    <div className="space-y-4">
      {/* ─── Greeting ─── */}
      {/* ─── Greeting ─── */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-cyan-50 to-transparent rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">{user?.full_name?.split(" ")[0] || "Driver"}</span> 👋
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            {(profile?.assigned_emirates_display?.length ?? 0) > 0
              ? `${profile!.assigned_emirates_display.join(", ")}`
              : "No region assigned"}
          </p>
        </div>
        <div
          className={`relative z-10 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest shadow-sm flex items-center gap-1.5 ${profile?.is_available
            ? "bg-green-50 text-green-700 border border-green-100"
            : "bg-gray-50 text-gray-500 border border-gray-100"
            }`}
        >
          <span className={`w-1 h-1 rounded-full ${profile?.is_available ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          {profile?.is_available ? "AVAILABLE" : "OFFLINE"}
        </div>
      </div>

      {/* ─── KPI cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="Pending assigned"
          value={kpi?.pending_assigned_orders ?? 0}
          icon={<Clock size={16} />}
          highlight
        />
        <KpiCard
          label="Available nearby"
          value={kpi?.available_orders_in_region ?? 0}
          icon={<MapPin size={16} />}
        />
        <KpiCard
          label="Completed today"
          value={kpi?.completed_today ?? 0}
          icon={<CheckCircle2 size={16} />}
        />
        <KpiCard
          label="Total completed"
          value={kpi?.completed_total ?? 0}
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* ─── Quick actions ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/delivery/available"
          className="group flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300"
        >
          <Package size={16} className="group-hover:rotate-12 transition-transform duration-300" />
          Pick Up New Order
        </Link>
        <Link
          to="/delivery/my-orders"
          className="group flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-[10px] font-black tracking-widest uppercase shadow-sm hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
          <Truck size={16} className="text-gray-400 group-hover:translate-x-1 transition-all duration-300" />
          My Deliveries
        </Link>
      </div>

      {/* ─── Recent orders ─── */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Recent Assignments</h2>
            <Link to="/delivery/my-orders" className="text-xs text-cyan-600 font-medium flex items-center gap-0.5">
              See all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to={`/delivery/orders/${order.id}`}
                className="group relative bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex flex-col gap-3 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/30 hover:-translate-y-1 transition-all duration-500 ease-out overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-y-1/2 translate-x-1/3" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-black tracking-tight text-gray-800 group-hover:text-cyan-700 transition-colors">
                      #{order.id}
                    </span>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                      {order.preferred_delivery_date ? (
                        <>DELIVERY: {new Date(order.preferred_delivery_date).toLocaleDateString()} {order.preferred_delivery_slot_name ? `· ${order.preferred_delivery_slot_name}` : ""}</>
                      ) : (
                        "RECENT ASSIGNMENT"
                      )}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-wide uppercase shadow-sm border ${STATUS_COLOR[order.status] || "bg-gray-50 text-gray-600 border-gray-100"
                      }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="flex items-start gap-3 text-sm text-gray-600 relative z-10 mt-auto">
                  <div className="mt-0.5 p-1.5 bg-gray-50 rounded-full group-hover:bg-cyan-50 transition-colors duration-300">
                    <MapPin size={14} className="text-gray-400 group-hover:text-cyan-500 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed group-hover:text-gray-800 transition-colors">
                    {order.shipping_address_summary?.emirate?.replace("_", " ") || "No Region"} · AED {parseFloat(order.total_amount).toFixed(2)}
                    {parseFloat(order.tip_amount) > 0 && (
                      <span className="ml-2 text-emerald-600 font-bold">+ AED {parseFloat(order.tip_amount).toFixed(2)} Tip</span>
                    )}
                  </p>
                  <div className="ml-auto w-9 h-9 rounded-2xl bg-gray-50 group-hover:bg-gray-900 group-hover:scale-110 flex items-center justify-center transition-all duration-500 shadow-sm">
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          No recent assignments. Go pick up an order!
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
