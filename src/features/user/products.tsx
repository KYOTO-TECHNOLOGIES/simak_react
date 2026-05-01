import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { type ProductDto } from "../admin/products/productApi";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Search, ShoppingCart, Star, Filter, ArrowRight, Zap, Loader2, Bell, X } from "lucide-react";
import { useAppDispatch, useAppSelector, useRequireAuth } from "../../hooks";
import { fetchCartRequest } from "../admin/cart/cartSlice";
import { cartsApi } from "../admin/cart/cartApi";
import { useNavigate } from "react-router-dom";
import ShrimpLoader from "../../components/loader/preloader";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, useCategories } from "../../hooks/queries";
import { useToast } from "../../components/ui/Toast";
import useLanguageToggle from "../../hooks/useLanguageToggle";
import { productsApi } from "../admin/products/productApi";
import { processRestockAlerts } from "../../utils/restockAlerts";

import logo from "../../assets/SIMAK FRESH FINAL LOGO-01.svg";
import InitialLoader from "../../components/loader/spinnerLoader";
import PreparationSpecModal from "../../components/userside/PreparationSpecModal";

/** Main image field → feature gallery image → first gallery image */
const getProductImage = (p: ProductDto): string => {
    if (p.image) return p.image;
    const featured = p.images?.find((img) => img.is_feature);
    if (featured) return featured.image;
    return p.images?.[0]?.image || "";
};

