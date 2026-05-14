import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Star,
  Search,

  Filter,
  ChevronRight,
  ChevronLeft,
  Download,
  MessageSquare,
  ListFilter,
  Columns3,
  X,
  Eye,
  EyeOff,
  Calendar,
  User,
  Package,
  Loader2,
} from "lucide-react";

import { dashboardApi } from "../dashboard/dashboardApi";
import {
  reviewsActions,
  selectReviews,
  selectReviewsStatus,
  selectReviewsError,
  selectReviewsTotal,
  selectSelectedReviewId,
} from "./reviewsSlice";
import type { Review } from "./reviewsSlice";
import { reviewsApi } from "./reviewsApi";
import { useToast } from "../../../components/ui/Toast";
import { API_BASE_URL } from "../../../config/constants";

/* --- Column Visibility --- */
type ColumnKey =
  | "index"
  | "product"
  | "customer"
  | "rating"
  | "comment"
  | "visibility"
  | "date"
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
  { key: "product", label: "Product", icon: <Package size={12} />, defaultVisible: true },
  { key: "customer", label: "Customer", icon: <User size={12} />, defaultVisible: true },
  { key: "rating", label: "Rating", icon: <Star size={12} />, defaultVisible: true },
  { key: "comment", label: "Comment", icon: <MessageSquare size={12} />, defaultVisible: true },
  { key: "visibility", label: "Visibility", defaultVisible: true },
  { key: "date", label: "Created", icon: <Calendar size={12} />, defaultVisible: true },
  { key: "actions", label: "Actions", defaultVisible: true, alwaysVisible: true },
];

 

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const normalizeReviewImage = (src: string): string => {
  if (!src) return "";
  const value = String(src).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const base =
    (import.meta as any).env?.VITE_MEDIA_BASE_URL ||
    ((API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL))
      ? new URL(API_BASE_URL as any).origin
      : window.location.origin);

  if (value.startsWith("/")) return `${base}${value}`;
  return `${base}/${value.replace(/^\.?\/*/, "")}`;
};

