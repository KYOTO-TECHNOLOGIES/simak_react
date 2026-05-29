import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useDeliveryEstimation } from "../../hooks/useDeliveryEstimation";
import {
  selectCartItems,
  selectInStockCartItems,
  selectInStockCartTotal,
  clearCart,
  fetchCartRequest,
  isCartItemInStock,
} from "../admin/cart/cartSlice";
import { ordersApi, type CheckoutSummaryResponse, type DeliveryChargeSettingsDto, type DeliverySlotDto } from "../admin/orders/ordersApi";
import { customersApi, type AddressDto } from "../admin/customers/customersApi";
import { cartsApi } from "../admin/cart/cartApi";
import {
  MapPin, CreditCard, Truck, ArrowLeft, Loader2,
  Calendar, Clock, MessageSquare, Plus, Home, Briefcase, ChevronDown, Info, Check, Tag, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useToast } from "../../components/ui/Toast";
import BackendData from "../../components/ui/BackendData";
import GoogleMapPicker, { type MapPickerResult } from "../../components/ui/GoogleMapPicker";
import { MdDeliveryDining } from "react-icons/md";
import useLanguageToggle from "../../hooks/useLanguageToggle";
import { profileApi } from "./profileApi";
import { setUser } from "../auth/authSlice";
import { api, tokenManager } from "../../services/api";

// ✅ Updated Tip Presets
const TIP_PRESETS = [0, 1, 3, 5];

const ADDRESS_TYPES = [
  { value: "home", key: "addressTypes.home" },
  { value: "work", key: "addressTypes.work" },
  { value: "other", key: "addressTypes.other" },
];

const EMIRATES = [
  { value: "abu_dhabi", key: "emirates.abu_dhabi", available: true },
  { value: "dubai", key: "emirates.dubai", available: false },
  { value: "sharjah", key: "emirates.sharjah", available: false },
  { value: "ajman", key: "emirates.ajman", available: false },
  { value: "umm_al_quwain", key: "emirates.umm_al_quwain", available: false },
  { value: "ras_al_khaimah", key: "emirates.ras_al_khaimah", available: false },
  { value: "fujairah", key: "emirates.fujairah", available: false },
];

type CouponFeedback = {
  type: "success" | "error";
  message: string;
};

type AvailableCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  badge?: string;
};

const parseAmount = (value?: string | number | null) => {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;

  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const computeDeliveryCharge = (
  orderTotal: number,
  settings: DeliveryChargeSettingsDto | null
) => {
  if (!settings) return null;
  if (!settings.is_active) return 0;
  return orderTotal >= settings.min_order_for_free_delivery ? 0 : settings.delivery_charge_amount;
};

const normalizeCouponCode = (value?: string | null) =>
  String(value ?? "").trim().toUpperCase();

const normalizeAvailableCoupon = (raw: any, index: number, t: any): AvailableCoupon | null => {
  const code = normalizeCouponCode(raw?.coupon_code ?? raw?.code ?? raw?.promo_code);

  if (!code) return null;

  const discountType = String(raw?.discount_type ?? "").toLowerCase();
  const percentage = raw?.discount_percentage ?? raw?.percentage;
  const fixedAmount = raw?.discount_amount ?? raw?.amount ?? raw?.discount_value;

  let badge = "";
  if (discountType === "percentage" && percentage !== undefined && percentage !== null) {
    badge = `${percentage}% OFF`;
  } else if (fixedAmount !== undefined && fixedAmount !== null && String(fixedAmount).trim() !== "") {
    badge = `AED ${parseAmount(fixedAmount).toFixed(0)} OFF`;
  }

  return {
    id: String(raw?.id ?? `${code}-${index}`),
    code,
    title: raw?.title ?? raw?.name ?? code,
    description:
      raw?.description ||
      raw?.message ||
      raw?.short_description ||
      (badge ? t("coupons.applyToOrder", { badge: badge.toLowerCase() }) : t("coupons.availableCoupon")),
    badge: badge || undefined,
  };
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
    return String(data.non_field_errors[0]);
  }

  if (data && typeof data === "object") {
    const firstFieldError = Object.values(data).find(
      (value) =>
        (Array.isArray(value) && value.length > 0) ||
        (typeof value === "string" && value.trim())
    );

    if (Array.isArray(firstFieldError) && firstFieldError.length > 0) {
      return String(firstFieldError[0]);
    }

    if (typeof firstFieldError === "string" && firstFieldError.trim()) {
      return firstFieldError;
    }
  }

  return fallback;
};

