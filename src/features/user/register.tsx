import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  Loader2,
  Check,
  Phone,
  Mail,
  RefreshCcw,
  User,
  Timer,
  AlertCircle
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

const RegisterWithOtp: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isArabic } = useLanguageToggle();
  const { t } = useTranslation("common");

  const { otp_type, step, isLoading, error, value, isAuthenticated, user } = useSelector(
    (s: any) => s.auth
  );

  const [localValue, setLocalValue] = useState(value || "");
  const [otp, setOtp] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [sendToWhatsApp, setSendToWhatsApp] = useState(false);
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [countryCode, setCountryCode] = useState("+971");
  const [, setDropdownOpen] = useState(false);
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

  useEffect(() => { setLocalValue(value || ""); }, [value]);

  // Clear any stale auth errors (e.g. from Login page)
  useEffect(() => {
    dispatch(authError(null as any));
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isAdmin = user.role === "admin" || user.is_admin === true;
    navigate(isAdmin ? "/admin/dashboard" : "/", { replace: true });
  }, [isAuthenticated, user, navigate]);

  const getPhoneRequirements = (code: string) => {
    switch (code) {
      case "+971": return { length: 9, pattern: /^5/, description: "9 digits (mobile format)" };
      case "+91": return { length: 10, pattern: /^[6-9]/, description: "10 digits" };
      case "+86": return { length: 11, pattern: /^1/, description: "11 digits" };
      default: return { length: 10, pattern: null, description: "10 digits" };
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

  const isFirstNameValid = useMemo(() => {
    const trimmed = firstName.trim();
    return trimmed.length >= 2 && /^[a-zA-Z\s]+$/.test(trimmed);
  }, [firstName]);

  const canSendOtp =
    !isLoading &&
    agreeTerms &&
    isFirstNameValid &&
    (otp_type === "phone" ? isPhoneValid : isEmailValid);

  const canVerifyOtp = !isLoading && !isExpired && otp.trim().length === 6;

  const onChangeMethod = (m: AuthMethod) => {
    setOtp("");
    setAgreeTerms(false);
    setLocalValue("");
    setFirstName("");
    setLastName("");
    setFirstNameTouched(false);
    setCountryCode("+971");
    reset();
    dispatch(setMethod(m));
  };

  const getFormattedPhone = () =>
    otp_type === "phone" ? `${countryCode}${localValue.trim().replace(/^0+/, '')}` : undefined;

  const onSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendOtp) return;

    dispatch(
      requestOtp({
        otp_type: otp_type,
        phone_number: getFormattedPhone(),
        email: otp_type === "email" ? localValue.trim() : undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        referral_code: referralCode.trim() || undefined,
        otp_platform: sendToWhatsApp ? "whatsapp" : undefined,
      })
    );
    startTimers();
  };

  const onVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canVerifyOtp) return;

    dispatch(
      verifyOtp({
        otp_type: otp_type,
        phone_number: getFormattedPhone(),
        email: otp_type === "email" ? (value || localValue.trim()) : undefined,
        otp_code: otp.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        referral_code: referralCode.trim() || undefined,
      })
    );
  };

  const onChangeNumberOrEmail = () => {
    setOtp("");
    reset();
    dispatch(setStep("input"));
  };

  const onResend = () => {
    if (isLoading || !canResend) return;
    dispatch(
      requestOtp({
        otp_type: otp_type,
        phone_number: getFormattedPhone(),
        email: otp_type === "email" ? (value || localValue.trim()) : undefined,
        otp_platform: sendToWhatsApp ? "whatsapp" : undefined,
      })
    );
    startTimers();
  };

  const displayError = useMemo(() => {
    if (!error) return null;
    if (error.includes("400") || error.includes("Request failed")) {
      return step === "otp" ? "Invalid or expired OTP." : "Invalid details provided. Please check and try again.";
    }
    return error;
  }, [error, step]);

  return (
    <div className="min-h-screen bg-white text-black antialiased flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-105">
        <div className="mt-4 rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)] bg-white">
          <div className="px-6 pt-7 pb-6">
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight">{t("auth.createAccount", "Create account")}</h1>
            <p className="mt-2 text-sm text-gray-500">{t("auth.registerUsingOtp", "Register using OTP. No password needed.")}</p>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => onChangeMethod("phone")}
                className={`h-10 rounded-xl text-[11px] font-semibold uppercase tracking-[0.18em] transition ${otp_type === "phone" ? "bg-white shadow-sm text-cyan-600" : "text-gray-500 hover:text-cyan-600"}`}
              >
                <span className="inline-flex items-center gap-2 justify-center"><Phone size={14} /> {t("auth.phone", "Phone")}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeMethod("email")}
                className={`h-10 rounded-xl text-[11px] font-semibold uppercase tracking-[0.18em] transition ${otp_type === "email" ? "bg-white shadow-sm text-cyan-600" : "text-gray-500 hover:text-cyan-600"}`}
              >
                <span className="inline-flex items-center gap-2 justify-center"><Mail size={14} /> {t("auth.email", "Email")}</span>
              </button>
            </div>

            {step === "input" && (
              <form onSubmit={onSendOtp} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t("auth.firstName", "First Name")}>
                    <div className="relative">
                      <User size={16} className={`absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={() => setFirstNameTouched(true)}
                        placeholder={t("auth.firstNamePlaceholder", "First name")}
                        className={`w-full h-11 rounded-xl border bg-white pl-9 pr-3 text-sm outline-none transition
                                   focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-300
                                   ${firstNameTouched && !isFirstNameValid ? "border-rose-400" : "border-gray-200"}`}
                      />
                    </div>
                    {firstNameTouched && !isFirstNameValid && (
                      <p className="text-[11px] text-rose-500 mt-1">
                        {firstName.trim().length < 2 ? t("auth.firstNameTooShort", "At least 2 characters.") : t("auth.firstNameOnlyLetters", "Letters and spaces only.")}
                      </p>
                    )}
                  </Field>
                  <Field label={t("auth.lastName", "Last Name")}>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t("auth.lastNamePlaceholder", "Last name")}
                      className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition
                                 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-300"
                    />
                  </Field>

                </div>

                <Field label={t("auth.referralCode", "Referral Code (optional)")}>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder={t("auth.referralCodePlaceholder", "Enter referral code (if any)")}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-300"
                  />
                </Field>

                <Field label={otp_type === "phone" ? t("auth.phoneNumber", "Phone number") : t("auth.email", "Email")}>
                  {otp_type === "phone" ? (
                    <div className="flex gap-2">
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-2 px-1 text-sm text-gray-700 shrink-0">
                          <img src={selectedCountry.flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
                          <span className="font-bold text-gray-600">{selectedCountry.code}</span>
                        </div>
                      </div>

                      <input
                        type="tel"
                        required
                        maxLength={phoneRequirements.length}
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder={t("auth.phoneDigits", "{{n}} digits").replace("{{n}}", String(phoneRequirements.length))}
                        className="flex-1 h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition
                                   focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-300"
                      />
                    </div>
                  ) : (
                    <input
                      type="email"
                      required
                      value={localValue}
                      onChange={(e) => setLocalValue(e.target.value)}
                      placeholder={t("auth.emailPlaceholder", "name@domain.com")}
                      className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition
                                 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-300"
                    />
                  )}
                </Field>

                <div className="mt-4 space-y-3">
                  {otp_type === "phone" && (
                    <label className="flex items-center gap-3 cursor-pointer select-none group/wa">
                      <div className="relative h-4 w-4 rounded-md border border-gray-300 flex items-center justify-center transition-all group-hover/wa:border-green-500">
                        <input
                          type="checkbox"
                          className="peer absolute inset-0 opacity-0 cursor-pointer"
                          checked={sendToWhatsApp}
                          onChange={(e) => setSendToWhatsApp(e.target.checked)}
                        />
                        <Check size={12} strokeWidth={3} className="opacity-0 peer-checked:opacity-100 transition-opacity text-green-600" />
                      </div>
                      <span className="text-xs text-gray-500 group-hover/wa:text-green-600 transition-colors">
                        {t("auth.sendToWhatsApp", "Send OTP via WhatsApp")}
                      </span>
                    </label>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer select-none group/terms">
                    <div className="relative mt-0.5 h-4 w-4 rounded-md border border-gray-300 flex items-center justify-center transition-all group-hover/terms:border-cyan-500">
                      <input
                        type="checkbox"
                        className="peer absolute inset-0 opacity-0 cursor-pointer"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                      />
                      <Check
                        size={12}
                        strokeWidth={3}
                        className="opacity-0 peer-checked:opacity-100 transition-opacity text-cyan-600"
                      />
                    </div>
                    <span className="text-xs text-gray-500 leading-relaxed group-hover/terms:text-gray-700 transition-colors">
                      <Trans
                        i18nKey="auth.termsSentence"
                        ns="common"
                        components={[
                          <a
                            href="/terms-of-service"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2 font-semibold transition-colors"
                          />,
                          <a
                            href="/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2 font-semibold transition-colors"
                          />,
                        ]}
                      />
                    </span>
                  </label>
                </div>

                {displayError && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-2">
                    {displayError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSendOtp}
                  className="w-full h-11 rounded-xl bg-cyan-600 text-white text-[11px] font-semibold uppercase tracking-[0.22em]
                             flex items-center justify-center gap-2 transition
                             hover:bg-cyan-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      {t("auth.sendOtp", "Send OTP")} <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={onVerifyOtp} className="mt-6 space-y-5">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">{t("auth.otpSentTo", "OTP sent to")} <span className="text-cyan-600 font-semibold">{value || localValue}</span></p>
                    <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isExpired ? "text-rose-500" : "text-cyan-600"}`}>
                      <Timer size={12} />
                      {isExpired ? "Expired" : formattedExpiration}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onChangeNumberOrEmail}
                    className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-700 hover:text-cyan-600"
                  >
                    <RefreshCcw size={14} /> Change
                  </button>
                </div>

                <Field label={t("auth.otpSixDigits", "OTP (6 digits)")}>
                  <input
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={isExpired}
                    placeholder="••••••"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm tracking-[0.35em] text-center outline-none transition
                               focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </Field>

                {isExpired ? (
                  <p className="text-[11px] font-semibold text-rose-600 text-center flex items-center justify-center gap-1.5"><AlertCircle size={14} /> {t("auth.otpExpiredText", "This OTP has expired. Please request a new one.")}</p>
                ) : displayError ? (
                  <p className="text-[11px] font-semibold text-rose-600 text-center">
                    {displayError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={!canVerifyOtp}
                  className="w-full h-11 rounded-xl bg-cyan-600 text-white text-[11px] font-semibold uppercase tracking-[0.22em]
                             flex items-center justify-center gap-2 transition
                             hover:bg-cyan-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      {t("auth.verifyContinue", "Verify & Continue")} <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onResend}
                  disabled={isLoading || !canResend}
                  className={`w-full h-11 rounded-xl border text-[11px] font-semibold uppercase tracking-[0.18em] transition ${canResend
                    ? "border-gray-200 text-gray-600 hover:border-cyan-600 hover:text-cyan-600"
                    : "border-gray-100 text-gray-300 cursor-not-allowed"
                    }`}
                >
                  {canResend ? (
                    "Resend OTP"
                  ) : (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <Timer size={14} />
                      Resend in {resendCooldown}s
                    </span>
                  )}
                </button>
              </form>
            )}

            <div className="mt-7">
              <div className="flex items-center gap-3 text-gray-200">
                <div className="h-px flex-1 bg-current" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  or
                </span>
                <div className="h-px flex-1 bg-current" />
              </div>

              <div className="mt-4">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      dispatch(googleLogin({
                        credential: credentialResponse.credential,
                        referral_code: referralCode.trim() || undefined,
                      }));
                    }
                  }}
                  onError={() => {
                    dispatch(authError("Google sign-in was cancelled or failed." as any));
                  }}
                  width="100%"
                />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <p className="text-center text-xs text-gray-500">
              Already a member?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-cyan-600 font-semibold underline underline-offset-4"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          OTP-first onboarding. Faster conversion.
        </p>
      </div>
    </div>
  );
};

export default RegisterWithOtp;

/* --- Small field wrapper --- */
function Field({
  label,
  children,
  right,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
          {label}
        </span>
        {right}
      </div>
      {children}
      {hint ? <div>{hint}</div> : null}
    </div>
  );
}
