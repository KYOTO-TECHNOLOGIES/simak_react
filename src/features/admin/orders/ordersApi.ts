import { api } from "../../../services/api";

/* ── Order Item DTO ── */
export interface OrderItemDto {
    id: number;
    product: number;
    product_name: string;
    product_image: string | null;
    quantity: number;
    price: string;
    subtotal: string;
    preparation_specification_name?: string | null;
    preparation_instructions?: string | null;
    preparation_extra_price?: string;
    total_with_preparation?: string;
    base_unit_price?: string;
    unit_price?: string;
    unit_name?: string | null;
    product_unit_display?: string | null;
}

/* ── Shipping Address DTO ── */
export interface ShippingAddressDto {
    id: string;
    label: string;
    address_type: string;
    is_default: boolean;
    full_name: string;
    phone_number: string;
    building_name: string | null;
    flat_villa_number: string | null;
    street_address: string;
    area: string;
    city: string;
    emirate: string;
    postal_code: string | null;
    country: string;
    latitude: string | null;
    longitude: string | null;
}

/* ── Payment DTO ── */
export interface PaymentDto {
    transaction_id: string;
    amount: string;
    status: string;
    payment_method: string;
    receipt: {
        receipt_number: string;
        generated_at: string;
    } | null;
    created_at: string;
}

/* ── Status History DTO ── */
export interface StatusHistoryDto {
    status: string;
    notes: string;
    created_at: string;
}

/* ── Dashboard Analytics DTO ── */
export interface DashboardAnalyticsDto {
    total_users: number;
    active_users: number;
    total_orders: number;
    completed_orders: number;
    total_revenue: string;
    average_order_value: string;
    cart_conversion_rate: number;
    top_products: Array<{
        id: number;
        name: string;
        sales: number;
        revenue: string;
    }>;
}

/* ── Delivery Estimation DTO ── */
export interface DeliveryEstimationDto {
    estimated_delivery_date: string;
    max_delivery_days: number;
    items_breakdown: Array<{
        product_id: number;
        product_name: string;
        quantity: number;
        delivery_days: number;
    }>;
}

/* --- Order Counts DTO --- */
export interface OrderCountsDto {
    total: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
}

/* --- Delivery Assignment DTO --- */
export interface DeliveryAssignmentDto {
    id: number;
    delivery_boy: number;
    delivery_boy_name: string;
    status: string;
    assigned_at: string;
    accepted_at: string | null;
    delivered_at: string | null;
    notes: string | null;
}

/* --- Delivery Proof DTO --- */
export interface DeliveryProofDto {
    id: number;
    proof_image: string;
    signature_name: string | null;
    notes: string | null;
    created_at: string;
}

/* --- Delivery Cancel Request DTO --- */
export interface DeliveryCancelRequestDto {
    id: number;
    reason: string;
    status: string;
    review_notes: string | null;
    requested_at: string;
    reviewed_at: string | null;
}

/* --- Order DTO from backend --- */
export interface OrderDto {
    id: number;
    status: string;
    shipping_address: string;
    shipping_address_details: ShippingAddressDto;
    total_amount: string;
    tip_amount?: string;
    coupon_code?: string | null;
    discount_amount?: string;
    delivery_charge?: string;
    preferred_delivery_date: string | null;
    preferred_delivery_slot: number | null;
    delivery_notes: string | null;
    items: OrderItemDto[];
    status_history: StatusHistoryDto[];
    payment: PaymentDto | null;
    created_at: string;
    updated_at: string;
    delivery_assignment?: DeliveryAssignmentDto | null;
    delivery_proof?: DeliveryProofDto | null;
    delivery_cancel_request?: DeliveryCancelRequestDto | null;
    preferred_delivery_slot_details?: DeliverySlotDto;
}

/* --- Delivery Slot DTO --- */
export interface DeliverySlotDto {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    cutoff_time: string;
    start_time_display: string;
    end_time_display: string;
    sort_order: number;
    is_active: boolean;
}

/* --- Available Slots Response --- */
export interface AvailableSlotsResponse {
    date: string;
    available_slots: DeliverySlotDto[];
}

export type OrdersQuery = {
    q?: string;
    status?: string;
    payment__status?: string;
    page?: number;
    limit?: number;
    offset?: number;
    search?: string;
    customer?: string;
    city?: string;
    deliveryDate?: string;
    deliverySlot?: string | number;
    paymentMethod?: string;
    transactionId?: string;
    delivery_boy?: string | number;
    delivery_assignment__delivery_boy?: string | number;
};