/* --- MAIN COMPONENT --- */
const ReviewsManagement: React.FC = () => {
  const dispatch = useDispatch();

  // Redux data
  const reviews = useSelector(selectReviews);
  const totalCount = useSelector(selectReviewsTotal);
  const status = useSelector(selectReviewsStatus);
  const error = useSelector(selectReviewsError);
  const selectedReviewId = useSelector(selectSelectedReviewId);

  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | "All">("All");
  const [customerFilter, setCustomerFilter] = useState("");
  const [commentFilter, setCommentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const debouncedSearch = useDebounce(searchTerm, 2000);
  const toast = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  const reviewsQuery = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      rating: filterRating === "All" ? undefined : filterRating,
      page,
      limit,
      offset: (page - 1) * limit,
    }),
    [debouncedSearch, filterRating, page, limit]
  );

  useEffect(() => {
    dispatch(reviewsActions.fetchReviewsRequest(reviewsQuery));
  }, [dispatch, reviewsQuery]);

  const handleReset = () => {
    setSearchTerm("");
    setFilterRating("All");
    setCustomerFilter("");
    setCommentFilter("");
    setPage(1);
  };

  // Keep only filters the backend does not currently expose client-side.
  const filteredReviews = useMemo(() => {
    let result = reviews;
    if (customerFilter) {
      result = result.filter((r) =>
        r.userName.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    if (commentFilter) {
      result = result.filter((r) =>
        r.comment.toLowerCase().includes(commentFilter.toLowerCase())
      );
    }
    return result;
  }, [reviews, customerFilter, commentFilter]);

  const hasServerFilters = !!(debouncedSearch || filterRating !== "All");
  const displayedReviews = hasServerFilters ? reviews : filteredReviews;

  const selectedReview = useMemo(
    () => displayedReviews.find((r) => r.id === selectedReviewId) ?? null,
    [displayedReviews, selectedReviewId]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const visibleStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = totalCount === 0 ? 0 : Math.min((page - 1) * limit + displayedReviews.length, totalCount);

  const refetchReviews = useCallback(() => {
    dispatch(reviewsActions.fetchReviewsRequest(reviewsQuery));
  }, [dispatch, reviewsQuery]);

  // Export handler
  const handleExport = () => {
    const headers = ["ID", "Product", "Customer", "Rating", "Comment", "Visibility", "Date"];
    const rows = displayedReviews.map(r => [
      r.id,
      r.productName,
      r.userName,
      r.rating,
      r.comment,
      r.isVisible ? "Visible" : "Hidden",
      new Date(r.createdAt).toLocaleDateString()
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
    link.setAttribute("download", `reviews_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [reviewCounts, setReviewCounts] = useState({
    total_reviews: 0,
    avg_rating: 0,
    visible: 0,
    hidden: 0,
  });

  useEffect(() => {
    let mounted = true;
    dashboardApi.fetchReviewsCount()
      .then((res: any) => {
        if (mounted) {
          setReviewCounts(res.data || res);
        }
      })
      .catch(() => { /* silent */ });
    return () => { mounted = false; };
  }, []);

  // Stats from reviewCounts or fallback to current data
  const totalReviewsCount = reviewCounts.total_reviews || totalCount;
  const avgRatingDisplay = reviewCounts.avg_rating > 0
    ? reviewCounts.avg_rating.toFixed(1)
    : (displayedReviews.length > 0
      ? (displayedReviews.reduce((sum, r) => sum + r.rating, 0) / displayedReviews.length).toFixed(1)
      : "0.0");
  const visibleCount = reviewCounts.visible || displayedReviews.filter((r) => r.isVisible).length;
  const hiddenCount = reviewCounts.hidden || (displayedReviews.length - visibleCount);

  return (
    <div className="min-h-screen w-full space-y-6 text-[#18181B] bg-[#FDFDFD]">
      {/* --- PAGE HEADER --- */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">Reviews</h1>
        <p className="text-[#71717A] text-sm mt-1">Monitor and moderate customer feedback.</p>
      </div>

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Total Reviews"
          value={`${totalReviewsCount}`}
          sub="All time"
          icon={<MessageSquare size={16} className="text-[#A1A1AA]" />}
        />
        <QuickStat
          label="Avg Rating"
          value={avgRatingDisplay}
          sub="Out of 5.0"
          icon={<Star size={16} className="text-amber-400" />}
        />
        <QuickStat
          label="Visible"
          value={`${visibleCount}`}
          sub="Shown to users"
          icon={<Eye size={16} className="text-emerald-500" />}
        />
        <QuickStat
          label="Hidden"
          value={`${hiddenCount}`}
          sub="Not visible"
          icon={<EyeOff size={16} className="text-slate-400" />}
        />
      </div>

      {/* --- TABLE CONTAINER --- */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-sm overflow-hidden">
        {/* TABLE TOOLBAR */}
        <div className="p-4 border-b border-[#EEEEEE] flex flex-col md:flex-row justify-between items-center gap-4 bg-white">

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${isFilterOpen
                ? "bg-black text-white border-black"
                : "bg-white text-black border-[#EEEEEE] hover:bg-gray-50"
                }`}
            >
              <Filter size={14} /> <span className="hidden sm:inline">{isFilterOpen ? "Hide Filters" : "Show Filters"}</span>
            </button>

            {/* Column Visibility Dropdown */}
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

        {/* Status/Error */}
        {status === "loading" && reviews.length === 0 && (
          <div className="p-6 text-sm text-[#71717A]">Loading reviews…</div>
        )}
        {status === "failed" && (
          <div className="p-6 text-sm text-rose-600">
            {error || "Failed to load reviews"}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#FAFAFA]">
              <tr className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">
                {isVisible("index") && <th className="px-5 py-4 w-12 text-center text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest border-b border-[#EEEEEE]">#</th>}
                {isVisible("product") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE]">Product</th>}
                {isVisible("customer") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE] hidden md:table-cell">Customer</th>}
                {isVisible("rating") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE]">Rating</th>}
                {isVisible("comment") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE] hidden lg:table-cell">Comment</th>}
                {isVisible("visibility") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE] hidden lg:table-cell">Visibility</th>}
                {isVisible("date") && <th className="px-5 py-4 text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE] hidden xl:table-cell">Created</th>}
                {isVisible("actions") && <th className="px-5 py-4 text-right text-xs font-bold text-[#A1A1AA] uppercase border-b border-[#EEEEEE]">Actions</th>}
              </tr>

              {isFilterOpen && (
                <tr className="bg-white border-b border-[#EEEEEE] animate-in fade-in slide-in-from-top-1 duration-200">
                  {isVisible("index") && (
                    <td className="px-5 py-3 text-center">
                      <ListFilter size={14} className="text-[#D4D4D8] mx-auto" />
                    </td>
                  )}
                  {isVisible("product") && (
                    <td className="px-5 py-3">
                      <div className="text-[10px] text-[#A1A1AA] italic">—</div>
                    </td>
                  )}
                  {isVisible("customer") && (
                    <td className="px-5 py-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={12} />
                        <input
                          type="text"
                          placeholder="Customer..."
                          value={customerFilter}
                          onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
                          className="w-full pl-7 pr-2 py-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                        />
                      </div>
                    </td>
                  )}
                  {isVisible("rating") && (
                    <td className="px-5 py-3">
                      <select
                        value={filterRating}
                        onChange={(e) => {
                          setFilterRating(
                            e.target.value === "All" ? "All" : Number(e.target.value)
                          );
                          setPage(1);
                        }}
                        className="w-full p-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none cursor-pointer focus:bg-white focus:border-[#EEEEEE]"
                      >
                        <option value="All">All Stars</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {"★".repeat(n)} {n}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  
                  {isVisible("comment") && (
                    <td className="px-5 py-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={12} />
                        <input
                          type="text"
                          placeholder="Comment..."
                          value={commentFilter}
                          onChange={(e) => { setCommentFilter(e.target.value); setPage(1); }}
                          className="w-full pl-7 pr-2 py-2 bg-[#F9F9F9] border border-transparent rounded-md text-[11px] outline-none focus:bg-white focus:border-[#EEEEEE]"
                        />
                      </div>
                    </td>
                  )}
                  
                  {isVisible("visibility") && (
                    <td className="px-5 py-3"><div className="text-[10px] text-[#A1A1AA] italic">—</div></td>
                  )}
                  {isVisible("date") && (
                    <td className="px-5 py-3"><div className="text-[10px] text-[#A1A1AA] italic">—</div></td>
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
              {status === "loading" && reviews.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-8 w-8 bg-gray-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : (
                displayedReviews.map((r, index) => (
                  <tr
                    key={r.id}
                    onClick={() => dispatch(reviewsActions.setSelectedReviewId(r.id))}
                    className="group hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                  >
                    {isVisible("index") && (
                      <td className="px-5 py-4 text-xs font-mono text-[#A1A1AA] text-center">
                        {(page - 1) * limit + index + 1}
                      </td>
                    )}

                    {isVisible("product") && (
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold truncate max-w-[120px] sm:max-w-[180px]">{r.productName}</p>
                        <p className="text-[10px] text-[#A1A1AA]">ID: {r.productId}</p>
                      </td>
                    )}

                    {isVisible("customer") && (
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-xs font-bold">{r.userName}</p>
                        <p className="text-[10px] text-[#A1A1AA]">ID: {r.userId}</p>
                      </td>
                    )}

                    {isVisible("rating") && (
                      <td className="px-5 py-4">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={
                                i < r.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-200"
                              }
                            />
                          ))}
                        </div>
                      </td>
                    )}

                    

                    {isVisible("comment") && (
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-xs text-[#52525B] truncate max-w-[150px] sm:max-w-[240px]">
                          {r.comment || <span className="italic text-[#A1A1AA]">No comment</span>}
                        </p>
                      </td>
                    )}

                    

                    {isVisible("visibility") && (
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <VisibilityBadge visible={r.isVisible} />
                      </td>
                    )}

                    {isVisible("date") && (
                      <td className="px-5 py-4 hidden xl:table-cell">
                        <p className="text-[11px] text-[#52525B] font-medium">
                          {new Date(r.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                    )}

                    {isVisible("actions") && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (togglingId) return;
                              try {
                                setTogglingId(r.id);
                                const res = await reviewsApi.toggleVisibility(r.id);
                                toast.show(res?.message || "Visibility toggled", "success");
                              } catch (err: any) {
                                toast.show(err?.response?.data?.detail || "Failed to toggle visibility", "error");
                              } finally {
                                setTogglingId(null);
                                refetchReviews();
                              }
                            }}
                            disabled={!!togglingId}
                             className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                             title={r.isVisible ? "Hide" : "Show"}
                           >
                             {togglingId === r.id ? (
                               <Loader2 size={16} className="animate-spin" />
                             ) : r.isVisible ? (
                               <EyeOff size={16} />
                             ) : (
                               <Eye size={16} />
                             )}
                           </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {status !== "loading" && displayedReviews.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <MessageSquare className="mx-auto text-[#D4D4D8]" size={32} />
              <p className="text-sm font-bold text-[#18181B]">No reviews found</p>
              <p className="text-xs text-[#A1A1AA]">Reviews will appear here when customers submit feedback.</p>
              <button
                onClick={handleReset}
                className="text-xs font-bold underline text-[#A1A1AA] hover:text-black"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* --- PAGINATION CONTROLS --- */}
        <div className="p-4 border-t border-[#EEEEEE] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-[#A1A1AA] font-medium">
              Showing {visibleStart}-{visibleEnd} of {totalCount} reviews
            </div>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
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

      {/* --- REVIEW DETAIL SLIDE-OVER --- */}
      {selectedReview && (
        <ReviewDetailPanel
          review={selectedReview}
          onRefetch={refetchReviews}
          onClose={() => dispatch(reviewsActions.setSelectedReviewId(null))}
        />
      )}
    </div>
  );
};

/* ── REVIEW DETAIL SLIDE-OVER ── */
const ReviewDetailPanel = ({
  review,
  onRefetch,
  onClose,
}: {
  review: Review;
  onRefetch: () => void;
  onClose: () => void;
}) => {
  const [response, setResponse] = useState(review.adminResponse ?? "");
  const [saving, setSaving] = useState(false);
  const [localVisible, setLocalVisible] = useState(review.isVisible);
  const toast = useToast();
  const dispatch = useDispatch();

  const handleSaveResponse = async () => {
    try {
      setSaving(true);
      const updated = await reviewsApi.setAdminResponse(review.id, response);
      const updatedAt = updated?.updated_at || new Date().toISOString();
      dispatch(reviewsActions.updateReviewResponse({ id: review.id, adminResponse: response || null, updatedAt }));
      toast.show("Response saved", "success");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Failed to save response", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      setSaving(true);
      const res = await reviewsApi.toggleVisibility(review.id);
      setLocalVisible((v) => !v);
      toast.show(res?.message || "Visibility toggled", "success");
      onRefetch();
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Failed to toggle visibility", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
  <>
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity"
      onClick={onClose}
    />
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-[60] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-[#EEEEEE] flex justify-between items-center bg-white sticky top-0">
        <div>
          <h2 className="text-lg font-black">Review Details</h2>
          <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
            Review #{review.id}
          </span>
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
        {/* Visibility + Rating */}
        <div className="flex items-center justify-between bg-[#FAFAFA] p-4 rounded-xl border border-[#EEEEEE]">
          <div>
            <p className="text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Visibility</p>
            <div className="flex items-center gap-2">
              <VisibilityBadge visible={localVisible} />
              <button
                onClick={handleToggle}
                disabled={saving}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border hover:bg-emerald-50 text-emerald-600 border-emerald-100 disabled:opacity-50"
                title={localVisible ? "Hide" : "Show"}
              >
                {localVisible ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Rating</p>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Product & Customer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Product</p>
            <Link
              to={`/admin/products/${review.productId}`}
              className="text-sm font-bold hover:text-cyan-600 transition-colors"
            >
              {review.productName}
            </Link>
            <p className="text-[10px] text-[#A1A1AA]">ID: {review.productId}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Customer</p>
            <Link
              to={`/admin/users/${review.userId}`}
              className="text-sm font-bold hover:text-cyan-600 transition-colors"
            >
              {review.userName}
            </Link>
            <p className="text-[10px] text-[#A1A1AA]">ID: {review.userId}</p>
          </div>
        </div>

        

        {/* Comment */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-3">
            Comment
          </h4>
          {review.comment ? (
            <div className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-xl p-4">
              <p className="text-sm leading-relaxed text-[#3F3F46]">{review.comment}</p>
            </div>
          ) : (
            <p className="text-sm text-[#A1A1AA] italic">No comment provided.</p>
          )}
        </div>

          {/* Images */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-3">
              Images
            </h4>
            {Array.isArray(review.images) && review.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {review.images.slice(0, 6).map((src, idx) => {
                  const normalizedSrc = normalizeReviewImage(src);
                  return (
                    <a
                      key={`${review.id}-image-${idx}`}
                      href={normalizedSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border border-[#EEEEEE] bg-[#FAFAFA]"
                      aria-label={`Open review image ${idx + 1}`}
                    >
                      <img
                        src={normalizedSrc}
                        alt={`Review ${review.id} image ${idx + 1}`}
                        className="h-28 w-full object-cover"
                      />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#A1A1AA] italic">No images uploaded.</p>
            )}
          </div>

        {/* Timestamps */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2 mb-3">
            Activity
          </h4>
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Created</p>
              <p className="text-sm font-bold">
                {new Date(review.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Response */}
      <div className="p-6 space-y-2">
        <p className="text-[10px] font-bold text-[#A1A1AA] uppercase">Admin Response</p>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="w-full p-3 bg-white border border-[#EEEEEE] rounded-xl outline-none focus:border-[#D4D4D8] min-h-[100px]"
          placeholder="Write a response to this review…"
        />
        <div className="flex justify-end">
           <button
             onClick={handleSaveResponse}
             disabled={saving}
             className="px-4 py-2 text-sm font-bold rounded-lg bg-black text-white disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {saving ? <Loader2 size={16} className="animate-spin" /> : null}
             {saving ? "Saving..." : "Save Response"}
           </button>
        </div>
      </div>
    </div>
  </>);
};

/* --- SUB-COMPONENTS --- */
const VisibilityBadge = ({ visible }: { visible: boolean }) => {
  const cls = visible
    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
    : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${cls}`}>
      {visible ? "Visible" : "Hidden"}
    </span>
  );
};

const QuickStat = ({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) => (
  <div className="p-5 bg-white border border-[#EEEEEE] rounded-2xl shadow-sm hover:border-[#D4D4D8] transition-colors">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{label}</p>
      {icon}
    </div>
    <h3 className="text-2xl font-bold mt-1 tracking-tight">{value}</h3>
    <p className="text-[11px] text-emerald-600 font-medium mt-1">{sub}</p>
  </div>
);

export default ReviewsManagement;
