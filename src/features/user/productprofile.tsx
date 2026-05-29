import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { type ProductDto } from "../admin/products/productApi";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingCart, Truck, ShieldCheck, ArrowLeft, Minus, Plus, Heart, Zap, Play, X, MapPin, Bell } from "lucide-react";
import { useAppDispatch, useAppSelector, useRequireAuth } from "../../hooks";
import { fetchCartRequest } from "../admin/cart/cartSlice";
import { cartsApi } from "../admin/cart/cartApi";
import { useTranslation } from "react-i18next";
import { useProductDetails, useProductReviews } from "../../hooks/queries";
import { useToast } from "../../components/ui/Toast";
import BackendData from "../../components/ui/BackendData";
import { API_BASE_URL } from "../../config/constants";
import { productsApi } from "../admin/products/productApi";
import {
  extractProductLocationValues,
  getProductLocationLabel,
} from "../admin/products/productLocationOptions";
import { processRestockAlerts } from "../../utils/restockAlerts";
import PreparationSpecModal from "../../components/userside/PreparationSpecModal";

import logo from "../../assets/SIMAK FRESH FINAL LOGO-01.svg";

type MediaItem =
  | { type: "image"; id: number; src: string }
  | { type: "video"; id: number; src: string; title: string };

const buildMediaList = (product: ProductDto): MediaItem[] => {
  const items: MediaItem[] = [];
  const addedSrcs = new Set<string>();

  if (product.image && !addedSrcs.has(product.image)) {
    items.push({ type: "image", id: -1, src: product.image });
    addedSrcs.add(product.image);
  }

  const featured = product.images?.find((img) => img.is_feature);
  if (featured && !addedSrcs.has(featured.image)) {
    items.push({ type: "image", id: featured.id, src: featured.image });
    addedSrcs.add(featured.image);
  }

  for (const img of product.images || []) {
    if (!addedSrcs.has(img.image)) {
      items.push({ type: "image", id: img.id, src: img.image });
      addedSrcs.add(img.image);
    }
  }

  for (const vid of product.videos || []) {
    const src = vid.video_file || vid.video_url;
    if (src) {
      items.push({ type: "video", id: vid.id, src, title: vid.title });
    }
  }

  return items;
};

const normalizeReviewImage = (src: string): string => {
  if (!src) return "";
  const s = String(src);
  if (/^https?:\/\//i.test(s)) return s;
  const base =
    (import.meta as any).env?.VITE_MEDIA_BASE_URL ||
    ((API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL)) ? new URL(API_BASE_URL as any).origin : window.location.origin);
  if (s.startsWith("/")) return `${base}${s}`;
  return `${base}/${s.replace(/^\.?\/*/, "")}`;
};

const isCustomerReview = (review: { user_name?: string | null; user?: number | null }) => {
  const author = (review.user_name || "").trim().toLowerCase();
  return author !== "admin" && !author.includes("admin");
};

