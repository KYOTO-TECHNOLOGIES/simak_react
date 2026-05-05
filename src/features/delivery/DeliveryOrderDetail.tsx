import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Copy,
  Check,
} from "lucide-react";
import { deliveryApi, type DeliveryOrder } from "./deliveryApi";

// ─── Confirmation modal ───
function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl scale-in-center">
        <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">Wait a moment</h3>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gray-900 text-white text-xs font-black tracking-widest uppercase hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "PROCEED"}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 rounded-2xl border border-gray-100 text-xs font-black tracking-widest uppercase text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
          >
            NOT NOW
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Request Modal ───
function CancelRequestModal({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl scale-in-center">
        <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight tracking-tight">Request Cancellation</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Briefly explain why this delivery cannot be completed.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Customer unreachable or incorrect address"
          rows={3}
          className="w-full rounded-2xl bg-gray-50 border-0 px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none transition-all"
        />
        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={() => reason.trim() && onSubmit(reason.trim())}
            disabled={loading || !reason.trim()}
            className="w-full py-4 rounded-2xl bg-red-500 text-white text-xs font-black tracking-widest uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-100 disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "SUBMIT REQUEST"}
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl border border-gray-100 text-xs font-black tracking-widest uppercase text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
          >
            GO BACK
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Proof Upload Modal ───
function ProofModal({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sigName, setSigName] = useState("");
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!imageFile) return;
    const fd = new FormData();
    fd.append("status", "DELIVERED");
    fd.append("proof_image", imageFile);
    if (sigName.trim()) fd.append("signature_name", sigName.trim());
    if (notes.trim()) fd.append("proof_notes", notes.trim());
    onSubmit(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center overflow-y-auto max-h-[90vh] no-scrollbar">
        <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight tracking-tight">Confirm Delivery</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">Please capture a photo as proof of successful delivery.</p>

        {/* Image upload */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-48 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all duration-500 overflow-hidden group shadow-inner"
        >
          {preview ? (
            <img src={preview} alt="proof" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <>
              <div className="p-4 bg-white rounded-2xl shadow-sm text-gray-300 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-500">
                <ImageIcon size={32} />
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase">Tap to Capture</span>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

        <div className="mt-6 space-y-3">
          <input
            value={sigName}
            onChange={(e) => setSigName(e.target.value)}
            placeholder="RECIPIENT NAME (OPTIONAL)"
            className="w-full rounded-2xl bg-gray-50 border-0 px-4 py-4 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ADDITIONAL NOTES (OPTIONAL)"
            className="w-full rounded-2xl bg-gray-50 border-0 px-4 py-4 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={handleSubmit}
            disabled={loading || !imageFile}
            className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-xs font-black tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "COMPLETE DELIVERY"}
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl border border-gray-100 text-xs font-black tracking-widest uppercase text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
          >
            GO BACK
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
const DeliveryOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [showShipConfirm, setShowShipConfirm] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [copied, setCopied] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await deliveryApi.claimOrder(Number(id));
      showToast("success", "Order claimed successfully!");
      loadOrder();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || e?.message || "Failed to claim order");
    } finally {
      setActionLoading(false);
    }
  };

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryApi.getOrder(Number(id));
      setOrder(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleShip = async () => {
    setActionLoading(true);
    try {
      await deliveryApi.updateStatus(Number(id), { status: "SHIPPED", notes: "Picked up from warehouse" });
      showToast("success", "Order marked as Shipped");
      await loadOrder();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Failed to update status");
    } finally {
      setActionLoading(false);
      setShowShipConfirm(false);
    }
  };

  const handleProofSubmit = async (fd: FormData) => {
    setActionLoading(true);
    try {
      await deliveryApi.submitProof(Number(id), fd);
      showToast("success", "Order marked as Delivered!");
      await loadOrder();
    } catch (e: any) {
      const errs = e?.response?.data;
      const msg =
        errs?.proof_image?.[0] ||
        errs?.detail ||
        e?.message ||
        "Failed to submit proof";
      showToast("error", msg);
    } finally {
      setActionLoading(false);
      setShowProofModal(false);
    }
  };

  const handleCancelRequest = async (reason: string) => {
    setActionLoading(true);
    try {
      await deliveryApi.updateStatus(Number(id), { status: "CANCELLED", reason });
      showToast("success", "Cancellation request submitted for admin review.");
      await loadOrder();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Failed to submit cancellation request");
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Loading order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-red-600">{error || "Order not found"}</p>
        <button
          onClick={loadOrder}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const addr = order.shipping_address_details;
  const assignment = order.delivery_assignment && (order.delivery_assignment as any).id ? order.delivery_assignment : null;
  const cancelReq = order.delivery_cancel_request;
  const hasProof = !!order.delivery_proof;
  const canClaim = !assignment;
  const canShip = assignment && ["PAID", "PROCESSING"].includes(order.status) && (assignment as any).status !== "IN_TRANSIT";
  const canDeliver = order.status === "SHIPPED";
  const canRequestCancel =
    ["SHIPPED", "DELIVERED"].includes(order.status) &&
    cancelReq?.status !== "PENDING" &&
    order.status !== "CANCELLED";

  return (
    <>
      {/* Modals */}
      {showShipConfirm && (
        <ConfirmModal
          message={`Mark Order #${order.id} as Shipped?`}
          onConfirm={handleShip}
          onCancel={() => setShowShipConfirm(false)}
          loading={actionLoading}
        />
      )}
      {showProofModal && (
        <ProofModal
          onSubmit={handleProofSubmit}
          onClose={() => setShowProofModal(false)}
          loading={actionLoading}
        />
      )}
      {showCancelModal && (
        <CancelRequestModal
          onSubmit={handleCancelRequest}
          onClose={() => setShowCancelModal(false)}
          loading={actionLoading}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-4 w-full pb-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Toast */}
        {toast && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium ${toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
              }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Order header */}
        <div className="bg-white border border-gray-100 p-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">
                #{order.id}
              </h1>
              <p className="text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase mt-4">
                LOGistics / Order ID
              </p>
            </div>
            <span className="px-5 py-2 border-2 border-black text-[10px] font-black tracking-[0.2em] uppercase">
              {order.status}
            </span>
          </div>
          <div className="flex gap-12 border-t border-gray-100 pt-8">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Created</p>
              <p className="text-xs font-bold text-gray-900 uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Settlement</p>
              <p className="text-xs font-bold text-gray-900 uppercase">AED {order.total_amount}</p>
            </div>
            {order.preferred_delivery_date && (
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Scheduled Window</p>
                <p className="text-xs font-bold text-gray-900 uppercase">
                  {new Date(order.preferred_delivery_date).toLocaleDateString()}
                  {order.preferred_delivery_slot_details ? (
                    <> · {order.preferred_delivery_slot_details.start_time_display} - {order.preferred_delivery_slot_details.end_time_display}</>
                  ) : order.preferred_delivery_slot_name ? (
                    <> · {order.preferred_delivery_slot_name}</>
                  ) : null}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation status */}
        {cancelReq && (
          <div className={`p-10 border-l border-r border-b border-gray-100 ${
            cancelReq.status === "PENDING" ? "bg-amber-50" : 
            cancelReq.status === "APPROVED" ? "bg-rose-50" : "bg-gray-50"
          }`}>
            <div className="flex justify-between items-start mb-6">
              <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] ${
                cancelReq.status === "PENDING" ? "text-amber-600" : 
                cancelReq.status === "APPROVED" ? "text-rose-600" : "text-gray-400"
              }`}>
                Cancellation Task Phase / {cancelReq.status}
              </h2>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {new Date(cancelReq.requested_at).toLocaleDateString()}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason for Abort</p>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-tighter italic">"{cancelReq.reason}"</p>
              </div>

              {cancelReq.review_notes && (
                <div className="pt-4 border-t border-black/5">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">HQ Review Notes</p>
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-tighter">{cancelReq.review_notes}</p>
                </div>
              )}

              {cancelReq.status === "PENDING" && (
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest pt-2">
                  Waiting for HQ Authorization
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-r border-b border-gray-100">
          {/* Destination */}
          <div className="p-10 border-b border-gray-100 md:border-b-0 md:border-r">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">
              Ship-to Destination
            </h2>
            <p className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none mb-4">
              {addr.full_name}
            </p>
            <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase max-w-xs">
              {addr.street_address}, {addr.area}, {addr.city}, {addr.emirate}
            </p>
            {order.delivery_notes && (
              <div className="mt-6 p-4 bg-gray-50 border-l-2 border-black">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Entry Protocol / Notes</p>
                <p className="text-xs font-bold text-gray-900 leading-relaxed">{order.delivery_notes}</p>
              </div>
            )}
            <div className="mt-10 flex flex-col sm:flex-row gap-2">
              <a
                href={`tel:${addr.phone_number}`}
                className="flex-1 py-4 border border-black text-center text-[9px] font-black tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-all"
              >
                CALL CUSTOMER
              </a>
              <button
                onClick={() => handleCopy(addr.phone_number)}
                className="flex-1 py-4 border border-black text-center text-[9px] font-black tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "COPIED" : "COPY NUMBER"}
              </button>
            </div>
            {addr.latitude && (
              <div className="mt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-4 border border-black text-center text-[9px] font-black tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-all"
                >
                  MAP NAVIGATION
                </a>
              </div>
            )}
          </div>

          {/* Logistics Tracking */}
          <div className="p-10">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">
              Logistics Chain
            </h2>
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-50">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Phase</p>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-tighter">{assignment?.status.replace("_", " ") || "UNASSIGNED"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Time Assigned</p>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-tighter">{assignment ? new Date(assignment.assigned_at).toLocaleString() : "---"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border-l border-r border-b border-gray-100 p-10">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-10">
            Shipment Manifest
          </h2>
          <div className="space-y-10">
            {order.items?.map((item) => (
              <div key={item.id} className="space-y-4 group/item">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-base font-black text-gray-900 uppercase tracking-tighter mb-1">{item.product_name}</p>
                    <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase">
                      {item.unit_name ? `${item.unit_name} / ` : ""}AED {item.price}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900 uppercase">QTY {item.quantity}</p>
                    <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase">SUBTOTAL AED {item.subtotal}</p>
                  </div>
                </div>

                {/* Preparation Details */}
                {(item.preparation_details || item.preparation_instructions) && (
                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 space-y-3">
                    {item.preparation_details && (
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Spec:</span>
                        <span className="text-[10px] font-black uppercase text-gray-900">{item.preparation_details.name}</span>
                        {parseFloat(item.preparation_details.price) > 0 && (
                          <span className="text-[9px] font-bold text-emerald-600 ml-auto">+ AED {item.preparation_details.price}</span>
                        )}
                      </div>
                    )}
                    {item.preparation_instructions && (
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-100/50">
                        <div className="w-1 h-1 rounded-full bg-gray-300 mt-1.5" />
                        <div className="flex-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Chef Instructions:</span>
                          <p className="text-xs font-bold text-gray-900 leading-relaxed italic">"{item.preparation_instructions}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 pt-10 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-black tracking-[0.4em] uppercase">Order Value</span>
              <span className="text-sm font-black text-gray-900 uppercase">AED {(parseFloat(order.total_amount) - parseFloat(order.tip_amount)).toFixed(2)}</span>
            </div>
            
            {parseFloat(order.tip_amount) > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-black tracking-[0.4em] uppercase">Gratuity / Tip</span>
                <span className="text-sm font-black uppercase">+ AED {parseFloat(order.tip_amount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-[10px] font-black tracking-[0.4em] uppercase text-gray-900">Final Settlement</span>
              <span className="text-4xl font-black text-gray-900 tracking-tighter">AED {order.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Details (if exists) */}
        {cancelReq && (
          <div className="bg-red-50 border-l border-r border-b border-red-100 p-10">
            <h2 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-6">
              Cancellation Intelligence
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-1">Status</p>
                <p className="text-xl font-black text-red-900 uppercase tracking-tighter">
                  {cancelReq.status}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-1">Reason for Abort</p>
                  <p className="text-xs font-bold text-red-900 leading-relaxed italic">"{cancelReq.reason}"</p>
                </div>
                {cancelReq.review_notes && (
                  <div>
                    <p className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-1">HQ Review Notes</p>
                    <p className="text-xs font-bold text-red-900 leading-relaxed italic">"{cancelReq.review_notes}"</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-red-100">
                <div>
                  <p className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-1">Requested At</p>
                  <p className="text-[10px] font-bold text-red-900">{new Date(cancelReq.requested_at).toLocaleString()}</p>
                </div>
                {cancelReq.reviewed_at && (
                  <div>
                    <p className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-1">Reviewed At</p>
                    <p className="text-[10px] font-bold text-red-900">{new Date(cancelReq.reviewed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment, Timeline and Logistics */}
        <div className="bg-gray-50 border-l border-r border-b border-gray-100 p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Payment */}
          {order.payment && (
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">
                Settlement Method
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl">
                    <span className="text-xs font-black text-gray-900 uppercase">{order.payment.payment_method}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <p className={`text-xs font-black uppercase ${order.payment.status === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {order.payment.status}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Transaction ID</p>
                  <p className="text-[10px] font-bold text-gray-900 font-mono">{order.payment.transaction_id || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {order.status_history?.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">
                Order Timeline
              </h2>
              <div className="relative space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                {order.status_history.map((h, i) => (
                  <div key={i} className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-4 h-4 -translate-x-1.5 rounded-full bg-white border-2 border-gray-900" />
                    <div>
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{h.status}</p>
                      <p className="text-[9px] text-gray-400 font-bold mb-1">{new Date(h.created_at).toLocaleString()}</p>
                      {h.notes && <p className="text-[10px] text-gray-500 italic">"{h.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logistics */}
          {assignment && (
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">
                Logistics Intelligence
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Assigned</span>
                  <span className="text-[10px] font-bold text-gray-900">{new Date(assignment.assigned_at).toLocaleString()}</span>
                </div>
                {assignment.accepted_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Accepted</span>
                    <span className="text-[10px] font-bold text-gray-900">{new Date(assignment.accepted_at).toLocaleString()}</span>
                  </div>
                )}
                {assignment.delivered_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Completed</span>
                    <span className="text-[10px] font-bold text-gray-900">{new Date(assignment.delivered_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Proof of delivery */}
        {hasProof && (
          <div className="bg-black text-white p-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] mb-10 text-gray-500">
              Handover Authorization
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
              {order.delivery_proof!.proof_image && (
                <div className="border border-white/20 p-2">
                  <img
                    src={order.delivery_proof!.proof_image}
                    alt="delivery proof"
                    className="w-full grayscale hover:grayscale-0 transition-all duration-700"
                  />
                </div>
              )}
              <div className="pb-2">
                <p className="text-[9px] font-black tracking-[0.2em] text-gray-500 uppercase mb-2">Released To</p>
                <p className="text-3xl font-black tracking-tighter uppercase leading-none">{order.delivery_proof!.signature_name || "AUTHORIZED RECEIVER"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 py-10">
          {canClaim && (
            <button
              onClick={handleClaim}
              disabled={actionLoading}
              className="w-full py-5 bg-black text-white text-[10px] font-black tracking-[0.4em] uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
            >
              CLAIM ORDER
            </button>
          )}
          {canShip && (
            <button
              onClick={() => setShowShipConfirm(true)}
              disabled={actionLoading}
              className="w-full py-5 bg-black text-white text-[10px] font-black tracking-[0.4em] uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
            >
              INITIALIZE SHIPMENT
            </button>
          )}
          {canDeliver && (
            <button
              onClick={() => setShowProofModal(true)}
              disabled={actionLoading}
              className="w-full py-5 bg-black text-white text-[10px] font-black tracking-[0.4em] uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
            >
              ACKNOWLEDGE COMPLETION
            </button>
          )}
          {canRequestCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="w-full py-5 border border-gray-200 text-gray-300 text-[10px] font-black tracking-[0.4em] uppercase hover:border-red-500 hover:text-red-500 transition-all"
            >
              ABORT DELIVERY TASK
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default DeliveryOrderDetail;
