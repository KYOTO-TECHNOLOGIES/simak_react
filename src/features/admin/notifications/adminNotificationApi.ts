import { api } from "../../../services/api";

/* ── Base Notification Types ── */

export interface AdminNotificationDto {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    action_url?: string | null;
}

export interface AdminNotificationListOptions {
    limit?: number;
    offset?: number;
    is_read?: boolean | null;
}

export interface AdminNotificationListResult {
    results: AdminNotificationDto[];
    next?: string | null;
    count?: number;
}

/* ── Template Types ── */

export interface NotificationTemplateDto {
    id: number;
    name: string;
    type: string;
    subject: string;
    body: string;
    created_at?: string;
    updated_at?: string;
}

export interface NotificationTemplatePayload {
    name: string;
    type: string;
    subject: string;
    body: string;
}

/* ── Broadcast Types ── */

export interface BroadcastDto {
    id: number;
    template: number | null;
    template_name?: string;
    subject: string;
    message: string;
    type: string;
    send_to_all: boolean;
    recipients: number[];
    sent_at?: string | null;
    image_url?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface BroadcastPayload {
    template?: number | null;
    subject: string;
    message: string;
    type: string;
    send_to_all: boolean;
    recipients?: number[];
    image?: string | null;
}

/* ── API ── */

export const adminNotificationApi = {
    /* ── Notifications ── */
    list: async (): Promise<AdminNotificationDto[]> => {
        const response = await api.get<{ results: AdminNotificationDto[] }>("/notifications/");
        return Array.isArray(response.data) ? response.data : (response.data.results || []);
    },

    listPaged: async (opts?: AdminNotificationListOptions): Promise<AdminNotificationListResult> => {
        const params: Record<string, any> = {};
        if (opts?.limit != null) params.limit = opts.limit;
        if (opts?.offset != null) params.offset = opts.offset;
        if (typeof opts?.is_read === 'boolean') params.is_read = opts.is_read;
        const res = await api.get("/notifications/", { params });
        const data = res.data;
        const results = Array.isArray(data) ? data : (data.results || []);
        const next = Array.isArray(data) ? null : (data.next || null);
        const count = Array.isArray(data) ? results.length : (data.count ?? results.length);
        return { results, next, count };
    },

    markAsRead: async (id: number): Promise<void> => {
        await api.post(`/notifications/${id}/mark_as_read/`);
    },

    markAllAsRead: async (): Promise<void> => {
        await api.post("/notifications/mark_all_as_read/");
    },

    /* ── Templates ── */
    listTemplates: async (): Promise<NotificationTemplateDto[]> => {
        const res = await api.get("/notifications/templates/");
        return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },

    createTemplate: async (data: NotificationTemplatePayload): Promise<NotificationTemplateDto> => {
        const res = await api.post("/notifications/templates/", data);
        return res.data;
    },

    updateTemplate: async (id: number, data: Partial<NotificationTemplatePayload>): Promise<NotificationTemplateDto> => {
        const res = await api.patch(`/notifications/templates/${id}/`, data);
        return res.data;
    },

    deleteTemplate: async (id: number): Promise<void> => {
        await api.delete(`/notifications/templates/${id}/`);
    },

    /* ── Broadcasts ── */
    listBroadcasts: async (): Promise<BroadcastDto[]> => {
        const res = await api.get("/notifications/broadcasts/");
        return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },

    createBroadcast: async (data: BroadcastPayload | FormData): Promise<BroadcastDto> => {
        const res = await api.post("/notifications/broadcasts/", data);
        return res.data;
    },

    updateBroadcast: async (id: number, data: Partial<BroadcastPayload> | FormData): Promise<BroadcastDto> => {
        const res = await api.patch(`/notifications/broadcasts/${id}/`, data);
        return res.data;
    },

    deleteBroadcast: async (id: number): Promise<void> => {
        await api.delete(`/notifications/broadcasts/${id}/`);
    },

    sendBroadcast: async (id: number): Promise<any> => {
        const res = await api.post(`/notifications/broadcasts/${id}/send/`);
        return res.data;
    },
};