const ProductProfile: React.FC = () => {
  const { t } = useTranslation("product");

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const requireAuth = useRequireAuth();
  const authUserId = useAppSelector((state) => state.auth.user?.id);

  const productId = id ? parseInt(id) : undefined;
  const { data: product = null, isLoading: loading, isError } = useProductDetails(productId);
  const error = isError ? t("details.errorLoad") : null;
  const { data: reviewsData } = useProductReviews(productId);
  const visibleReviews = (reviewsData?.results || []).filter(isCustomerReview);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [selectedPreparationId, setSelectedPreparationId] = useState<number | null>(null);
  const [preparationInstructions, setPreparationInstructions] = useState<string>("");
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"cart" | "checkout">("cart");

  const mediaList = product ? buildMediaList(product) : [];

  React.useEffect(() => {
    if (product && !selectedMedia && mediaList.length > 0) {
      setSelectedMedia(mediaList[0]);
    }
  }, [product]);

  React.useEffect(() => {
    checkWishlist();
  }, [product]);

  const toast = useToast();

  React.useEffect(() => {
    if (!product) return;

    const alerts = processRestockAlerts([product], authUserId, (restockedProduct) => ({
      title: t("details.restockBackInStock", {
        name: restockedProduct.name,
        defaultValue: `${restockedProduct.name} is back in stock now.`,
      }),
      message: t("details.restockBackInStock", {
        name: restockedProduct.name,
        defaultValue: `${restockedProduct.name} is back in stock now.`,
      }),
      actionUrl: `/products/${restockedProduct.id}`,
    }));

    alerts.forEach((alert) => toast.show(alert.message, "success"));
  }, [authUserId, product, t, toast]);

  const checkWishlist = () => {
    if (!product) return;
    try {
      const stored = localStorage.getItem("wishlist");
      if (stored) {
        const items = JSON.parse(stored) as ProductDto[];
        setIsWishlisted(items.some((item) => item.id === product.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWishlist = () => {
    if (!product) return;
    try {
      const stored = localStorage.getItem("wishlist");
      let items: ProductDto[] = stored ? JSON.parse(stored) : [];

      if (isWishlisted) {
        items = items.filter((item) => item.id !== product.id);
        setIsWishlisted(false);
      } else {
        if (!items.find((item) => item.id === product.id)) {
          items.push(product);
        }
        setIsWishlisted(true);
      }

      localStorage.setItem("wishlist", JSON.stringify(items));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div dir="ltr" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full mb-4" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div dir="ltr" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <p className="text-cyan-500 font-bold mb-4">{error || t("details.notFound")}</p>
        <button
          onClick={() => navigate("/products")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold"
        >
          <ArrowLeft size={16} /> {t("details.backToShop")}
        </button>
      </div>
    );
  }

  const discountPercentage = product.discount_price
    ? Math.round(((parseFloat(product.price) - parseFloat(product.discount_price)) / parseFloat(product.price)) * 100)
    : 0;

  const unitLabel = product.unit === "kg"
    ? t("units.kg")
    : product.unit === "piece"
      ? t("units.piece")
      : product.unit === "100g"
        ? t("units.100g")
        : t("details.perUnitFallback");

  const availableLocations = extractProductLocationValues(
    product.available_locations ?? product.available_emirates ?? product.service_areas
  ).map(getProductLocationLabel);

  const selectedSpec = product?.preparation_specifications?.find((s) => s.id === selectedPreparationId);
  const specPrice = selectedSpec ? parseFloat(selectedSpec.extra_price || "0") : 0;

  const baseUnitPrice = product ? parseFloat(product.price) : 0;
  const discountUnitPrice = product?.discount_price ? parseFloat(product.discount_price) : null;

  const basePriceTotal = ((baseUnitPrice + specPrice) * quantity).toFixed(2);
  const discountPriceTotal = discountUnitPrice
    ? ((discountUnitPrice + specPrice) * quantity).toFixed(2)
    : null;

  const requiresPreparation = Boolean(product?.preparation_specifications?.length);
  const isPreparationSelected = !requiresPreparation || selectedPreparationId !== null;
  const canAddToCart = product?.is_available && product.stock > 0;

  const addItemToCart = (mode: "cart" | "checkout", specId?: number, instructions?: string) => {
    const finalSpecId = specId || selectedPreparationId;
    const finalInstructions = instructions || preparationInstructions;

    if (requiresPreparation && !finalSpecId) {
      setModalMode(mode);
      setIsSpecModalOpen(true);
      return;
    }

    requireAuth(async () => {
      try {
        const result = await cartsApi.addItem(
          product.id,
          quantity,
          finalSpecId || undefined,
          finalInstructions || undefined
        );
        if (result?.error) {
          toast.show(result.error, "error");
          return;
        }
        dispatch(fetchCartRequest());
        toast.show(`${product.name} added to cart`, "cart");
        if (mode === "checkout") {
          navigate("/cart");
        }
      } catch (e: any) {
        const errorMsg = e?.response?.data?.error || "Failed to add item to cart";
        toast.show(errorMsg, "error");
      }
    })();
  };

  const handleNotifyMe = () => {
    if (!product) return;

    requireAuth(async () => {
      try {
        await productsApi.notifyStock(product.id);
        toast.show(
          t("details.restockSubscribed", {
            name: product.name,
            defaultValue: `We’ll notify you when ${product.name} is back in stock.`,
          }),
          "success"
        );
      } catch (err: any) {
        const message = err?.response?.data?.detail || err?.response?.data?.error || "Failed to subscribe for stock alerts.";
        toast.show(message, "error");
      }
    })();
  };

  // Determine what to show in the main viewer
  const activeMedia = selectedMedia || mediaList[0] || null;



  return (
    <div dir="ltr" className="min-h-screen bg-white text-stone-800">
      <Helmet>
        <title>{product ? `${product.name} - SIMAK FRESH` : "Product Details - SIMAK FRESH"}</title>
        <meta name="description" content={product?.description || "Get the freshest seafood and  delivered to your doorstep."} />
        {product?.image && <meta property="og:image" content={product.image} />}
      </Helmet>

      {/* ═══════════════════════════════════════════════════════
          MOBILE / TABLET  (hidden on lg+)
      ═══════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* Hero */}
        <div className="relative w-full overflow-hidden" style={{ height: "min(72vw, 420px)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMedia?.src || "empty-mobile"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="absolute inset-0"
            >
              {activeMedia?.type === "video" ? (
                <video
                  src={activeMedia.src}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              ) : activeMedia?.src ? (
                <img
                  src={activeMedia.src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center p-16">
                  <img src={logo} className="w-full h-full object-contain" alt="logo" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/55 to-transparent z-10" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/35 to-transparent z-10" />

          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-stone-800 active:scale-90 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>

          <motion.button
            onClick={toggleWishlist}
            whileTap={{ scale: 0.75 }}
            animate={{ scale: isWishlisted ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
          >
            <Heart
              size={18}
              fill={isWishlisted ? "currentColor" : "none"}
              className={isWishlisted ? "text-rose-500" : "text-stone-600"}
            />
          </motion.button>

          {discountPercentage > 0 && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
              className="absolute top-[60px] left-4 z-20 bg-cyan-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md shadow-cyan-600/30"
            >
              -{discountPercentage}% OFF
            </motion.div>
          )}

          {(!product.is_available || product.stock === 0) && (
            <div className="absolute inset-0 z-10 bg-black/45 flex items-center justify-center">
              <span className="bg-white/95 text-stone-900 px-5 py-2 rounded-full font-black text-sm shadow-xl">
                {t("details.outOfStock")}
              </span>
            </div>
          )}

          {mediaList.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {mediaList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMedia(item)}
                  className={`rounded-full transition-all duration-300 ${activeMedia?.src === item.src ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/45 hover:bg-white/70"}`}
                />
              ))}
            </div>
          )}
        </div>

        {mediaList.length > 1 && (
          <div className="flex gap-2.5 px-4 pt-3 pb-0 overflow-x-auto no-scrollbar bg-white">
            {mediaList.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedMedia(item)}
                className={`relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 ${activeMedia?.src === item.src ? "border-cyan-600 ring-2 ring-cyan-600/20 shadow-md" : "border-stone-100 hover:border-stone-300"}`}
              >
                {item.type === "video" ? (
                  <>
                    <video src={item.src} muted preload="metadata" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                        <Play size={10} fill="currentColor" className="text-stone-800 ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={item.src} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white px-5 pt-5 pb-32 space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-lg truncate max-w-[55%]">
              <BackendData value={product.category_name} />
            </span>
            {product.average_rating > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg flex-shrink-0">
                <Star size={11} fill="currentColor" className="text-amber-400" />
                <span className="text-xs font-black text-stone-800">{Number(product.average_rating).toFixed(1)}</span>
                <span className="text-[10px] text-stone-400">({product.total_reviews})</span>
              </div>
            )}
          </div>

          <h1 className="text-[1.65rem] font-black text-stone-900 leading-tight tracking-tight">
            <BackendData value={product.name} />
          </h1>

          <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3.5 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-wider">
                {quantity > 1
                  ? t("details.priceFor", { count: quantity, unit: unitLabel })
                  : t("details.pricePer", { sku: unitLabel })}
              </p>
              {discountPriceTotal ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[1.45rem] font-black text-stone-900 leading-none">
                    <span className="text-yellow-500 text-[10px] font-bold">AED </span>{discountPriceTotal}
                  </span>
                  <span className="text-sm text-stone-400 line-through font-medium">{basePriceTotal}</span>
                </div>
              ) : (
                <span className="text-[1.45rem] font-black text-stone-900 leading-none">
                  <span className="text-yellow-500 text-[10px] font-bold">AED </span>{basePriceTotal}
                </span>
              )}
            </div>
          </div>



          {/* Actions - Responsive layout for all screen sizes */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <button
                onClick={() => addItemToCart("cart")}
                disabled={!canAddToCart}
                className="w-full py-3 sm:py-4 bg-stone-900 text-white text-sm sm:text-base font-black rounded-2xl hover:bg-stone-800 shadow-xl shadow-stone-900/10 hover:shadow-stone-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <ShoppingCart size={22} />
                {product.is_available && product.stock > 0 ? t("details.addToCart") : t("details.outOfStock")}
              </button>

            </div>

            {product.is_available && product.stock > 0 ? (
              <div className="flex-1 flex flex-col gap-1">
                <button
                  onClick={() => addItemToCart("checkout")}
                  className="w-full py-4 bg-cyan-600 text-white text-base font-black rounded-2xl hover:bg-cyan-700 shadow-xl shadow-cyan-600/20 hover:shadow-cyan-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <Zap size={22} />
                  {t("details.buyNow")}
                </button>
              </div>
            ) : (
              <button
                onClick={handleNotifyMe}
                className="flex-1 py-4 bg-amber-500 text-white text-base font-black rounded-2xl hover:bg-amber-600 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <Bell size={22} />
                {t("details.notifyMe")}
              </button>
            )}

            <motion.button
              onClick={toggleWishlist}
              whileTap={{ scale: 0.8 }}
              animate={{ scale: isWishlisted ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3 }}
              className={`p-4 border-2 rounded-2xl transition-all ${isWishlisted
                ? "bg-cyan-50 border-cyan-100 text-cyan-600"
                : "bg-white border-stone-100 text-stone-400 hover:text-cyan-500 hover:border-cyan-100 hover:bg-cyan-50"
                }`}
              aria-label={isWishlisted ? t("details.removeWishlist") : t("details.addWishlist")}
            >
              <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
            </motion.button>
          </div>

          {product.is_available && product.stock > 0 && product.stock < 15 && (
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${product.stock < 7 ? "bg-orange-500" : product.stock < 10 ? "bg-amber-500" : "bg-emerald-500"}`} />
              <p className={`text-xs font-bold ${product.stock < 7 ? "text-orange-500" : product.stock < 10 ? "text-amber-500" : "text-emerald-600"}`}>
                {product.stock === 1
                  ? t("details.inStockItem", { count: product.stock })
                  : t("details.inStockItems", { count: product.stock })}
              </p>
            </div>
          )}

          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5">
            <div className="flex-shrink-0 flex items-center gap-2.5 bg-yellow-50 border border-yellow-100 rounded-2xl px-3.5 py-2.5">
              <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck size={14} className="text-yellow-700" />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-900 leading-none">{t("details.meta.fastDelivery.title")}</p>
                <p className="text-[9px] text-stone-400 mt-0.5">Same day</p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl px-3.5 py-2.5">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={14} className="text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-900 leading-none">{t("details.meta.freshGuaranteed.title")}</p>
                <p className="text-[9px] text-stone-400 mt-0.5">{t("details.meta.freshGuaranteed.subtitle")}</p>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                {t("details.description", { defaultValue: "Description" })}
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">
                <BackendData value={product.description} />
              </p>
            </div>
          )}

          {availableLocations.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-cyan-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  {t("details.availableIn.title", { defaultValue: "Available in" })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableLocations.map((loc) => (
                  <span key={loc} className="rounded-full bg-cyan-50 border border-cyan-100 px-3 py-1 text-[10px] font-bold text-cyan-700">
                    {t(`details.emirates.${loc}`, { defaultValue: loc })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {visibleReviews.length > 0 && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  {t("details.reviews.title", { defaultValue: "Reviews" })} ({visibleReviews.length})
                </p>
              </div>
              <div className="space-y-3">
                {visibleReviews.map((r) => (
                  <div key={r.id} className="p-4 bg-stone-50 border border-stone-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                          {(r.user_name || "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-stone-900 leading-none">
                            {r.user_name || t("details.reviews.anonymous", { defaultValue: "Anonymous" })}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} className={i < r.rating ? "text-yellow-500" : "text-stone-200"} fill={i < r.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed">{r.comment}</p>
                    {Array.isArray((r as any).images) && (r as any).images.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {(r as any).images.slice(0, 6).map((entry: any, idx: number) => {
                          const raw = typeof entry === "string" ? entry : entry?.image;
                          const cleaned = typeof raw === "string" ? raw.trim().replace(/^['\"`]+|['\"`]+$/g, "") : "";
                          const url = normalizeReviewImage(cleaned);
                          return (
                            <button key={idx} type="button" onClick={() => setViewerUrl(url)} className="group relative" aria-label="Expand image">
                              <img src={url} alt="review" className="w-14 h-14 object-cover rounded-xl border border-stone-200" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MOBILE STICKY CTA  (removed - using desktop buttons across all sizes)
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-100 px-4 py-3 flex gap-3 shadow-[0_-8px_28px_rgba(0,0,0,0.09)]">
        <button
          onClick={() => addItemToCart("cart")}
          disabled={!product.is_available || product.stock === 0}
          className="flex-1 py-3.5 bg-stone-900 text-white text-sm font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={17} />
          {product.is_available && product.stock > 0 ? t("details.addToCart") : t("details.outOfStock")}
        </button>
        {product.is_available && product.stock > 0 ? (
          <button
            onClick={() => addItemToCart("checkout")}
            className="flex-1 py-3.5 bg-cyan-600 text-white text-sm font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-[0.97] transition-all"
          >
            <Zap size={17} className="fill-current" />
            {t("details.buyNow")}
          </button>
        ) : (
          <button
            onClick={handleNotifyMe}
            className="flex-1 py-3.5 bg-amber-500 text-white text-sm font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-all"
          >
            <Bell size={17} />
            {t("details.notifyMe")}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden below lg)  — UNTOUCHED
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:block pb-20">
        <div className="mx-auto px-4 sm:px-6 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-cyan-600 transition-colors"
          >
            <ArrowLeft size={16} /> {t("details.back")}
          </button>
        </div>

        <main className="mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="space-y-4">
            <motion.div
              key={activeMedia?.src || "empty"}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative aspect-[4/3] bg-slate-50 rounded-3xl overflow-hidden border border-slate-100"
            >
              {activeMedia?.type === "video" ? (
                <video
                  key={activeMedia.src}
                  src={activeMedia.src}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black rounded-3xl"
                />
              ) : (
                <img
                  src={activeMedia?.src || "https://via.placeholder.com/600x450?text=No+Image"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}

              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {product.discount_price && (
                  <span className="px-3 py-1.5 bg-cyan-600 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg shadow-cyan-600/30">
                    {t("details.off", { value: discountPercentage })}
                  </span>
                )}
                {(!product.is_available || product.stock === 0) && (
                  <span className="px-3 py-1.5 bg-cyan-900 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg">
                    {t("details.outOfStock")}
                  </span>
                )}
              </div>
            </motion.div>

            {mediaList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {mediaList.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => setSelectedMedia(item)}
                    className={`relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all bg-slate-100 group ${activeMedia?.src === item.src
                      ? "border-cyan-600 ring-2 ring-cyan-600/20 shadow-lg"
                      : "border-transparent hover:border-stone-300"
                      }`}
                  >
                    {item.type === "video" ? (
                      <>
                        <video src={item.src} muted preload="metadata" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md">
                            <Play size={14} className="text-stone-800 ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img src={item.src} alt={`View ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md">
                  <BackendData value={product.category_name} />
                </span>

                {product.average_rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-bold text-stone-700">
                      {t("details.ratingText", {
                        rating: product.average_rating,
                        reviews: product.total_reviews
                      })}
                    </span>
                  </div>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-stone-900 leading-tight"><BackendData value={product.name} /></h1>
              <p className="text-stone-500 leading-relaxed text-lg"><BackendData value={product.description} /></p>
            </div>



            <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-stone-400 font-bold mb-1">
                  {quantity > 1
                    ? t("details.priceFor", { count: quantity, unit: unitLabel })
                    : t("details.pricePer", { sku: unitLabel })}
                </p>

                <div className="flex items-baseline gap-3">
                  {discountPriceTotal ? (
                    <>
                      <span className="text-4xl font-black text-stone-900">
                        {t("details.currencyAed", { value: discountPriceTotal })}
                      </span>
                      <span className="text-xl text-stone-400 line-through font-bold">
                        {t("details.currencyAed", { value: basePriceTotal })}
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-black text-stone-900">
                      {t("details.currencyAed", { value: basePriceTotal })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-4 bg-white rounded-xl p-1 border border-stone-200 shadow-sm w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    aria-label={t("details.qtyDecrease")}
                  >
                    <Minus size={18} />
                  </button>

                  <span className="text-lg font-black w-8 text-center" aria-label={t("details.qtyLabel", { value: quantity })}>
                    {quantity}
                  </span>

                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    aria-label={t("details.qtyIncrease")}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {product.is_available && product.stock > 0 && product.stock < 15 && (
                  <p className={`text-xs font-bold ${product.stock < 7 ? "text-orange-500" : product.stock < 10 ? "text-amber-500" : "text-emerald-600"}`}>
                    {product.stock === 1 ? t("details.inStockItem", { count: product.stock }) : t("details.inStockItems", { count: product.stock })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <button
                  onClick={() => addItemToCart("cart")}
                  disabled={!canAddToCart}
                  className="w-full py-4 bg-stone-900 text-white text-base font-black rounded-2xl hover:bg-stone-800 shadow-xl shadow-stone-900/10 hover:shadow-stone-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <ShoppingCart size={22} />
                  {product.is_available && product.stock > 0 ? t("details.addToCart") : t("details.outOfStock")}
                </button>

              </div>

              {product.is_available && product.stock > 0 ? (
                <div className="flex-1 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      if (requiresPreparation && !isPreparationSelected) {
                        setIsSpecModalOpen(true);
                      } else {
                        addItemToCart("checkout");
                      }
                    }}
                    className="w-full py-4 bg-cyan-600 text-white text-base font-black rounded-2xl hover:bg-cyan-700 shadow-xl shadow-cyan-600/20 hover:shadow-cyan-600/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <Zap size={22} />
                    {t("details.buyNow")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleNotifyMe}
                  className="flex-1 py-4 bg-amber-500 text-white text-base font-black rounded-2xl hover:bg-amber-600 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <Bell size={22} />
                  {t("details.notifyMe")}
                </button>
              )}

              <motion.button
                onClick={toggleWishlist}
                whileTap={{ scale: 0.8 }}
                animate={{ scale: isWishlisted ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className={`p-4 border-2 rounded-2xl transition-all ${isWishlisted
                  ? "bg-cyan-50 border-cyan-100 text-cyan-600"
                  : "bg-white border-stone-100 text-stone-400 hover:text-cyan-500 hover:border-cyan-100 hover:bg-cyan-50"
                  }`}
                aria-label={isWishlisted ? t("details.removeWishlist") : t("details.addWishlist")}
              >
                <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
              </motion.button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-100">
                <div className="p-2 bg-yellow-50 rounded-xl text-yellow-600">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{t("details.meta.fastDelivery.title")}</p>
                  <p className="text-stone-500 text-xs">Same day delivery</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-100">
                <div className="p-2 bg-yellow-50 rounded-xl text-yellow-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{t("details.meta.freshGuaranteed.title")}</p>
                  <p className="text-stone-500 text-xs">{t("details.meta.freshGuaranteed.subtitle")}</p>
                </div>
              </div>
            </div>

            {availableLocations.length > 0 && (
              <div className="bg-white rounded-3xl border border-stone-100 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-50 rounded-xl text-cyan-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{t("details.availableIn.title", { defaultValue: "Available in" })}</p>
                    <p className="text-xs text-stone-500">
                      {t("details.availableIn.subtitle", { defaultValue: "This product can be delivered in the following emirates." })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableLocations.map((location) => (
                    <span
                      key={location}
                      className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 border border-cyan-100"
                    >
                      {t(`details.emirates.${location}`, { defaultValue: location })}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {visibleReviews.length > 0 && (
              <div className="bg-white rounded-3xl border border-stone-100 p-6">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">
                      {t("details.reviews.title", { defaultValue: "Reviews" })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleReviews.map((r) => (
                    <div key={r.id} className="p-5 rounded-2xl border border-stone-100 bg-stone-50 hover:bg-white transition-colors shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">
                            {(r.user_name || "U").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-stone-900">
                              {r.user_name || t("details.reviews.anonymous", { defaultValue: "Anonymous" })}
                            </p>
                            <p className="text-xs text-stone-400 font-bold">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={16} className={i < r.rating ? "text-yellow-500" : "text-stone-300"} fill={i < r.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-stone-600 text-sm leading-relaxed">{r.comment}</p>
                      {Array.isArray((r as any).images) && (r as any).images.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {(r as any).images.slice(0, 6).map((entry: any, idx: number) => {
                            const raw = typeof entry === "string" ? entry : entry?.image;
                            const cleaned = typeof raw === "string" ? raw.trim().replace(/^['\"`]+|['\"`]+$/g, "") : "";
                            const url = normalizeReviewImage(cleaned);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setViewerUrl(url)}
                                className="group relative"
                                aria-label="Expand image"
                              >
                                <img src={url} alt="review" className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                                <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setViewerUrl(null)} />
            <div className="relative max-w-4xl w-full bg-white rounded-2xl p-2 shadow-2xl">
              <button
                onClick={() => setViewerUrl(null)}
                className="absolute top-3 right-3 bg-white/80 rounded-full p-2 text-slate-600 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <img src={viewerUrl || ""} alt="review" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PreparationSpecModal
        isOpen={isSpecModalOpen}
        onClose={() => setIsSpecModalOpen(false)}
        product={product}
        mode={modalMode}
        onConfirm={async (specId, instructions) => {
          setSelectedPreparationId(specId);
          setPreparationInstructions(instructions);
          addItemToCart(modalMode, specId, instructions);
        }}
      />
    </div>
  );
};

export default ProductProfile;