const CheckoutPage: React.FC = () => {
  const { t } = useTranslation("checkout");
  const { isArabic } = useLanguageToggle();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const allCartItems = useAppSelector(selectCartItems);
  const cartItems = useAppSelector(selectInStockCartItems);
  const cartTotal = useAppSelector(selectInStockCartTotal);
  const { user } = useAppSelector((s: any) => s.auth);
  const outOfStockCartItems = allCartItems.filter((item) => !isCartItemInStock(item));
  const prunedOutOfStockSignature = useRef<string>("");

  // ─── Delivery Estimation from Tiers ───
  const { estimation, loading: estimationLoading, error: estimationError, stockDetails } = useDeliveryEstimation();
  const emirateUnavailableMessage = t("address.errors.emirateUnsupported", {
    defaultValue: "Delivery is currently available only in Abu Dhabi.",
  });

  // ─── State ───
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliverySlot, setDeliverySlot] = useState<number | "">("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<DeliverySlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [couponFeedback, setCouponFeedback] = useState<CouponFeedback | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [deliveryChargeSettings, setDeliveryChargeSettings] = useState<DeliveryChargeSettingsDto | null>(null);
  const [loadingDeliveryChargeSettings, setLoadingDeliveryChargeSettings] = useState(true);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryUnsupported, setSummaryUnsupported] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ZIINA">("ZIINA");

  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // ─── Phone Verification Gate ───
  const phoneVerified: boolean = Boolean(user?.is_phone_verified ?? user?.profile?.is_phone_verified);
  const existingPhone: string = user?.phone_number || "";
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState<"input" | "otp">("input");
  const [verifyCountry] = useState("+971");
  const [verifyPhone, setVerifyPhone] = useState(existingPhone.replace(/[^\d]/g, "").replace(/^(\+971)/, "") || "");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyWhatsApp, setVerifyWhatsApp] = useState(false);

  // Add address form
  const [showAddressForm, setShowAddressForm] = useState(false);

  const getPhonePrefill = (rawPhone?: string) => {
    const digitsPhone = String(rawPhone || "").replace(/[^\d+]/g, "");
    const supportedCodes = ["+971"];
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

  const phonePrefill = getPhonePrefill(user?.phone_number);
  const [addressForm, setAddressForm] = useState({
    label: "home", full_name: "", phone_number: "", building_name: "",
    flat_villa_number: "", street_address: "", area: "", city: "",
    emirate: "abu_dhabi", country: "AE", address_type: "home",
    latitude: null as number | null, longitude: null as number | null,
  });
  const [addrCountryCode, setAddrCountryCode] = useState(phonePrefill.countryCode);
  const [, setAddrDropdownOpen] = useState(false);
  const addrDropdownRef = useRef<HTMLDivElement>(null);
  const addressCountries = [
    { code: "+971", flag: "https://flagcdn.com/w40/ae.png", name: "UAE" },
  ];
  const getPhoneRequirements = (code: string) => {
    switch (code) {
      case "+971": return { length: 9, pattern: /^5/, name: "UAE" };
      case "+91": return { length: 10, pattern: /^[6-9]/, name: "India" };
      case "+86": return { length: 11, pattern: /^1/, name: "China" };
      default: return { length: 10, pattern: null, name: "Phone" };
    }
  };
  const verifyReq = getPhoneRequirements(verifyCountry);
  const isVerifyPhoneValid = (() => {
    const digits = verifyPhone.replace(/[^\d]/g, "");
    if (digits.length !== verifyReq.length) return false;
    return verifyReq.pattern ? verifyReq.pattern.test(digits) : true;
  })();
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addrDropdownRef.current && !addrDropdownRef.current.contains(e.target as Node)) {
        setAddrDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [addressPhoneOtpStep, setAddressPhoneOtpStep] = useState<"idle" | "otp">("idle");
  const [addressPhoneOtp, setAddressPhoneOtp] = useState("");
  const [sendingAddressOtp, setSendingAddressOtp] = useState(false);
  const [verifyingAddressOtp, setVerifyingAddressOtp] = useState(false);
  const [addressPhoneVerified, setAddressPhoneVerified] = useState(false);
  const [addressPhoneVerificationError, setAddressPhoneVerificationError] = useState<string | null>(null);
  const [addressPhoneWhatsApp, setAddressPhoneWhatsApp] = useState(false);

  const accountPhoneComposed = String(user?.phone_number || "").replace(/\s+/g, "");
  const composedAddressPhone = `${addrCountryCode}${(addressForm.phone_number || "").replace(/[^\d]/g, "").replace(/^0+/, "")}`;
  const isAddressPhoneValid = (() => {
    const req = getPhoneRequirements(addrCountryCode);
    const digits = (addressForm.phone_number || "").replace(/[^\d]/g, "");
    return digits.length === req.length && (!req.pattern || req.pattern.test(digits));
  })();
  const isAddressPhoneOtpVerified = phoneVerified || addressPhoneVerified;

  useEffect(() => {
    if (!showAddressForm) return;
    const prefill = getPhonePrefill(user?.phone_number);
    setAddrCountryCode(prefill.countryCode);
    setAddressForm((prev) => ({
      ...prev,
      phone_number: prev.phone_number || prefill.localNumber,
    }));
    setAddressPhoneOtpStep("idle");
    setAddressPhoneOtp("");
    setAddressPhoneVerificationError(null);
    setAddressPhoneVerified(false);
  }, [showAddressForm, user?.phone_number]);

  const validateAddress = () => {
    const errors: Record<string, string> = {};
    if (!addressForm.full_name || addressForm.full_name.trim().length < 3) {
      errors.full_name = t("address.errors.nameRequired", { defaultValue: "Full name must be at least 3 characters" });
    }
    const req = getPhoneRequirements(addrCountryCode);
    const digitsOnly = (addressForm.phone_number || "").replace(/[^\d]/g, "");
    if (digitsOnly.length !== req.length || (req.pattern && !req.pattern.test(digitsOnly))) {
      errors.phone_number = t("address.errors.phoneInvalid", {
        defaultValue: `${req.name}: ${req.length} digits${req.pattern ? ", specific starting digits required" : ""}`,
        name: req.name,
        length: req.length,
        reqPatternStr: req.pattern ? ", specific starting digits required" : ""
      });
    }
    if (!addressForm.street_address) errors.street_address = t("address.errors.streetRequired", { defaultValue: "Street address is required" });
    if (!addressForm.area) errors.area = t("address.errors.areaRequired", { defaultValue: "Area is required" });
    if (!addressForm.emirate) errors.emirate = t("address.errors.emirateRequired", { defaultValue: "Please select an emirate" });
    if (addressForm.emirate && addressForm.emirate !== "abu_dhabi") {
      errors.emirate = emirateUnavailableMessage;
    }
    if (!isAddressPhoneOtpVerified) {
      errors.phone_number = t("address.errors.phoneOtpRequired", {
        defaultValue: "Please verify this phone number with OTP before saving the address.",
      });
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Fetch Addresses ───
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const data = await customersApi.listAddresses();
        const list = Array.isArray(data) ? data : data.results || [];
        setAddresses(list);
        const defaultAddr = list.find((a: AddressDto) => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (list.length > 0) setSelectedAddressId(list[0].id);
      } catch (err) {
        console.error("Failed to load addresses", err);
      } finally {
        setLoadingAddresses(false);
      }
    };
    loadAddresses();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDeliveryChargeSettings = async () => {
      try {
        const data = await ordersApi.getDeliveryChargeSettings();
        if (isMounted) {
          setDeliveryChargeSettings(data);
        }
      } catch (error) {
        console.error("Failed to load delivery charge settings", error);
        if (isMounted) {
          setDeliveryChargeSettings(null);
        }
      } finally {
        if (isMounted) {
          setLoadingDeliveryChargeSettings(false);
        }
      }
    };

    void loadDeliveryChargeSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (outOfStockCartItems.length === 0) {
      return;
    }

    const ids = outOfStockCartItems
      .map((item) => item.id)
      .sort((left, right) => left - right);
    const signature = ids.join(",");

    if (!signature || signature === prunedOutOfStockSignature.current) {
      return;
    }

    prunedOutOfStockSignature.current = signature;
    let cancelled = false;

    const pruneOutOfStockItems = async () => {
      await Promise.all(ids.map((id) => cartsApi.removeItem(id).catch(() => null)));

      if (cancelled) return;

      dispatch(fetchCartRequest());
      toast.show(
        t("alerts.removedOutOfStockBeforeCheckout", {
          count: ids.length,
          defaultValue:
            ids.length === 1
              ? "1 out-of-stock item was removed from checkout."
              : `${ids.length} out-of-stock items were removed from checkout.`,
        }),
        "warning"
      );
    };

    void pruneOutOfStockItems();

    return () => {
      cancelled = true;
    };
  }, [dispatch, outOfStockCartItems, t, toast]);

  // ─── Computed ───
  useEffect(() => {
    let isMounted = true;

    const loadAvailableCoupons = async () => {
      setLoadingCoupons(true);
      setCouponsError(null);

      try {
        const response = await api.get("/marketing/coupons/");
        const rawCoupons = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
            ? response.data.results
            : [];

        const normalizedCoupons = rawCoupons
          .filter((coupon: any) => {
            if (coupon.is_active !== true) return false;

            const validTo = coupon.valid_to ? new Date(coupon.valid_to) : null;
            if (validTo && !Number.isNaN(validTo.getTime()) && validTo.getTime() < Date.now()) {
              return false;
            }

            return true;
          })
          .map((coupon: any, index: number) => normalizeAvailableCoupon(coupon, index, t))
          .filter(Boolean) as AvailableCoupon[];

        if (isMounted) {
          setAvailableCoupons(normalizedCoupons);
        }
      } catch (error: any) {
        if (isMounted) {
          setCouponsError(
            getApiErrorMessage(error, t("coupons.unableToLoad", "Unable to load available coupons right now."))
          );
        }
      } finally {
        if (isMounted) {
          setLoadingCoupons(false);
        }
      }
    };

    void loadAvailableCoupons();

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveTip = isCustomTip ? (parseFloat(customTip) || 0) : tipAmount;
  const summarySubtotal = checkoutSummary ? parseAmount(checkoutSummary.cart_total_before_discount) : cartTotal;
  const summaryDiscount = checkoutSummary ? parseAmount(checkoutSummary.discount_amount) : 0;
  const summaryAfterDiscount = checkoutSummary ? parseAmount(checkoutSummary.cart_total_after_discount) : cartTotal;
  const previewDeliveryCharge = computeDeliveryCharge(summaryAfterDiscount, deliveryChargeSettings);
  const summaryDeliveryCharge = checkoutSummary ? parseAmount(checkoutSummary.delivery_charge) : previewDeliveryCharge;
  const summaryTip = checkoutSummary ? parseAmount(checkoutSummary.tip_amount) : effectiveTip;
  const finalTotal = checkoutSummary
    ? parseAmount(checkoutSummary.final_total)
    : Number((cartTotal + effectiveTip + (summaryDeliveryCharge ?? 0)).toFixed(2));

  // Min date = earliest delivery date from estimation, or UAE today as fallback
  const uaeTodayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  const minDate = estimation?.estimated_delivery_date ?? uaeTodayDate;
  const deliveryBaseDate = parseDateOnly(minDate) ?? parseDateOnly(uaeTodayDate) ?? new Date();
  const deliveryWindowEnd = addDays(deliveryBaseDate, 1);
  const visibleDeliveryDates = Array.from({ length: 7 }, (_, index) => addDays(deliveryBaseDate, index - 2));
  const selectedDeliveryDate = parseDateOnly(deliveryDate);

  const isDateSelectable = (date: Date) =>
    date.getTime() >= deliveryBaseDate.getTime() && date.getTime() <= deliveryWindowEnd.getTime();

  const formatDeliveryDate = (date: Date) =>
    new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);

  useEffect(() => {
    if (!deliveryDate) return;

    if (!selectedDeliveryDate || !isDateSelectable(selectedDeliveryDate)) {
      setDeliveryDate("");
      setDeliverySlot("");
    }
  }, [deliveryDate, minDate]);

  // ─── Fetch Available Slots ───
  useEffect(() => {
    let isMounted = true;

    const loadSlots = async () => {
      if (!deliveryDate) return;

      setLoadingSlots(true);
      setSlotsError(null);

      try {
        const response = await ordersApi.getAvailableSlots(deliveryDate);
        if (isMounted) {
          setAvailableSlots(response.available_slots);
          // If current slot is not in the new list, clear it
          if (deliverySlot && !response.available_slots.find(s => s.id === deliverySlot)) {
            setDeliverySlot("");
          }
          // Auto-select first slot if none selected? Optional.
        }
      } catch (error: any) {
        if (isMounted) {
          const msg = getApiErrorMessage(error, "Unable to load delivery slots.");
          setSlotsError(msg);
          setAvailableSlots([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    };

    void loadSlots();

    return () => {
      isMounted = false;
    };
  }, [deliveryDate]);

  // ─── Add Address Handler ───
  const fetchCheckoutSummary = async () => {
    if (summaryUnsupported) {
      return "unsupported" as const;
    }

    if (!selectedAddressId) {
      setCheckoutSummary(null);
      setSummaryError(null);
      return null;
    }

    if (!deliveryDate) {
      setCheckoutSummary(null);
      setSummaryError(null);
      return null;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const summary = await ordersApi.checkoutSummary({
        address_id: selectedAddressId,
        coupon_code: appliedCouponCode || undefined,
        tip_amount: effectiveTip > 0 ? effectiveTip : undefined,
        preferred_delivery_date: deliveryDate || undefined,
        preferred_delivery_slot: deliverySlot || undefined,
      });

      setCheckoutSummary(summary);
      setSummaryUnsupported(false);

      if (summary.coupon_message) {
        setCouponFeedback({
          type: parseAmount(summary.discount_amount) > 0 ? "success" : "error",
          message: summary.coupon_message,
        });
      }

      return summary;
    } catch (error: any) {
      if (error?.response?.status === 405) {
        setCheckoutSummary(null);
        setSummaryUnsupported(true);
        setSummaryError(
          t("alerts.summaryUnsupported", "This server does not support checkout summary yet. You can still continue to place the order.")
        );
        return "unsupported" as const;
      }

      const message = getApiErrorMessage(
        error,
        t("alerts.summaryUpdateFailedShort", "Unable to load the checkout summary right now.")
      );

      setSummaryError(message);
      return null;
    } finally {
      setSummaryLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedAddressId || !deliveryDate) {
      setCheckoutSummary(null);
      setSummaryError(null);
      return;
    }

    if (summaryUnsupported) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchCheckoutSummary();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [selectedAddressId, appliedCouponCode, effectiveTip, deliveryDate, deliverySlot, summaryUnsupported]);

  const handleApplyCoupon = async (couponCode = couponInput) => {
    const normalizedCoupon = String(couponCode ?? "").trim().toUpperCase();

    if (!normalizedCoupon) {
      setCouponFeedback({
        type: "error",
        message: t("coupons.enterToApply", "Enter a coupon code to apply it."),
      });
      return;
    }

    setValidatingCoupon(true);
    setCouponFeedback(null);
    setCouponInput(normalizedCoupon);

    try {
      const result = await ordersApi.validateCoupon({
        coupon_code: normalizedCoupon,
        cart_total: cartTotal,
      });

      if (result.success) {
        const resolvedCode = result.coupon_code || normalizedCoupon;
        setAppliedCouponCode(resolvedCode);
        setCouponInput(resolvedCode);
        setCouponFeedback({
          type: "success",
          message: result.message,
        });
      } else {
        setAppliedCouponCode("");
        setCouponFeedback({
          type: "error",
          message: result.message,
        });
      }
    } catch (error: any) {
      const message = getApiErrorMessage(
        error,
        t("alerts.couponValidationFailed", "Unable to validate this coupon right now.")
      );

      setAppliedCouponCode("");
      setCouponFeedback({
        type: "error",
        message,
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput("");
    setAppliedCouponCode("");
    setCouponFeedback(null);
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;

    setSavingAddress(true);
    try {
      const newAddr = await customersApi.createAddress({
        ...addressForm,
        phone_number: `${addrCountryCode}${(addressForm.phone_number || "").replace(/[^\d]/g, "").replace(/^0+/, "")}`
      } as any);
      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowAddressForm(false);
      setAddressForm({
        label: "home", full_name: "", phone_number: "", building_name: "",
        flat_villa_number: "", street_address: "", area: "", city: "",
        emirate: "abu_dhabi", country: "AE", address_type: "home",
        latitude: null, longitude: null,
      });
      const prefill = getPhonePrefill(user?.phone_number);
      setAddrCountryCode(prefill.countryCode);
      setAddressPhoneOtpStep("idle");
      setAddressPhoneOtp("");
      setAddressPhoneVerificationError(null);
      setAddressPhoneVerified(false);
      setAddressErrors({});
    } catch (err: any) {
      console.error("Failed to save address", err);
      const serverMsg = err?.response?.data?.error || t("address.errors.saveFailed", { defaultValue: "Failed to save address. Please try again." });
      toast.show(serverMsg, "error");
    } finally {
      setSavingAddress(false);
    }
  };

  // ─── Submit Checkout ───
  const handlePlaceOrder = async () => {
    setAttemptedSubmit(true);

    if (cartItems.length === 0) {
      toast.show(
        t("alerts.inStockItemsRequired", {
          defaultValue: "Your cart has no in-stock items available for checkout.",
        }),
        "warning"
      );
      return;
    }

    if (!phoneVerified) {
      // Open verification modal if not verified
      setVerifyOpen(true);
      setVerifyStep("input");
      return;
    }

    if (!selectedAddressId) {
      toast.show(t("alerts.selectAddress"), "error");
      return;
    }

    if (!deliveryDate) {
      toast.show(t("alerts.selectDeliveryDate", { defaultValue: "Please select a preferred delivery date" }), "error");
      return;
    }

    if (!deliverySlot) {
      toast.show(t("alerts.selectDeliverySlot", { defaultValue: "Please select a preferred delivery slot" }), "error");
      return;
    }

    setSubmitting(true);
    try {
      const latestSummary = await fetchCheckoutSummary();

      if (latestSummary === null) {
        toast.show(
          summaryError || t("alerts.summaryUpdateFailed", "Unable to confirm your final total right now. Please try again."),
          "error"
        );
        return;
      }

      if (
        latestSummary !== "unsupported" &&
        appliedCouponCode &&
        latestSummary.coupon_message &&
        parseAmount(latestSummary.discount_amount) <= 0
      ) {
        toast.show(latestSummary.coupon_message, "error");
        return;
      }

      const payload: any = {
        address_id: selectedAddressId,
        payment_method: paymentMethod,
        preferred_delivery_date: deliveryDate,
      };
      if (deliverySlot) payload.preferred_delivery_slot = deliverySlot;
      if (deliveryNotes.trim()) payload.delivery_notes = deliveryNotes.trim();
      if (effectiveTip > 0) payload.tip_amount = effectiveTip;
      if (appliedCouponCode) payload.coupon_code = appliedCouponCode;

      const res = await ordersApi.checkout(payload);

      if (res.payment_method === "ZIINA" && res.payment_url) {
        // Store order_id so payment result pages can always access it
        sessionStorage.setItem("pending_order_id", String(res.order_id));
        localStorage.setItem("pending_order_id", String(res.order_id));
        // Redirect to Ziina payment gateway
        window.location.href = res.payment_url;
        return;
      }

      // COD success
      dispatch(clearCart());
      navigate(`/payment/success?order_id=${res.order_id}`);
    } catch (error: any) {
      const msg = getApiErrorMessage(error, t("alerts.placeOrderFailed"));
      toast.show(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Empty Cart ───
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
          <Truck size={36} className="text-slate-300" />
        </div>
        <p className="text-slate-500 font-semibold">
          {allCartItems.length > 0
            ? t("emptyCart.onlyOutOfStock", {
              defaultValue: "All items in your cart are currently out of stock.",
            })
            : t("emptyCart.title")}
        </p>
        <button
          onClick={() => navigate("/products")}
          className="px-6 py-2.5 bg-cyan-600 text-white rounded-full text-sm font-bold hover:bg-cyan-700 transition-colors"
        >
          {t("emptyCart.cta")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans text-slate-800 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="  mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/cart")} className="text-slate-400 hover:text-cyan-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-900">{t("header.title")}</h1>
        </div>
      </div>

      <main className="  mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* ═══ Left Column - Form ═══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ──── 1. Address Selection ──── */}
          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-50 rounded-xl text-cyan-600">
                <MapPin size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900">{t("address.title")}</h2>
            </div>

            {loadingAddresses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : addresses.length === 0 && !showAddressForm ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-slate-400 text-sm">{t("address.noAddresses")}</p>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 transition-colors"
                >
                  <Plus size={16} /> {t("address.addNew")}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200 ${selectedAddressId === addr.id
                        ? "border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500/20 shadow-md"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                        }`}
                    >
                      {/* Label badge */}
                      <div className="flex items-center gap-2 mb-2">
                        {addr.label?.toLowerCase() === "home" ? (
                          <Home size={14} className="text-cyan-600" />
                        ) : (
                          <Briefcase size={14} className="text-cyan-600" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">
                          {addr.label || t("address.defaultLabel", { defaultValue: "Address" })}
                        </span>
                        {selectedAddressId === addr.id && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-600 text-white">
                            <Check size={12} />
                          </span>
                        )}
                        {addr.is_default && (
                          <span className={`${isArabic ? 'mr-auto' : 'ml-auto'} text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md`}>
                            {t("address.default")}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-bold text-slate-900 mb-0.5">
                        <BackendData value={addr.full_name} />
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        <BackendData
                          value={[addr.flat_villa_number, addr.building_name, addr.street_address]
                            .filter(Boolean).join(", ")}
                        />
                      </p>
                      <p className="text-xs text-slate-400">
                        <BackendData
                          value={[addr.area, addr.city, addr.emirate].filter(Boolean).join(", ")}
                        />
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        <BackendData value={addr.phone_number} />
                      </p>

                      {/* Selected state is indicated by border + ring; no extra badge to avoid overlap with Default */}
                    </button>
                  ))}
                </div>

                {/* Add new address toggle */}
                {!showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-cyan-600 hover:text-cyan-700 transition-colors mt-2"
                  >
                    <Plus size={16} /> {t("address.addNew")}
                  </button>
                )}
              </>
            )}

            {/* ── Add Address Form ── */}
            <AnimatePresence>
              {showAddressForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border border-slate-100 rounded-2xl p-5 space-y-4 mt-3 bg-slate-50/50">
                    {/* Google Maps picker */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("fields.pinLocation", "Pin Your Location")}</p>
                      <GoogleMapPicker
                        onSelect={(result: MapPickerResult) => {
                          const normalizedEmirate = result.emirate
                            ? result.emirate.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "")
                            : "";

                          setAddressForm((prev) => ({
                            ...prev,
                            latitude: result.lat,
                            longitude: result.lng,
                            ...(result.street ? { street_address: result.street } : {}),
                            ...(result.area ? { area: result.area } : {}),
                            ...(result.city ? { city: result.city } : {}),
                            ...(normalizedEmirate ? { emirate: normalizedEmirate } : {}),
                          }));

                          setAddressErrors((prev) => {
                            const next = { ...prev };
                            if (result.street) delete next.street_address;
                            if (result.area) delete next.area;
                            if (result.city) delete next.city;
                            if (normalizedEmirate && normalizedEmirate !== "abu_dhabi") {
                              next.emirate = emirateUnavailableMessage;
                            } else if (normalizedEmirate) {
                              delete next.emirate;
                            }
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Address Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("fields.addressType", "Address Type")}</label>
                        <div className="relative">
                          <select
                            value={addressForm.address_type}
                            onChange={(e) => setAddressForm((prev) => ({ ...prev, address_type: e.target.value, label: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all"
                          >
                            {ADDRESS_TYPES.map((at) => (
                              <option key={at.value} value={at.value}>{t(at.key)}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className={`absolute ${isArabic ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none`} />
                        </div>
                      </div>

                      {/* Text fields */}
                      {([
                        ["full_name", t("address.fields.fullName.label"), t("address.fields.fullName.placeholder")],
                        ["building_name", t("address.fields.building.label"), t("address.fields.building.placeholder")],
                        ["flat_villa_number", t("address.fields.flat.label"), t("address.fields.flat.placeholder")],
                        ["street_address", t("address.fields.street.label"), t("address.fields.street.placeholder")],
                        ["area", t("address.fields.area.label"), t("address.fields.area.placeholder")],
                        ["city", t("address.fields.city.label"), t("address.fields.city.placeholder")],
                      ] as [string, string, string][]).map(([key, label, placeholder]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                          <input
                            value={(addressForm as any)[key]}
                            onChange={(e) => {
                              setAddressForm((prev) => ({ ...prev, [key]: e.target.value }));
                              if (addressErrors[key]) {
                                setAddressErrors(prev => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                });
                              }
                            }}
                            placeholder={placeholder}
                            className={`w-full px-3.5 py-2.5 bg-white border ${addressErrors[key] ? "border-rose-400 focus:ring-rose-500/30" : "border-slate-200 focus:ring-cyan-500/30"} rounded-xl text-sm focus:ring-2 focus:border-cyan-400 outline-none transition-all`}
                          />
                          {addressErrors[key] && (
                            <p className="text-[10px] text-rose-500 font-medium px-1">{addressErrors[key]}</p>
                          )}
                        </div>
                      ))}
                      {/* Phone with country flag selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("fields.phone", "Phone")}</label>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2 px-3 h-10.5 rounded-xl border border-slate-200 bg-white text-sm">
                            <img src={addressCountries[0].flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm" />
                            <span className="font-bold text-slate-700">{addrCountryCode}</span>
                          </div>
                          <input
                            value={addressForm.phone_number}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^\d]/g, "");
                              setAddressForm((prev) => ({ ...prev, phone_number: v }));
                              setAddressPhoneOtpStep("idle");
                              setAddressPhoneOtp("");
                              setAddressPhoneVerificationError(null);
                              setAddressPhoneVerified(false);
                              if (addressErrors.phone_number) {
                                setAddressErrors(prev => {
                                  const next = { ...prev };
                                  delete next.phone_number;
                                  return next;
                                });
                              }
                            }}
                            placeholder={`${getPhoneRequirements(addrCountryCode).length} digits`}
                            maxLength={getPhoneRequirements(addrCountryCode).length}
                            className={`w-full px-3.5 py-2.5 bg-white border ${addressErrors.phone_number ? "border-rose-400 focus:ring-rose-500/30" : "border-slate-200 focus:ring-cyan-500/30"} rounded-xl text-sm focus:ring-2 focus:border-cyan-400 outline-none transition-all`}
                            inputMode="tel"
                          />
                        </div>
                        {addressErrors.phone_number && (
                          <p className="text-[10px] text-rose-500 font-medium px-1">{addressErrors.phone_number}</p>
                        )}
                        {addressPhoneVerificationError && (
                          <p className="text-[10px] text-rose-500 font-medium px-1">{addressPhoneVerificationError}</p>
                        )}

                        {!phoneVerified && !addressPhoneVerified && (
                          <div className="px-1 pt-1 space-y-2">
                            {addressPhoneOtpStep === "idle" ? (
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none group/wa">
                                  <div className="relative h-4 w-4 rounded-md border border-slate-200 flex items-center justify-center transition-all group-hover/wa:border-green-500">
                                    <input
                                      type="checkbox"
                                      className="peer absolute inset-0 opacity-0 cursor-pointer"
                                      checked={addressPhoneWhatsApp}
                                      onChange={(e) => setAddressPhoneWhatsApp(e.target.checked)}
                                    />
                                    <Check size={12} strokeWidth={3} className="opacity-0 peer-checked:opacity-100 transition-opacity text-green-600" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover/wa:text-green-600 transition-colors">
                                    {t("auth.sendToWhatsApp", "Send OTP via WhatsApp")}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setAddressPhoneVerificationError(null);
                                    if (!isAddressPhoneValid) {
                                      const req = getPhoneRequirements(addrCountryCode);
                                      setAddressPhoneVerificationError(`${req.name}: ${req.length} digits${req.pattern ? ", specific starting digits required" : ""}`);
                                      return;
                                    }
                                    try {
                                      setSendingAddressOtp(true);
                                      const isPhoneChanged = composedAddressPhone !== accountPhoneComposed;
                                      if (isPhoneChanged && user?.id) {
                                        await profileApi.updateProfile(user.id, { phone_number: composedAddressPhone } as any);
                                        const me = await profileApi.getMe();
                                        dispatch(setUser(me));
                                      }
                                      await profileApi.sendProfileOtp({
                                        otp_type: "phone",
                                        phone_number: composedAddressPhone,
                                        otp_platform: addressPhoneWhatsApp ? "whatsapp" : undefined,
                                      } as any);
                                      setAddressPhoneOtpStep("otp");
                                    } catch (err: any) {
                                      const detail = getApiErrorMessage(
                                        err,
                                        t("verifyPhone.sendError", { defaultValue: "Failed to send OTP. Try again." })
                                      );
                                      setAddressPhoneVerificationError(detail);
                                      toast.show(detail, "error");
                                    } finally {
                                      setSendingAddressOtp(false);
                                    }
                                  }}
                                  disabled={sendingAddressOtp || !isAddressPhoneValid}
                                  className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                                >
                                  {sendingAddressOtp ? t("verifyPhone.sending", "Sending...") : t("address.verifyPhone", { defaultValue: "Verify this phone with OTP" })}
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  value={addressPhoneOtp}
                                  onChange={(e) => setAddressPhoneOtp(e.target.value.replace(/\D/g, ""))}
                                  maxLength={6}
                                  placeholder={t("fields.digits", { count: 6, defaultValue: "6 digits" })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setAddressPhoneVerificationError(null);
                                    if (addressPhoneOtp.length < 6) {
                                      setAddressPhoneVerificationError(t("verifyPhone.otpError", "Enter the 6-digit OTP."));
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
                                      const me = res?.user || (await profileApi.getMe());
                                      dispatch(setUser(me));
                                      setAddressPhoneVerified(true);
                                      setAddressPhoneOtpStep("idle");
                                      setAddressPhoneOtp("");
                                      setAddressErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.phone_number;
                                        return next;
                                      });
                                      toast.show(t("verifyPhone.success", { defaultValue: "Phone verified. You can now place your order." }), "success");
                                    } catch (err: any) {
                                      const apiErr = err?.response?.data;
                                      const detail = apiErr?.detail || apiErr?.message || (typeof apiErr === "string" ? apiErr : t("verifyPhone.verifyError", { defaultValue: "OTP verification failed." }));
                                      setAddressPhoneVerificationError(detail);
                                    } finally {
                                      setVerifyingAddressOtp(false);
                                    }
                                  }}
                                  disabled={verifyingAddressOtp || addressPhoneOtp.length < 6}
                                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {verifyingAddressOtp ? t("verifyPhone.verifying", "Verifying...") : t("verifyPhone.verifyAndContinue", "Verify")}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {!phoneVerified && addressPhoneVerified && (
                          <p className="text-[10px] text-emerald-600 font-bold px-1 pt-1">{t("verifyPhone.success", { defaultValue: "Phone verified. You can now place your order." })}</p>
                        )}
                      </div>

                      {/* Emirate Selection */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("fields.emirate", "Emirate")}</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {EMIRATES.map((em) => {
                            const isSelected = addressForm.emirate === em.value;
                            const isAvailable = em.available;
                            return (
                              <button
                                key={em.value}
                                type="button"
                                onClick={() => {
                                  if (!isAvailable) return;
                                  setAddressForm((prev) => ({ ...prev, emirate: em.value }));
                                  setAddressErrors(prev => {
                                    const next = { ...prev };
                                    delete next.emirate;
                                    return next;
                                  });
                                }}
                                className={`relative px-2 py-2.5 rounded-xl text-xs font-bold text-center transition-all border-2 ${
                                  isSelected && isAvailable
                                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm ring-2 ring-cyan-500/10"
                                    : isAvailable
                                      ? "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/50 cursor-pointer"
                                      : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                }`}
                                disabled={!isAvailable}
                              >
                                {t(em.key)}
                                {!isAvailable && (
                                  <span className="block text-[8px] font-semibold text-slate-400 mt-0.5 leading-tight">{t("address.notAvailable", { defaultValue: "Not available yet" })}</span>
                                )}
                                {isSelected && isAvailable && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                                    <Check size={10} className="text-white" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {addressErrors.emirate && (
                          <p className="text-[10px] text-rose-500 font-medium px-1">{addressErrors.emirate}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveAddress}
                        disabled={savingAddress || !isAddressPhoneOtpVerified}
                        className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingAddress && <Loader2 size={14} className="animate-spin" />}
                        {savingAddress ? t("address.adding") : t("address.addNew")}
                      </button>
                      <button
                        onClick={() => {
                          const prefill = getPhonePrefill(user?.phone_number);
                          setShowAddressForm(false);
                          setAddrCountryCode(prefill.countryCode);
                          setAddressPhoneOtpStep("idle");
                          setAddressPhoneOtp("");
                          setAddressPhoneVerificationError(null);
                          setAddressPhoneVerified(false);
                        }}
                        className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                      >
                        {t("address.cancel", { defaultValue: "Cancel" })}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* ──── 2. Delivery Preferences ──── */}
          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                <Calendar size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900">{t("delivery.title")}</h2>
            </div>

            {/* Delivery Tier Info */}
            {estimationLoading ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Loader2 className="animate-spin text-blue-600" size={16} />
                <p className="text-xs text-blue-700 font-medium">Loading delivery estimates...</p>
              </div>
            ) : estimation ? (
              <div className="space-y-3">
                {/* Estimated Delivery Days Banner */}
                <div className="p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-amber-600" />
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      {t("delivery.window", "Estimated Delivery Window")}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-900">
                    {estimation.max_delivery_days === 0 ? t("delivery.sameDay", "Same day delivery") : estimation.max_delivery_days === 1 ? t("delivery.dayDelivery", { count: 1, defaultValue: "1 day delivery time" }) : t("delivery.daysDelivery", { count: estimation.max_delivery_days, defaultValue: `${estimation.max_delivery_days} days delivery time` })}
                  </p>
                  <p className="text-xs text-amber-700">
                    {estimation.max_delivery_days === 0 ? t("delivery.availableToday", "Available for delivery today") : estimation.max_delivery_days === 1 ? t("delivery.minDateTomorrow", "Minimum delivery date is tomorrow") : t("delivery.minDateInDays", { count: estimation.max_delivery_days, defaultValue: `Minimum delivery date is in ${estimation.max_delivery_days} days` })}
                  </p>
                </div>

                {/* Items Breakdown */}
                {estimation.items_breakdown && estimation.items_breakdown.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t("delivery.productsDeliveryTimes", "Products Delivery Times")}</p>
                    <div className="space-y-1.5">
                      {estimation.items_breakdown.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-700 font-medium truncate flex-1">{item.product_name || t("delivery.fallbackProductName", { index: idx + 1, defaultValue: `Product ${idx + 1}` })}</span>
                          <span className={`text-slate-500 ${isArabic ? 'mr-2' : 'ml-2'}`}>{t("delivery.qty", { count: item.quantity, defaultValue: `Qty: ${item.quantity}` })}</span>
                          <span className={`${isArabic ? 'mr-2' : 'ml-2'} px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold`}>
                            {t("delivery.daysShort", { count: item.delivery_days, defaultValue: `${item.delivery_days}d` })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : estimationError ? (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-rose-600" />
                  <p className="text-xs font-bold text-rose-700">{t("delivery.estimateFailed", "Delivery estimate failed")}</p>
                </div>
                <p className="text-xs text-rose-700">{estimationError} If you have to buy other products, remove this from your cart.</p>
                {stockDetails?.length ? (
                  <div className="space-y-2 text-xs text-rose-700">
                    <p className="font-medium">{t("delivery.stockDetails", "Insufficient stock for these items:")}</p>
                    <ul className="list-disc list-inside space-y-1">
                      {stockDetails.map((item) => (
                        <li key={item.product_id}>
                          {item.product_name}: {t("delivery.requestedQuantity", { defaultValue: "Requested" })} {item.requested_quantity}, {t("delivery.availableStock", { defaultValue: "Available" })} {item.available_stock}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> {t("delivery.date")}
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        {t("delivery.selectWindow", { defaultValue: "Selectable delivery window" })}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t("delivery.windowHint", {
                          defaultValue: `Only dates from ${formatDeliveryDate(deliveryBaseDate)} to ${formatDeliveryDate(deliveryWindowEnd)} can be selected.`,
                        })}
                      </p>
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 text-right">
                      {t("delivery.earliest", { defaultValue: "Earliest:" })} {estimationLoading ? "…" : minDate}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {visibleDeliveryDates.map((date) => {
                      const dateValue = toDateInputValue(date);
                      const selectable = isDateSelectable(date);
                      const selected = deliveryDate === dateValue;

                      return (
                        <button
                          key={dateValue}
                          type="button"
                          disabled={!selectable}
                          onClick={() => selectable && setDeliveryDate(dateValue)}
                          className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                            selected
                              ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm ring-2 ring-cyan-500/15"
                              : selectable
                                ? "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                                : "border-slate-200 bg-slate-100 text-slate-400 opacity-50 blur-[1px] cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", { weekday: "short" })}
                            </span>
                            {selected && <Check size={12} className="text-cyan-600 shrink-0" />}
                          </div>
                          <div className="mt-1 text-lg font-black leading-none">
                            {date.getDate()}
                          </div>
                          <div className="mt-1 text-[10px] font-medium opacity-80">
                            {formatDeliveryDate(date)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Slot */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} /> {t("delivery.slot")}
                </label>
                <div className="relative">
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                      <Loader2 size={14} className="animate-spin text-cyan-600" />
                      <span className="text-slate-500">{t("delivery.checkingSlots", "Checking slots...")}</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={deliverySlot}
                        onChange={(e) => setDeliverySlot(e.target.value ? parseInt(e.target.value) : "")}
                        disabled={availableSlots.length === 0}
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all ${availableSlots.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <option value="">
                          {availableSlots.length === 0 ? t("delivery.noSlots", "No slots available") : t("delivery.selectSlot", "Select a slot")}
                        </option>
                        {availableSlots.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.start_time_display} - {s.end_time_display} ({s.name})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className={`absolute ${isArabic ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none`} />
                    </>
                  )}
                </div>
                {availableSlots.length === 0 && !loadingSlots && !!deliveryDate && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">
                    {t("delivery.noSlotsForDate", "No available slots for this date. Please select a different date.")}
                  </p>
                )}
                {slotsError && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">{slotsError}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={12} /> {t("delivery.notes")}
              </label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder={t("delivery.notesPlaceholder")}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all resize-none"
              />
            </div>

            {/* Tier Info Helper */}
            {estimation && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex gap-2">
                <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {t("delivery.fulfillmentHelper", "Delivery time based on order quantity. Larger orders may take longer due to fulfillment requirements.")}
                </p>
              </div>
            )}
          </section>

          {/* ──── 3. Tip ──── */}
          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-50 rounded-2xl text-cyan-600 shadow-inner">
                <MdDeliveryDining size={24} />
              </div>
              <h2 className="text-lg font-black text-slate-900">{t("tip.title")}</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {TIP_PRESETS.map((val) => (
                <button
                  key={val}
                  onClick={() => { setTipAmount(val); setIsCustomTip(false); setCustomTip(""); }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${!isCustomTip && tipAmount === val
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {val === 0 ? t("tip.noTip", "No Tip") : t("currency.aed", { value: val })}
                </button>
              ))}
              <button
                onClick={() => { setIsCustomTip(true); setTipAmount(0); }}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isCustomTip
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {t("tip.custom")}
              </button>
            </div>

            <AnimatePresence>
              {isCustomTip && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-bold text-slate-500">{t("currency.aedCode", { defaultValue: "AED" })}</span>
                    {/* ✅ Updated Input with hide-arrows class and + Button */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30 transition-all overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={customTip}
                        onChange={(e) => setCustomTip(e.target.value)}
                        placeholder="0.0"
                        className="w-24 px-3 py-2.5 bg-transparent text-sm font-bold outline-none text-center hide-arrows"
                      />
                      <button
                        onClick={() => {
                          const currentVal = parseFloat(customTip) || 0;
                          setCustomTip((currentVal + 0.5).toString());
                        }}
                        className="h-full px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border-l border-slate-200 transition-colors flex items-center justify-center"
                        title={t("tip.addPointFive", "Add 0.5 AED")}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* ──── 4. Payment Method ──── */}
          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                <CreditCard size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900">{t("payment.title")}</h2>
            </div>

            <div className="space-y-3">
              {/* ZIINA */}
              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === "ZIINA"
                  ? "border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500/20"
                  : "border-slate-100 hover:border-slate-200"
                  }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ZIINA"
                  checked={paymentMethod === "ZIINA"}
                  onChange={() => setPaymentMethod("ZIINA")}
                  className="w-5 h-5 text-cyan-600 focus:ring-cyan-500"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{t("payment.ziina.title")}</p>
                  <p className="text-xs text-slate-500">{t("payment.ziina.subtitle")}</p>
                </div>
                <CreditCard size={20} className="text-slate-400" />
              </label>

              {/* COD - Disabled / Not available for this order */}
              <div
                className="flex items-center gap-4 p-4 border-2 rounded-2xl border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed select-none"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  disabled
                  className="w-5 h-5 text-slate-300"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-400">{t("payment.cod.title")}</p>
                  <p className="text-xs text-slate-400">{t("payment.cod.subtitle")}</p>
                  <p className="text-[11px] font-semibold text-rose-500 mt-1">
                    {t("payment.cod.unavailableForOrder", {
                      defaultValue: "Not available for this order now.",
                    })}
                  </p>
                </div>
                <Truck size={20} className="text-slate-300" />
              </div>
            </div>
          </section>
        </div>

        {/* ═══ Right Column - Order Summary ═══ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">{t("summary.title")}</h2>
              {summaryLoading && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700">
                  <Loader2 size={14} className="animate-spin" />
                  {t("summary.updating", "Updating")}
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-xl text-cyan-700">
                  <Tag size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {t("coupon.title", { defaultValue: "Coupon Code" })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("coupon.subtitle", { defaultValue: "Validate your code before placing the order." })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleApplyCoupon();
                    }
                  }}
                  placeholder={t("coupon.placeholder", { defaultValue: "Enter coupon code" })}
                  className="w-full sm:flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm uppercase tracking-wide focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={appliedCouponCode ? handleRemoveCoupon : () => void handleApplyCoupon()}
                  disabled={validatingCoupon}
                  className={`w-full sm:w-auto sm:min-w-24 px-4 py-3 rounded-xl text-sm font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap ${appliedCouponCode
                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                    }`}
                >
                  {validatingCoupon ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : appliedCouponCode ? (
                    t("coupon.remove", { defaultValue: "Remove" })
                  ) : (
                    t("coupon.apply", { defaultValue: "Apply" })
                  )}
                </button>
              </div>

              {appliedCouponCode && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <span className="text-xs font-bold text-emerald-700">
                    {t("coupon.applied", {
                      defaultValue: "Applied coupon: {{code}}",
                      code: appliedCouponCode,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-emerald-700 hover:text-emerald-900 transition-colors"
                    aria-label={t("coupon.remove", { defaultValue: "Remove coupon" })}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {couponFeedback && (
                <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${couponFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}>
                  {couponFeedback.message}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t("coupon.availableTitle", { defaultValue: "Available Coupons" })}
                  </p>
                  {availableCoupons.length > 0 && (
                    <span className="text-[11px] font-bold text-cyan-700">{availableCoupons.length}</span>
                  )}
                </div>

                {loadingCoupons && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    <Loader2 size={14} className="animate-spin text-cyan-600" />
                    {t("coupon.loading", { defaultValue: "Loading available coupons..." })}
                  </div>
                )}

                {!loadingCoupons && couponsError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {couponsError}
                  </div>
                )}

                {!loadingCoupons && !couponsError && availableCoupons.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    {t("coupon.empty", { defaultValue: "No coupons are available right now." })}
                  </div>
                )}

                {!loadingCoupons && availableCoupons.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableCoupons.map((coupon) => {
                      const isApplied = normalizeCouponCode(appliedCouponCode) === coupon.code;

                      return (
                        <button
                          key={coupon.id}
                          type="button"
                          onClick={() => void handleApplyCoupon(coupon.code)}
                          disabled={validatingCoupon}
                          className={`w-full text-left rounded-2xl border px-3 py-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isApplied
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/40"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900">{coupon.code}</p>
                              {coupon.title !== coupon.code && (
                                <p className="mt-0.5 text-xs font-semibold text-slate-700">{coupon.title}</p>
                              )}
                              <p className="mt-1 text-xs text-slate-500">{coupon.description}</p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-2">
                              {coupon.badge && (
                                <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700">
                                  {coupon.badge}
                                </span>
                              )}
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isApplied
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-600"
                                }`}>
                                {isApplied
                                  ? t("coupon.appliedShort", { defaultValue: "Applied" })
                                  : t("coupon.applyShort", { defaultValue: "Tap to apply" })}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                    <img src={item.image || ""} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {t("summary.qtyPrice", { qty: item.quantity, price: item.finalPrice })}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-slate-900 shrink-0">
                    {t("currency.aed", { value: (item.finalPrice * item.quantity).toFixed(2) })}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t("summary.subtotal")}</span>
                <span className="font-bold text-slate-900">
                  {t("currency.aed", { value: summarySubtotal.toFixed(2) })}
                </span>
              </div>

              {summaryDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">
                    {t("summary.discount", { defaultValue: "Discount" })}
                    {checkoutSummary?.discount_code ? ` (${checkoutSummary.discount_code})` : ""}
                  </span>
                  <span className="font-bold text-emerald-600">
                    -{t("currency.aed", { value: summaryDiscount.toFixed(2) })}
                  </span>
                </div>
              )}

              {summaryDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {t("summary.afterDiscount", { defaultValue: "After Discount" })}
                  </span>
                  <span className="font-bold text-slate-900">
                    {t("currency.aed", { value: summaryAfterDiscount.toFixed(2) })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t("summary.shipping")}</span>
                {summaryDeliveryCharge === null ? (
                  <span className="font-bold text-slate-500">
                    {t("summary.calculatedAtCheckout", { defaultValue: "Calculated at checkout" })}
                  </span>
                ) : (
                  <span className={`font-bold ${summaryDeliveryCharge === 0 ? "text-emerald-600" : "text-slate-900"}`}>
                    {summaryDeliveryCharge === 0
                      ? t("summary.free")
                      : t("currency.aed", { value: summaryDeliveryCharge.toFixed(2) })}
                  </span>
                )}
              </div>

              {summaryDeliveryCharge === null && (
                <p className="text-xs text-slate-400">
                  {loadingDeliveryChargeSettings
                    ? t("summary.deliveryRuleLoading", {
                        defaultValue: "Loading delivery charge settings...",
                      })
                    : deliveryChargeSettings
                      ? deliveryChargeSettings.is_active
                        ? t("summary.deliveryRule", {
                            defaultValue: `Delivery is free for orders AED ${deliveryChargeSettings.min_order_for_free_delivery.toFixed(2)} and above. Orders below that pay AED ${deliveryChargeSettings.delivery_charge_amount.toFixed(2)}.`,
                          })
                        : t("summary.deliveryDisabled", {
                            defaultValue: "Delivery charges are currently disabled.",
                          })
                      : t("summary.deliveryRule", {
                          defaultValue: "Delivery is calculated using the current delivery settings.",
                        })}
                </p>
              )}

              {summaryTip > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t("summary.tip")}</span>
                  <span className="font-bold text-rose-500">
                    {t("currency.aed", { value: summaryTip.toFixed(2) })}
                  </span>
                </div>
              )}

              {summaryError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {summaryError}
                </div>
              )}

              {!selectedAddressId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  {t("summary.selectAddressHint", {
                    defaultValue: "Select a delivery address to calculate the final delivery charge.",
                  })}
                </div>
              )}

              {selectedAddressId && !deliveryDate && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  {t("summary.selectDateHint", {
                    defaultValue: "Choose your delivery date to preview the final total and delivery charge.",
                  })}
                </div>
              )}

              <div className="flex justify-between items-end pt-3 border-t border-slate-100 mt-1">
                <span className="text-base font-bold text-slate-900">{t("summary.total")}</span>
                <span className="text-2xl font-black text-slate-900">
                  {t("currency.aed", { value: finalTotal.toFixed(2) })}
                </span>
              </div>
            </div>

            {/* Place Order */}
            <div className="space-y-2">
              {!phoneVerified && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex gap-2">
                  <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-800 font-medium">
                      {t("verifyPhone.helper", "Verify your phone number to place an order. This helps prevent fake orders.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setVerifyOpen(true); setVerifyStep("input"); }}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700"
                    >
                      {t("verifyPhone.button", "Verify Phone")}
                    </button>
                  </div>
                </div>
              )}
              {attemptedSubmit && !deliveryDate && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex gap-2">
                  <Info size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-medium">
                    {t("delivery.selectDateHint", "Please select a preferred delivery date to proceed with your order.")}
                  </p>
                </div>
              )}
              {estimationError && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex gap-2">
                  <Info size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-medium">{estimationError}</p>
                </div>
              )}
              <button
                onClick={handlePlaceOrder}
                disabled={submitting || summaryLoading || !selectedAddressId || !phoneVerified || !!estimationError}
                className="w-full py-4 bg-linear-to-r from-cyan-600 to-cyan-700 text-white rounded-2xl font-black text-base hover:from-cyan-700 hover:to-cyan-800 transition-all shadow-xl shadow-cyan-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t("actions.processing")}
                  </>
                ) : (
                  t("actions.placeOrder")
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Phone Verification Modal ─── */}
      <AnimatePresence>
        {verifyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setVerifyOpen(false)} />
            <div className="relative bg-white rounded-2xl border border-slate-200 w-full max-w-sm p-5 z-10">
              <h3 className="text-sm font-black text-slate-900 mb-2">{t("verifyPhone.title", "Verify Phone Number")}</h3>
              <p className="text-xs text-slate-500 mb-3">
                {t("verifyPhone.subtitle", "Only users with a verified phone can place orders.")}
              </p>
              {verifyError && (
                <div className="mb-3 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
                  {verifyError}
                </div>
              )}
              {verifyStep === "input" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 h-10.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                      <img src={addressCountries[0].flag} alt="flag" className="w-5 h-3.5 object-cover rounded-sm" />
                      <span className="font-bold text-slate-700">{verifyCountry}</span>
                    </div>
                    <input
                      value={verifyPhone}
                      onChange={(e) => setVerifyPhone(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder={t("fields.digits", { count: verifyReq.length, defaultValue: `${verifyReq.length} digits` })}
                      maxLength={verifyReq.length}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all"
                      inputMode="tel"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none group/wa mb-1">
                    <div className="relative h-4 w-4 rounded-md border border-slate-200 flex items-center justify-center transition-all group-hover/wa:border-green-500">
                      <input
                        type="checkbox"
                        className="peer absolute inset-0 opacity-0 cursor-pointer"
                        checked={verifyWhatsApp}
                        onChange={(e) => setVerifyWhatsApp(e.target.checked)}
                      />
                      <Check size={12} strokeWidth={3} className="opacity-0 peer-checked:opacity-100 transition-opacity text-green-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover/wa:text-green-600 transition-colors">
                      {t("auth.sendToWhatsApp", "Send OTP via WhatsApp")}
                    </span>
                  </label>

                  <button
                    onClick={async () => {
                      setVerifyError(null);
                      if (!isVerifyPhoneValid) {
                        setVerifyError(`${verifyReq.name}: ${verifyReq.length} digits${verifyReq.pattern ? ", specific starting digits required" : ""}`);
                        return;
                      }
                      try {
                        setSendingOtp(true);
                        const composed = `${verifyCountry}${verifyPhone.replace(/^0+/, "")}`;
                        const isChanged = composed !== (user?.phone_number || "");
                        if (user?.id && isChanged) {
                          await profileApi.updateProfile(user.id, { phone_number: composed } as any);
                          const me = await profileApi.getMe();
                          dispatch(setUser(me));
                        }
                        await profileApi.sendProfileOtp({
                          otp_type: "phone",
                          phone_number: composed,
                          otp_platform: verifyWhatsApp ? "whatsapp" : undefined,
                        } as any);
                        setVerifyStep("otp");
                      } catch (err: any) {
                        const apiErr = err?.response?.data;
                        const detail = apiErr?.detail || apiErr?.message || (typeof apiErr === "string" ? apiErr : t("verifyPhone.sendError", { defaultValue: "Failed to send OTP. Try again." }));
                        setVerifyError(detail);
                      } finally {
                        setSendingOtp(false);
                      }
                    }}
                    disabled={sendingOtp || !isVerifyPhoneValid}
                    className="w-full px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {sendingOtp ? t("verifyPhone.sending", "Sending...") : t("verifyPhone.sendOtp", "Send OTP")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">{t("fields.enterOtp", "Enter OTP")}</h4>
                  <input
                    value={verifyOtp}
                    onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    placeholder={t("fields.digits", { count: 6, defaultValue: "6 digits" })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVerifyStep("input")}
                      className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700"
                    >
                      {t("fields.editPhone", "Edit Phone")}
                    </button>
                    <button
                      onClick={async () => {
                        setVerifyError(null);
                        if (verifyOtp.length < 6) {
                          setVerifyError(t("verifyPhone.otpError", "Enter the 6-digit OTP."));
                          return;
                        }
                        try {
                          setVerifyingOtp(true);
                          const composed = `${verifyCountry}${verifyPhone.replace(/^0+/, "")}`;
                          const res: any = await profileApi.verifyProfileOtp({
                            otp_type: "phone",
                            otp_code: verifyOtp,
                            phone_number: composed,
                          } as any);
                          const access = res?.access || res?.accessToken || res?.token;
                          if (access) tokenManager.set(access);
                          const me = res?.user || (await profileApi.getMe());
                          dispatch(setUser(me));
                          setVerifyOpen(false);
                          toast.show(t("verifyPhone.success", { defaultValue: "Phone verified. You can now place your order." }), "success");
                        } catch (err: any) {
                          const apiErr = err?.response?.data;
                          const detail = apiErr?.detail || apiErr?.message || (typeof apiErr === "string" ? apiErr : t("verifyPhone.verifyError", { defaultValue: "OTP verification failed." }));
                          setVerifyError(detail);
                        } finally {
                          setVerifyingOtp(false);
                        }
                      }}
                      disabled={verifyingOtp || verifyOtp.length < 6}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {verifyingOtp ? t("verifyPhone.verifying", "Verifying...") : t("verifyPhone.verifyAndContinue", "Verify & Continue")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ CSS to hide number input arrows */}
      <style>{`
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-arrows {
          -moz-appearance: textfield; /* Firefox */
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;
