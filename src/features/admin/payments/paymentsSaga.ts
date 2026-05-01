import { call, put, select, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { paymentsApi } from "./paymentsApi";
import { paymentsActions } from "./paymentsSlice";
import type { Payment, PaymentStatus, PaymentMethod } from "./paymentsSlice";
import type { PaymentDto } from "./paymentsApi";
import type { RootState } from "../../../app/store";

/* ── Normalize payment status ── */
function normalizePaymentStatus(raw?: string): PaymentStatus {
    if (!raw) return "Pending";
    const map: Record<string, PaymentStatus> = {
        pending: "Pending",
        success: "Success",
        failed: "Failed",
        refunded: "Refunded",
    };
    return map[raw.toLowerCase()] ?? "Pending";
}

function normalizePaymentMethod(raw?: string): PaymentMethod {
    if (!raw) return "N/A";
    const map: Record<string, PaymentMethod> = {
        ziina: "Card",
        card: "Card",
        cod: "COD",
        cash_on_delivery: "COD",
    };
    return map[raw.toLowerCase()] ?? "N/A";
}

/* ── Map DTO → Payment ── */
function mapPaymentDto(dto: PaymentDto): Payment {
    return {
        id: dto.payment_id,
        paymentId: `PAY-${dto.payment_id}`,
        orderNumber: `ORD-${dto.order_id}`,
        customerId: dto.customer_id,
        customerName: dto.customer_name ?? `Customer #${dto.customer_id}`,
        customerEmail: dto.customer_email ?? "",
        customerPhone: dto.customer_phone ?? "",
        amount: parseFloat(dto.amount) || 0,
        paymentStatus: normalizePaymentStatus(dto.status),
        paymentMethod: normalizePaymentMethod(dto.payment_method),
        orderStatus: dto.order_status ?? "",
        date: dto.transaction_date,
        updatedAt: dto.updated_date,
        transactionId: dto.transaction_id,
        ziinaPaymentIntentId: dto.ziina_payment_intent_id,
        providerResponse: dto.provider_response,
    };
}

function normalizePayments(payload: any): Payment[] {
    if (Array.isArray(payload?.results))
        return payload.results.map(mapPaymentDto);
    if (Array.isArray(payload)) return payload.map(mapPaymentDto);
    if (Array.isArray(payload?.data))
        return payload.data.map(mapPaymentDto);
    return [];
}

function* fetchPaymentsWorker(
    action: ReturnType<typeof paymentsActions.fetchPaymentsRequest>
): SagaIterator {
    try {
        const auth: any = yield select((state: RootState) => (state as any).auth);
        if (auth && auth.isAuthenticated === false) {
            yield put(paymentsActions.fetchPaymentsFailure("User not authenticated"));
            return;
        }

        const raw: any = yield call(paymentsApi.list, action.payload);
        const totalCount = raw?.count || 0;
        const items = normalizePayments(raw);
        const page = action.payload?.page || 1;

        yield put(
            paymentsActions.fetchPaymentsSuccess({
                items,
                totalCount,
                page,
            })
        );
    } catch (e: any) {
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to fetch payments";
        yield put(paymentsActions.fetchPaymentsFailure(errMsg));
    }
}

function* fetchPaymentDetailsWorker(
    action: ReturnType<typeof paymentsActions.fetchPaymentDetailsRequest>
): SagaIterator {
    try {
        const raw: any = yield call(paymentsApi.details, action.payload);
        const payment = mapPaymentDto(raw);
        yield put(paymentsActions.fetchPaymentDetailsSuccess(payment));
    } catch (e: any) {
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to fetch payment details";
        yield put(paymentsActions.fetchPaymentDetailsFailure(errMsg));
    }
}

function* createRefundWorker(
    action: ReturnType<typeof paymentsActions.createRefundRequest>
): SagaIterator {
    try {
        const { paymentId, amount_fils } = action.payload;
        yield call(paymentsApi.createRefund, paymentId, { amount_fils });
        yield put(paymentsActions.createRefundSuccess());
        // Refresh details after refund
        yield put(paymentsActions.fetchPaymentDetailsRequest(paymentId));
        yield put(paymentsActions.fetchRefundStatusRequest(paymentId));
    } catch (e: any) {
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to initiate refund";
        yield put(paymentsActions.createRefundFailure(errMsg));
    }
}

function* fetchRefundStatusWorker(
    action: ReturnType<typeof paymentsActions.fetchRefundStatusRequest>
): SagaIterator {
    try {
        const raw: any = yield call(paymentsApi.getRefundStatus, action.payload);
        yield put(paymentsActions.fetchRefundStatusSuccess(raw));
    } catch (e: any) {
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to fetch refund status";
        yield put(paymentsActions.fetchRefundStatusFailure(errMsg));
    }
}

/* ── Update payment status ── */
function* updatePaymentStatusWorker(
    action: ReturnType<typeof paymentsActions.updatePaymentStatusRequest>
): SagaIterator {
    try {
        const { id, status } = action.payload;
        const raw: any = yield call(paymentsApi.updateStatus, id, status);

        const normalizedStatus = (() => {
            const map: Record<string, PaymentStatus> = {
                pending: "Pending",
                success: "Success",
                failed: "Failed",
                refunded: "Refunded",
            };
            return map[(raw?.status || status).toLowerCase()] ?? "Pending";
        })();

        yield put(
            paymentsActions.updatePaymentStatusSuccess({
                id,
                status: normalizedStatus,
            })
        );

        // Re-fetch payments to get fresh data
        const lastQuery: any = yield select(
            (state: RootState) => state.payments.lastQuery
        );
        if (lastQuery) {
            yield put(paymentsActions.fetchPaymentsRequest(lastQuery));
        }
    } catch (e: any) {
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to update payment status";
        yield put(paymentsActions.updatePaymentStatusFailure(errMsg));
    }
}

export function* paymentsSaga(): SagaIterator {
    yield takeLatest(
        paymentsActions.fetchPaymentsRequest.type,
        fetchPaymentsWorker
    );
    yield takeLatest(
        paymentsActions.fetchPaymentDetailsRequest.type,
        fetchPaymentDetailsWorker
    );
    yield takeLatest(
        paymentsActions.createRefundRequest.type,
        createRefundWorker
    );
    yield takeLatest(
        paymentsActions.fetchRefundStatusRequest.type,
        fetchRefundStatusWorker
    );
    yield takeLatest(
        paymentsActions.updatePaymentStatusRequest.type,
        updatePaymentStatusWorker
    );
}
