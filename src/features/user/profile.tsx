import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
    User, Mail, Phone, LogOut, Camera, Save, Loader2, Calendar,
    MapPin, Package, Plus, Edit3, X, Home, Briefcase, Globe, Star,
    ChevronRight, CheckCircle, Hash, Clock, Truck, XCircle, AlertCircle,
    ChevronDown, Gift, Copy, Share2, Percent, Tag
} from "lucide-react";
import referralInviteImg from "../../assets/referral/referral_invite.png";
import referralPurchaseImg from "../../assets/referral/referral_purchase.png";
import referralRewardImg from "../../assets/referral/referral_reward.png";
import { motion, AnimatePresence } from "framer-motion";
import { logout, setUser } from "../auth/authSlice";
import { profileApi, type ProfileUpdatePayload } from "./profileApi";
import { customersApi, type AddressDto, type UserDto } from "../admin/customers/customersApi";
import GoogleMapPicker, { type MapPickerResult } from "../../components/ui/GoogleMapPicker";
import { AddressDeleteIcon } from "../admin/customers/addressDeleteIcon";
import { ordersApi, type OrderDto } from "../admin/orders/ordersApi";
import { reviewsApi, type ReviewDto } from "../admin/reviews/reviewsApi";
import { useUserProfile } from "../../hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ui/Toast";
import { api, tokenManager } from "../../services/api";
import useLanguageToggle from "../../hooks/useLanguageToggle";
import BackendData from "../../components/ui/BackendData";
import { useTranslation } from "react-i18next";
import { normalizeMediaUrl } from "../../utils/media";

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */
type TabKey = "profile" | "orders" | "addresses" | "reviews" | "referrals_coupons";

interface ProfilePageProps {
    // No longer using initialSection - always start from default tabs
}

const EMIRATES = [
    { value: "abu_dhabi", label: "Abu Dhabi" },
];

type CouponStatusKey = "active" | "inactive" | "expired" | "redeemed" | "deleted";
type CouponTypeKey = "standard" | "referral" | "firstOrder";

type ProfileCouponCard = {
    id: string;
    code: string;
    title: string;
    description: string;
    badge?: string;
    statusKey: CouponStatusKey;
    statusLabel: string;
    statusClassName: string;
    typeKey: CouponTypeKey;
    typeLabel: string;
    validUntil: string;
    usage: string;
};

