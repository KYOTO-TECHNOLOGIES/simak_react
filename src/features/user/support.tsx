import React, { useState, useCallback } from "react";
import {
    Mail,
    Send,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    Headphones,
    Clock,
    MessageCircle,
    MessageSquare,
    User,
    FileText,
} from "lucide-react";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";
import { useUserProfile } from "../../hooks/queries";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { useQueryClient } from "@tanstack/react-query";
import { profileApi } from "./profileApi";
import { setUser } from "../auth/authSlice";

/* ─── Types ─── */
interface ContactForm {
    name: string;
    email: string;
    subject: string;
    message: string;
}

type Status = "idle" | "sending" | "success" | "error";

/** Extract a human-readable message from any DRF error response */
function extractApiError(e: any, fallback: string): string {
    const d = e?.response?.data;
    if (!d) return e?.message || fallback;
    // flat string
    if (typeof d === "string") return d;
    if (typeof d.detail === "string") return d.detail;
    if (typeof d.error === "string") return d.error;
    if (typeof d.message === "string") return d.message;
    // non_field_errors array
    if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) return d.non_field_errors[0];
    // field-level errors — collect first error from each field
    const fieldMsgs: string[] = [];
    for (const key of Object.keys(d)) {
        const val = d[key];
        if (Array.isArray(val) && val.length && typeof val[0] === "string") {
            fieldMsgs.push(val[0]);
        }
    }
    if (fieldMsgs.length) return fieldMsgs.join(" ");
    return fallback;
}

/* ─── FAQ Item ─── */
const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-zinc-100 rounded-2xl overflow-hidden transition-all hover:border-zinc-200">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer group"
            >
                <span className="text-sm font-semibold text-zinc-800 group-hover:text-cyan-600 transition-colors pr-4">
                    {q}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-zinc-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-cyan-600" : ""}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
            >
                <p className="px-6 pb-5 text-[13px] text-zinc-500 leading-relaxed">
                    {a}
                </p>
            </div>
        </div>
    );
};

