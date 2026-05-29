import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Download, Package, MessageSquare, Send, Navigation, Truck, UserCheck, Loader2 } from "lucide-react";
import { ordersApi, type DeliverySlotDto } from "./ordersApi";
import { paymentsApi } from "../payments/paymentsApi";
import type { OrderStatus, PaymentStatus } from "./ordersSlice";
import { useDispatch } from "react-redux";
import { ordersActions } from "./ordersSlice";
import { deliveryApi } from "../../delivery/deliveryApi";
import type { DeliveryBoyUser, DeliveryAssignment, DeliveryCancelRequest } from "../../delivery/deliveryApi";
import { useToast } from "../../../components/ui/Toast";
import { normalizeDisplayPaymentMethod } from "../../../utils/payment";
import { getApiErrorMessage } from "../../../utils/apiError";

type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  preparationSpecificationName?: string | null;
  preparationExtraPrice?: number;
  preparationInstructions?: string | null;
  totalWithPreparation?: number;
  productUnitDisplay?: string | null;
};

type ShippingAddress = {
  id: string;
  label: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  area: string;
  city: string;
  emirate: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
};

type Payment = {
  id?: number | string;
  transactionId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  receiptNumber: string | null;
  createdAt: string;
} | null;

type StatusHistoryEntry = {
  status: string;
  notes: string;
  createdAt: string;
};

type Order = {
  id: number;
  orderNumber: string;
  userId?: string | number | null;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  total: number;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  deliveryCharge: number;
  tipAmount: number;
  deliveryDate: string | null;
  deliverySlot: string | number | null;
  deliverySlotDetails: string | null;
  deliveryNotes: string | null;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
  payment: Payment;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  deliveryAssignment?: DeliveryAssignment | null;
  deliveryProof?: {
    id: number;
    proofImage: string;
    signatureName: string | null;
    notes: string | null;
    createdAt: string;
  } | null;
  cancellationRequest?: DeliveryCancelRequest | null;
};

function normalizeOrderStatus(raw: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: "PENDING",
    paid: "PAID",
    processing: "PROCESSING",
    shipped: "SHIPPED",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
  };
  return map[raw?.toLowerCase?.()] ?? "PENDING";
}

function normalizePaymentStatus(raw: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    paid: "Paid",
    success: "Success",
    pending: "Pending",
    refunded: "Refunded",
    failed: "Failed",
  };
  return map[raw?.toLowerCase?.()] ?? "Pending";
}

