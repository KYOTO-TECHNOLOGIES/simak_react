import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Globe, Save, Loader2, X, ChevronDown } from "lucide-react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { NATIONALITY_CHOICES } from "../../constants/nationalities";
import { profileApi } from "../../features/user/profileApi";
import { setUser } from "../../features/auth/authSlice";
import useLanguageToggle from "../../hooks/useLanguageToggle";

interface ProfileCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ isOpen, onClose, user }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const { setLanguage } = useLanguageToggle();
    const { t } = useTranslation("common");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [selectedNationality, setSelectedNationality] = useState("");
    const [selectedLang, setSelectedLang] = useState<"en" | "ar" | "cn">("en");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Check if user already has a name from registration
    const hasName = useMemo(() => {
        return !!(user?.first_name && user.first_name.trim().length >= 2);
    }, [user]);

    // Pre-fill if some data already exists
    useEffect(() => {
        if (user) {
            if (user.first_name) setFirstName(user.first_name);
            if (user.last_name) setLastName(user.last_name);
            if (user.nationality) setSelectedNationality(user.nationality);
        }
        const currentLang = localStorage.getItem("i18nextLng") || "en";
        if (["en", "ar", "cn"].includes(currentLang)) {
            setSelectedLang(currentLang as "en" | "ar" | "cn");
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasName && !firstName.trim()) {
            setError(t("profileModal.firstNameRequired", "First Name is required."));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const fallbackLang = localStorage.getItem("i18nextLng")?.split("-")[0];
            const finalLang = ["en", "ar", "cn"].includes(selectedLang || fallbackLang || "")
                ? (selectedLang || fallbackLang)
                : "en";

            const payload: any = {
                first_name: hasName ? user.first_name : firstName.trim(),
                last_name: hasName ? user.last_name : lastName.trim(),
                nationality: selectedNationality,
                profile: {
                    preferred_language: finalLang,
                },
            };

            console.log("[ProfileModal] Payload being sent:", JSON.stringify(payload, null, 2));

            // 1. Update Profile
            const updatedUser = await profileApi.updateProfile(user.id, payload);

            dispatch(setUser({ ...user, ...updatedUser })); // Update Redux and preserve id
            queryClient.invalidateQueries({ queryKey: ["userProfile"] }); // Refresh profile query

            // 2. Mark profile as completed so modal doesn't show again
            localStorage.setItem(`profile_completed_${user.id}`, "true");

            // 3. Set i18n Language
            setLanguage(selectedLang);

            setLoading(false);
            onClose();
        } catch (err: any) {
            setError(t("profileModal.saveFailed", "Failed to save details. Please try again."));
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
                >
                    {/* Header Background */}
                    <div className="h-32 bg-cyan-600 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
                            <div className="absolute bottom-0 right-0 w-40 h-40 bg-cyan-400 rounded-full translate-x-1/4 translate-y-1/4 blur-2xl" />
                        </div>
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white relative z-10 border border-white/30 shadow-xl">
                            <User size={32} />
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-20"
                    >
                        <X size={16} />
                    </button>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="text-center space-y-1.5 -mt-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t("profileModal.title")}</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {hasName
                                    ? t("profileModal.chooseLang", "Choose your preferred language.")
                                    : t("profileModal.subtitle")}
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl text-center">
                                <p className="text-xs font-bold text-cyan-600">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Name Fields — only shown if user doesn't have a name yet */}
                            {!hasName ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("profileModal.firstName")} <span className="text-cyan-500">*</span></label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder={t("profileModal.firstName")}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("profileModal.lastName")}</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder={t("profileModal.lastName")}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-sm text-slate-600">
                                        {t("profileModal.welcome", "Welcome,")} <span className="font-bold text-slate-900">{user.first_name} {user.last_name || ""}</span>
                                    </p>
                                </div>
                            )}

                            {/* Nationality Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                    <Globe size={12} /> {t("profileModal.nationality", "Nationality")}
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedNationality}
                                        onChange={(e) => setSelectedNationality(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all appearance-none"
                                    >
                                        <option value="">{t("profileModal.selectNationality", "Select Nationality")}</option>
                                        {NATIONALITY_CHOICES.map((n) => (
                                            <option key={n.code} value={n.code}>{n.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Language Selection */}
                            <div className="space-y-1.5 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                    <Globe size={12} /> {t("profileModal.preferredLang", "Preferred Language")}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <LanguageBtn lang="en" label="English" selected={selectedLang} onSelect={setSelectedLang} />
                                    <LanguageBtn lang="ar" label="العربية" selected={selectedLang} onSelect={setSelectedLang} />
                                    <LanguageBtn lang="cn" label="中文" selected={selectedLang} onSelect={setSelectedLang} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-4 bg-cyan-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200/50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? t("profileModal.saving") : t("profileModal.save")}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const LanguageBtn = ({ lang, label, selected, onSelect }: { lang: "en" | "ar" | "cn", label: string, selected: string, onSelect: any }) => (
    <button
        type="button"
        onClick={() => onSelect(lang)}
        className={`py-3 rounded-xl text-xs font-bold transition-all border ${selected === lang
            ? "bg-cyan-50 text-cyan-600 border-cyan-200 shadow-inner"
            : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
            }`}
    >
        {label}
    </button>
);

export default ProfileCompletionModal;
