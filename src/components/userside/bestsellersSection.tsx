import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, ShoppingCart, Flame, Eye, Sparkles, Zap, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector, useRequireAuth } from "../../hooks";
import { fetchCartRequest } from "../../features/admin/cart/cartSlice";
import { cartsApi } from "../../features/admin/cart/cartApi";
import { useTranslation } from "react-i18next";
import { productsApi, type ProductDto } from "../../features/admin/products/productApi";
import { useBestsellers } from "../../hooks/queries";
import { useToast } from "../ui/Toast";
import { processRestockAlerts } from "../../utils/restockAlerts";
import logo from "../../assets/LOGO-1.svg";
import InfiniteScrollTrack from "../ui/InfiniteScrollTrack";
import PreparationSpecModal from "../userside/PreparationSpecModal";

/* ── Product Card ── */
const ProductCard: React.FC<{
  product: ProductDto;
  image: string;
  discount: number;
  index: number;
  onAddToCart: () => void;
  onDirectBuy: () => void;
  onNotifyMe: () => void;
  onQuickView: () => void;
}> = ({ product, image, discount, index, onAddToCart, onDirectBuy, onNotifyMe, onQuickView }) => {
  const { t } = useTranslation("home");
  const isOutOfStock = !product.is_available || product.stock === 0;

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(true);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const price = parseFloat(product.price);
  const finalPrice = parseFloat(product.final_price);
  const rating = product.average_rating || 0;

  return (
    <div
      ref={ref}
      onClick={onQuickView}
      className={`group relative flex flex-col h-full min-w-[280px] max-w-[280px] bg-white rounded-2xl border border-zinc-100 overflow-hidden snap-start transition-all duration-500 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Image Section */}
      <div className="relative h-52 shrink-0 bg-zinc-50 overflow-hidden flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={product.name}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"
              }`}
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 p-8">
            <img src={logo} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="Logo fallback" />
          </div>
        )}
        {!imgLoaded && image && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
            <Sparkles size={32} />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discount > 0 && (
            <div className="px-2.5 py-1 bg-cyan-600 text-white rounded-lg text-[10px] font-bold shadow-md">
              {discount}% {t("bestsellers.off", "OFF")}
            </div>
          )}
          {product.is_available && product.stock > 0 && product.stock < 7 && (
            <div className="px-2.5 py-1 bg-orange-500 text-white rounded-lg text-[10px] font-bold shadow-md">
              {t("bestsellers.onlyLeft", { count: product.stock, defaultValue: `Only ${product.stock} left` })}
            </div>
          )}
          {product.is_available && product.stock >= 7 && product.stock < 10 && (
            <div className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow-md">
              {t("bestsellers.lowStock", "Low Stock")}
            </div>
          )}
        </div>

        {(!product.is_available || product.stock === 0) && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
            <span className="px-4 py-1.5 bg-white/90 rounded-full text-xs font-bold text-zinc-700">
              {t("bestsellers.outOfStock")}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView();
            }}
            className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-zinc-800 flex items-center gap-1.5 shadow-lg hover:bg-white transition-all"
          >
            <Eye size={14} /> {t("bestsellers.quickView")}
          </button>
        </div>
      </div>

      {/* Details Section - Force LTR for English content */}
      <div className="p-5 flex-1 flex flex-col text-left" dir="ltr">

        {/* ✅ FIXED: Category (Left) & Rating (Right) */}
        <div className="flex items-center justify-between mb-2 h-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate mr-2">
            {product.category_name || t("bestsellers.fallbackCategory")}
          </p>

          <div className="flex items-center justify-end gap-1.5 shrink-0">
            {rating > 0 && (
              <>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={
                        i < Math.round(rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-zinc-200"
                      }
                    />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5">({product.total_reviews})</span>
              </>
            )}
          </div>
        </div>

        {/* Name (from API) */}
        <h3 className="h-10 text-sm font-bold text-zinc-900 leading-snug line-clamp-2 mb-2 group-hover:text-cyan-600 transition-colors">
          {product.name}
        </h3>

        {/* Price + Actions - mt-auto keeps this locked to the bottom */}
        <div className="mt-auto pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-zinc-900">
                <span className="text-yellow-500">AED</span> {finalPrice}
              </span>
              {discount > 0 && (
                <span className="text-xs text-zinc-400 line-through">
                  <span className="text-yellow-500/70">AED</span> {Math.round(price)}
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
              disabled={!product.is_available || product.stock === 0}
              aria-label={t("bestsellers.addToCartAria", "Add to cart")}
              className="p-2.5 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-300 disabled:cursor-not-allowed transition-all duration-300 active:scale-95"
            >
              <ShoppingCart size={16} />
            </button>
          </div>

          {/* Stock count — always reserve height to keep card size consistent */}
          <p className="text-[10px] text-zinc-400 font-medium h-4">
            {product.is_available && product.stock > 0 && product.stock < 15 ? t("bestsellers.inStock", { count: product.stock, defaultValue: `${product.stock} in stock` }) : ""}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isOutOfStock) onNotifyMe();
              else onDirectBuy();
            }}
            className={`w-full py-2.5 rounded-xl text-white transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 text-xs font-bold flex items-center justify-center gap-2 ${isOutOfStock ? "bg-amber-500 hover:bg-amber-600" : "bg-cyan-600 hover:bg-cyan-700"}`}
          >
            {isOutOfStock ? <Bell size={14} /> : <Zap size={14} className="fill-current" />}
            {isOutOfStock ? t("bestsellers.notifyMe") : t("bestsellers.buyNow", "Buy Now")}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Section ── */