/* ─── Support Page ─── */
const SupportPage: React.FC = () => {
    const { t } = useTranslation("support");
    const { data: me } = useUserProfile(true);
    const { isAuthenticated: isAuthed, checkingAuth } = useAppSelector((s) => s.auth);
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();
    const [form, setForm] = useState<ContactForm>({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [verifyError, setVerifyError] = useState("");
    const [verifySuccess, setVerifySuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const resendRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    React.useEffect(() => {
        return () => { if (resendRef.current) clearInterval(resendRef.current); };
    }, []);

    const onChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        },
        []
    );

    const fullNamePlaceholder = [((me as any)?.first_name || ""), ((me as any)?.last_name || "")]
        .filter(Boolean)
        .join(" ")
        .trim();
    const emailPlaceholder = (me as any)?.email || "";

    React.useEffect(() => {
        if (isAuthed && me) {
            const full = fullNamePlaceholder;
            const email = emailPlaceholder;
            setForm((prev) => ({
                ...prev,
                name: prev.name || full,
                email: prev.email || email,
            }));
            setVerifyEmail(email);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthed, fullNamePlaceholder, emailPlaceholder]);

    const isFormValid =
        form.subject.trim().length > 2 &&
        form.message.trim().length > 10;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        setStatus("sending");
        setErrorMsg("");

        try {
            await api.post("/notifications/contact/", {
                subject: form.subject.trim(),
                message: form.message.trim(),
            });
            setStatus("success");
            setForm({ name: "", email: "", subject: "", message: "" });
        } catch (err: any) {
            setStatus("error");
            const statusCode = err?.response?.status;
            if (statusCode === 401) {
                setErrorMsg(t("form.errors.unauthenticated"));
            } else if (statusCode === 403) {
                setErrorMsg(extractApiError(err, t("form.errors.emailNotVerified")));
            } else {
                setErrorMsg(extractApiError(err, t("form.errors.generic")));
            }
        }
    };

    const inputBase =
        "w-full bg-transparent border-b border-zinc-100 py-3 text-sm font-medium tracking-tight placeholder:text-zinc-300 outline-none transition-all focus:border-cyan-500";

    return (
        <div className="min-h-screen bg-[#F9F9F9] text-[#18181B] font-sans antialiased selection:bg-cyan-500 selection:text-white">
            <section className="relative bg-gradient-to-br from-cyan-600 via-cyan-500 to-teal-400 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
                </div>
                <div className="relative   mx-auto px-6 py-20 md:py-28 text-center">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.3em] text-white/90 mb-6">
                        <Headphones size={14} /> {t("hero.badge")}
                    </span>
                    <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                        {t("hero.title")}
                    </h1>
                    <p className="mt-4 text-white/70 text-sm md:text-base max-w-xl mx-auto">
                        {t("hero.subtitle")}
                    </p>
                </div>
            </section>

            {/* ─── Main Content ─── */}
            <div className="  mx-auto px-6 -mt-10 pb-20 relative z-10">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* ─── Contact Form (spans 2 cols on large) ─── */}
                    <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-8 md:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                                <MessageSquare size={18} className="text-cyan-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900">
                                    {t("form.title")}
                                </h2>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                                    {t("form.subtitle")}
                                </p>
                            </div>
                        </div>

                        {status === "success" ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 size={32} className="text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-zinc-900">
                                    {t("form.success.title")}
                                </h3>
                                <p className="text-sm text-zinc-500 max-w-xs">
                                    {t("form.success.subtitle")}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStatus("idle")}
                                    className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 hover:text-cyan-700 transition-colors cursor-pointer"
                                >
                                    {t("form.success.again")}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {!isAuthed && !checkingAuth && (
                                    <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                        <p className="text-[11px] font-bold text-amber-700">
                                            {t("form.loginBanner")}
                                        </p>
                                    </div>
                                )}
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {/* Name */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                                            {t("form.fields.name")}
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <User
                                                size={14}
                                                className="text-zinc-300 shrink-0"
                                            />
                                            <input
                                                type="text"
                                                name="name"
                                                value={form.name}
                                                onChange={onChange}
                                                placeholder={fullNamePlaceholder || t("form.placeholders.name")}
                                                className={inputBase}
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                                            {t("form.fields.email")}
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <Mail
                                                size={14}
                                                className="text-zinc-300 shrink-0"
                                            />
                                            <input
                                                type="email"
                                                name="email"
                                                value={form.email}
                                                onChange={onChange}
                                                placeholder={emailPlaceholder || t("form.placeholders.email")}
                                                className={inputBase}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                                        {t("form.fields.subject")}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <FileText
                                            size={14}
                                            className="text-zinc-300 shrink-0"
                                        />
                                        <input
                                            type="text"
                                            name="subject"
                                            value={form.subject}
                                            onChange={onChange}
                                            placeholder={t("form.placeholders.subject")}
                                            required
                                            disabled={!isAuthed}
                                            className={inputBase}
                                        />
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                                        {t("form.fields.message")}
                                    </label>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={onChange}
                                        placeholder={t("form.placeholders.message")}
                                        required
                                        disabled={!isAuthed}
                                        rows={5}
                                        className={`${inputBase} resize-none`}
                                    />
                                </div>

                                {/* Error */}
                                {status === "error" && (
                                    <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                        <p className="text-[11px] font-bold text-rose-600">
                                            {errorMsg}
                                        </p>
                                    </div>
                                )}

                                {/* Verify Email */}
                                {isAuthed && errorMsg && /email.*verified/i.test(errorMsg) && (
                                    <div className="space-y-4 border border-amber-200 bg-amber-50 rounded-2xl p-4">
                                        {!verifyOpen ? (
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[11px] font-bold text-amber-700">
                                                    {t("form.errors.emailNotVerified")}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setVerifyOpen(true)}
                                                    className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-[11px] font-bold hover:bg-cyan-700"
                                                >
                                                    {t("form.verify.openBtn")}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1 block">
                                                        {t("form.verify.email")}
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={verifyEmail}
                                                        onChange={(e) => setVerifyEmail(e.target.value)}
                                                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            setVerifyError("");
                                                            setSendingOtp(true);
                                                            try {
                                                                await profileApi.sendProfileOtp({ otp_type: "email", email: verifyEmail });
                                                                setResendCooldown(30);
                                                                if (resendRef.current) clearInterval(resendRef.current);
                                                                resendRef.current = setInterval(() => {
                                                                    setResendCooldown((prev) => {
                                                                        if (prev <= 1) {
                                                                            if (resendRef.current) clearInterval(resendRef.current);
                                                                            return 0;
                                                                        }
                                                                        return prev - 1;
                                                                    });
                                                                }, 1000);
                                                            } catch (e: any) {
                                                                setVerifyError(extractApiError(e, t("form.verify.sendError")));
                                                            } finally {
                                                                setSendingOtp(false);
                                                            }
                                                        }}
                                                        disabled={sendingOtp || !verifyEmail || resendCooldown > 0}
                                                        className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold disabled:opacity-50"
                                                    >
                                                        {sendingOtp ? t("form.verify.sending") : resendCooldown > 0 ? `${resendCooldown}s` : t("form.verify.send")}
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={otpCode}
                                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                        placeholder={t("form.verify.codePlaceholder")}
                                                        className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            setVerifyError("");
                                                            setVerifyingOtp(true);
                                                            try {
                                                                await profileApi.verifyProfileOtp({ otp_type: "email", otp_code: otpCode, email: verifyEmail });
                                                                // Update user email on profile if it changed
                                                                try {
                                                                    await profileApi.updateMe({ email: verifyEmail });
                                                                } catch { /* email may already be set, ignore */ }
                                                                const fresh = await profileApi.getMe();
                                                                queryClient.setQueryData(["userProfile"], fresh);
                                                                dispatch(setUser(fresh) as any);
                                                                setForm((prev) => ({ ...prev, email: verifyEmail }));
                                                                setVerifySuccess(true);
                                                                setOtpCode("");
                                                                // Auto-close after brief success display
                                                                setTimeout(() => {
                                                                    setVerifyOpen(false);
                                                                    setVerifySuccess(false);
                                                                    setErrorMsg("");
                                                                    setStatus("idle");
                                                                }, 1500);
                                                            } catch (e: any) {
                                                                setVerifyError(extractApiError(e, t("form.verify.verifyError")));
                                                            } finally {
                                                                setVerifyingOtp(false);
                                                            }
                                                        }}
                                                        disabled={verifyingOtp || otpCode.length < 6}
                                                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50"
                                                    >
                                                        {verifyingOtp ? t("form.verify.verifying") : t("form.verify.verify")}
                                                    </button>
                                                </div>
                                                {verifyError && (
                                                    <p className="text-[11px] font-bold text-rose-600">{verifyError}</p>
                                                )}
                                                {verifySuccess && (
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600">
                                                        <CheckCircle2 size={14} />
                                                        {t("form.verify.success", { defaultValue: "Email verified successfully!" })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!isAuthed || !isFormValid || status === "sending"}
                                    className="group relative w-full bg-cyan-600 text-white py-5 rounded-2xl overflow-hidden transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-700 cursor-pointer"
                                >
                                    <div className="relative flex items-center justify-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-[0.4em]">
                                            {status === "sending" ? t("form.sending") : t("form.submit")}
                                        </span>
                                        {status === "sending" ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Send
                                                size={16}
                                                className="transition-transform group-hover:translate-x-1"
                                            />
                                        )}
                                    </div>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* ─── Sidebar: Call Support + Info ─── */}
                    <div className="space-y-6">
                        {/* Call Support Card */}
                        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <MessageCircle size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-zinc-900">
                                        {t("sidebar.call.title")}
                                    </h3>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                                        {t("sidebar.call.subtitle")}
                                    </p>
                                </div>
                            </div>

                            <a
                                href={t("sidebar.call.tel")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center bg-emerald-600 text-white py-4 rounded-2xl text-sm font-bold tracking-wide hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <MessageCircle size={16} />
                                    {t("sidebar.call.value")}
                                </span>
                            </a>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Clock size={14} className="text-zinc-300" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                            {t("sidebar.hours.title")}
                                        </p>
                                        <p className="text-xs font-medium text-zinc-600">
                                            {t("sidebar.hours.value")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail size={14} className="text-zinc-300" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                            {t("sidebar.email.title")}
                                        </p>
                                        <a
                                            href="mailto:support@simakfresh.ae"
                                            className="text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                                        >
                                            {t("sidebar.email.value")}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Info Card */}
                        <div className="bg-linear-to-br from-zinc-900 to-zinc-800 rounded-[2rem] p-8 text-white">
                            <h3 className="text-base font-semibold mb-3">
                                {t("quick.title")}
                            </h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                {t("quick.textBefore")}{" "}
                                <a
                                    href="/orders"
                                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                                >
                                    {t("quick.ordersLink")}
                                </a>{" "}
                                {t("quick.textAfter")}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                <Headphones size={14} />
                                {t("quick.response")}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16">
                    <div className="text-center mb-10">
                        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                            <FileText size={14} /> {t("faq.badge")}
                        </span>
                        <h2 className="text-2xl font-semibold text-zinc-900">
                            {t("faq.title")}
                        </h2>
                    </div>
                    <div className="max-w-2xl mx-auto space-y-3">
                        {(t("faq.items", { returnObjects: true }) as any[]).map((item, i) => (
                            <FaqItem key={i} q={item.q} a={item.a} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportPage;
