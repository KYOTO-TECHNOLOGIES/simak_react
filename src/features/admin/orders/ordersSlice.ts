import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../../app/store";
import type { OrdersQuery } from "./ordersApi";

type Status = "idle" | "loading" | "succeeded" | "failed";

export type OrderStatus =
    | "PENDING"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

export type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Failed" | "Success";

export interface OrderItem {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
    productUnitDisplay?: string | null;
}

export interface ShippingAddress {
    id: string;
    label: string;
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    area: string;
    city: string;
    emirate: string;
    country: string;
}

export interface Payment {
    transactionId: string;
    amount: number;
    status: string;
    paymentMethod: string;
    receiptNumber: string | null;
    createdAt: string;
}

export interface StatusHistoryEntry {
    status: string;
    notes: string;
    createdAt: string;
}

export interface Order {
    id: number;
    orderNumber: string;
    status: OrderStatus;
    shippingAddress: ShippingAddress;
    total: number;
    deliveryDate: string | null;
    deliverySlot: string | number | null;
    deliveryNotes: string | null;
    items: OrderItem[];
    statusHistory: StatusHistoryEntry[];
    payment: Payment | null;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    createdAt: string;
    updatedAt: string;
}

interface OrdersState {
    items: Order[];
    totalCount: number;
    currentPage: number;
    status: Status;
    error: string | null;
    selectedId: number | null;
    lastQuery: OrdersQuery | null;
}

const initialState: OrdersState = {
    items: [],
    totalCount: 0,
    currentPage: 1,
    status: "idle",
    error: null,
    selectedId: null,
    lastQuery: null,
};

const ordersSlice = createSlice({
    name: "orders",
    initialState,
    reducers: {
        fetchOrdersRequest: (
            state,
            action: PayloadAction<OrdersQuery | undefined>
        ) => {
            state.status = "loading";
            state.error = null;
            state.lastQuery = action.payload ?? null;
        },
        fetchOrdersSuccess: (
            state,
            action: PayloadAction<{
                items: Order[];
                totalCount: number;
                page: number;
            }>
        ) => {
            state.status = "succeeded";
            state.items = action.payload.items;
            state.totalCount = action.payload.totalCount;
            state.currentPage = action.payload.page;
        },
        fetchOrdersFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },

        /* ── Update Order Status ── */
        updateStatusRequest: (state, _action: PayloadAction<{ id: number; status: OrderStatus; notes?: string }>) => {
            state.status = "loading";
            state.error = null;
        },
        updateStatusSuccess: (state, action: PayloadAction<Order>) => {
            state.status = "succeeded";
            // Optional: update the item in the list immediately
            const index = state.items.findIndex(i => i.id === action.payload.id);
            if (index !== -1) {
                state.items[index] = action.payload;
            }
        },
        updateStatusFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        setSelectedOrderId: (state, action: PayloadAction<number | null>) => {
            state.selectedId = action.payload;
        },
    },
});

export const ordersActions = ordersSlice.actions;
export default ordersSlice.reducer;

// Selectors
export const selectOrders = (s: RootState) => s.orders.items;
export const selectOrdersTotal = (s: RootState) => s.orders.totalCount;
export const selectOrdersPage = (s: RootState) => s.orders.currentPage;
export const selectOrdersStatus = (s: RootState) => s.orders.status;
export const selectOrdersError = (s: RootState) => s.orders.error;
export const selectSelectedOrderId = (s: RootState) => s.orders.selectedId;
