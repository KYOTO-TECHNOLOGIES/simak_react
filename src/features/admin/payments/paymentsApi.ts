import { api } from "../../../services/api";

/* ── Payment DTO ── 
 * Uses the dedicated /orders/payments/ endpoint for payment management.
 */

export interface PaymentDto {
    payment_id: number;
    order_id: number;
    customer_id: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: string;
    payment_method: string;
    payment_method_display: string;
    status: string;
    payment_status_display: string;
    order_status: string;
    transaction_id: string;
    ziina_payment_intent_id: string;
    transaction_date: string;
    updated_date: string;
    provider_response: Record<string, any>;
}

export type PaymentsQuery = {
    q?: string;
    search?: string;
    id?: string | number;
    payment_id?: string | number;
    order__id?: string | number;
    order_id?: string | number;
    amount_min?: string | number;
    amount_max?: string | number;
    status?: string;
    payment_method?: string;
    customer_name?: string;
    order__status?: string;
    page?: number;
    limit?: number;
    offset?: number;
    ordering?: string;
};

export const paymentsApi = {
    /**
     * List all payments with filtering, searching, and pagination.
     */
    list: async (
        params?: PaymentsQuery
    ): Promise<{ results: PaymentDto[]; count: number; next?: string; previous?: string }> => {
        const res = await api.get<{ results: PaymentDto[]; count: number; next?: string; previous?: string }>(
            "/orders/payments/",
            { params }
        );
        return res.data;
    },

    /**
     * Get payment details by payment_id
     */
    details: async (id: number): Promise<PaymentDto> => {
        const res = await api.get<PaymentDto>(`/orders/payments/${id}/`);
        return res.data;
    },

    /**
     * Update payment status (mainly for COD or specific admin overrides)
     */
    updateStatus: async (
        id: number,
        status: string
    ): Promise<PaymentDto> => {
        const res = await api.patch<PaymentDto>(`/orders/payments/${id}/`, {
            status: status.toUpperCase(),
        });
        return res.data;
    },

    /**
     * Create a refund for a successful payment.
     */
    createRefund: async (
        paymentId: number,
        data: { amount_fils?: number; currency_code?: string }
    ): Promise<{ message: string; refund_id: string; status: string; amount: number; currency: string }> => {
        const res = await api.post<{ message: string; refund_id: string; status: string; amount: number; currency: string }>(
            `/orders/payments/${paymentId}/create_refund/`,
            data
        );
        return res.data;
    },

    /**
     * Check the status of a refund for a payment.
     */
    getRefundStatus: async (
        paymentId: number
    ): Promise<{
        refund_id: string;
        status: string;
        amount: number;
        currency: string;
        created_at: string;
        processed_at: string | null;
        reason: string | null;
    }> => {
        const res = await api.get<{
            refund_id: string;
            status: string;
            amount: number;
            currency: string;
            created_at: string;
            processed_at: string | null;
            reason: string | null;
        }>(`/orders/payments/${paymentId}/refund_status/`);
        return res.data;
    },
};
