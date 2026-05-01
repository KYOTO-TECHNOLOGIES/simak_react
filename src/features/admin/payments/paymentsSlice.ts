import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../../app/store";
import type { PaymentsQuery } from "./paymentsApi";

type Status = "idle" | "loading" | "succeeded" | "failed";

export type PaymentStatus = "Success" | "Failed" | "Pending" | "Refunded";
export type PaymentMethod = "UPI" | "Card" | "NetBanking" | "Wallet" | "COD" | "N/A";

export interface Payment {
    id: number;
    paymentId: string; // display ID like "PAY-1234"
    orderNumber: string;
    customerId: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    amount: number;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    orderStatus: string;
    date: string;
    updatedAt: string;
    transactionId?: string;
    ziinaPaymentIntentId?: string;
    providerResponse?: Record<string, any>;
}

export interface RefundStatus {
    refund_id: string;
    status: string;
    amount: number;
    currency: string;
    created_at: string;
    processed_at: string | null;
    reason: string | null;
}

interface PaymentsState {
    items: Payment[];
    totalCount: number;
    currentPage: number;
    status: Status;
    error: string | null;
    selectedId: number | null;
    detailedPayment: Payment | null;
    refundStatus: RefundStatus | null;
    lastQuery: PaymentsQuery | null;
    actionLoading: boolean;
}

const initialState: PaymentsState = {
    items: [],
    totalCount: 0,
    currentPage: 1,
    status: "idle",
    error: null,
    selectedId: null,
    detailedPayment: null,
    refundStatus: null,
    lastQuery: null,
    actionLoading: false,
};

const paymentsSlice = createSlice({
    name: "payments",
    initialState,
    reducers: {
        fetchPaymentsRequest: (
            state,
            action: PayloadAction<PaymentsQuery | undefined>
        ) => {
            state.status = "loading";
            state.error = null;
            state.lastQuery = action.payload ?? null;
        },
        fetchPaymentsSuccess: (
            state,
            action: PayloadAction<{
                items: Payment[];
                totalCount: number;
                page: number;
            }>
        ) => {
            state.status = "succeeded";
            state.items = action.payload.items;
            state.totalCount = action.payload.totalCount;
            state.currentPage = action.payload.page;
        },
        fetchPaymentsFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        setSelectedPaymentId: (state, action: PayloadAction<number | null>) => {
            state.selectedId = action.payload;
        },

        /* ── Update Payment Status ── */
        updatePaymentStatusRequest: (
            state,
            _action: PayloadAction<{ id: number; status: string }>
        ) => {
            state.status = "loading";
            state.error = null;
        },
        updatePaymentStatusSuccess: (
            state,
            action: PayloadAction<{ id: number; status: PaymentStatus }>
        ) => {
            state.status = "succeeded";
            const item = state.items.find((p) => p.id === action.payload.id);
            if (item) {
                item.paymentStatus = action.payload.status;
            }
        },
        updatePaymentStatusFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },

        /* ── Fetch Single Payment ── */
        fetchPaymentDetailsRequest: (state, _action: PayloadAction<number>) => {
            state.status = "loading";
            state.error = null;
        },
        fetchPaymentDetailsSuccess: (state, action: PayloadAction<Payment>) => {
            state.status = "succeeded";
            state.detailedPayment = action.payload;
        },
        fetchPaymentDetailsFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },

        /* ── Refund Actions ── */
        createRefundRequest: (state, _action: PayloadAction<{ paymentId: number; amount_fils?: number }>) => {
            state.actionLoading = true;
            state.error = null;
        },
        createRefundSuccess: (state) => {
            state.actionLoading = false;
        },
        createRefundFailure: (state, action: PayloadAction<string>) => {
            state.actionLoading = false;
            state.error = action.payload;
        },

        fetchRefundStatusRequest: (state, _action: PayloadAction<number>) => {
            state.actionLoading = true;
            state.error = null;
        },
        fetchRefundStatusSuccess: (state, action: PayloadAction<RefundStatus>) => {
            state.actionLoading = false;
            state.refundStatus = action.payload;
        },
        fetchRefundStatusFailure: (state, action: PayloadAction<string>) => {
            state.actionLoading = false;
            state.error = action.payload;
        },
        clearRefundStatus: (state) => {
            state.refundStatus = null;
        },
    },
});

export const paymentsActions = paymentsSlice.actions;
export default paymentsSlice.reducer;

// Selectors
export const selectPayments = (s: RootState) => s.payments.items;
export const selectPaymentsTotal = (s: RootState) => s.payments.totalCount;
export const selectPaymentsPage = (s: RootState) => s.payments.currentPage;
export const selectPaymentsStatus = (s: RootState) => s.payments.status;
export const selectPaymentsError = (s: RootState) => s.payments.error;
export const selectSelectedPaymentId = (s: RootState) => s.payments.selectedId;
export const selectDetailedPayment = (s: RootState) => s.payments.detailedPayment;
export const selectRefundStatus = (s: RootState) => s.payments.refundStatus;
export const selectActionLoading = (s: RootState) => s.payments.actionLoading;
