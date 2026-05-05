import React, { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Inbox,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Mail,
  Clock,
  ExternalLink,
} from "lucide-react";
import { ordersApi } from "../orders/ordersApi";
import { useNavigate } from "react-router-dom";

interface CancelRequest {
  id: number;
  order_id: number;
  order_status: string;
  requested_by_email: string;
  requested_by_phone: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  review_notes: string | null;
  reviewed_by_email: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

function ReviewModal({
  request,
  onDecide,
  onClose,
  loading,
}: {
  request: CancelRequest;
  onDecide: (decision: "approve" | "reject", notes: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 space-y-6 shadow-2xl">
        <div className="space-y-1 text-center">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Review Request</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order #{request.order_id}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Inbox size={10} /> Delivery Boy's Reason
          </p>
          <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{request.reason || "No reason provided"}"</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setDecision("approve")}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${
              decision === "approve"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-200/50"
                : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
            }`}
          >
            <CheckCircle2 size={20} className={decision === "approve" ? "text-emerald-600" : "text-slate-200"} />
            <span className="text-[11px] font-black uppercase tracking-wider">Approve</span>
          </button>
          <button
            onClick={() => setDecision("reject")}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${
              decision === "reject"
                ? "bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-200/50"
                : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
            }`}
          >
            <XCircle size={20} className={decision === "reject" ? "text-rose-600" : "text-slate-200"} />
            <span className="text-[11px] font-black uppercase tracking-wider">Reject</span>
          </button>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Notes</label>
           <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why are you making this decision?"
            rows={3}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-slate-200 transition-all resize-none placeholder:text-slate-300 placeholder:italic"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
          >
            Go Back
          </button>
          <button
            onClick={() => decision && onDecide(decision, notes)}
            disabled={loading || !decision}
            className="flex-[2] py-4 rounded-2xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Confirm Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

const AdminCancellationRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<CancelRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [tab, setTab] = useState<"PENDING" | "ALL">("PENDING");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.listCancellationRequests({
        status: tab === "PENDING" ? "PENDING" : undefined,
        ordering: "-requested_at",
      });
      setRequests(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const handleDecide = async (decision: "approve" | "reject", notes: string) => {
    if (!reviewTarget) return;
    setActionLoading(true);
    try {
      await ordersApi.reviewCancellationRequest(reviewTarget.order_id, decision, notes);
      showToast(
        "success",
        `Order #${reviewTarget.order_id} cancellation ${decision === "approve" ? "approved" : "rejected"}`
      );
      await load();
    } catch (e: any) {
      showToast("error", e?.response?.data?.error || e?.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading(false);
      setReviewTarget(null);
    }
  };

  const statusStyles: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <>
      {reviewTarget && (
        <ReviewModal
          request={reviewTarget}
          onDecide={handleDecide}
          onClose={() => setReviewTarget(null)}
          loading={actionLoading}
        />
      )}

      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cancellation Requests</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Manage driver return requests</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh List
          </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-24 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                : "bg-rose-50 border-rose-100 text-rose-900"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-rose-500" size={20} />}
            <span className="text-sm font-bold tracking-tight">{toast.msg}</span>
          </div>
        )}

        {/* Tabs UI */}
        <div className="flex p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/50">
          <button
            onClick={() => setTab("PENDING")}
            className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              tab === "PENDING" ? "bg-white shadow-xl shadow-black/5 text-black" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setTab("ALL")}
            className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              tab === "ALL" ? "bg-white shadow-xl shadow-black/5 text-black" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            History
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-300">
            <Loader2 size={48} className="animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Synchronizing Data</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm gap-4">
            <div className="p-4 bg-rose-50 rounded-full">
              <AlertCircle size={32} className="text-rose-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-800">Connection Interrupted</p>
              <p className="text-xs text-slate-400 max-w-xs">{error}</p>
            </div>
            <button onClick={load} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-black/10">
              <RefreshCw size={14} /> Retry Now
            </button>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm gap-4 text-slate-300">
            <div className="p-6 bg-slate-50 rounded-full">
               <Inbox size={48} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">{tab === "PENDING" ? "No Pending Requests" : "No Activity History"}</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req) => {
              const isExpanded = expanded === req.id;
              
              return (
                <div 
                  key={req.id} 
                  className={`group bg-white border-2 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-black/5 ${
                    isExpanded ? "border-black shadow-2xl shadow-black/5" : "border-slate-50"
                  }`}
                >
                  {/* Status Bar */}
                  <div className={`h-1.5 w-full rounded-t-full ${
                    req.status === 'PENDING' ? 'bg-amber-400' : 
                    req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg tracking-tight">Order #{req.order_id}</h3>
                          <button 
                            onClick={() => navigate(`/admin/orders/${req.order_id}`)}
                            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                            title="Go to order details"
                          >
                            <ExternalLink size={12} className="text-slate-400" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusStyles[req.status]}`}>
                            {req.status}
                          </span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase">Status</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested</p>
                        <p className="text-[11px] font-black text-slate-900">{new Date(req.requested_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                           <User size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{req.requested_by_email.split('@')[0]}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1"><Mail size={8} /> {req.requested_by_email}</span>
                          </div>
                        </div>
                      </div>

                      {req.requested_by_phone && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 px-1">
                          <Phone size={10} className="text-slate-300" />
                          {req.requested_by_phone}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Clock size={10} /> Reason
                       </p>
                       <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{req.reason}"</p>
                    </div>

                    {req.status === "PENDING" ? (
                      <button
                        onClick={() => setReviewTarget(req)}
                        className="w-full py-4 rounded-2xl bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 active:scale-95"
                      >
                        Review Request
                      </button>
                    ) : (
                      <div className="space-y-3">
                         {req.review_notes && (
                           <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Feedback</p>
                             <p className="text-xs text-slate-600 leading-relaxed">{req.review_notes}</p>
                           </div>
                         )}
                         <div className="flex flex-col items-center justify-between px-2 gap-2">
                             <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Reviewed By</span>
                                <span className="text-[10px] font-black text-slate-900">{req.reviewed_by_email?.split('@')[0] || "System"}</span>
                             </div>
                             {req.reviewed_at && (
                               <div className="flex items-center justify-between w-full">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Reviewed At</span>
                                  <span className="text-[10px] font-black text-slate-900">{new Date(req.reviewed_at).toLocaleString()}</span>
                               </div>
                             )}
                          </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminCancellationRequests;
