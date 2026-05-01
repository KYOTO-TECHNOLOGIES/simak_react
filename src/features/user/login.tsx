import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ArrowRight,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  Check,
  Timer,
  ChevronDown,
  AlertCircle,
  ShieldX
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import useLanguageToggle from "../../hooks/useLanguageToggle";

import type { AuthMethod } from "../../types/types";
import { requestOtp, verifyOtp, setMethod, setStep, authError, googleLogin } from "../auth/authSlice";

/* ─── OTP Timer Hook ─── */
const useOtpTimer = () => {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiration, setOtpExpiration] = useState(0);

  const [resendCount, setResendCount] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expirationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimers = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (expirationRef.current) clearInterval(expirationRef.current);

    setResendCooldown(40);
    setOtpExpiration(120);
    setResendCount((c) => c + 1);

    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    expirationRef.current = setInterval(() => {
      setOtpExpiration((prev) => {
        if (prev <= 1) {
          clearInterval(expirationRef.current!);
          expirationRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const reset = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (expirationRef.current) clearInterval(expirationRef.current);
    setResendCooldown(0);
    setOtpExpiration(0);
    setResendCount(0);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (expirationRef.current) clearInterval(expirationRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    resendCooldown,
    otpExpiration,
    formattedExpiration: formatTime(otpExpiration),
    resendCount,
    startTimers,
    reset,
    canResend: resendCooldown === 0,
    isExpired: otpExpiration === 0
  };
};

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { isArabic } = useLanguageToggle();

  const { otp_type, step, isLoading, error, value, isAuthenticated, user } = useSelector(
    (s: any) => s.auth
  );

  const [focused, setFocused] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState(value || "");
  const [otp, setOtp] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [countryCode, setCountryCode] = useState("+971");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    resendCooldown,
    formattedExpiration,
    startTimers,
    reset,
    canResend,
    isExpired
  } = useOtpTimer();

  const countries = [
    { code: "+971", flag: "https://flagcdn.com/w40/ae.png", name: "UAE" },
    { code: "+91", flag: "https://flagcdn.com/w40/in.png", name: "India" },
    { code: "+86", flag: "https://flagcdn.com/w40/cn.png", name: "China" },
  ];

  const selectedCountry = countries.find((c) => c.code === countryCode) || countries[0];


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setLocalValue(value || ""), [value]);

  // Clear any stale auth errors (e.g. from Register page)
  useEffect(() => {
    dispatch(authError(null as any));
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isAdmin = user.role === "admin" || user.is_admin === true;
    const isDeliveryBoy = user.role === "delivery_boy";
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    } else if (isDeliveryBoy) {
      navigate("/delivery", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const getPhoneRequirements = (code: string) => {
    switch (code) {
      case "+971": return { length: 9, pattern: /^5/ };
      case "+91": return { length: 10, pattern: /^[6-9]/ };
      case "+86": return { length: 11, pattern: /^1/ };
      default: return { length: 10, pattern: null };
    }
  };

  const phoneRequirements = getPhoneRequirements(countryCode);

  const isPhoneValid = useMemo(() => {
    const digits = localValue.replace(/\D/g, "");
    if (digits.length !== phoneRequirements.length) return false;
    return phoneRequirements.pattern ? phoneRequirements.pattern.test(digits) : true;
  }, [localValue, phoneRequirements]);

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localValue.trim());
  }, [localValue]);

  const isAccountInactive = error === "ACCOUNT_INACTIVE";
  const canSendOtp = !isLoading && !isAccountInactive && agreeTerms && (otp_type === "phone" ? isPhoneValid : isEmailValid);
  const canVerifyOtp = !isLoading && !isExpired && !isAccountInactive && otp.trim().length === 6;

  const onSwitchMethod = (m: AuthMethod) => {
    setOtp("");
    setAgreeTerms(false);
    setLocalValue("");
    setCountryCode("+971");
    reset();
    dispatch(setMethod(m));
  };

  const getFormattedPhone = () =>
    otp_type === "phone" ? `${countryCode}${localValue.trim().replace(/^0+/, '')}` : undefined;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendOtp) return;

    dispatch(
      requestOtp({
        otp_type: otp_type,
        phone_number: getFormattedPhone(),
        email: otp_type === "email" ? localValue.trim() : undefined,
      })
    );
    startTimers();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canVerifyOtp) return;

    dispatch(
      verifyOtp({
        otp_type: otp_type,
        phone_number: getFormattedPhone(),
        email: otp_type === "email" ? (value || localValue.trim()) : undefined,
        otp_code: otp.trim(),
      })
    );
  };

  const onChangeIdentity = () => {
    setOtp("");
    reset();
    dispatch(setStep("input"));
  };

  const onResendOtp = () => {
    if (isLoading || !canResend || isAccountInactive) return;
    const v = (value || localValue).trim();
    if (!v) return;

    dispatch(
      requestOtp({
        otp_type: otp_type,
        phone_number: otp_type === "phone" ? `${countryCode}${v.replace(/^0+/, '')}` : undefined,
        email: otp_type === "email" ? v : undefined,
      })
    );
    startTimers();
  };

  // ✅ Clean up backend errors to be user friendly
  const displayError = useMemo(() => {
    if (!error) return null;
    if (error === "ACCOUNT_INACTIVE") {
      return "Your account has been deactivated. Please contact the administrator.";
    }
    if (error.includes("400") || error.includes("Request failed")) {
      return step === "otp" ? "Invalid or expired OTP." : "Invalid details provided. Please check and try again.";
    }
    return error;
  }, [error, step]);

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#18181B] font-sans antialiased flex items-center justify-center p-6 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-95 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-10 md:p-12 space-y-8">
          <header className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-medium tracking-tight text-zinc-900">{t("auth.loginTitle", "Welcome Back")}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
                {t("auth.otpSignin", "OTP Sign-in")}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-50 p-1 border border-zinc-100">
            <button
              type="button"
              onClick={() => onSwitchMethod("phone")}
              className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.28em] transition ${otp_type === "phone"
                ? "bg-white shadow-sm text-cyan-600"
                : "text-zinc-400 hover:text-cyan-600"
                }`}
            >
              <span className="inline-flex items-center gap-2 justify-center">
                <Phone size={14} /> {t("auth.phone", "Phone")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchMethod("email")}
              className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.28em] transition ${otp_type === "email"
                ? "bg-white shadow-sm text-cyan-600"
                : "text-zinc-400 hover:text-cyan-600"
                }`}
            >
              <span className="inline-flex items-center gap-2 justify-center">
                <Mail size={14} /> {t("auth.email", "Email")}
              </span>
            </button>
          </div>

          {step === "input" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-1">
                <div className={`group relative border-b transition-all duration-500 py-3 ${focused === "id" ? "border-cyan-500" : "border-zinc-100"}`}>
                  <div className="flex items-center gap-3">
                    {otp_type === "email" ? (
                      <Mail size={14} className={`${focused === "id" ? "text-cyan-600" : "text-zinc-300"} transition-colors`} />
                    ) : (
                      <Phone size={14} className={`${focused === "id" ? "text-cyan-600" : "text-zinc-300"} transition-colors`} />
                    )}

                    {otp_type === "phone" ? (
                      <div className="flex gap-2 flex-1">
                        <div className="relative" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="h-9 rounded-lg border-b border-zinc-100 bg-transparent px-2 text-sm outline-none transition focus:border-cyan-600 cursor-pointer flex items-center gap-2 hover:bg-zinc-50"
                          >
                            <img src={selectedCountry.flag} alt={selectedCountry.name} className="w-5 h-[14px] object-cover rounded-sm shadow-sm" />
                            <span className="text-xs font-medium text-zinc-600">{selectedCountry.code}</span>
                            <ChevronDown size={12} className={`text-zinc-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          {dropdownOpen && (
                            <div className={`absolute top-full ${isArabic ? 'right-0' : 'left-0'} mt-1 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden`}>
                              {countries.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCountryCode(c.code);
                                    setDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-cyan-50 transition-colors ${c.code === countryCode ? "bg-cyan-50 text-cyan-600" : "text-zinc-700"}`}
                                >
                                  <img src={c.flag} alt={c.name} className="w-5 h-[14px] object-cover rounded-sm shadow-sm" />
                                  <span className="font-medium">{c.name}</span>
                                  <span className={`${isArabic ? 'mr-auto' : 'ml-auto'} text-zinc-400 text-[10px]`}>{c.code}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <input
                          type="tel"
                          required
                          maxLength={phoneRequirements.length}
                          value={localValue}
                          onChange={(e) => setLocalValue(e.target.value.replace(/[^\d]/g, ''))}
                          onFocus={() => setFocused("id")}
                          onBlur={() => setFocused(null)}
                          placeholder={`${phoneRequirements.length} digits`}
                          className="flex-1 bg-transparent outline-none text-sm font-medium tracking-tight placeholder:text-zinc-200"
                        />
                      </div>
                    ) : (
                      <input
                        type="email"
                        required
                        placeholder={t("auth.emailPlaceholder", "Email Address")}
                        value={localValue}
                        onFocus={() => setFocused("id")}
                        onBlur={() => setFocused(null)}
                        className="w-full bg-transparent outline-none text-sm font-medium tracking-tight placeholder:text-zinc-200"
                        onChange={(e) => setLocalValue(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
                  <span className="relative mt-0.5 h-4 w-4 rounded-md border border-zinc-200 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer absolute inset-0 opacity-0 cursor-pointer"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <Check size={12} strokeWidth={3} className="opacity-0 peer-checked:opacity-100 transition-opacity text-cyan-600" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 leading-relaxed">
                    <Trans
                      i18nKey="auth.termsSentence"
                      ns="common"
                      components={[
                        <a
                          href="/terms-of-service"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2 transition-colors"
                        />,
                        <a
                          href="/privacy-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2 transition-colors"
                        />,
                      ]}
                    />
                  </span>
                </label>

                {/* ✅ Clean Text Error / Inactive Account Alert */}
                {displayError && (
                  isAccountInactive ? (
                    <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <ShieldX size={16} className="text-rose-500 shrink-0" />
                      <p className="text-[11px] font-bold text-rose-600">
                        {displayError}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-semibold text-rose-600 mt-2">
                      {displayError}
                    </p>
                  )
                )}
              </div>

              <button
                type="submit"
                disabled={!canSendOtp}
                className="group relative w-full bg-cyan-600 text-white py-5 rounded-2xl overflow-hidden transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-700"
              >
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.4em]">{isLoading ? t("auth.sending", "Sending...") : t("auth.sendOtp", "Send OTP")}</span>
                  {!isLoading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                </div>
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t("auth.otpSentTo", "OTP sent to")}</p>
                  <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isExpired ? "text-rose-500" : "text-cyan-600"}`}>
                    <Timer size={12} />
                    {isExpired ? t("auth.expired", "Expired") : formattedExpiration}
                  </div>
                </div>

                <p className="text-cyan-600 font-black">{value || localValue}</p>

                <button
                  type="button"
                  onClick={onChangeIdentity}
                  className="mt-3 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 hover:text-cyan-600 transition-colors"
                >
                  <RefreshCcw size={14} /> {t("auth.change", "Change")}
                </button>
              </div>

              <div className={`group relative border-b transition-all duration-500 py-3 ${focused === "otp" ? "border-cyan-600" : isExpired || displayError ? "border-rose-300" : "border-zinc-100"}`}>
                <div className="flex items-center gap-3">
                  <input
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setFocused("otp")}
                    onBlur={() => setFocused(null)}
                    disabled={isExpired}
                    placeholder={t("auth.otpPlaceholder", "Enter 6-digit OTP")}
                    className="w-full bg-transparent outline-none text-sm font-medium tracking-[0.35em] text-center placeholder:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* ✅ Clean Text Error / Expiration Warnings */}
              {isExpired ? (
                <p className="text-[11px] font-semibold text-rose-600 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle size={14} /> This OTP has expired. Please request a new one.
                </p>
              ) : displayError ? (
                <p className="text-[11px] font-semibold text-rose-600 text-center">
                  {displayError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canVerifyOtp}
                className="group relative w-full bg-cyan-600 text-white py-5 rounded-2xl overflow-hidden transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-700"
              >
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.4em]">{isLoading ? t("auth.verifying", "Verifying...") : t("auth.verify", "Verify")}</span>
                  {!isLoading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                </div>
              </button>

              <button
                type="button"
                onClick={onResendOtp}
                disabled={isLoading || !canResend}
                className={`w-full py-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.3em] transition-all ${canResend
                  ? "border-zinc-100 text-zinc-400 hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-200"
                  : "border-zinc-50 text-zinc-300 cursor-not-allowed"
                  }`}
              >
                {canResend ? t("auth.resendOtp", "Resend OTP") : t("auth.resendIn", "Resend in {{s}}s").replace("{{s}}", String(resendCooldown))}
              </button>
            </form>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-zinc-100" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300">Auth Options</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>

           <div className="mt-4">
  <GoogleLogin
    onSuccess={(credentialResponse) => {
      if (credentialResponse.credential) {
        dispatch(googleLogin({
          credential: credentialResponse.credential,
        }));
      }
    }}
    onError={() => {
      dispatch(authError("Google sign-in was cancelled or failed." as any));
    }}
    width="280"
  />
</div>
          </div>
        </div>

        <footer className="text-center mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            No account?{" "}
            <button onClick={() => navigate("/register")} className="text-cyan-600 font-black border-b-2 border-zinc-100 hover:border-cyan-600 transition-all ml-1 pb-0.5">
              Join the Network
            </button>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