const BestsellersSection: React.FC = () => {
  const { t } = useTranslation("home");

  const { data, isLoading: loading } = useBestsellers();
  const products = useMemo(() => data?.results || [], [data]);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const authUserId = useAppSelector((state) => state.auth.user?.id);

  // Preparation Spec Modal State
  const [selectedProductForSpec, setSelectedProductForSpec] = useState<ProductDto | null>(null);
  const [specModalMode, setSpecModalMode] = useState<"cart" | "checkout">("cart");

  const getProductImage = (p: ProductDto) => {
    if (p.image) return p.image;
    const featured = p.images?.find((img) => img.is_feature);
    if (featured) return featured.image;
    return p.images?.[0]?.image || "";
  };

  const getDiscount = (p: ProductDto) => {
    const price = parseFloat(p.price);
    const final = parseFloat(p.final_price);
    if (!price || !final || price <= final) return 0;
    return Math.round(((price - final) / price) * 100);
  };

  const toast = useToast();

  useEffect(() => {
    if (!products.length) return;

    const alerts = processRestockAlerts(products, authUserId, (product) => ({
      title: t("bestsellers.restockBackInStock", {
        name: product.name,
        defaultValue: `${product.name} is back in stock now.`,
      }),
      message: t("bestsellers.restockBackInStock", {
        name: product.name,
        defaultValue: `${product.name} is back in stock now.`,
      }),
      actionUrl: `/products/${product.id}`,
    }));

    alerts.forEach((alert) => toast.show(alert.message, "success"));
  }, [authUserId, products, t, toast]);

  const handleAddToCart = (product: ProductDto) => {
    if (product.preparation_specifications && product.preparation_specifications.length > 0) {
      setSelectedProductForSpec(product);
      setSpecModalMode("cart");
      return;
    }

    requireAuth(async () => {
      try {
        const result = await cartsApi.addItem(product.id, 1);
        if (result?.error) {
          toast.show(result.error, "error");
          return;
        }
        dispatch(fetchCartRequest());
        toast.show(t("bestsellers.addedToCart", { name: product.name, defaultValue: `${product.name} added to cart` }), "cart");
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to add item to cart";
        toast.show(msg, "error");
      }
    })();
  };

  const handleDirectBuy = (product: ProductDto) => {
    if (product.preparation_specifications && product.preparation_specifications.length > 0) {
      setSelectedProductForSpec(product);
      setSpecModalMode("checkout");
      return;
    }

    requireAuth(async () => {
      try {
        const result = await cartsApi.addItem(product.id, 1);
        if (result?.error) {
          toast.show(result.error, "error");
          return;
        }
        dispatch(fetchCartRequest());
        toast.show(t("bestsellers.addedToCart", { name: product.name, defaultValue: `${product.name} added to cart` }), "cart");
        navigate("/cart");
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to add item to cart";
        toast.show(msg, "error");
      }
    })();
  };

  const handleConfirmSpecSelection = async (preparationId: number, instructions: string) => {
    if (!selectedProductForSpec) return;

    try {
      const result = await cartsApi.addItem(
        selectedProductForSpec.id,
        1,
        preparationId,
        instructions || undefined
      );

      if (result?.error) {
        toast.show(result.error, "error");
        return;
      }

      dispatch(fetchCartRequest());
      toast.show(t("bestsellers.addedToCart", { name: selectedProductForSpec.name, defaultValue: `${selectedProductForSpec.name} added to cart` }), "cart");

      if (specModalMode === "checkout") {
        navigate("/cart");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to add item to cart";
      toast.show(msg, "error");
      throw err;
    }
  };

  const handleNotifyMe = (product: ProductDto) => {
    requireAuth(async () => {
      try {
        await productsApi.notifyStock(product.id);
        toast.show(
          t("bestsellers.restockSubscribed", {
            name: product.name,
            defaultValue: `We’ll notify you when ${product.name} is back in stock.`,
          }),
          "success"
        );
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.response?.data?.error || "Failed to subscribe for stock alerts.";
        toast.show(msg, "error");
      }
    })();
  };

  return (
    <section className="relative bg-[#FAFAF8] py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-cyan-50 rounded-full blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 bg-yellow-50 rounded-full blur-3xl opacity-50" />

      <div className="relative mx-auto  ">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-50 border border-cyan-100 rounded-full mb-3">
              <Flame size={14} className="text-cyan-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-600">
                {t("bestsellers.kicker")}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
              {t("bestsellers.title")}{" "}
              <span className="text-cyan-600">{t("bestsellers.titleHighlight")}</span>{" "}
              {t("bestsellers.titleSuffix")}
            </h2>
            <p className="mt-2 text-zinc-500 text-sm max-w-md">
              {t("bestsellers.subtitle")}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex gap-5 overflow-hidden py-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="min-w-[280px] bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-pulse flex flex-col h-[400px]"
              >
                <div className="h-52 bg-zinc-100 shrink-0" />
                <div className="p-5 flex-1 flex flex-col">
                  {/* Skeleton for Category (Left) and Rating (Right) */}
                  <div className="flex justify-between items-center mb-3 h-4">
                    <div className="h-3 w-16 bg-zinc-100 rounded" />
                    <div className="h-3 w-12 bg-zinc-100 rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-zinc-100 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-zinc-100 rounded" />

                  <div className="mt-auto pt-3 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-16 bg-zinc-100 rounded" />
                      <div className="h-10 w-10 bg-zinc-100 rounded-xl" />
                    </div>
                    <div className="h-10 w-full bg-zinc-100 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length > 0 && (
          <InfiniteScrollTrack
            items={products}
            speed={0.6}
            copies={4}
            outerClassName="overflow-hidden py-2 -mx-4 sm:-mx-6 lg:-mx-8"
            gap="gap-5"
            fadeEdges
            edgeColor="#FAFAF8"
            renderItem={(product, i) => (
              <ProductCard
                product={product}
                image={getProductImage(product)}
                discount={getDiscount(product)}
                index={i}
                onAddToCart={() => handleAddToCart(product)}
                onDirectBuy={() => handleDirectBuy(product)}
                onNotifyMe={() => handleNotifyMe(product)}
                onQuickView={() => navigate(`/products/${product.id}`)}
              />
            )}
          />
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="mx-auto text-zinc-300 mb-4" size={48} />
            <p className="text-zinc-400 text-sm">{t("bestsellers.empty")}</p>
          </div>
        )}
      </div>

      <PreparationSpecModal
        product={selectedProductForSpec}
        isOpen={!!selectedProductForSpec}
        onClose={() => setSelectedProductForSpec(null)}
        onConfirm={handleConfirmSpecSelection}
        mode={specModalMode}
      />
    </section>
  );
};

export default BestsellersSection;