import { call, put, select, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { ordersApi } from "./ordersApi";
import { ordersActions } from "./ordersSlice";
import type { Order, OrderItem, OrderStatus, PaymentStatus, ShippingAddress, Payment, StatusHistoryEntry } from "./ordersSlice";
import type { OrderDto, OrderItemDto } from "./ordersApi";
import type { RootState } from "../../../app/store";
import { normalizeDisplayPaymentMethod } from "../../../utils/payment";

/* ── Normalize status strings from backend ── */
function normalizeOrderStatus(raw: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
        pending: "PENDING",
        paid: "PAID",
        processing: "PROCESSING",
        shipped: "SHIPPED",
        delivered: "DELIVERED",
        cancelled: "CANCELLED",
    };
    return map[raw.toLowerCase()] ?? "PENDING";
}

function normalizePaymentStatus(raw: string): PaymentStatus {
    const map: Record<string, PaymentStatus> = {
        paid: "Paid",
        success: "Success",
        pending: "Pending",
        refunded: "Refunded",
        failed: "Failed",
    };
    return map[raw.toLowerCase()] ?? "Pending";
}

function mapOrderItemDto(dto: OrderItemDto): OrderItem {
    return {
        id: dto.id,
        productId: dto.product,
        productName: dto.product_name ?? `Product #${dto.product}`,
        quantity: dto.quantity,
        price: parseFloat(dto.price) || 0,
        subtotal: parseFloat(dto.subtotal) || 0,
        productUnitDisplay: dto.unit_name ?? dto.product_unit_display ?? null,
    };
}

/* ── Map backend DTO → UI Order ── */
function mapOrderDtoToOrder(dto: OrderDto): Order {
    const addr = dto.shipping_address_details;
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
        };

    const payment: Payment | null = dto.payment
        ? {
            transactionId: dto.payment.transaction_id ?? "",
            amount: parseFloat(dto.payment.amount) || 0,
            status: dto.payment.status ?? "",
            paymentMethod: normalizeDisplayPaymentMethod(dto.payment.payment_method),
            receiptNumber: dto.payment.receipt?.receipt_number ?? null,
            createdAt: dto.payment.created_at ?? "",
        }
        : null;

    const statusHistory: StatusHistoryEntry[] = Array.isArray(dto.status_history)
        ? dto.status_history.map((h) => ({
            status: h.status ?? "",
            notes: h.notes ?? "",
            createdAt: h.created_at ?? "",
        }))
        : [];

    return {
        id: dto.id,
        orderNumber: `ORD-${dto.id}`,
        status: normalizeOrderStatus(dto.status ?? "pending"),
        shippingAddress,
        total: parseFloat(dto.total_amount) || 0,
        deliveryDate: dto.preferred_delivery_date ?? null,
        deliverySlot: dto.preferred_delivery_slot ?? null,
        deliveryNotes: dto.delivery_notes ?? null,
        items: Array.isArray(dto.items) ? dto.items.map(mapOrderItemDto) : [],
        statusHistory,
        payment,
        paymentStatus: payment
            ? normalizePaymentStatus(payment.status)
            : "Pending",
        paymentMethod: payment?.paymentMethod ?? "N/A",
        createdAt: dto.created_at,
        updatedAt: dto.updated_at,
    };
}

/** Normalize any API shape → Order[] */
function normalizeOrders(payload: any): Order[] {
    if (Array.isArray(payload?.results))
        return payload.results.map(mapOrderDtoToOrder);
    if (Array.isArray(payload)) return payload.map(mapOrderDtoToOrder);
    if (Array.isArray(payload?.data))
        return payload.data.map(mapOrderDtoToOrder);
    return [];
}

function* fetchOrdersWorker(
    action: ReturnType<typeof ordersActions.fetchOrdersRequest>
): SagaIterator {
    try {
        const auth: any = yield select((state: RootState) => (state as any).auth);
        if (auth && auth.isAuthenticated === false) {
            yield put(ordersActions.fetchOrdersFailure("User not authenticated"));
            return;
        }

        const raw: any = yield call(ordersApi.list, action.payload);
        const totalCount = raw?.count || 0;
        const items = normalizeOrders(raw);
        const page = action.payload?.page || 1;

        yield put(
            ordersActions.fetchOrdersSuccess({
                items,
                totalCount,
                page,
            })
        );
    } catch (e: any) {
        console.error("Fetch Orders Error:", {
            status: e?.response?.status,
            data: e?.response?.data,
            message: e?.message,
        });

        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to fetch orders";

        yield put(ordersActions.fetchOrdersFailure(errMsg));
    }
}

function* updateStatusWorker(
    action: ReturnType<typeof ordersActions.updateStatusRequest>
): SagaIterator {
    try {
        const { id, status, notes } = action.payload;
        const raw: any = yield call(ordersApi.updateStatus, id, status, notes);
        const updatedOrder = mapOrderDtoToOrder(raw);

        yield put(ordersActions.updateStatusSuccess(updatedOrder));

        // Re-fetch order list to reflect changes
        const lastQuery: any = yield select((state: RootState) => state.orders.lastQuery);
        yield put(ordersActions.fetchOrdersRequest(lastQuery ?? undefined));
    } catch (e: any) {
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to update status";
        yield put(ordersActions.updateStatusFailure(errMsg));
    }
}

export function* ordersSaga(): SagaIterator {
    yield takeLatest(
        ordersActions.fetchOrdersRequest.type,
        fetchOrdersWorker
    );
    yield takeLatest(
        ordersActions.updateStatusRequest.type,
        updateStatusWorker
    );
}
