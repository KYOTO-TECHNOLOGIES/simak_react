import { api } from "../../services/api";

/* ── Types ── */

export interface ProfileUpdatePayload {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    nationality?: string;
    profile?: {
        gender?: "M" | "F" | "O";
        date_of_birth?: string; // "YYYY-MM-DD"
        preferred_language?: string;
    };
}

export interface ChangePasswordPayload {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
}

export interface SendProfileOtpPayload {
    otp_type: "email" | "phone";
    email?: string;
    phone_number?: string;
    otp_platform?: string;
}

export interface VerifyProfileOtpPayload {
    otp_type: "email" | "phone";
    otp_code: string;
    email?: string;
    phone_number?: string;
}


/* ── API ── */

export const profileApi = {
    /** GET /users/me/ — fetch current authenticated user */
    getMe: async () => {
        const res = await api.get("/users/me/");
        return res.data;
    },

    /** PUT /users/me/ — update current authenticated user */
    updateMe: async (data: ProfileUpdatePayload | FormData) => {
        const res = await api.put("/users/me/", data);
        return res.data;
    },

    /** PATCH /users/:id/ — update profile fields (backend doesn't allow PATCH on /me/) */
    updateProfile: async (id: number | string, data: ProfileUpdatePayload | FormData) => {
        const res = await api.patch(`/users/${id}/`, data);
        return res.data;
    },

    /** POST /users/change_password/ */
    changePassword: async (id: number | string, data: ChangePasswordPayload) => {
        const res = await api.post(`/users/${id}/change_password/`, data);
        return res.data;
    },

    /** POST /auth/otp/request/ — send OTP for profile updates */
    sendProfileOtp: async (data: SendProfileOtpPayload) => {
        const res = await api.post(`/auth/otp/request/`, data);
        return res.data;
    },

    verifyProfileOtp: async (data: VerifyProfileOtpPayload) => {
        const res = await api.post(`/auth/otp/verify-update/`, data);
        return res.data;
    },
};