export interface ValidateCouponRequest {
    coupon_code: string;
    cart_total: number;
}

export interface ValidateCouponResponse {
    success: boolean;
    message: string;
    coupon_code?: string;
    discount_amount: string;
    discount_type: "percentage" | "fixed" | null;
    discount_percentage?: number;
    cart_total: string;
    final_amount: string;
}

export interface CheckoutSummaryRequest {
    address_id: number;
    coupon_code?: string;
    tip_amount?: number;
    preferred_delivery_date?: string;
    preferred_delivery_slot?: number;
}

/* ── Delivery Charge Settings DTO ── */
export interface DeliveryChargeSettingsDto {
    min_order_for_free_delivery: number;
    delivery_charge_amount: number;
    is_active: boolean;
}

export interface CheckoutSummaryResponse {
    success: boolean;
    cart_total_before_discount: string;
    discount_amount: string;
    discount_type: "percentage" | "fixed" | null;
    discount_code: string | null;
    coupon_message: string | null;
    cart_total_after_discount: string;
    delivery_charge: string;
    tip_amount: string;
    final_total: string;
    items_count: number;
}

export const ordersApi = {
    list: async (
        params?: OrdersQuery
    ): Promise<{ results: OrderDto[]; count: number }> => {
        const { page: _page, ...requestParams } = params ?? {};
        const res = await api.get<{ results: OrderDto[]; count: number }>(
            "/orders/",
            { params: requestParams }
        );
        return res.data;
    },

    /* ── Receipts (Success Payments Only) ── */
    receiptImage: async (id: number): Promise<Blob> => {
        const res = await api.get(`/orders/${id}/receipt_image/`, {
            responseType: "blob",
        } as any);
        return res.data as Blob;
    },

    receiptPdf: async (id: number): Promise<Blob> => {
        const res = await api.get(`/orders/${id}/receipt_pdf/`, {
            responseType: "blob",
        } as any);
        return res.data as Blob;
    },

    /* ── Admin Delivery Details (All Orders) ── */
    adminReceiptPdf: async (id: number): Promise<Blob> => {
        const res = await api.get(`/orders/${id}/admin_receipt_pdf/`, {
            responseType: "blob",
        } as any);
        return res.data as Blob;
    },

    details: async (id: number): Promise<OrderDto> => {
        const res = await api.get<OrderDto>(`/orders/${id}/`);
        return res.data;
    },

    updateStatus: async (
        id: number,
        status: string,
        notes?: string
    ): Promise<OrderDto> => {
        const res = await api.post<OrderDto>(`/orders/${id}/admin_update_status/`, {
            status: status.toUpperCase(),
            ...(notes ? { notes } : {}),
        });
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/orders/${id}/`);
    },

    create: async (data: any): Promise<OrderDto> => {
        const res = await api.post<OrderDto>("/orders/", data);
        return res.data;
    },

    checkout: async (data: {
        address_id: number;
        payment_method: "COD" | "ZIINA";
        preferred_delivery_date?: string;
        preferred_delivery_slot?: number;
        delivery_notes?: string;
        tip_amount?: number;
        coupon_code?: string;
    }): Promise<{
        message: string;
        order_id: number;
        total_amount: string;
        payment_method: string;
        payment_url?: string;
    }> => {
        const res = await api.post("/orders/checkout/", data);
        return res.data;
    },

    /* ── Dashboard Analytics (Admin Only) ── */
    validateCoupon: async (
        data: ValidateCouponRequest
    ): Promise<ValidateCouponResponse> => {
        const res = await api.post<ValidateCouponResponse>("/orders/validate_coupon/", data);
        return res.data;
    },

    checkoutSummary: async (
        data: CheckoutSummaryRequest
    ): Promise<CheckoutSummaryResponse> => {
        const res = await api.post<CheckoutSummaryResponse>("/orders/checkout_summary/", data);
        return res.data;
    },

    getDashboardAnalytics: async (): Promise<DashboardAnalyticsDto> => {
        const res = await api.get<DashboardAnalyticsDto>("/orders/dashboard_analytics/");
        return res.data;
    },

    /* ── Delivery Estimation ── */
    estimateDelivery: async (): Promise<DeliveryEstimationDto> => {
        const res = await api.get<DeliveryEstimationDto>("/orders/estimate_delivery/");
        return res.data;
    },

    /* ── Delivery Charge Settings (Admin) ── */
    getDeliveryChargeSettings: async (): Promise<DeliveryChargeSettingsDto> => {
        const res = await api.get<any>("/orders/delivery_charge_settings/");
        const raw = res.data;
        return {
            min_order_for_free_delivery: parseFloat(raw.min_free_shipping_amount ?? raw.min_order_for_free_delivery ?? 0),
            delivery_charge_amount: parseFloat(raw.delivery_charge ?? raw.delivery_charge_amount ?? 0),
            is_active: raw.is_active ?? true,
        };
    },

    updateDeliveryChargeSettings: async (
        data: DeliveryChargeSettingsDto
    ): Promise<DeliveryChargeSettingsDto> => {
        const res = await api.post<any>("/orders/delivery_charge_settings/", {
            min_free_shipping_amount: data.min_order_for_free_delivery,
            delivery_charge: data.delivery_charge_amount,
            is_active: data.is_active,
        });
        const raw = res.data;
        return {
            min_order_for_free_delivery: parseFloat(raw.min_free_shipping_amount ?? raw.min_order_for_free_delivery ?? 0),
            delivery_charge_amount: parseFloat(raw.delivery_charge ?? raw.delivery_charge_amount ?? 0),
            is_active: raw.is_active ?? true,
        };
    },

    /* ── Retry Payment ── */
    retryPayment: async (orderId: number): Promise<{ payment_url: string }> => {
        const res = await api.post<{ payment_url: string }>(`/orders/${orderId}/retry_payment/`);
        return res.data;
    },

    /* ── Verify Payment ── */
    verifyPayment: async (orderId: number): Promise<void> => {
        await api.post(`/orders/${orderId}/verify_payment/`);
    },

    getAvailableSlots: async (date?: string): Promise<AvailableSlotsResponse> => {
        const res = await api.get<AvailableSlotsResponse>("/orders/delivery-slots/available/", {
            params: date ? { date } : {},
        });
        return res.data;
    },

    /* ── Delivery Slots (Admin) ── */
    getSlots: async (): Promise<DeliverySlotDto[]> => {
        const res = await api.get<DeliverySlotDto[]>("/orders/delivery-slots/");
        return res.data;
    },

    createSlot: async (data: Partial<DeliverySlotDto>): Promise<DeliverySlotDto> => {
        const res = await api.post<DeliverySlotDto>("/orders/delivery-slots/", data);
        return res.data;
    },

    updateSlot: async (id: number, data: Partial<DeliverySlotDto>): Promise<DeliverySlotDto> => {
        const res = await api.patch<DeliverySlotDto>(`/orders/delivery-slots/${id}/`, data);
        return res.data;
    },

    deleteSlot: async (id: number): Promise<void> => {
        await api.delete(`/orders/delivery-slots/${id}/`);
    },

    activateSlot: async (id: number): Promise<DeliverySlotDto> => {
        const res = await api.post<DeliverySlotDto>(`/orders/delivery-slots/${id}/activate/`);
        return res.data;
    },

    deactivateSlot: async (id: number): Promise<DeliverySlotDto> => {
        const res = await api.post<DeliverySlotDto>(`/orders/delivery-slots/${id}/deactivate/`);
        return res.data;
    },

    /* ── Delivery Overrides (Admin) ── */
    getOverrides: async (params?: any): Promise<any[]> => {
        const res = await api.get<any[]>("/orders/delivery-slot-overrides/", { params });
        return res.data;
    },

    createOverride: async (data: any): Promise<any> => {
        const res = await api.post<any>("/orders/delivery-slot-overrides/", data);
        return res.data;
    },

    deleteOverride: async (id: number): Promise<void> => {
        await api.delete(`/orders/delivery-slot-overrides/${id}/`);
    },

    /* ── Delivery Cancellation Requests (Admin) ── */
    listCancellationRequests: async (params?: any): Promise<any[]> => {
        const res = await api.get<{ results: any[] }>("/orders/cancel-requests/", { params });
        // Handle both direct array and paginated results
        return Array.isArray(res.data) ? res.data : res.data.results || [];
    },

    getCancellationRequest: async (id: number): Promise<any> => {
        const res = await api.get<any>(`/orders/cancel-requests/${id}/`);
        return res.data;
    },

    reviewCancellationRequest: async (
        orderId: number,
        decision: "approve" | "reject",
        reviewNotes?: string
    ): Promise<{ message: string }> => {
        const res = await api.post<{ message: string }>(
            `/orders/${orderId}/admin_review_cancel_request/`,
            {
                decision,
                review_notes: reviewNotes,
            }
        );
        return res.data;
    },
};