const ProductCard = memo(({
    product,
    index,
    onAddToCart,
    onBuyNow,
    onNotifyMe,
}: {
    product: ProductDto;
    index: number;
    onAddToCart: (e: React.MouseEvent, p: ProductDto) => void;
    onBuyNow: (e: React.MouseEvent, p: ProductDto) => void;
    onNotifyMe: (e: React.MouseEvent, p: ProductDto) => void;
}) => {
    const { t } = useTranslation("product");
    const unitDisplay =
        product.unit === "kg" ? "Kg"
            : product.unit === "piece" ? "Pc"
                : product.unit === "Gram" ? "100g"
                    : "";
    const isOutOfStock = !product.is_available || product.stock === 0;

    const mainImage = getProductImage(product);

    return (
        <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.42, delay: (index % 8) * 0.055, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -5 }}
            className="group relative bg-white rounded-2xl sm:rounded-4xl p-2 sm:p-3 shadow-[0_2px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_44px_rgba(0,0,0,0.12)] transition-all duration-300 border border-slate-100 hover:border-slate-200 flex flex-col hover:z-10"
        >
            <Link to={`/products/${product.id}`} className="flex flex-col flex-1">
                <div className="relative aspect-3/4 bg-slate-50 rounded-xl sm:rounded-3xl overflow-hidden mb-2 sm:mb-3 isolate">
                    {mainImage ? (
                        <img
                            src={mainImage}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-107 transition-transform duration-700 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full p-6 sm:p-8 bg-slate-900 flex items-center justify-center">
                            <img src={logo} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="Logo fallback" />
                        </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-2 z-10">
                        {product.discount_price && (
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md sm:rounded-lg shadow-sm">
                                {t("card.sale")}
                            </span>
                        )}
                        {product.average_rating > 4.5 && (
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-400 text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md sm:rounded-lg shadow-sm flex items-center gap-1">
                                <Star size={9} fill="black" /> {t("card.topRated")}
                            </span>
                        )}
                        {product.is_available && product.stock > 0 && product.stock < 7 && (
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-orange-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md sm:rounded-lg shadow-sm">
                                {t("card.onlyLeft", { count: product.stock })}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={(e) => onAddToCart(e, product)}
                        disabled={!product.is_available || product.stock === 0}
                        title={t("card.addToCart")}
                        className="absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 sm:bg-white shadow-lg text-slate-900 rounded-full flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-all duration-300 disabled:opacity-40 sm:translate-y-10 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 z-20"
                    >
                        <ShoppingCart size={14} className="sm:hidden" />
                        <ShoppingCart size={17} className="hidden sm:block" />
                    </button>

                    {(!product.is_available || product.stock === 0) && (
                        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <div className="bg-white/95 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-xl">
                                <span className="text-slate-900 text-[10px] sm:text-xs font-black uppercase tracking-widest">{t("card.outOfStock")}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content - Force LTR for English data */}
                <div className="px-2 pb-2 grow flex flex-col text-left" dir="ltr">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">
                            {product.category_name || t("card.categoryFallback")}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span className="text-[10px] font-bold text-slate-700">{product.average_rating ? Number(product.average_rating).toFixed(1) : t("card.new")}</span>
                        </div>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mb-1 line-clamp-2">
                        {product.name}
                    </h3>

                    <div className="hidden sm:block h-9 relative group/desc mb-3 cursor-default">
                        <p className="text-xs text-slate-500 leading-normal line-clamp-2 select-none">
                            {product.description || t("card.descriptionFallback")}
                        </p>
                        {product.description && product.description.length > 60 && (
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-xl opacity-0 group-hover/desc:opacity-100 transition-opacity duration-200 z-50">
                                {product.description}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-2 border-t border-slate-50 space-y-2">
                        <div className="flex items-end justify-between gap-1">
                            <div className="flex flex-col min-w-0">
                                {product.discount_price ? (
                                    <>
                                        <span className="text-[9px] sm:text-[10px] text-slate-400 line-through font-medium leading-none mb-0.5">AED {Number(product.price).toFixed(0)}{unitDisplay ? `/${unitDisplay}` : ""}</span>
                                        <span className="text-sm sm:text-base font-black text-slate-900 leading-tight"><span className="text-yellow-500 text-[10px] sm:text-xs font-bold">AED </span>{Number(product.discount_price).toFixed(2)}{unitDisplay ? <span className="text-[9px] font-semibold text-slate-500">/{unitDisplay}</span> : ""}</span>
                                    </>
                                ) : (
                                    <span className="text-sm sm:text-base font-black text-slate-900 leading-tight"><span className="text-yellow-500 text-[10px] sm:text-xs font-bold">AED </span>{Number(product.price).toFixed(2)}{unitDisplay ? <span className="text-[9px] font-semibold text-slate-500">/{unitDisplay}</span> : ""}</span>
                                )}
                            </div>
                            <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-900 shrink-0">
                                <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-slate-400 text-[11px]">{t("card.view")}</span>
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                                    <ArrowRight size={13} />
                                </div>
                            </div>
                        </div>

                        <p className="hidden sm:block text-[10px] text-slate-400 font-medium h-3.5">
                            {product.is_available && product.stock > 0 && product.stock < 15 ? t("card.inStock", { count: product.stock }) : ""}
                        </p>

                        <button
                            onClick={(e) => (isOutOfStock ? onNotifyMe(e, product) : onBuyNow(e, product))}
                            className={`w-full py-2.5 text-white text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] ${isOutOfStock ? "bg-amber-500 hover:bg-amber-600" : "bg-cyan-600 hover:bg-cyan-700"}`}
                        >
                            {isOutOfStock ? <Bell size={14} /> : <Zap size={14} />}
                            {isOutOfStock ? t("card.notifyMe") : t("card.buyNow")}
                        </button>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
});

const UserProductsPage: React.FC = () => {
    const { t, i18n } = useTranslation("product");
    useLanguageToggle();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const requireAuth = useRequireAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const LIMIT = 12;
    const toast = useToast();

    // Preparation Spec Modal State
    const [selectedProductForSpec, setSelectedProductForSpec] = useState<ProductDto | null>(null);
    const [specModalMode, setSpecModalMode] = useState<"cart" | "checkout">("cart");

    // Fetch categories from backend
    const { data: backendCategories = [] } = useCategories(i18n.language);

    // Filters state
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const categoryName = searchParams.get("category_name");

    const pageCategoryLabel = categoryName || "";

    const handleAllCategories = useCallback(() => {
        const params = new URLSearchParams(searchParams);
        params.delete("category");
        params.delete("category_name");
        params.delete("category_slug");
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    const handleCategoryChipClick = useCallback((name: string) => {
        const params = new URLSearchParams(searchParams);
        params.delete("category");
        params.delete("category_slug");
        params.set("category_name", name);
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    // Debounce the search term for data fetching
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Sync filters to URL (debounced)
    useEffect(() => {
        const handler = setTimeout(() => {
            const params: any = {};
            if (searchTerm) params.q = searchTerm;
            if (categoryName) params.category_name = categoryName;
            setSearchParams(params, { replace: true });
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm, categoryName, setSearchParams]);

    // ✅ TanStack Infinite Query — Load More pagination
    const filters = {
        ...(debouncedSearch && { search: debouncedSearch, q: debouncedSearch }),
        ...(categoryName ? { category_name: categoryName } : {}),
    };
    const {
        data,
        isLoading: loading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteProducts(filters, LIMIT);

    const products = useMemo(() => data?.pages.flatMap(page => page.results) || [], [data]);
    const totalCount = data?.pages[0]?.count || 0;
    const error = isError ? t("list.errorLoading") : null;
    const authUserId = useAppSelector((state) => state.auth.user?.id);

    useEffect(() => {
        if (!products.length) return;

        const alerts = processRestockAlerts(products, authUserId, (product) => ({
            title: t("details.restockBackInStock", {
                name: product.name,
                defaultValue: `${product.name} is back in stock now.`,
            }),
            message: t("details.restockBackInStock", {
                name: product.name,
                defaultValue: `${product.name} is back in stock now.`,
            }),
            actionUrl: `/products/${product.id}`,
        }));

        alerts.forEach((alert) => toast.show(alert.message, "success"));
    }, [authUserId, products, t, toast]);

    const handleAddToCart = useCallback((e: React.MouseEvent, product: ProductDto) => {
        e.preventDefault();
        e.stopPropagation();

        if (product.preparation_specifications && product.preparation_specifications.length > 0) {
            setSelectedProductForSpec(product);
            setSpecModalMode("cart");
            setSelectedPreparationId(null);
            setPreparationInstructions("");
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
                toast.show(`${product.name} added to cart`, "cart");
            } catch (err: any) {
                const msg = err?.response?.data?.error || "Failed to add item to cart";
                toast.show(msg, "error");
            }
        })();
    }, [dispatch, requireAuth, toast]);

    const handleBuyNow = useCallback((e: React.MouseEvent, product: ProductDto) => {
        e.preventDefault();
        e.stopPropagation();

        if (product.preparation_specifications && product.preparation_specifications.length > 0) {
            setSelectedProductForSpec(product);
            setSpecModalMode("checkout");
            setSelectedPreparationId(null);
            setPreparationInstructions("");
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
                toast.show(`${product.name} added to cart`, "cart");
                navigate('/cart');
            } catch (err: any) {
                const msg = err?.response?.data?.error || "Failed to add item to cart";
                toast.show(msg, "error");
            }
        })();
    }, [dispatch, navigate, requireAuth, toast]);

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
            toast.show(`${selectedProductForSpec.name} added to cart`, "cart");
            
            if (specModalMode === "checkout") {
                navigate('/cart');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Failed to add item to cart";
            toast.show(msg, "error");
            throw err; // Re-throw to let the modal handle loading state if needed (though it handles its own)
        }
    };

    const handleNotifyMe = useCallback((e: React.MouseEvent, product: ProductDto) => {
        e.preventDefault();
        e.stopPropagation();

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
                const msg = err?.response?.data?.detail || err?.response?.data?.error || "Failed to subscribe for stock alerts.";
                toast.show(msg, "error");
            }
        })();
    }, [requireAuth, t, toast]);

    return (
        <div dir="ltr" className="min-h-screen bg-slate-50 text-slate-800 selection:bg-cyan-100 selection:text-cyan-900">
            <Helmet>
                <title>
                    {pageCategoryLabel ? `${pageCategoryLabel} - SIMAK FRESH` : searchTerm ? `Search: ${searchTerm} - SIMAK FRESH` : "Shop Fresh Seafood & Meat - SIMAK FRESH"}
                </title>
                <meta name="description" content={pageCategoryLabel ? `Browse our freshest selection of ${pageCategoryLabel}. Quality seafood and meat delivered fresh.` : "Browse our full catalog of premium fresh seafood and meat products locally sourced and delivered in Dubai."} />
            </Helmet>

            {/* ─── Sticky Premium Filter & Search Bar ─── */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-300">
                <div className="mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8">
                        
                        {/* Horizontal Category Scroll - Pill Design */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0 lg:order-1 lg:flex-1">
                            {/* All Button */}
                            <button
                                onClick={handleAllCategories}
                                className={`shrink-0 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 whitespace-nowrap active:scale-95 ${
                                    !categoryName
                                        ? "bg-[#0b4e62] text-white shadow-lg shadow-[#0b4e62]/20"
                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/50"
                                }`}
                            >
                                {t("list.all", { defaultValue: "All Items" })}
                            </button>

                            {/* Category Chips — dynamic from backend */}
                            {backendCategories.map((cat) => {
                                const isActive = categoryName === cat.name;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategoryChipClick(cat.name)}
                                        className={`shrink-0 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 whitespace-nowrap active:scale-95 ${
                                            isActive
                                                ? "bg-[#0b4e62] text-white shadow-lg shadow-[#0b4e62]/20"
                                                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/50"
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input - Desktop: Inline | Mobile: Below Categories */}
                        <div className="relative group w-full lg:max-w-md lg:order-2">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-[#0b4e62] transition-colors duration-200" size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder={t("list.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                dir="auto"
                                className="w-full pl-11 pr-4 py-3 bg-slate-100/50 hover:bg-slate-100 border-none focus:ring-2 focus:ring-[#0b4e62]/20 rounded-2xl text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400/80"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm("")}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <span className="text-xs font-bold uppercase tracking-tighter">Clear</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Product Grid ─── */}
            <main className="max-w-350 mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {loading && products.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[50vh]">
                        {/* <ShrimpLoader /> */}
                        <InitialLoader/>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                        <div className="w-16 h-16 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mb-4">
                            <Filter size={32} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg mb-2">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-colors">
                            {t("list.tryAgain")}
                        </button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Search className="text-slate-300" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">{t("list.noProductsFound")}</h3>
                        <p className="text-slate-500 mb-8 max-w-sm">{t("list.noProductsDescription", { searchTerm })}</p>
                        <button
                            onClick={() => { setSearchTerm(""); }}
                            className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20"
                        >
                            {t("list.clearSearch")}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                            <AnimatePresence mode="popLayout">
                                {products.map((product, index) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        index={index}
                                        onAddToCart={handleAddToCart}
                                        onBuyNow={handleBuyNow}
                                        onNotifyMe={handleNotifyMe}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Load More Section */}
                        {hasNextPage && (
                            <div className="mt-14 flex flex-col items-center gap-5">
                                {/* Progress bar
                                <div className="w-full max-w-xs">
                                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.round((products.length / totalCount) * 100)}%` }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                        />
                                    </div>
                                    <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
                                        {products.length} / {totalCount}
                                    </p>
                                </div> */}

                                {/* Load More button */}
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="relative px-8 py-3 bg-linear-to-r from-slate-900 to-slate-700 text-white rounded-full font-semibold text-sm shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
                                >
                                    {isFetchingNextPage ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            {t("list.loading", "Loading...")}
                                        </span>
                                    ) : (
                                        t("list.loadMore", "Load More")
                                    )}
                                </button>
                            </div>
                        )}

                        {/* All loaded */}
                        {!hasNextPage && products.length > 0 && totalCount > LIMIT && (
                            <div className="mt-14 flex flex-col items-center gap-2">
                                <div className="w-full max-w-xs h-1 bg-linear-to-r from-cyan-400 to-cyan-600 rounded-full" />
                                <p className="text-[11px] text-slate-400 font-medium mt-1">
                                    ✨ {t("list.allLoaded", "That's everything!")}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Preparation Specification Modal */}
            <PreparationSpecModal
                product={selectedProductForSpec}
                isOpen={!!selectedProductForSpec}
                onClose={() => setSelectedProductForSpec(null)}
                onConfirm={handleConfirmSpecSelection}
                mode={specModalMode}
            />
        </div>
    );
};

export default UserProductsPage;