const parseCouponAmount = (value?: unknown) => {
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatCouponDate = (value?: string | null) => {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toLocaleDateString("en-AE", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const normalizeProfileCoupon = (raw: any, index: number, t: any): ProfileCouponCard | null => {
    const code = String(raw?.coupon_code ?? raw?.code ?? raw?.promo_code ?? "").trim().toUpperCase();

    if (!code) return null;

    const discountType = String(raw?.discount_type ?? "").toLowerCase();
    const discountValue = raw?.discount_value ?? raw?.discount_amount ?? raw?.amount ?? raw?.percentage;
    let badge: string | undefined;

    if (discountType === "percentage" && discountValue !== undefined && discountValue !== null && String(discountValue).trim() !== "") {
        badge = `${parseCouponAmount(discountValue).toFixed(0)}% OFF`;
    } else if (discountValue !== undefined && discountValue !== null && String(discountValue).trim() !== "") {
        badge = `AED ${parseCouponAmount(discountValue).toFixed(0)} OFF`;
    }

    const validUntil = formatCouponDate(raw?.valid_to) ?? t("profile.coupons.noExpiry", { defaultValue: "No expiry" });
    const usageLimit = raw?.usage_limit;
    const usedCount = Number(raw?.used_count ?? 0);
    
    const isDeleted = Boolean(raw?.deleted_at);
    const isInactive = raw?.is_active === false;
    const isExpired = Boolean(raw?.valid_to) && !Number.isNaN(new Date(raw.valid_to).getTime()) && new Date(raw.valid_to).getTime() < Date.now();
    const isRedeemed = usageLimit !== null && usageLimit !== undefined && usedCount >= Number(usageLimit);
    
    const usage = isRedeemed 
        ? t("profile.coupons.exhausted", { defaultValue: "Exhausted" })
        : usageLimit === null || usageLimit === undefined
            ? t("profile.coupons.unlimited", { defaultValue: "Unlimited" })
            : `${usedCount} / ${usageLimit}`;

    let statusKey: CouponStatusKey = "active";
    if (isDeleted) statusKey = "deleted";
    else if (isInactive) statusKey = "inactive";
    else if (isExpired) statusKey = "expired";
    else if (isRedeemed) statusKey = "redeemed";

    const statusConfig: Record<CouponStatusKey, { label: string; className: string }> = {
        active: { label: t("profile.coupons.active", { defaultValue: "Active" }), className: "bg-emerald-50 text-emerald-700" },
        inactive: { label: t("profile.coupons.inactive", { defaultValue: "Inactive" }), className: "bg-slate-100 text-slate-500" },
        expired: { label: t("profile.coupons.expired", { defaultValue: "Expired" }), className: "bg-amber-50 text-amber-700" },
        redeemed: { label: t("profile.coupons.redeemed", { defaultValue: "Redeemed" }), className: "bg-rose-50 text-rose-700" },
        deleted: { label: t("profile.coupons.deleted", { defaultValue: "Deleted" }), className: "bg-slate-100 text-slate-500" },
    };

    const typeKey: CouponTypeKey = raw?.is_referral_reward ? "referral" : raw?.is_first_order_reward ? "firstOrder" : "standard";
    const typeLabel = typeKey === "referral"
        ? t("profile.coupons.referralReward", { defaultValue: "Referral reward" })
        : typeKey === "firstOrder"
            ? t("profile.coupons.firstOrderReward", { defaultValue: "First order reward" })
            : t("profile.coupons.availableCoupon", { defaultValue: "Available coupon" });

    const title = String(raw?.title ?? raw?.name ?? code).trim() || code;
    const description = String(
        raw?.description || raw?.message || raw?.short_description || t("profile.coupons.availableCoupon", { defaultValue: "Available coupon" })
    ).trim();

    return {
        id: String(raw?.id ?? `${code}-${index}`),
        code,
        title,
        description,
        badge,
        statusKey,
        statusLabel: statusConfig[statusKey].label,
        statusClassName: statusConfig[statusKey].className,
        typeKey,
        typeLabel,
        validUntil,
        usage,
    };
};

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
const ProfilePage: React.FC<ProfilePageProps> = () => {
    // Bring in i18n to ensure we can listen to language state on initial load
    const { t, i18n } = useTranslation("profile");
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useSelector((state: any) => state.auth); // eslint-disable-line @typescript-eslint/no-explicit-any
    const queryClient = useQueryClient();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<TabKey>("profile");
    const [uploadingImage, setUploadingImage] = useState(false);

    const { data: profileData, isLoading: loading } = useUserProfile(isAuthenticated);

    // Force document direction to update dynamically based on language selection
    useEffect(() => {
        if (i18n?.language) {
            document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        }
    }, [i18n?.language]);

    const handleLogout = () => {
        dispatch(logout() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        queryClient.clear(); // Clear all queries on logout to prevent state leak
        navigate("/login");
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-4 w-full max-w-sm">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-300 shadow-sm border border-slate-100">
                        <User size={36} />
                    </div>
                    <p className="text-slate-500 font-medium">{t("profile.auth.loginRequired")}</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full sm:w-auto px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // Prioritize profileData but allow Redux user to provide the most recent verification flags if query is stale
    const displayUser = profileData || user;
    const fullName = [displayUser?.first_name, displayUser?.last_name].filter(Boolean).join(" ") || displayUser?.username || t("profile.auth.accountMember");
    const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            // Optimistically show the image instantly
            const previewUrl = URL.createObjectURL(file);
            const optimisticUser = {
                ...displayUser,
                profile: {
                    ...(displayUser?.profile || {}),
                    profile_picture: previewUrl
                }
            };
            queryClient.setQueryData(["userProfile"], optimisticUser);
            dispatch(setUser(optimisticUser));

            const formData = new FormData();
            formData.append("profile.profile_picture", file);
            await profileApi.updateProfile(displayUser.id, formData);

            // Refetch to ensure all fields and absolute URLs match exactly what the backend gives on fresh load
            const freshProfile = await profileApi.getMe();

            queryClient.setQueryData(["userProfile"], freshProfile);
            dispatch(setUser(freshProfile));
            toast.show(t("profile.messages.profilePicUpdated"), "success");
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const msg = err?.response?.data?.detail
                || err?.response?.data?.profile?.profile_picture?.[0]
                || t("profile.messages.failedToUpdateProfilePic");
            toast.show(msg, "error");
            // If failed, refetch to revert the optimistic update
            const freshProfile = await profileApi.getMe().catch(() => displayUser);
            queryClient.setQueryData(["userProfile"], freshProfile);
            dispatch(setUser(freshProfile));
        } finally {
            setUploadingImage(false);
        }
    };

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: "profile", label: t("profile.sidebar.personalInfo", { defaultValue: "Personal Info" }), icon: <User size={18} /> },
        { key: "orders", label: t("profile.sidebar.myOrders", { defaultValue: "My Orders" }), icon: <Package size={18} /> },
        { key: "reviews", label: t("profile.sidebar.reviews", { defaultValue: "Reviews" }), icon: <Star size={18} /> },
        { key: "addresses", label: t("profile.sidebar.addresses", { defaultValue: "Addresses" }), icon: <MapPin size={18} /> },
        { key: "referrals_coupons", label: t("profile.sidebar.rewards", { defaultValue: "Rewards" }), icon: <Gift size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFB] font-sans">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 lg:py-12">
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr] gap-6 lg:gap-8">

                    {/* ═══════ LEFT SIDEBAR ═══════ */}
                    <div className="space-y-4 md:space-y-5">
                        {/* Avatar Card */}
                        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">

                            {/* ✅ Logout Button placed inside the profile card */}
                            <button
                                onClick={handleLogout}
                                title="Sign Out"
                                className="absolute top-4 end-4 z-10 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all shadow-sm"
                            >
                                <LogOut size={16} />
                            </button>

                            <div className="h-20 md:h-24 bg-gradient-to-br from-cyan-500 via-cyan-600 to-teal-600 relative">
                                <div className="absolute inset-0 opacity-20">
                                    <div className="absolute -top-8 -end-8 w-32 h-32 bg-white rounded-full blur-2xl" />
                                    <div className="absolute -bottom-12 -start-8 w-40 h-40 bg-cyan-300 rounded-full blur-3xl" />
                                </div>
                            </div>

                            <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-10 md:-mt-12 flex flex-col sm:flex-row md:flex-col items-start sm:items-end md:items-start gap-4 md:gap-0">
                                <div className="relative group w-fit">
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white p-1 shadow-lg">
                                        <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-cyan-50 to-slate-50 flex items-center justify-center overflow-hidden">
                                            {normalizeMediaUrl(displayUser?.profile?.profile_picture) ? (
                                                <img src={normalizeMediaUrl(displayUser.profile.profile_picture)!} alt="Avatar" className="w-full h-full object-cover rounded-[14px]" />
                                            ) : (
                                                <span className="text-lg md:text-xl font-black text-cyan-600">{initials}</span>
                                            )}
                                        </div>
                                    </div>
                                    <label className="absolute -bottom-1 -end-1 p-1.5 bg-white rounded-lg shadow-md border border-slate-100 text-slate-400 hover:text-cyan-600 transition-all cursor-pointer hover:shadow-lg">
                                        <input type="file" className="hidden" accept="image/*" disabled={uploadingImage} onChange={handleImageUpload} />
                                        {uploadingImage ? <Loader2 size={14} className="animate-spin text-cyan-500" /> : <Camera size={14} />}
                                    </label>
                                </div>

                                <div className="mt-0 sm:mt-2 md:mt-4 space-y-1 sm:pb-1 md:pb-0">
                                    <h2 className="text-base md:text-lg font-bold text-slate-900">{fullName}</h2>
                                    <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-400">
                                        <Phone size={12} />
                                        <span><BackendData value={displayUser?.phone_number || "Not set"} /></span>
                                    </div>
                                    {displayUser?.email && (
                                        <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-400">
                                            <Mail size={12} className="shrink-0" />
                                            <span className="truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[220px]"><BackendData value={displayUser.email} /></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-2 flex overflow-x-auto md:flex-col gap-2 md:gap-1 profile-hide-scrollbar">
                            {tabs.map(({ key, label, icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === key
                                        ? "bg-cyan-50 text-cyan-700"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                        }`}
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ═══════ MAIN CONTENT ═══════ */}
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 md:p-8 min-h-[400px] md:min-h-[500px]">
                        <AnimatePresence mode="wait">
                            {activeTab === "profile" && (
                                <PersonalInfoTab
                                    key="profile"
                                    profileData={displayUser}
                                    loading={loading}
                                    onSaved={(freshUser) => {
                                        queryClient.setQueryData(["userProfile"], freshUser);
                                        dispatch(setUser(freshUser));
                                        toast.show(t("profile.messages.profileUpdated"), "success");
                                    }}
                                    onError={(msg) => toast.show(msg, "error")}
                                />
                            )}
                            {activeTab === "orders" && <OrdersTab key="orders" />}
                            {activeTab === "reviews" && (
                                <ReviewsTab
                                    key="reviews"
                                    userId={displayUser.id}
                                />
                            )}
                            {activeTab === "addresses" && (
                                <AddressesTab
                                    key="addresses"
                                    onSuccess={(msg) => toast.show(msg, "success")}
                                    onError={(msg) => toast.show(msg, "error")}
                                />
                            )}
                            {activeTab === "referrals_coupons" && (
                                <div key="referrals_coupons" className="space-y-8">
                                    {/* Referrals Section */}
                                    <section className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
                                                <Gift size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-base md:text-lg font-bold text-slate-900">{t("profile.sidebar.referrals", { defaultValue: "Referrals" })}</h2>
                                                <p className="text-[11px] md:text-xs text-slate-400">{t("profile.referrals.title", { defaultValue: "Friends Who Refer" })}</p>
                                            </div>
                                        </div>
                                        <ReferralTab user={displayUser} />
                                    </section>

                                    {/* Divider */}
                                    <div className="border-t border-slate-100" />

                                    {/* Coupons Section */}
                                    <section className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                                <Tag size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-base md:text-lg font-bold text-slate-900">{t("profile.sidebar.coupons", { defaultValue: "Coupons" })}</h2>
                                                <p className="text-[11px] md:text-xs text-slate-400">{t("profile.coupons.title", { defaultValue: "Available Coupons" })}</p>
                                            </div>
                                        </div>
                                        <CouponsTab />
                                    </section>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════
   Personal Info Tab — view/edit toggle
   ═══════════════════════════════════════════════ */
interface PersonalInfoTabProps {
    profileData: UserDto | null;
    loading: boolean;
    onSaved: (user: UserDto) => void;
    onError: (msg: string) => void;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ profileData, loading, onSaved, onError }) => {
    // Bring in i18n to force global document language switch on save
    const { t, i18n } = useTranslation("profile");
    const [editing, setEditing] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [gender, setGender] = useState<"M" | "F" | "O" | "">("");
    const [dob, setDob] = useState("");
    const [email, setEmail] = useState("");
    const [preferredLanguage, setPreferredLanguage] = useState("");
    const [saving, setSaving] = useState(false);

    const toast = useToast();
    const queryClient = useQueryClient();
    const dispatch = useDispatch();
    const isVerified = profileData?.is_email_verified;
    const isPhoneVerified = profileData?.is_phone_verified;
    const maxDateOfBirth = (() => {
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 10);
        return cutoff.toISOString().slice(0, 10);
    })();

    // OTP Modal State
    const [otpModalState, setOtpModalState] = useState<{
        isOpen: boolean;
        type: "email" | "phone";
        step: "input" | "otp";
        newValue: string;
        otpCode: string;
        sending: boolean;
        verifying: boolean;
        error: string | null;
    }>({
        isOpen: false,
        type: "email",
        step: "input",
        newValue: "",
        otpCode: "",
        sending: false,
        verifying: false,
        error: null
    });

    // Country selector state for phone verification (reuse login's flags)
    const otpCountries = [
        { code: "+971", flag: "https://flagcdn.com/w40/ae.png", name: "UAE" },
        { code: "+91", flag: "https://flagcdn.com/w40/in.png", name: "India" },
        { code: "+86", flag: "https://flagcdn.com/w40/cn.png", name: "China" },
    ];
    const [otpCountryCode, setOtpCountryCode] = useState("+971");
    const [otpDropdownOpen, setOtpDropdownOpen] = useState(false);
    const otpDropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (otpDropdownRef.current && !otpDropdownRef.current.contains(e.target as Node)) {
                setOtpDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Phone requirements by country (same rules as Login)
    const getPhoneRequirements = (code: string) => {
        switch (code) {
            case "+971": return { length: 9, pattern: /^5/, name: "UAE" };
            case "+91": return { length: 10, pattern: /^[6-9]/, name: "India" };
            case "+86": return { length: 11, pattern: /^1/, name: "China" };
            default: return { length: 10, pattern: null, name: "Phone" };
        }
    };
    const otpPhoneReq = getPhoneRequirements(otpCountryCode);
    const isOtpPhoneValid = otpModalState.type === "phone"
        ? (() => {
            const digits = otpModalState.newValue.replace(/[^\d]/g, "");
            if (digits.length !== otpPhoneReq.length) return false;
            return otpPhoneReq.pattern ? otpPhoneReq.pattern.test(digits) : true;
        })()
        : true;

    useLanguageToggle();

    useEffect(() => {
        if (profileData) {
            setFirstName(profileData.first_name || "");
            setLastName(profileData.last_name || "");
            setGender((profileData.profile?.gender as "M" | "F" | "O" | "") || "");
            setDob(profileData.profile?.date_of_birth || "");
            setEmail(profileData.email || "");
            setPreferredLanguage(profileData.profile?.preferred_language || "en");
        }
    }, [profileData]);

    const handleSave = async () => {
        if (!firstName.trim()) { onError(t("profile.messages.firstNameRequired")); return; }
        if (dob) {
            const birth = new Date(dob + "T00:00:00");
            const today = new Date();
            const age = today.getFullYear() - birth.getFullYear() - ((today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) ? 1 : 0);
            if (age < 10) { onError("You must be at least 10 years old."); return; }
        }
        setSaving(true);
        try {
            const payload: ProfileUpdatePayload = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                profile: {
                    gender: gender as "M" | "F" | "O",
                    ...(dob ? { date_of_birth: dob } : {}), // Only include if not empty
                    preferred_language: preferredLanguage, // Use the state value
                },
            };

            await profileApi.updateProfile(profileData!.id, payload);

            // 1. Update the i18n language instance
            if (preferredLanguage && i18n.language !== preferredLanguage) {
                await i18n.changeLanguage(preferredLanguage);
                // 2. Persist to localStorage so it survives refresh
                localStorage.setItem("i18nextLng", preferredLanguage);
                // 3. Update document direction
                document.documentElement.dir = preferredLanguage === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = preferredLanguage;
            }

            const freshProfile = await profileApi.getMe();
            onSaved(freshProfile);
            setEditing(false);
        } catch (err: any) {
            onError(t("profile.messages.failedToUpdateProfile"));
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profileData) {
            setFirstName(profileData.first_name || "");
            setLastName(profileData.last_name || "");
            setGender((profileData.profile?.gender as "M" | "F" | "O" | "") || "");
            setDob(profileData.profile?.date_of_birth || "");
            setPreferredLanguage(profileData.profile?.preferred_language || "en");
        }
        setEditing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-300">
                <Loader2 size={28} className="animate-spin" />
            </div>
        );
    }

    const genderLabel = gender === "M" ? t("profile.personalInfo.male") : gender === "F" ? t("profile.personalInfo.female") : gender === "O" ? t("profile.personalInfo.other") : "—";

    // --- OTP Handlers ---
    const handleOpenOtpModal = (type: "email" | "phone") => {
        setOtpModalState({
            isOpen: true,
            type,
            step: "input",
            newValue: type === "email" ? profileData?.email || "" : profileData?.phone_number || "",
            otpCode: "",
            sending: false,
            verifying: false,
            error: null
        });
    };

    const handleSendOtp = async () => {
        const { type, newValue } = otpModalState;
        if (!newValue.trim()) {
            setOtpModalState(prev => ({ ...prev, error: t("profile.messages.otpInputError", { type: type === "email" ? t("profile.personalInfo.email") : t("profile.personalInfo.phone") }) }));
            return;
        }
        setOtpModalState(prev => ({ ...prev, sending: true, error: null }));
        try {
            const isValueChanged = (type === "email" && newValue !== profileData?.email) ||
                (type === "phone" && newValue !== profileData?.phone_number);

            if (isValueChanged) {
                await profileApi.updateProfile(profileData!.id, {
                    ...(type === "email"
                        ? { email: newValue }
                        : { phone_number: `${otpCountryCode}${newValue.replace(/^0+/, "")}` })
                });
            }

            await profileApi.sendProfileOtp({
                otp_type: type,
                ...(type === "email"
                    ? { email: newValue }
                    : { phone_number: `${otpCountryCode}${newValue.replace(/^0+/, "")}` })
            });

            if (isValueChanged) {
                const freshProfile = await profileApi.getMe();
                onSaved(freshProfile);
            }

            setOtpModalState(prev => ({ ...prev, step: "otp", sending: false, error: null }));
            toast.show(t("profile.messages.otpSent", { type: type === "email" ? t("profile.personalInfo.email") : t("profile.personalInfo.phone") }), "success");
        } catch (err: any) {
            // Always show exact API error message
            let msg = err?.response?.data?.detail;
            // If error is an object (e.g. { email: [...] }), show first value
            if (!msg && err?.response?.data) {
                const errorObj = err.response.data;
                const firstKey = Object.keys(errorObj)[0];
                if (Array.isArray(errorObj[firstKey])) {
                    msg = errorObj[firstKey][0];
                } else {
                    msg = errorObj[firstKey];
                }
            }
            setOtpModalState(prev => ({ ...prev, sending: false, error: msg || "An error occurred." }));
        }
    };

    const handleVerifyOtp = async () => {
        const { type, otpCode, newValue } = otpModalState;
        if (!otpCode.trim() || otpCode.length < 6) {
            setOtpModalState(prev => ({ ...prev, error: t("profile.messages.otpInvalid") }));
            return;
        }
        setOtpModalState(prev => ({ ...prev, verifying: true, error: null }));
        try {
            const res = await profileApi.verifyProfileOtp({
                otp_type: type,
                otp_code: otpCode,
                ...(type === "email"
                    ? { email: newValue }
                    : { phone_number: `${otpCountryCode}${newValue.replace(/^0+/, "")}` })
            });

            const accessToken = res?.access || res?.accessToken || res?.token;
            if (accessToken) {
                tokenManager.set(accessToken);
            }

            const freshProfile = (res?.user || res?.id) ? (res?.user || res) : await profileApi.getMe();

            queryClient.setQueryData(["userProfile"], freshProfile);
            await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            dispatch(setUser(freshProfile));
            onSaved(freshProfile);

            setOtpModalState(prev => ({ ...prev, isOpen: false, verifying: false }));
            toast.show(t("profile.otp.success", { type: type === "email" ? t("profile.personalInfo.email") : t("profile.personalInfo.phone") }), "success");
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const msg = err?.response?.data?.detail || t("profile.messages.otpVerifyError");
            setOtpModalState(prev => ({ ...prev, verifying: false, error: msg }));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
        >
            {/* --- OTP MODAL --- */}
            <AnimatePresence>
                {otpModalState.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 w-full max-w-sm shadow-xl relative"
                        >
                            <button
                                onClick={() => setOtpModalState(prev => ({ ...prev, isOpen: false }))}
                                className="absolute top-3 end-3 md:top-4 md:end-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={16} />
                            </button>

                            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                                {t("profile.otp.verify", { type: otpModalState.type === "email" ? t("profile.personalInfo.email") : t("profile.personalInfo.phone") })}
                            </h3>
                            <p className="text-xs md:text-sm text-slate-500 mb-5 md:mb-6">
                                {otpModalState.step === "input"
                                    ? `Enter the new ${otpModalState.type} you want to verify.`
                                    : `Enter the 6-digit OTP sent to your ${otpModalState.type}.`}
                            </p>

                            {otpModalState.error && (
                                <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    {otpModalState.error}
                                </div>
                            )}

                            {otpModalState.step === "input" ? (
                                <div className="space-y-4">
                                    {otpModalState.type === "email" ? (
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">
                                                {t("profile.personalInfo.email")}
                                            </label>
                                            <input
                                                type="email"
                                                value={otpModalState.newValue}
                                                onChange={(e) => setOtpModalState(prev => ({ ...prev, newValue: e.target.value }))}
                                                className="profile-field-input mt-1"
                                                placeholder="Enter email..."
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">
                                                {t("profile.personalInfo.phone")}
                                            </label>
                                            <div className="flex gap-2 mt-1">
                                                <div className="relative" ref={otpDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOtpDropdownOpen(!otpDropdownOpen)}
                                                        className="h-11 px-3 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-sm hover:bg-slate-50"
                                                    >
                                                        <img src={(otpCountries.find(c => c.code === otpCountryCode) || otpCountries[0]).flag} alt="flag" className="w-5 h-[14px] object-cover rounded-sm" />
                                                        <span className="text-xs font-medium text-slate-700">{otpCountryCode}</span>
                                                        <ChevronDown size={12} className={`text-slate-400 transition-transform ${otpDropdownOpen ? "rotate-180" : ""}`} />
                                                    </button>
                                                    {otpDropdownOpen && (
                                                        <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                                            {otpCountries.map((c) => (
                                                                <button
                                                                    key={c.code}
                                                                    type="button"
                                                                    onClick={() => { setOtpCountryCode(c.code); setOtpDropdownOpen(false); }}
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-cyan-50 ${c.code === otpCountryCode ? "bg-cyan-50 text-cyan-600" : "text-slate-700"}`}
                                                                >
                                                                    <img src={c.flag} alt={c.name} className="w-5 h-[14px] object-cover rounded-sm" />
                                                                    <span className="font-medium">{c.name}</span>
                                                                    <span className="ms-auto text-slate-400">{c.code}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={otpModalState.newValue}
                                                    onChange={(e) => setOtpModalState(prev => ({ ...prev, newValue: e.target.value.replace(/[^\d]/g, "") }))}
                                                    className={`profile-field-input mt-0 flex-1 ${!isOtpPhoneValid ? "border-rose-400" : ""}`}
                                                    placeholder={`${otpPhoneReq.length} digits`}
                                                    maxLength={otpPhoneReq.length}
                                                    autoFocus
                                                />
                                            </div>
                                            {!isOtpPhoneValid && (
                                                <p className="text-[10px] text-rose-500 font-medium px-1 mt-1">
                                                    {otpPhoneReq.name}: {otpPhoneReq.length} digits{otpPhoneReq.pattern ? ", specific starting digits required" : ""}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSendOtp}
                                        disabled={otpModalState.sending || !isOtpPhoneValid && otpModalState.type === "phone"}
                                        className="w-full py-3 md:py-3.5 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {otpModalState.sending ? <Loader2 size={16} className="animate-spin" /> : t("profile.otp.send")}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">
                                            {t("profile.otp.label")}
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otpModalState.otpCode}
                                            onChange={(e) => setOtpModalState(prev => ({ ...prev, otpCode: e.target.value.replace(/\D/g, '') }))}
                                            className="profile-field-input mt-1 tracking-widest text-center text-lg md:text-xl font-bold"
                                            placeholder={t("profile.otp.placeholder")}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2 md:gap-3">
                                        <button
                                            onClick={() => setOtpModalState(prev => ({ ...prev, step: "input", error: null }))}
                                            className="flex-1 py-3 md:py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-sm transition-all"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleVerifyOtp}
                                            disabled={otpModalState.verifying || otpModalState.otpCode.length < 6}
                                            className="flex-[2] py-3 md:py-3.5 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                        >
                                            {otpModalState.verifying ? <Loader2 size={16} className="animate-spin" /> : t("profile.otp.verify", { type: "" }).trim()}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header with edit toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 flex-shrink-0">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900">{t("profile.personalInfo.title", { defaultValue: "Personal Information" })}</h2>
                        <p className="text-[11px] md:text-xs text-slate-400">{t("profile.personalInfo.subtitle", { defaultValue: "Your personal details and preferences" })}</p>
                    </div>
                </div>

                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-cyan-50 hover:text-cyan-600 transition-colors border border-slate-100"
                    >
                        <Edit3 size={14} /> {t("profile.personalInfo.edit")}
                    </button>
                ) : (
                    <button
                        onClick={handleCancel}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-100"
                    >
                        <X size={14} /> {t("profile.personalInfo.cancel")}
                    </button>
                )}
            </div>

            <div className="space-y-4 md:space-y-5">
                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField
                        label={t("profile.personalInfo.firstName")}
                        value={firstName}
                        editing={editing}
                        onChange={setFirstName}
                        placeholder="Jane"
                        required
                    />
                    <InfoField
                        label={t("profile.personalInfo.lastName")}
                        value={lastName}
                        editing={editing}
                        onChange={setLastName}
                        placeholder="Doe"
                    />
                </div>

                {/* Email (Standard Profile Update) */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 w-full">
                            <InfoField
                                label={t("profile.personalInfo.email")}
                                value={email}
                                editing={editing}
                                onChange={setEmail}
                                placeholder="jane@example.com"
                            />
                        </div>
                        {!editing && (
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto sm:mt-6 shrink-0">
                                <button
                                    onClick={() => handleOpenOtpModal("email")}
                                    className={`w-auto px-4 sm:px-5 py-2 sm:py-3 rounded-xl font-bold text-xs transition-colors shadow-sm ${!profileData?.email || !isVerified
                                        ? "bg-cyan-500 text-white hover:bg-cyan-600"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                    {profileData?.email ? (isVerified ? t("profile.personalInfo.changeEmail") : t("profile.personalInfo.verifyEmail")) : t("profile.personalInfo.addEmail")}
                                </button>
                                {profileData?.email && (
                                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-center ${isVerified
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-amber-50 text-amber-600"
                                        }`}>
                                        {isVerified ? t("profile.personalInfo.verified") : t("profile.personalInfo.unverified")}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Phone — editable via OTP */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">{t("profile.personalInfo.phone")}</label>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Phone size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{profileData?.phone_number || "Not provided"}</span>
                            {profileData?.phone_number && (
                                <span className={`ms-auto shrink-0 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isPhoneVerified
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-amber-50 text-amber-600"
                                    }`}>
                                    {isPhoneVerified ? t("profile.personalInfo.verified") : t("profile.personalInfo.unverified")}
                                </span>
                            )}
                        </div>
                        {!editing && !isPhoneVerified && (
                            <div className="flex w-full sm:w-auto shrink-0">
                                <button
                                    onClick={() => handleOpenOtpModal("phone")}
                                    className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors shadow-sm"
                                >
                                    Edit Phone
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">{t("profile.personalInfo.gender")}</label>
                    {editing ? (
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {(["M", "F", "O"] as const).map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGender(g)}
                                    className={`py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all border-2 ${gender === g
                                        ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                        : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-200 hover:text-slate-600"
                                        }`}
                                >
                                    {g === "M" ? t("profile.personalInfo.male") : g === "F" ? t("profile.personalInfo.female") : t("profile.personalInfo.other")}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm font-medium text-slate-700">
                            {genderLabel}
                        </div>
                    )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">{t("profile.personalInfo.dob")}</label>
                    {editing ? (
                        <div className="relative">
                            <Calendar size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                max={maxDateOfBirth}
                                min="1900-01-01"
                                className="w-full ps-11 pe-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-slate-300 outline-none"
                            />
                        </div>
                    ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            {dob ? new Date(dob + "T00:00:00").toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                        </div>
                    )}
                </div>

                {/* Preferred Language */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1">{t("profile.personalInfo.language")}</label>
                    {editing ? (
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[
                                { id: "en", label: "English" },
                                { id: "ar", label: "Arabic" },
                                { id: "cn", label: "Chinese" }
                            ].map((lang) => (
                                <button
                                    key={lang.id}
                                    type="button"
                                    onClick={() => setPreferredLanguage(lang.id)}
                                    className={`py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all border-2 ${preferredLanguage === lang.id
                                        ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                        : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-200 hover:text-slate-600"
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Globe size={14} className="text-slate-400 shrink-0" />
                            {preferredLanguage === "en" ? t("profile.personalInfo.english") : preferredLanguage === "ar" ? t("profile.personalInfo.arabic") : preferredLanguage === "cn" ? t("profile.personalInfo.chinese") : t("profile.personalInfo.english")}
                        </div>
                    )}
                </div>

                {/* Save Button — only visible in edit mode */}
                {editing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end pt-6 border-t border-slate-100"
                    >
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-200/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? t("profile.personalInfo.saving") : t("profile.personalInfo.save")}
                        </button>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════
   Orders Tab — summary list
   ═══════════════════════════════════════════════ */
const getStatusMap = (t: any) => ({
    pending: { color: "text-amber-600", bg: "bg-amber-50", icon: <Clock size={12} />, label: t("profile.orders.status.pending") },
    confirmed: { color: "text-blue-600", bg: "bg-blue-50", icon: <CheckCircle size={12} />, label: t("profile.orders.status.confirmed") },
    processing: { color: "text-indigo-600", bg: "bg-indigo-50", icon: <Package size={12} />, label: t("profile.orders.status.processing") },
    shipped: { color: "text-cyan-600", bg: "bg-cyan-50", icon: <Truck size={12} />, label: t("profile.orders.status.shipped") },
    delivered: { color: "text-emerald-600", bg: "bg-emerald-50", icon: <CheckCircle size={12} />, label: t("profile.orders.status.delivered") },
    cancelled: { color: "text-rose-600", bg: "bg-rose-50", icon: <XCircle size={12} />, label: t("profile.orders.status.cancelled") },
});

const getStatus = (s: string, t: any) => {
    const map = getStatusMap(t);
    return map[s.toLowerCase() as keyof ReturnType<typeof getStatusMap>] || map.pending;
};

const OrdersTab: React.FC = () => {
    const { t } = useTranslation("profile");
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ordersApi.list().then((d) => { setOrders(d.results || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Package size={20} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900">{t("profile.orders.title", { defaultValue: "My Orders" })}</h2>
                        <p className="text-[11px] md:text-xs text-slate-400">{t("profile.orders.subtitle", { defaultValue: "Your recent purchases" })}</p>
                    </div>
                </div>
                <Link to="/orders" className="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1 self-end sm:self-auto">
                    {t("profile.orders.viewAll")} <ChevronRight size={14} className="rtl:rotate-180" />
                </Link>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 sm:h-20 bg-slate-50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="text-slate-300" size={28} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-4">{t("profile.orders.empty")}</p>
                    <Link to="/products" className="inline-flex px-6 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 transition-colors">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="space-y-3 md:space-y-4">
                    {orders.slice(0, 5).map((order) => {
                        const st = getStatus(order.status, t);
                        return (
                            <Link
                                key={order.id}
                                to={`/orders/${order.id}`}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group text-start"
                            >
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 flex-shrink-0">
                                        <Hash size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">Order ID: {order.id}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {new Date(order.created_at).toLocaleDateString("en-AE", { month: "short", day: "numeric", year: "numeric" })}
                                            {" · "}
                                            {order.items.length} {order.items.length !== 1 ? (t("profile.orders.items_plural") || "items") : (t("profile.orders.items") || "item")}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto sm:ms-auto border-t sm:border-none border-slate-50 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase shrink-0 ${st.color} ${st.bg}`}>
                                        {st.icon} {st.label}
                                    </span>
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <span className="text-sm font-black text-slate-900">AED {parseFloat(order.total_amount).toFixed(2)}</span>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-cyan-600 transition-colors hidden sm:block rtl:rotate-180" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                    {orders.length > 5 && (
                        <Link to="/orders" className="block text-center text-xs font-bold text-cyan-600 hover:underline py-3">
                            {t("profile.orders.viewAllCount", { count: orders.length })}
                        </Link>
                    )}
                </div>
            )}
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════
   Reviews Tab — list + edit
   ═══════════════════════════════════════════════ */
const ReviewsTab: React.FC<{ userId: number }> = ({ userId }) => {
    const { t } = useTranslation("profile");
    const [reviews, setReviews] = useState<ReviewDto[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<ReviewDto | null>(null);
    const [editRating, setEditRating] = useState(0);
    const [editComment, setEditComment] = useState("");
    const [editFiles, setEditFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const toast = useToast();

    const normalizeMedia = (input: any) => {
        if (!input) return "";
        if (typeof File !== "undefined" && input instanceof File) {
            try { return URL.createObjectURL(input); } catch { /* ignore */ }
        }
        if (typeof input === "object") {
            const candidate = input.url || input.image || input.path || input.src;
            if (typeof candidate === "string") return normalizeMedia(candidate);
            return "";
        }
        const src: string = String(input);
        if (!src) return "";
        if (/^https?:\/\//i.test(src)) return src;
        const apiBase: string | undefined = (import.meta as any).env?.VITE_API_BASE_URL;
        const mediaBase =
            (import.meta as any).env?.VITE_MEDIA_BASE_URL ||
            ((apiBase && /^https?:\/\//i.test(apiBase)) ? new URL(apiBase).origin : window.location.origin);
        if (src.startsWith("/")) return `${mediaBase}${src}`;
        return `${mediaBase}/${src.replace(/^\.?\/*/, "")}`;
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await reviewsApi.list({ user: userId, limit: 100 });
                if (mounted) setReviews(res.results || []);
            } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (mounted) setError(e?.message || "Failed to load reviews");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [userId]);

    const openEdit = (r: ReviewDto) => {
        setEditing(r);
        setEditRating(r.rating);
        setEditComment(r.comment || "");
        setEditFiles([]);
    };

    const submitEdit = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            const updated = await reviewsApi.update(editing.id, {
                rating: editRating,
                comment: editComment.trim(),
                uploaded_images: editFiles.length ? editFiles : undefined,
            });
            setReviews((prev) =>
                (prev || []).map((r) => (r.id === updated.id ? updated : r))
            );
            setEditing(null);
            toast.show("Review updated", "success");
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const apiErr = err?.response?.data;
            const detail =
                (typeof apiErr === "string" && apiErr) ||
                apiErr?.detail ||
                apiErr?.message ||
                "Failed to update review";
            toast.show(detail, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500 shrink-0">
                    <Star size={20} />
                </div>
                <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-900">{t("profile.reviews.title", { defaultValue: "My Reviews" })}</h2>
                    <p className="text-[11px] md:text-xs text-slate-400">{t("profile.reviews.subtitle", { defaultValue: "All reviews you have written" })}</p>
                </div>
            </div>

            {loading && <div className="text-sm text-slate-500">{t("profile.reviews.loading", { defaultValue: "Loading reviews…" })}</div>}
            {error && <div className="text-sm text-rose-600">{error}</div>}
            {!loading && !error && (
                <>
                    {reviews && reviews.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reviews.map((r) => {
                                const isOpen = expandedId === r.id;
                                return (
                                    <div key={r.id} className="border border-slate-200 rounded-2xl bg-white">
                                        <button
                                            onClick={() => setExpandedId(isOpen ? null : r.id)}
                                            className="w-full flex items-center justify-between p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("profile.reviews.reviewLabel", { defaultValue: "Review" })}</span>
                                                <span className="text-sm font-bold text-slate-900">{r.product_name || `#${r.product}`}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">{isOpen ? t("profile.reviews.hide", { defaultValue: "Hide" }) : t("profile.reviews.view", { defaultValue: "View" })}</span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 pb-4">
                                                <div className="flex items-center gap-1 mb-2">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star key={i} size={16} className={i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"} />
                                                    ))}
                                                </div>
                                                <p className="text-sm text-slate-700 mb-3">{r.comment}</p>
                                                {Array.isArray(r.images) && r.images.length > 0 && (
                                                    <div className="flex gap-2 flex-wrap mb-3">
                                                        {r.images.slice(0, 6).map((entry: any, idx: number) => {
                                                            const raw = typeof entry === "string" ? entry : entry?.image;
                                                            const cleaned = typeof raw === "string" ? raw.trim().replace(/^['\"`]+|['\"`]+$/g, "") : "";
                                                            const url = normalizeMedia(cleaned);
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => setViewerUrl(url)}
                                                                    className="group relative"
                                                                    aria-label="Expand image"
                                                                >
                                                                    <img src={url} alt="review" className="w-14 h-14 rounded-md object-cover border border-slate-200" />
                                                                    <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {r.admin_response && (
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 mb-1">{t("profile.reviews.adminResponse", { defaultValue: "Admin Response" })}</p>
                                                        <p className="text-xs text-slate-700">{r.admin_response}</p>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        onClick={() => openEdit(r)}
                                                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                                                    >
                                                        {t("profile.reviews.edit", { defaultValue: "Edit" })}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">{t("profile.reviews.empty", { defaultValue: "You haven’t written any reviews yet." })}</p>
                    )}
                </>
            )}

            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setEditing(null)} />
                        <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm z-10 border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-900">{t("profile.reviews.editReview", { defaultValue: "Edit Review" })}</h3>
                                <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                {Array.from({ length: 5 }).map((_, i) => {
                                    const idx = i + 1;
                                    const active = idx <= editRating;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setEditRating(idx)}
                                            className="p-1"
                                        >
                                            <Star size={20} className={active ? "text-yellow-400 fill-yellow-400" : "text-slate-300"} />
                                        </button>
                                    );
                                })}
                            </div>
                            <textarea
                                value={editComment}
                                rows={3}
                                onChange={(e) => setEditComment(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-3 text-sm"
                                placeholder={t("profile.reviews.updateComment", { defaultValue: "Update your comment" })}
                            />
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                                {t("profile.reviews.addPhotos", { defaultValue: "Add Photos (Optional)" })}
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => setEditFiles(e.target.files ? Array.from(e.target.files) : [])}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 mb-3"
                            />
                            {editing.images && editing.images.length > 0 && (
                                <div className="flex gap-2 flex-wrap mb-3">
                                    {editing.images.slice(0, 6).map((entry: any, i) => {
                                        const raw = typeof entry === "string" ? entry : entry?.image;
                                        const cleaned = typeof raw === "string" ? raw.trim().replace(/^['\"`]+|['\"`]+$/g, "") : "";
                                        const url = normalizeMedia(cleaned);
                                        return <img key={i} src={url} alt="review" className="w-14 h-14 rounded-md object-cover border border-slate-200" />;
                                    })}
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setEditing(null)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700"
                                    disabled={saving}
                                >
                                    {t("profile.reviews.cancel", { defaultValue: "Cancel" })}
                                </button>
                                <button
                                    onClick={submitEdit}
                                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? t("profile.reviews.saving", { defaultValue: "Saving…" }) : t("profile.reviews.save", { defaultValue: "Save" })}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {viewerUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/60" onClick={() => setViewerUrl(null)} />
                        <div className="relative max-w-3xl w-full bg-white rounded-2xl p-2 shadow-2xl">
                            <button
                                onClick={() => setViewerUrl(null)}
                                className="absolute top-3 right-3 bg-white/80 rounded-full p-2 text-slate-600 hover:text-slate-900"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                            <img src={viewerUrl} alt="review" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* Inline lightbox viewer for ReviewsTab */
// We render it alongside the tab using AnimatePresence above (viewerUrl controls visibility)

/* ═══════════════════════════════════════════════
   Addresses Tab
   ═══════════════════════════════════════════════ */
import ConfirmModal from "../../components/ui/ConfirmModal";

const AddressesTab: React.FC<{ onSuccess: (msg: string) => void; onError: (msg: string) => void }> = ({ onSuccess, onError }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: any) => state.auth); // eslint-disable-line @typescript-eslint/no-explicit-any
    // State for ConfirmModal
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const handleDeleteAddress = (id: number) => {
        setDeleteId(id);
    };
    const confirmDeleteAddress = async () => {
        if (deleteId == null) return;
        setDeleting(true);
        try {
            await customersApi.deleteAddress(deleteId);
            setAddresses((prev) => prev.filter((a) => a.id !== deleteId));
            onSuccess("Address deleted!");
        } catch {
            onError("Failed to delete address.");
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };
    const { t } = useTranslation("profile");
    const [addresses, setAddresses] = useState<AddressDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        label: "home", full_name: "", phone_number: "", building_name: "",
        flat_villa_number: "", street_address: "", area: "", city: "",
        emirate: "abu_dhabi", country: "AE",
        latitude: null as number | null, longitude: null as number | null,
    });
    const [addrCountryCode, setAddrCountryCode] = useState("+971");
    const [addrDropdownOpen, setAddrDropdownOpen] = useState(false);
    const addrDropdownRef = useRef<HTMLDivElement>(null);
    const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
    const [addressPhoneOtpStep, setAddressPhoneOtpStep] = useState<"idle" | "otp">("idle");
    const [addressPhoneOtp, setAddressPhoneOtp] = useState("");
    const [sendingAddressOtp, setSendingAddressOtp] = useState(false);
    const [verifyingAddressOtp, setVerifyingAddressOtp] = useState(false);
    const [addressPhoneVerified, setAddressPhoneVerified] = useState(false);
    const [addressPhoneVerificationError, setAddressPhoneVerificationError] = useState<string | null>(null);
    const addressCountries = [
        { code: "+971", flag: "https://flagcdn.com/w40/ae.png", name: "UAE" },
        { code: "+91", flag: "https://flagcdn.com/w40/in.png", name: "India" },
        { code: "+86", flag: "https://flagcdn.com/w40/cn.png", name: "China" },
    ];

    const getPhonePrefill = (rawPhone?: string) => {
        const digitsPhone = String(rawPhone || "").replace(/[^\d+]/g, "");
        const supportedCodes = ["+971", "+91", "+86"];

        for (const code of supportedCodes) {
            if (digitsPhone.startsWith(code)) {
                return {
                    countryCode: code,
                    localNumber: digitsPhone.slice(code.length).replace(/^0+/, ""),
                };
            }
        }

        return {
            countryCode: "+971",
            localNumber: digitsPhone.replace(/[^\d]/g, "").replace(/^0+/, ""),
        };
    };
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (addrDropdownRef.current && !addrDropdownRef.current.contains(e.target as Node)) {
                setAddrDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const getAddrPhoneRequirements = (code: string) => {
        switch (code) {
            case "+971": return { length: 9, pattern: /^5/, name: "UAE" };
            case "+91": return { length: 10, pattern: /^[6-9]/, name: "India" };
            case "+86": return { length: 11, pattern: /^1/, name: "China" };
            default: return { length: 10, pattern: null, name: "Phone" };
        }
    };
    useEffect(() => {
        customersApi.listAddresses()
            .then((data) => { setAddresses(Array.isArray(data) ? data : data.results || []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const phoneVerified: boolean = Boolean(user?.is_phone_verified ?? user?.profile?.is_phone_verified);
    const accountPhoneComposed = String(user?.phone_number || "").replace(/\s+/g, "");
    const composedAddressPhone = `${addrCountryCode}${(form.phone_number || "").replace(/[^\d]/g, "").replace(/^0+/, "")}`;
    const isAddressPhoneSameAsAccount = Boolean(accountPhoneComposed) && composedAddressPhone === accountPhoneComposed;
    const addressPhoneReq = getAddrPhoneRequirements(addrCountryCode);
    const isAddressPhoneValid = (() => {
        const digits = (form.phone_number || "").replace(/[^\d]/g, "");
        return digits.length === addressPhoneReq.length && (!addressPhoneReq.pattern || addressPhoneReq.pattern.test(digits));
    })();
    const isAddressPhoneOtpVerified = addressPhoneVerified || (phoneVerified && isAddressPhoneSameAsAccount);

    const resetForm = () => {
        const prefill = getPhonePrefill(user?.phone_number);
        setForm({
            label: "home", full_name: "", phone_number: prefill.localNumber, building_name: "",
            flat_villa_number: "", street_address: "", area: "", city: "",
            emirate: "abu_dhabi", country: "AE",
            latitude: null, longitude: null,
        });
        setAddrCountryCode(prefill.countryCode);
        setAddressPhoneOtpStep("idle");
        setAddressPhoneOtp("");
        setAddressPhoneVerificationError(null);
        setAddressPhoneVerified(false);
    };

    useEffect(() => {
        if (!showForm) return;
        const prefill = getPhonePrefill(user?.phone_number);
        setAddrCountryCode(prefill.countryCode);
        setForm((prev) => ({
            ...prev,
            phone_number: prev.phone_number || prefill.localNumber,
        }));
        setAddressPhoneOtpStep("idle");
        setAddressPhoneOtp("");
        setAddressPhoneVerificationError(null);
        setAddressPhoneVerified(false);
    }, [showForm, user?.phone_number]);

    const handleSave = async () => {
        const errors: Record<string, string> = {};
        // Required fields
        if (!form.full_name || form.full_name.trim().length < 3) {
            errors.full_name = "Full name must be at least 3 characters";
        }
        if (!form.street_address || !form.street_address.trim()) {
            errors.street_address = "Street address is required";
        }
        if (!form.area || !form.area.trim()) {
            errors.area = "Area is required";
        }
        if (!form.emirate || !form.emirate.trim()) {
            errors.emirate = "Please select an emirate";
        }
        if (form.emirate && form.emirate !== "abu_dhabi") {
            errors.emirate = "Delivery is currently available only in Abu Dhabi.";
        }
        // Phone validation by country
        const req = getAddrPhoneRequirements(addrCountryCode);
        const digits = (form.phone_number || "").replace(/[^\d]/g, "");
        if (digits.length !== req.length || (req.pattern && !req.pattern.test(digits))) {
            errors.phone_number = `${req.name}: ${req.length} digits${req.pattern ? ", specific starting digits required" : ""}`;
        }
        if (!isAddressPhoneOtpVerified) {
            errors.phone_number = "Please verify this phone number with OTP before saving the address.";
        }
        setAddrErrors(errors);
        if (Object.keys(errors).length > 0) {
            onError("Please correct the highlighted fields");
            return;
        }
        setSaving(true);
        try {
            const newAddr = await customersApi.createAddress({
                ...form,
                phone_number: `${addrCountryCode}${(form.phone_number || "").replace(/[^\d]/g, "").replace(/^0+/, "")}`
            });
            setAddresses((prev) => [...prev, newAddr]);
            resetForm();
            setShowForm(false);
            onSuccess("Address added!");
        } catch { onError(t("profile.messages.failedToSaveAddress")); }
        finally { setSaving(false); }
    };

    const handleSetDefault = async (id: number) => {
        try {
            await customersApi.setDefaultAddress(id);
            setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
            onSuccess("Default address updated!");
        } catch { onError(t("profile.messages.failedToUpdateDefaultAddress")); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900">{t("profile.addresses.title", { defaultValue: "Saved Addresses" })}</h2>
                        <p className="text-[11px] md:text-xs text-slate-400">{t("profile.addresses.subtitle", { defaultValue: "Manage your delivery addresses" })}</p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700 transition-colors"
                    >
                        <Plus size={14} /> {t("profile.addresses.addAddress")}
                    </button>
                )}
            </div>

            {/* Add Address Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
                            {/* Google Maps picker */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pin Your Location</p>
                                <GoogleMapPicker
                                    onSelect={(result: MapPickerResult) => {
                                        const normalizedEmirate = result.emirate
                                            ? result.emirate.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "")
                                            : "";

                                        setForm((prev) => ({
                                            ...prev,
                                            latitude: result.lat,
                                            longitude: result.lng,
                                            ...(result.street ? { street_address: result.street } : {}),
                                            ...(result.area ? { area: result.area } : {}),
                                            ...(result.city ? { city: result.city } : {}),
                                            ...(normalizedEmirate ? { emirate: normalizedEmirate } : {}),
                                        }));

                                        setAddrErrors((prev) => {
                                            const next = { ...prev };
                                            if (result.street) delete next.street_address;
                                            if (result.area) delete next.area;
                                            if (result.city) delete next.city;
                                            if (normalizedEmirate && normalizedEmirate !== "abu_dhabi") {
                                                next.emirate = "Delivery is currently available only in Abu Dhabi.";
                                            } else if (normalizedEmirate) {
                                                delete next.emirate;
                                            }
                                            return next;
                                        });
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                                {/* Address Type */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("profile.addresses.type")}</label>
                                    <div className="relative">
                                        <select
                                            value={form.label}
                                            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                                            className="profile-field-input appearance-none"
                                        >
                                            <option value="home">Home</option>
                                            <option value="work">Work</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {([
                                    ["full_name", "Full Name", "John Doe"],
                                    ["building_name", "Building", "Al Reem Tower"],
                                    ["flat_villa_number", "Flat / Villa", "Apt 4B"],
                                    ["street_address", "Street", "123 Ocean Drive"],
                                    ["area", "Area", "Al Nahda"],
                                    ["city", "City", "Dubai"],
                                ] as [string, string, string][]).map(([key, label, ph]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                                        <input
                                            value={form[key as keyof typeof form] as string}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, [key]: e.target.value }));
                                                if (addrErrors[key]) setAddrErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
                                            }}
                                            placeholder={ph}
                                            className={`profile-field-input ${addrErrors[key] ? "border-rose-400" : ""}`}
                                        />
                                        {addrErrors[key] && <p className="text-[10px] text-rose-500 font-medium px-1">{addrErrors[key]}</p>}
                                    </div>
                                ))}
                                {/* Phone with country flag selector */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {(t("profile.addresses.phone") === "profile.addresses.phone") ? "Phone" : t("profile.addresses.phone")}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative" ref={addrDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setAddrDropdownOpen(!addrDropdownOpen)}
                                                className="h-[42px] px-3 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-sm hover:bg-slate-50"
                                            >
                                                <img src={(addressCountries.find(c => c.code === addrCountryCode) || addressCountries[0]).flag} alt="flag" className="w-5 h-[14px] object-cover rounded-sm" />
                                                <span className="text-xs font-medium text-slate-700">{addrCountryCode}</span>
                                                <ChevronDown size={12} className={`text-slate-400 transition-transform ${addrDropdownOpen ? "rotate-180" : ""}`} />
                                            </button>
                                            {addrDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                                    {addressCountries.map((c) => (
                                                        <button
                                                            key={c.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddrCountryCode(c.code);
                                                                setAddrDropdownOpen(false);
                                                                setAddressPhoneOtpStep("idle");
                                                                setAddressPhoneOtp("");
                                                                setAddressPhoneVerificationError(null);
                                                                setAddressPhoneVerified(false);
                                                                if (addrErrors.phone_number) setAddrErrors(prev => { const n = { ...prev }; delete n.phone_number; return n; });
                                                            }}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-cyan-50 ${c.code === addrCountryCode ? "bg-cyan-50 text-cyan-600" : "text-slate-700"}`}
                                                        >
                                                            <img src={c.flag} alt={c.name} className="w-5 h-[14px] object-cover rounded-sm" />
                                                            <span className="font-medium">{c.name}</span>
                                                            <span className="ms-auto text-slate-400">{c.code}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            value={form.phone_number}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, phone_number: e.target.value.replace(/[^\d]/g, "") }));
                                                setAddressPhoneOtpStep("idle");
                                                setAddressPhoneOtp("");
                                                setAddressPhoneVerificationError(null);
                                                setAddressPhoneVerified(false);
                                                if (addrErrors.phone_number) setAddrErrors(prev => { const n = { ...prev }; delete n.phone_number; return n; });
                                            }}
                                            placeholder={`${getAddrPhoneRequirements(addrCountryCode).length} digits`}
                                            maxLength={getAddrPhoneRequirements(addrCountryCode).length}
                                            className={`profile-field-input flex-1 ${addrErrors.phone_number ? "border-rose-400" : ""}`}
                                            inputMode="tel"
                                        />
                                    </div>
                                    {addrErrors.phone_number && <p className="text-[10px] text-rose-500 font-medium px-1">{addrErrors.phone_number}</p>}
                                    {addressPhoneVerificationError && <p className="text-[10px] text-rose-500 font-medium px-1">{addressPhoneVerificationError}</p>}

                                    {!isAddressPhoneOtpVerified && (
                                        <div className="px-1 pt-1 space-y-2">
                                            {addressPhoneOtpStep === "idle" ? (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setAddressPhoneVerificationError(null);
                                                        if (!isAddressPhoneValid) {
                                                            setAddressPhoneVerificationError(`${addressPhoneReq.name}: ${addressPhoneReq.length} digits${addressPhoneReq.pattern ? ", specific starting digits required" : ""}`);
                                                            return;
                                                        }
                                                        try {
                                                            setSendingAddressOtp(true);
                                                            await profileApi.sendProfileOtp({
                                                                otp_type: "phone",
                                                                phone_number: composedAddressPhone,
                                                            } as any);
                                                            setAddressPhoneOtpStep("otp");
                                                        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                                                            const apiErr = err?.response?.data;
                                                            const detail = apiErr?.detail || apiErr?.message || (typeof apiErr === "string" ? apiErr : "Failed to send OTP. Try again.");
                                                            setAddressPhoneVerificationError(detail);
                                                        } finally {
                                                            setSendingAddressOtp(false);
                                                        }
                                                    }}
                                                    disabled={sendingAddressOtp || !isAddressPhoneValid}
                                                    className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                                                >
                                                    {sendingAddressOtp ? "Sending..." : "Verify this phone with OTP"}
                                                </button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        value={addressPhoneOtp}
                                                        onChange={(e) => setAddressPhoneOtp(e.target.value.replace(/\D/g, ""))}
                                                        maxLength={6}
                                                        placeholder="6 digits"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            setAddressPhoneVerificationError(null);
                                                            if (addressPhoneOtp.length < 6) {
                                                                setAddressPhoneVerificationError("Enter the 6-digit OTP.");
                                                                return;
                                                            }
                                                            try {
                                                                setVerifyingAddressOtp(true);
                                                                const res: any = await profileApi.verifyProfileOtp({
                                                                    otp_type: "phone",
                                                                    otp_code: addressPhoneOtp,
                                                                    phone_number: composedAddressPhone,
                                                                } as any);
                                                                const access = res?.access || res?.accessToken || res?.token;
                                                                if (access) tokenManager.set(access);
                                                                const freshUser = res?.user || (await profileApi.getMe());
                                                                dispatch(setUser(freshUser));
                                                                setAddressPhoneVerified(true);
                                                                setAddressPhoneOtpStep("idle");
                                                                setAddressPhoneOtp("");
                                                                setAddrErrors(prev => { const n = { ...prev }; delete n.phone_number; return n; });
                                                            } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                                                                const apiErr = err?.response?.data;
                                                                const detail = apiErr?.detail || apiErr?.message || (typeof apiErr === "string" ? apiErr : "OTP verification failed.");
                                                                setAddressPhoneVerificationError(detail);
                                                            } finally {
                                                                setVerifyingAddressOtp(false);
                                                            }
                                                        }}
                                                        disabled={verifyingAddressOtp || addressPhoneOtp.length < 6}
                                                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        {verifyingAddressOtp ? "Verifying..." : "Verify"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isAddressPhoneOtpVerified && (
                                        <p className="text-[10px] text-emerald-600 font-bold px-1 pt-1">Phone verified. You can save this address.</p>
                                    )}
                                </div>

                                {/* Emirate */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("profile.addresses.emirate")}</label>
                                    <div className="relative">
                                        <select
                                            value={form.emirate}
                                            onChange={(e) => setForm((p) => ({ ...p, emirate: e.target.value }))}
                                            className="profile-field-input appearance-none"
                                        >
                                            <option value="">Select</option>
                                            {EMIRATES.map((em) => <option key={em.value} value={em.value}>{em.label}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-2">
                                <button
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                                >
                                    {t("profile.addresses.cancel", { defaultValue: "Cancel" })}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !isAddressPhoneOtpVerified}
                                    className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    {saving ? t("profile.personalInfo.saving") : t("profile.addresses.saveAddress")}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Address List */}
            {loading ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                    {[1, 2].map((i) => <div key={i} className="h-32 bg-slate-50 rounded-2xl animate-pulse" />)}
                </div>
            ) : addresses.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MapPin className="text-slate-300" size={28} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">{t("profile.addresses.empty", { defaultValue: "No saved addresses" })}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                    {addresses.map((addr) => (
                        <div key={addr.id} className="relative p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-white group flex flex-col h-full text-start">
                            {/* Delete Icon */}
                            {!addr.is_default && (
                                <AddressDeleteIcon onClick={() => handleDeleteAddress(addr.id)} />
                            )}
                            <div className="flex items-center gap-2 mb-3">
                                {addr.label?.toLowerCase() === "home" ? <Home size={14} className="text-cyan-600" /> : <Briefcase size={14} className="text-cyan-600" />}
                                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">{addr.label?.toLowerCase() === "home" ? t("profile.addresses.home") : addr.label?.toLowerCase() === "work" ? t("profile.addresses.work") : addr.label ? t("profile.addresses.other") : ""}</span>
                                {addr.is_default && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md ms-auto">
                                        {t("profile.addresses.default", { defaultValue: "Default" })}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-slate-900">{addr.full_name}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {[addr.flat_villa_number, addr.building_name, addr.street_address].filter(Boolean).join(", ")}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {[addr.area, addr.city, addr.emirate].filter(Boolean).join(", ")}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{addr.phone_number}</p>

                            <div className="mt-auto pt-4">
                                {!addr.is_default && (
                                    <button
                                        onClick={() => handleSetDefault(addr.id)}
                                        className="text-[11px] font-bold text-cyan-600 hover:underline inline-block"
                                    >
                                        {t("profile.addresses.setAsDefault", { defaultValue: "Set as Default" })}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* ConfirmModal for address deletion */}
            <ConfirmModal
                open={deleteId !== null}
                title={t("profile.addresses.deleteAddress", { defaultValue: "Delete Address" })}
                message={t("profile.addresses.deleteConfirm", { defaultValue: "Are you sure you want to delete this address? This action cannot be undone." })}
                confirmText={t("profile.addresses.deleteBtn", { defaultValue: "Delete" })}
                cancelText={t("profile.addresses.cancel", { defaultValue: "Cancel" })}
                onConfirm={confirmDeleteAddress}
                onCancel={() => { if (!deleting) setDeleteId(null); }}
                loading={deleting}
            />
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════
   Referral Tab
   ═══════════════════════════════════════════════ */

interface ReferralTabProps {
    user: any;
}

const ReferralTab: React.FC<ReferralTabProps> = ({ user }) => {
    const { t } = useTranslation("profile");
    const toast = useToast();
    const [copied, setCopied] = useState(false);

    // Prefer backend referral_code if present, else fallback to phone logic
    let referralCode = user?.referral_code;
    if (!referralCode) {
        if (user?.phone_number) {
            referralCode = `SIMAK${user.phone_number.replace(/[^0-9]/g, "").slice(-6)}`;
        } else {
            referralCode = "SIMAKFRESH";
        }
    }

    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.show("Referral code copied!", "success");
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.show("Failed to copy", "error");
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Simak Fresh — Refer & Earn!",
                    text: `Use my referral code ${referralCode} and get 20% OFF on your first order at Simak Fresh!`,
                    url: referralLink,
                });
            } catch {
                // User cancelled
            }
        } else {
            handleCopy(referralLink);
        }
    };

    const steps = [
        {
            num: "01",
            title: t("profile.referrals.steps.one.title", { defaultValue: "Invite a Friend" }),
            desc: t("profile.referrals.steps.one.desc", { defaultValue: "Share your unique referral code with friends and family. Ask them to register on Simak Fresh." }),
            img: referralInviteImg,
            gradient: "from-cyan-400 to-teal-400",
        },
        {
            num: "02",
            title: t("profile.referrals.steps.two.title", { defaultValue: "Friend Makes First Purchase" }),
            desc: t("profile.referrals.steps.two.desc", { defaultValue: "Your friend enters your referral code at checkout on their first order." }),
            img: referralPurchaseImg,
            gradient: "from-violet-400 to-indigo-400",
        },
        {
            num: "03",
            title: t("profile.referrals.steps.three.title", { defaultValue: "Both Get 20% OFF" }),
            desc: t("profile.referrals.steps.three.desc", { defaultValue: "Your friend gets 20% OFF instantly! Once the order is delivered, you also receive a 20% discount coupon." }),
            img: referralRewardImg,
            gradient: "from-amber-400 to-orange-400",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
        >
            {/* ── Hero Header ── */}
            <div className="text-center mb-8 md:mb-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-2xl flex items-center justify-center">
                    <Gift size={28} className="text-cyan-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {t("profile.referrals.title", { defaultValue: "Friends Who Refer" })}<br />
                    <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                        {t("profile.referrals.subtitle", { defaultValue: "Stay Friends Forever" })}
                    </span>
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                    {t("profile.referrals.description", { defaultValue: "When you refer your friend to Simak Fresh, you get 20% OFF on your next order and so does your friend. Then you both eat healthy ever after!" })}
                </p>
            </div>

            {/* ── Referral Code Card ── */}
            <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-teal-600 rounded-2xl p-5 md:p-6 mb-8 md:mb-10 relative overflow-hidden">
                {/* Decorative blurs */}
                <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -start-10 w-40 h-40 bg-cyan-300/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <p className="text-cyan-100 text-[10px] md:text-[11px] font-bold uppercase tracking-widest mb-2">
                        {t("profile.referrals.codeLabel", { defaultValue: "Your Referral Code" })}
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white font-mono text-lg md:text-xl font-black tracking-widest select-all">
                            {referralCode}
                        </div>
                        <button
                            onClick={() => handleCopy(referralCode)}
                            className={`p-3 rounded-xl font-bold text-sm transition-all ${copied
                                ? "bg-emerald-400 text-white"
                                : "bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                                }`}
                            title="Copy code"
                        >
                            {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                            onClick={handleShare}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-cyan-700 rounded-xl font-bold text-sm hover:bg-cyan-50 transition-all shadow-lg shadow-black/10 active:scale-[0.97]"
                        >
                            <Share2 size={16} />
                            {t("profile.referrals.startReferring", { defaultValue: "Start Referring, Start Earning!" })}
                        </button>
                        <button
                            onClick={() => handleCopy(referralLink)}
                            className="flex items-center justify-center gap-2 py-3 px-4 bg-white/15 backdrop-blur-sm text-white rounded-xl font-bold text-sm hover:bg-white/25 transition-all border border-white/20"
                        >
                            <Copy size={14} />
                            {t("profile.referrals.copyLink", { defaultValue: "Copy Link" })}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── How it Works ── */}
            <div className="mb-8 md:mb-10">
                <h3 className="text-center text-sm md:text-base font-extrabold text-slate-900 uppercase tracking-wider mb-6 md:mb-8">
                    {t("profile.referrals.howItWorks", { defaultValue: "Here is How it Working" }).split("Working")[0]}
                    <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">{t("profile.referrals.works", { defaultValue: "Works" })}</span>
                </h3>

                <div className="space-y-5 md:space-y-6">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={step.num}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.12, duration: 0.35 }}
                            className="flex items-start gap-4 md:gap-5 group"
                        >
                            {/* Step Number */}
                            <div className="flex flex-col items-center flex-shrink-0">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-black text-sm md:text-base shadow-lg`}>
                                    {step.num}
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className="w-0.5 h-8 md:h-10 bg-gradient-to-b from-slate-200 to-transparent mt-2" />
                                )}
                            </div>

                            {/* Card */}
                            <div className="flex-1 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 md:p-5 transition-all hover:shadow-sm group-hover:-translate-y-0.5">
                                <div className="flex items-start gap-3 md:gap-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-white border border-slate-100 flex-shrink-0 shadow-sm">
                                        <img
                                            src={step.img}
                                            alt={step.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm md:text-base font-bold text-slate-900 mb-1">
                                            {step.title}
                                        </h4>
                                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ── Second CTA ── */}
            <div className="text-center mb-8 md:mb-10">
                <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-cyan-200/50 transition-all active:scale-[0.97]"
                >
                    <Gift size={18} />
                    {t("profile.referrals.startReferring", { defaultValue: "Start Referring, Start Earning!" })}
                </button>
            </div>
        </motion.div>
    );
};

interface CouponsTabProps {
    user?: any;
}

const CouponsTab: React.FC<CouponsTabProps> = () => {
    const { t } = useTranslation("profile");
    const toast = useToast();
    const [coupons, setCoupons] = useState<ProfileCouponCard[]>([]);
    const [couponsLoading, setCouponsLoading] = useState(true);
    const [couponsError, setCouponsError] = useState<string | null>(null);
    const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
    const copiedCouponResetRef = useRef<number | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadCoupons = async () => {
            setCouponsLoading(true);
            setCouponsError(null);

            try {
                const response = await api.get("/marketing/coupons/");
                const rawCoupons = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.results)
                        ? response.data.results
                        : [];

                const normalizedCoupons = rawCoupons
                    .map((coupon: any, index: number) => normalizeProfileCoupon(coupon, index, t))
                    .filter(Boolean) as ProfileCouponCard[];

                if (mounted) {
                    setCoupons(normalizedCoupons);
                }
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (mounted) {
                    setCouponsError(
                        error?.response?.data?.detail
                        || t("profile.coupons.error", { defaultValue: "Unable to load your coupons right now." })
                    );
                }
            } finally {
                if (mounted) {
                    setCouponsLoading(false);
                }
            }
        };

        void loadCoupons();

        return () => {
            mounted = false;
            if (copiedCouponResetRef.current) {
                window.clearTimeout(copiedCouponResetRef.current);
            }
        };
    }, [t]);

    const handleCopyCouponCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCouponCode(code);
            toast.show(t("profile.coupons.copied", { defaultValue: "Coupon code copied!" }), "success");

            if (copiedCouponResetRef.current) {
                window.clearTimeout(copiedCouponResetRef.current);
            }

            copiedCouponResetRef.current = window.setTimeout(() => {
                setCopiedCouponCode(null);
            }, 2500);
        } catch {
            toast.show(t("profile.coupons.error", { defaultValue: "Unable to load your coupons right now." }), "error");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
        >
            <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest mb-3">
                    <Tag size={12} />
                    {t("profile.coupons.available", { defaultValue: "Available coupon" })}
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {t("profile.coupons.title", { defaultValue: "Available Coupons" })}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                    {t("profile.coupons.subtitle", { defaultValue: "Your active discounts and rewards at a glance." })}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
                {[
                    { label: t("profile.coupons.stats.available", { defaultValue: "Available" }), value: coupons.filter((coupon) => coupon.statusKey === "active").length, icon: <Tag size={16} />, bg: "bg-amber-50", color: "text-amber-600" },
                    { label: t("profile.coupons.stats.referral", { defaultValue: "Referral" }), value: coupons.filter((coupon) => coupon.typeKey === "referral").length, icon: <Gift size={16} />, bg: "bg-cyan-50", color: "text-cyan-600" },
                    { label: t("profile.coupons.stats.firstOrder", { defaultValue: "First Order" }), value: coupons.filter((coupon) => coupon.typeKey === "firstOrder").length, icon: <Percent size={16} />, bg: "bg-emerald-50", color: "text-emerald-600" },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-lg font-black text-slate-900">{stat.value}</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {couponsLoading ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 animate-pulse">
                            <div className="h-5 w-28 bg-slate-100 rounded-full mb-4" />
                            <div className="h-10 w-full bg-slate-100 rounded-xl mb-3" />
                            <div className="h-3 w-3/4 bg-slate-100 rounded-full mb-2" />
                            <div className="h-3 w-1/2 bg-slate-100 rounded-full mb-4" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-16 bg-slate-100 rounded-xl" />
                                <div className="h-16 bg-slate-100 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : couponsError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-4 text-sm text-rose-600 font-medium">
                    {couponsError}
                </div>
            ) : coupons.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-sm border border-slate-100">
                        <Tag size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{t("profile.coupons.empty", { defaultValue: "No coupons are available right now." })}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {t("profile.coupons.emptyHint", { defaultValue: "Earn one through referrals or check back after a new campaign goes live." })}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {coupons.map((coupon) => (
                        <div key={coupon.id} className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                        <Tag size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{coupon.typeLabel}</div>
                                        <h4 className="text-sm md:text-base font-bold text-slate-900 truncate">{coupon.title}</h4>
                                    </div>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${coupon.statusClassName}`}>
                                    {coupon.statusLabel}
                                </span>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <div className="flex-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 font-mono text-base md:text-lg font-black tracking-[0.2em] text-slate-900 truncate">
                                    {coupon.code}
                                </div>
                                <button
                                    onClick={() => handleCopyCouponCode(coupon.code)}
                                    className={`px-3 py-3 rounded-xl transition-all ${copiedCouponCode === coupon.code ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                                    title={t("profile.coupons.copied", { defaultValue: "Coupon code copied!" })}
                                >
                                    {copiedCouponCode === coupon.code ? <CheckCircle size={16} /> : <Copy size={16} />}
                                </button>
                            </div>

                            <p className="mt-3 text-xs md:text-sm text-slate-500 leading-relaxed">
                                {coupon.description}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("profile.coupons.discount", { defaultValue: "Discount" })}</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{coupon.badge || "—"}</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("profile.coupons.validUntil", { defaultValue: "Valid until" })}</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{coupon.validUntil}</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("profile.coupons.usage", { defaultValue: "Usage" })}</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{coupon.usage}</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("profile.coupons.status", { defaultValue: "Status" })}</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{coupon.statusLabel}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════
   Shared UI Components
   ═══════════════════════════════════════════════ */
const InfoField = ({
    label, value, editing, onChange, placeholder, required
}: {
    label: string; value: string; editing: boolean; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) => (
    <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ms-1 flex items-center gap-1">
            {label}
            {required && <span className="text-cyan-500">*</span>}
        </label>
        {editing ? (
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="profile-field-input"
            />
        ) : (
            <div className="px-3 sm:px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs sm:text-sm font-medium text-slate-700 break-words text-start">
                {value || "—"}
            </div>
        )}
    </div>
);

/* ── Field styles ── */
const style = document.createElement("style");
style.textContent = `
  .profile-field-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #0f172a;
    outline: none;
    transition: all 0.2s ease;
  }
  .profile-field-input:focus {
    border-color: #06b6d4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
    background: #fff;
  }
  .profile-field-input::placeholder {
    color: #cbd5e1;
    font-weight: 400;
  }
  
  /* Hide scrollbar for mobile navigation while keeping it scrollable */
  .profile-hide-scrollbar::-webkit-scrollbar { 
    display: none; 
  }
  .profile-hide-scrollbar { 
    -ms-overflow-style: none; 
    scrollbar-width: none; 
  }
`;
if (!document.getElementById("profile-field-styles")) {
    style.id = "profile-field-styles";
    document.head.appendChild(style);
}

export default ProfilePage;