function formatPreferredDeliverySlotDetails(slot?: DeliverySlotDto | null): string | null {
  if (!slot) return null;

  const name = slot.name?.trim();
  const start = slot.start_time_display?.trim();
  const end = slot.end_time_display?.trim();

  if (start && end && name) return `${start} - ${end} (${name})`;
  if (start && end) return `${start} - ${end}`;
  if (name) return name;
  return null;
}

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

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false); const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoyUser[]>([]);
  const [deliveryBoysError, setDeliveryBoysError] = useState<string | null>(null);
  const [selectedBoyId, setSelectedBoyId] = useState<number | "">("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const raw = await ordersApi.details(Number(id));
        const addr = raw.shipping_address_details;
        const shippingAddress: ShippingAddress = addr
          ? {
            id: addr.id,
            label: addr.label ?? "",
            fullName: addr.full_name ?? "",
            phoneNumber: addr.phone_number ?? "",
            streetAddress: addr.street_address ?? "",
            area: addr.area ?? "",
            city: addr.city ?? "",
            emirate: addr.emirate ?? "",
            country: addr.country ?? "",
            latitude: addr.latitude ?? null,
            longitude: addr.longitude ?? null,
          }
          : {
            id: "",
            label: "",
            fullName: "",
            phoneNumber: "",
            streetAddress: "",
            area: "",
            city: "",
            emirate: "",
            country: "",
            latitude: null,
            longitude: null,
          };
        const payment: Payment =
          raw.payment
            ? {
              id: (raw.payment as any).id || (raw.payment as any).payment_id || raw.payment.transaction_id,
              transactionId: raw.payment.transaction_id ?? "",
              amount: parseFloat(raw.payment.amount) || 0,
              status: raw.payment.status ?? "",
              paymentMethod: normalizeDisplayPaymentMethod(raw.payment.payment_method),
              receiptNumber: raw.payment.receipt?.receipt_number ?? null,
              createdAt: raw.payment.created_at ?? "",
            }
            : null;
        const statusHistory: StatusHistoryEntry[] = Array.isArray(raw.status_history)
          ? raw.status_history.map((h) => ({
            status: h.status ?? "",
            notes: h.notes ?? "",
            createdAt: h.created_at ?? "",
          }))
          : [];
        let uid: any = (addr as any)?.user ?? null;
        if (uid && typeof uid === "object") uid = uid.id ?? null;
        const shaped: Order = {
          id: raw.id,
          orderNumber: `ORD-${raw.id}`,
          userId: uid ?? null,
          status: normalizeOrderStatus(raw.status ?? "pending"),
          shippingAddress,
          total: parseFloat(raw.total_amount) || 0,
          subtotal: Array.isArray(raw.items)
            ? raw.items.reduce((s: number, i: any) => s + (parseFloat(i.subtotal) || 0), 0)
            : 0,
          discountAmount: parseFloat(raw.discount_amount ?? "0") || 0,
          couponCode: raw.coupon_code ?? null,
          deliveryCharge: parseFloat(raw.delivery_charge ?? "0") || 0,
          tipAmount: parseFloat(raw.tip_amount ?? "0") || 0,
          deliveryDate: raw.preferred_delivery_date ?? null,
          deliverySlot: raw.preferred_delivery_slot ?? null,
          deliverySlotDetails: formatPreferredDeliverySlotDetails(raw.preferred_delivery_slot_details ?? null),
          deliveryNotes: raw.delivery_notes ?? null,
          items: Array.isArray(raw.items)
            ? raw.items.map((dto) => ({
              id: dto.id,
              productId: dto.product,
              productName: dto.product_name ?? `Product #${dto.product}`,
              productImage: dto.product_image ?? null,
              quantity: dto.quantity,
              price: parseFloat(dto.price) || 0,
              subtotal: parseFloat(dto.subtotal) || 0,
              preparationSpecificationName: dto.preparation_specification_name ?? null,
              preparationExtraPrice: parseFloat(dto.preparation_extra_price || "") || 0,
              preparationInstructions: dto.preparation_instructions ?? null,
              totalWithPreparation: parseFloat(dto.total_with_preparation || "") || 0,
              productUnitDisplay: (dto as any).unit_name || (dto as any).product_unit_display || null,
            }))
            : [],
          statusHistory,
          payment,
          paymentStatus: payment ? normalizePaymentStatus(payment.status) : "Pending",
          paymentMethod: payment?.paymentMethod ?? "N/A",
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
        deliveryAssignment: raw.delivery_assignment ? {
          ...raw.delivery_assignment,
          status: raw.delivery_assignment.status as any
        } : null,
          deliveryProof: raw.delivery_proof
            ? {
                id: raw.delivery_proof.id,
                proofImage: raw.delivery_proof.proof_image,
                signatureName: raw.delivery_proof.signature_name,
                notes: raw.delivery_proof.notes,
                createdAt: raw.delivery_proof.created_at,
              }
            : null,
          cancellationRequest: raw.delivery_cancel_request ?? (raw as any).cancellation_request ?? null,
        };
        if (active) setOrder(shaped);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load order");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetch();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    deliveryApi.adminListDeliveryBoys()
      .then((boys) => { setDeliveryBoys(boys); setDeliveryBoysError(null); })
      .catch((e: unknown) => setDeliveryBoysError(getApiErrorMessage(e, "Failed to load delivery boys")));
  }, []);

  const handleAssign = async () => {
    if (!order || !selectedBoyId) return;
    setAssigning(true);
    setAssignMsg(null);
    try {
      await deliveryApi.adminAssignDeliveryBoy(order.id, Number(selectedBoyId));
      
      // Re-fetch everything because assigning can change status
      const raw = await ordersApi.details(order.id);
      
      // Reuse the normalization and mapping logic
      const addr = raw.shipping_address_details;
      const shippingAddress: ShippingAddress = addr ? {
        id: addr.id,
        label: addr.label ?? "",
        fullName: addr.full_name ?? "",
        phoneNumber: addr.phone_number ?? "",
        streetAddress: addr.street_address ?? "",
        area: addr.area ?? "",
        city: addr.city ?? "",
        emirate: addr.emirate ?? "",
        country: addr.country ?? "",
        latitude: addr.latitude ?? null,
        longitude: addr.longitude ?? null,
      } : { id: "", label: "", fullName: "", phoneNumber: "", streetAddress: "", area: "", city: "", emirate: "", country: "", latitude: null, longitude: null };

      const payment: Payment = raw.payment ? {
        id: (raw.payment as any).id || (raw.payment as any).payment_id || raw.payment.transaction_id,
        transactionId: raw.payment.transaction_id ?? "",
        amount: parseFloat(raw.payment.amount) || 0,
        status: raw.payment.status ?? "",
        paymentMethod: normalizeDisplayPaymentMethod(raw.payment.payment_method),
        receiptNumber: raw.payment.receipt?.receipt_number ?? null,
        createdAt: raw.payment.created_at ?? "",
      } : null;

      const shaped: Order = {
        ...order,
        status: normalizeOrderStatus(raw.status ?? "pending"),
        shippingAddress,
        payment,
        paymentStatus: payment ? normalizePaymentStatus(payment.status) : "Pending",
        deliveryAssignment: raw.delivery_assignment ? {
          ...raw.delivery_assignment,
          status: raw.delivery_assignment.status as any
        } : null,
        deliveryProof: raw.delivery_proof
            ? {
                id: raw.delivery_proof.id,
                proofImage: raw.delivery_proof.proof_image,
                signatureName: raw.delivery_proof.signature_name,
                notes: raw.delivery_proof.notes,
                createdAt: raw.delivery_proof.created_at,
              }
            : null,
        cancellationRequest: raw.delivery_cancel_request ?? (raw as any).cancellation_request ?? null,
        updatedAt: raw.updated_at,
      };

      setOrder(shaped);
      toast.show(`Assigned to ${shaped.deliveryAssignment?.delivery_boy_name || "delivery boy"}`, "success");
      setAssignMsg({ type: "ok", text: "Delivery boy assigned successfully." });
    } catch (e: unknown) {
      setAssignMsg({ type: "err", text: getApiErrorMessage(e, "Assignment failed.") });
    } finally {
      setAssigning(false);
    }
  };

  const canDownloadReceipt = useMemo(
    () => order && (order.paymentStatus === "Paid" || order.paymentStatus === "Success"),
    [order]
  );

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!order) return;
    const blob = await ordersApi.receiptPdf(order.id);
    downloadBlob(blob, `receipt_${order.orderNumber}.pdf`);
  }, [order]);



  const handleDownloadAdminReceipt = useCallback(async () => {
    if (!order) return;
    const blob = await ordersApi.adminReceiptPdf(order.id);
    downloadBlob(blob, `delivery_details_${order.orderNumber}.pdf`);
  }, [order]);

  const handleViewPayment = useCallback(async () => {
    if (!order) return;
    // 1. Try existing ID (ensure it's a numeric DB ID, not a UUID transaction ID)
    if (order.payment?.id && !isNaN(Number(order.payment.id))) {
      navigate(`/admin/payments/${order.payment.id}`);
      return;
    }
    // 2. Try to search by order ID
    try {
      const searchRes = await paymentsApi.list({ order_id: order.id, limit: 1 });
      if (searchRes.results.length > 0) {
        navigate(`/admin/payments/${searchRes.results[0].payment_id || searchRes.results[0].id}`);
      } else {
        alert("Payment record not found for this order.");
      }
    } catch (e) {
      console.error("Failed to find payment:", e);
      alert("Error locating payment record.");
    }
  }, [order, navigate]);

  const statusOptions: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div className="min-h-screen w-full text-[#18181B] bg-[#FDFDFD]">
      <div className="  mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/orders")}
              className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-gray-50 transition-colors"
              title="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-900 text-white rounded-xl">
                <Package size={18} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black">{order ? order.orderNumber : "Order"}</h2>
                <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
                  Order Details
                </span>
              </div>
            </div>
          </div>
          {order && (
            <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-white border border-[#EEEEEE] rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                  title="Print Delivery Slip"
                >
                  <Package size={14} /> <span className="hidden sm:inline">Print Slip</span>
                </button>
                <button
                  onClick={handleDownloadAdminReceipt}
                  className="p-2 bg-white border border-[#EEEEEE] rounded-lg text-xs font-bold hover:bg-gray-50"
                  title="Delivery details PDF"
                >
                  <Download size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {canDownloadReceipt && (
                  <>
                    <button
                      onClick={handleDownloadPdf}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800"
                      title="Payment receipt PDF"
                    >
                      <Download size={14} /> <span className="sm:hidden lg:inline">Receipt (PDF)</span>
                    </button>

                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {loading && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl">Loading…</div>}
        {error && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl text-rose-600">{error}</div>}
        {order && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 space-y-6">
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
                    Update Status <ChevronLeft size={14} className={`transition-transform rotate-90 ${isStatusOpen ? '-rotate-90' : ''}`} />
                  </button>
                </div>
                {isStatusOpen && (
                  <div className="border-t border-[#EEEEEE] pt-4 space-y-3">
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
                        placeholder="e.g. Handed over to courier, Customer requested reschedule..."
                        rows={2}
                        className="w-full p-3 bg-white border border-[#EEEEEE] rounded-lg text-xs outline-none resize-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-all placeholder:text-gray-300"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!selectedStatus) return;
                        setIsUpdating(true);
                        try {
                          await ordersApi.updateStatus(order.id, selectedStatus, statusNotes.trim() || undefined);
                          const raw = await ordersApi.details(order.id);
                          const addr = raw.shipping_address_details;
                          const shippingAddress: ShippingAddress = addr
                            ? {
                              id: addr.id,
                              label: addr.label ?? "",
                              fullName: addr.full_name ?? "",
                              phoneNumber: addr.phone_number ?? "",
                              streetAddress: addr.street_address ?? "",
                              area: addr.area ?? "",
                              city: addr.city ?? "",
                              emirate: addr.emirate ?? "",
                              country: addr.country ?? "",
                              latitude: addr.latitude ?? null,
                              longitude: addr.longitude ?? null,
                            }
                            : {
                              id: "",
                              label: "",
                              fullName: "",
                              phoneNumber: "",
                              streetAddress: "",
                              area: "",
                              city: "",
                              emirate: "",
                              country: "",
                              latitude: null,
                              longitude: null,
                            };
                          const payment: Payment =
                            raw.payment
                              ? {
                                transactionId: raw.payment.transaction_id ?? "",
                                amount: parseFloat(raw.payment.amount) || 0,
                                status: raw.payment.status ?? "",
                                paymentMethod: normalizeDisplayPaymentMethod(raw.payment.payment_method),
                                receiptNumber: raw.payment.receipt?.receipt_number ?? null,
                                createdAt: raw.payment.created_at ?? "",
                              }
                              : null;
                          const statusHistory: StatusHistoryEntry[] = Array.isArray(raw.status_history)
                            ? raw.status_history.map((h: any) => ({
                              status: h.status ?? "",
                              notes: h.notes ?? "",
                              createdAt: h.created_at ?? "",
                            }))
                            : [];
                          let uid: any = (addr as any)?.user ?? null;
                          if (uid && typeof uid === "object") uid = uid.id ?? null;
                          const shaped: Order = {
                            id: raw.id,
                            orderNumber: `ORD-${raw.id}`,
                            userId: uid ?? null,
                            status: normalizeOrderStatus(raw.status ?? "pending"),
                            shippingAddress,
                            total: parseFloat(raw.total_amount) || 0,
                            subtotal: Array.isArray(raw.items)
                              ? raw.items.reduce((s: number, i: any) => s + (parseFloat(i.subtotal) || 0), 0)
                              : 0,
                            discountAmount: parseFloat(raw.discount_amount ?? "0") || 0,
                            couponCode: raw.coupon_code ?? null,
                            deliveryCharge: parseFloat(raw.delivery_charge ?? "0") || 0,
                            tipAmount: parseFloat(raw.tip_amount ?? "0") || 0,
                            deliveryDate: raw.preferred_delivery_date ?? null,
                            deliverySlot: raw.preferred_delivery_slot ?? null,
                            deliverySlotDetails: formatPreferredDeliverySlotDetails(raw.preferred_delivery_slot_details ?? null),
                            deliveryNotes: raw.delivery_notes ?? null,
                            items: Array.isArray(raw.items)
                              ? raw.items.map((dto: any) => ({
                                id: dto.id,
                                productId: dto.product,
                                productName: dto.product_name ?? `Product #${dto.product}`,
                                productImage: dto.product_image ?? null,
                                quantity: dto.quantity,
                                price: parseFloat(dto.price) || 0,
                                subtotal: parseFloat(dto.subtotal) || 0,
                                preparationSpecificationName: dto.preparation_specification_name ?? null,
                                preparationExtraPrice: parseFloat(dto.preparation_extra_price || "") || 0,
                                preparationInstructions: dto.preparation_instructions ?? null,
                                totalWithPreparation: parseFloat(dto.total_with_preparation || "") || 0,
                                productUnitDisplay: dto.product_unit_display ?? null,
                              }))
                              : [],
                            statusHistory,
                            payment,
                            paymentStatus: payment ? normalizePaymentStatus(payment.status) : "Pending",
                            paymentMethod: payment?.paymentMethod ?? "N/A",
                            createdAt: raw.created_at,
                            updatedAt: raw.updated_at,
                            deliveryAssignment: raw.delivery_assignment ? {
                              ...raw.delivery_assignment,
                              status: raw.delivery_assignment.status as any
                            } : null,
                            deliveryProof: raw.delivery_proof
                              ? {
                                id: raw.delivery_proof.id,
                                proofImage: raw.delivery_proof.proof_image,
                                signatureName: raw.delivery_proof.signature_name,
                                notes: raw.delivery_proof.notes,
                                createdAt: raw.delivery_proof.created_at,
                              }
                              : null,
                            cancellationRequest: raw.delivery_cancel_request ?? (raw as any).cancellation_request ?? null,
                          };
                          setOrder(shaped);
                          dispatch(ordersActions.updateStatusSuccess(shaped));
                          setIsStatusOpen(false);
                          setSelectedStatus("");
                          setStatusNotes("");
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={!selectedStatus || isUpdating}
                      className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      {isUpdating ? 'Updating...' : selectedStatus ? `Update to "${selectedStatus}"` : 'Select a status above'}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-b border-[#EEEEEE] pb-2">
                  Purchased Items
                </h4>
                {order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start py-4 border-b border-dashed border-[#EEEEEE] last:border-0">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => navigate(`/admin/products/${item.productId}`)}
                          className="w-14 h-14 rounded-lg overflow-hidden bg-[#F4F4F5] flex items-center justify-center shrink-0 hover:ring-2 hover:ring-black/10 transition-all mt-1"
                          title="Open product"
                        >
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} className="text-[#A1A1AA]" />
                          )}
                        </button>
                        <div>
                          <p className="text-sm font-black">
                            <button
                              onClick={() => navigate(`/admin/products/${item.productId}`)}
                              className="hover:underline"
                              title="Open Product"
                            >
                              {item.productName || "Unknown Product"}
                            </button>
                          </p>
                          <p className="text-[11px] text-[#71717A] font-medium mt-0.5">
                            Qty: <span className="text-black font-bold">{item.quantity || 0} {item.productUnitDisplay === '100g' ? 'x 100g' : (item.productUnitDisplay || "")}</span> · AED {(item.price || 0).toFixed(2)}/{item.productUnitDisplay || "ea"}
                          </p>
                          {item.preparationSpecificationName && (
                            <div className="mt-2 p-2.5 bg-cyan-50/50 border border-cyan-100 rounded-xl max-w-sm">
                                <p className="text-[11px] font-bold text-cyan-900 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                  Prep: <span className="font-black underline decoration-cyan-200">{item.preparationSpecificationName}</span>
                                  {item.preparationExtraPrice && item.preparationExtraPrice > 0 ? ` (+AED ${item.preparationExtraPrice.toFixed(2)})` : ""}
                                </p>
                                {item.preparationInstructions && (
                                  <p className="text-[10px] text-cyan-700/70 mt-1 italic leading-relaxed">
                                    Note: {item.preparationInstructions}
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {item.preparationSpecificationName && item.preparationExtraPrice && item.preparationExtraPrice > 0 ? (
                            <>
                                <p className="text-sm font-black text-black">AED {(item.totalWithPreparation || item.subtotal).toFixed(2)}</p>
                                <p className="text-[10px] text-gray-400 font-medium">incl. prep</p>
                            </>
                        ) : (
                            <p className="text-sm font-black text-black">AED {(item.subtotal || 0).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#A1A1AA] italic">No items in this order.</p>
                )}
                <div className="pt-4 space-y-2 border-t border-[#EEEEEE]">
                  <div className="flex justify-between items-center text-xs text-[#A1A1AA]">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#18181B]">AED {order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.deliveryCharge > 0 && (
                    <div className="flex justify-between items-center text-xs text-[#A1A1AA]">
                      <span>Delivery Charge</span>
                      <span className="font-bold text-[#18181B]">AED {order.deliveryCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600">
                      <div className="flex flex-col">
                        <span>Discount</span>
                        {order.couponCode && (
                          <span className="text-[9px] font-mono uppercase tracking-wide opacity-75">Code: {order.couponCode}</span>
                        )}
                      </div>
                      <span className="font-bold">− AED {order.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.tipAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-[#A1A1AA]">
                      <span>Tip</span>
                      <span className="font-bold text-[#18181B]">AED {order.tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#EEEEEE]">
                    <span className="text-sm font-bold">Total Amount</span>
                    <span className="text-xl font-black text-emerald-600">
                      AED {(order.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {order.deliveryNotes && (
                <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-2">Delivery Notes</h4>
                  <p className="text-xs text-[#52525B] bg-[#FAFAFA] p-3 rounded-lg border border-[#EEEEEE]">
                    {order.deliveryNotes}
                  </p>
                </div>
              )}

              {order.statusHistory.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-3 border-b border-[#EEEEEE] pb-2">
                    Status History
                  </h4>
                  <div className="space-y-3">
                    {order.statusHistory.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-[#A1A1AA] shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-[#18181B]">{entry.status}</p>
                          <p className="text-[10px] text-[#A1A1AA]">
                            {entry.notes} ·{" "}
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoField label="Customer">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{order.shippingAddress.fullName || "—"}</span>
                    {order.userId && (
                      <button
                        onClick={() => { navigate(`/admin/users/${order.userId}`); }}
                        className="text-[10px] font-bold px-2 py-1 rounded-full border border-[#EEEEEE] hover:bg-gray-50"
                        title="Open user details"
                      >
                        View User
                      </button>
                    )}
                  </div>
                </InfoField>
                <InfoField label="Phone" value={order.shippingAddress.phoneNumber || "—"} />
                <InfoField label="City" value={order.shippingAddress.city || "—"} />
                <InfoField label="Area" value={order.shippingAddress.area || "—"} />
                <InfoField label="Address" value={order.shippingAddress.streetAddress || "—"} />
                <InfoField label="Emirate" value={order.shippingAddress.emirate || "—"} />
                <InfoField label="Payment Method" value={order.paymentMethod} />
                <InfoField label="Payment">
                  <div className="flex items-center gap-2">
                    <PaymentBadge status={order.paymentStatus} />
                    <button
                      onClick={handleViewPayment}
                      className="text-[10px] font-bold px-2 py-1 rounded-full border border-[#EEEEEE] hover:bg-black hover:text-white transition-colors"
                      title="View detailed payment record"
                    >
                      View Details
                    </button>
                  </div>
                </InfoField>
                <InfoField
                  label="Order Date"
                  value={new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
                {order.deliveryDate && (
                  <InfoField
                    label="Delivery Date"
                    value={new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                )}
                {order.deliverySlotDetails && <InfoField label="Preferred Delivery Slot" value={order.deliverySlotDetails} />}
                {order.payment?.transactionId && (
                  <InfoField label="Transaction ID">
                    <button
                      onClick={handleViewPayment}
                      className="text-sm font-bold text-blue-600 hover:underline text-left transition-all"
                      title="View Payment Details"
                    >
                      {order.payment.transactionId}
                    </button>
                  </InfoField>
                )}
                {order.shippingAddress.latitude && order.shippingAddress.longitude && (
                  <InfoField label="Location">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.shippingAddress.latitude},${order.shippingAddress.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Navigation size={12} /> Get Directions
                    </a>
                  </InfoField>
                )}
              </div>

              {/* Assign Delivery Boy */}
              <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#EEEEEE] pb-2">
                  <Truck size={14} className="text-[#A1A1AA]" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                    Delivery Assignment
                  </h4>
                </div>

                {/* Current assignment */}
                {order.deliveryAssignment ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-start gap-3">
                        <UserCheck size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-indigo-700">{order.deliveryAssignment.delivery_boy_name}</p>
                          <p className="text-[10px] text-indigo-500 mt-0.5">
                            Status: <span className="font-bold">{order.deliveryAssignment.status}</span>
                            {order.deliveryAssignment.assigned_at && (
                              <> · assigned {new Date(order.deliveryAssignment.assigned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/delivery/boys/${order.deliveryAssignment?.delivery_boy}`)}
                        className="text-[10px] font-bold px-2 py-1 rounded-full border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="View delivery boy profile"
                      >
                        View Profile
                      </button>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-3 px-1">
                      {order.deliveryAssignment.accepted_at && (
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-[#A1A1AA] uppercase">Accepted At</p>
                          <p className="text-[10px] font-medium">{new Date(order.deliveryAssignment.accepted_at).toLocaleString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      )}
                      {order.deliveryAssignment.delivered_at && (
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-[#A1A1AA] uppercase">Delivered At</p>
                          <p className="text-[10px] font-medium">{new Date(order.deliveryAssignment.delivered_at).toLocaleString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      )}
                    </div>

                    {/* Delivery Proof */}
                    {order.deliveryProof && (
                      <div className="mt-4 p-3 border border-[#EEEEEE] rounded-xl bg-slate-50 space-y-3">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Proof of Delivery</h5>
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-white border border-[#EEEEEE] relative group">
                          <img 
                            src={order.deliveryProof.proofImage} 
                            alt="Delivery Proof" 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                            onClick={() => window.open(order.deliveryProof?.proofImage, '_blank')}
                          />
                          <a 
                            href={order.deliveryProof.proofImage} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                          >
                            Open Original Image
                          </a>
                        </div>
                        {order.deliveryProof.signatureName && (
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] text-gray-400">Recipient Signature</span>
                            <span className="text-[11px] font-black">{order.deliveryProof.signatureName}</span>
                          </div>
                        )}
                        {order.deliveryProof.notes && (
                          <div className="px-1 pt-1 border-t border-slate-200">
                            <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Delivery Notes</p>
                            <p className="text-[10px] text-gray-600 italic">"{order.deliveryProof.notes}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#A1A1AA] italic">No delivery boy assigned yet.</p>
                )}

                {/* Cancellation request banner */}
                {order.cancellationRequest && (
                  <div className={`p-4 rounded-2xl border text-xs font-medium space-y-2 ${order.cancellationRequest.status === "PENDING"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : order.cancellationRequest.status === "APPROVED"
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}>
                    <div className="flex justify-between items-start">
                      <p className="font-black uppercase tracking-tight">
                        Cancellation {order.cancellationRequest.status}
                      </p>
                      <span className="text-[9px] opacity-60">
                        REQ: {new Date(order.cancellationRequest.requested_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="bg-white/50 rounded-xl p-2 border border-black/5">
                      <p className="text-[10px] font-bold opacity-60 uppercase mb-1 text-black/40">Reason</p>
                      <p className="text-[11px] leading-relaxed italic">"{order.cancellationRequest.reason}"</p>
                    </div>

                    {order.cancellationRequest.review_notes && (
                      <div className="bg-white/30 rounded-xl p-2 border border-black/5">
                        <p className="text-[10px] font-bold opacity-60 uppercase mb-1 text-black/40">Admin Review Notes</p>
                        <p className="text-[11px] leading-relaxed">{order.cancellationRequest.review_notes}</p>
                        {order.cancellationRequest.reviewed_at && (
                          <p className="text-[9px] mt-2 opacity-50 font-bold">
                            Reviewed on {new Date(order.cancellationRequest.reviewed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => navigate("/admin/delivery/cancellations")}
                        className="px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        View in Cancellations
                      </button>
                    </div>
                  </div>
                )}

                {/* Assign / Reassign - Only show if not delivered */}
                {order.status !== "DELIVERED" && (
                  <div className="space-y-2 pt-2 border-t border-[#EEEEEE]">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wide block">
                      {order.deliveryAssignment ? "Change delivery boy" : "Assign delivery boy"}
                    </label>
                    <select
                      value={selectedBoyId}
                      onChange={(e) => setSelectedBoyId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs border border-[#EEEEEE] rounded-lg px-3 py-2 bg-white outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-100"
                    >
                      <option value="">— Select a delivery boy —</option>
                      {deliveryBoys.map((boy) => (
                        <option key={boy.id} value={boy.id}>
                          {boy.full_name || `${boy.first_name} ${boy.last_name}`.trim()} {boy.delivery_profile?.assigned_emirates_display?.length ? `(${boy.delivery_profile.assigned_emirates_display.join(", ")})` : ""}
                        </option>
                      ))}
                    </select>
                    {deliveryBoysError && (
                      <p className="text-[11px] text-rose-600 font-medium">{deliveryBoysError}</p>
                    )}
                    <button
                      onClick={handleAssign}
                      disabled={!selectedBoyId || assigning}
                      className="w-full py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {assigning ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                      {assigning ? "Assigning…" : order.deliveryAssignment ? "Change Boy" : "Assign"}
                    </button>
                    {assignMsg && (
                      <p className={`text-[11px] font-medium ${assignMsg.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                        {assignMsg.text}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Print Content */}
      {order && (
        <div className="print-area">
          <DeliverySlip order={order} />
        </div>
      )}
      <PrintStyles />
    </div>
  );
};

/* ── DELIVERY SLIP COMPONENT (PRINT ONLY) ── */
const DeliverySlip = ({ order }: { order: Order }) => {
  return (
    <div className="hidden print:block w-[80mm] p-4 bg-white text-black font-sans leading-tight">
      <div className="border-2 border-black p-2 space-y-4">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-2">
          <h1 className="text-xl font-black">{order.orderNumber}</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Customer Info */}
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase border-b border-black">Customer</p>
          <p className="text-sm font-black uppercase">{order.shippingAddress.fullName}</p>
          <p className="text-xs font-bold">{order.shippingAddress.phoneNumber}</p>
          <p className="text-[10px] leading-tight">
            {order.shippingAddress.streetAddress}, {order.shippingAddress.area}<br />
            {order.shippingAddress.city}, {order.shippingAddress.emirate}
          </p>
          {order.deliveryNotes?.trim() && (
            <div className="pt-1 border-t border-dashed border-black/30 mt-1">
              <p className="text-[9px] font-black uppercase">Delivery Notes</p>
              <p className="text-[10px] font-bold leading-snug whitespace-pre-wrap">{order.deliveryNotes.trim()}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase border-b border-black">Items</p>
          <table className="w-full text-[10px]">
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 last:border-0">
                  <td className="py-1 align-top font-bold w-12">{item.quantity} {item.productUnitDisplay === '100g' ? 'x 100g' : (item.productUnitDisplay || "")}</td>
                  <td className="py-1 align-top">
                    <span className="font-black uppercase">{item.productName}</span>
                    {item.preparationSpecificationName && (
                      <div className="text-[9px] mt-0.5 leading-snug">
                        <span className="font-black uppercase">Prep spec:</span>{" "}
                        <span className="font-bold">{item.preparationSpecificationName}</span>
                      </div>
                    )}
                    {item.preparationInstructions?.trim() && (
                      <div className="text-[9px] mt-0.5 leading-snug">
                        <span className="font-black uppercase">Instructions:</span>{" "}
                        <span className="font-bold italic whitespace-pre-wrap">{item.preparationInstructions.trim()}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t-2 border-black flex justify-between items-end">
          <div>
            <p className="text-[9px] font-black uppercase">Payment</p>
            <p className="text-xs font-black uppercase">{order.paymentMethod} - {order.paymentStatus}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase">Total</p>
            <p className="text-sm font-black">AED {order.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="text-center pt-4 opacity-50">
          <p className="text-[8px] font-bold uppercase">Thank you for shopping with us!</p>
        </div>
      </div>
    </div>
  );
};

/* ── PRINT STYLES ── */
const PrintStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @media print {
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 80mm;
        height: auto;
      }
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  `}} />
);

export default OrderDetailsPage;
