import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Heart,
    ShoppingCart,
    Trash2,
    ArrowRight
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { type ProductDto } from "../admin/products/productApi";
import { useAppDispatch, useRequireAuth } from "../../hooks";
import { fetchCartRequest } from "../admin/cart/cartSlice";
import { cartsApi } from "../admin/cart/cartApi";
import { useToast } from "../../components/ui/Toast";
import PreparationSpecModal from "../../components/userside/PreparationSpecModal";
import { useNavigate } from "react-router-dom";

/** Main image field → feature gallery image → first gallery image */
const getBestProductImage = (product: ProductDto): string => {
    if (product.image) return product.image;
    const featured = product.images?.find((img) => img.is_feature);
    if (featured) return featured.image;
    return product.images?.[0]?.image || "";
};

const WishlistPage: React.FC = () => {
    const { t } = useTranslation("common");
    const [wishlistItems, setWishlistItems] = useState<ProductDto[]>([]);
    const [loading, setLoading] = useState(true);
    const dispatch = useAppDispatch();
    const requireAuth = useRequireAuth();
    const toast = useToast();
    const navigate = useNavigate();

    // Preparation Spec Modal State
    const [selectedProductForSpec, setSelectedProductForSpec] = useState<ProductDto | null>(null);
    const [specModalMode, setSpecModalMode] = useState<"cart" | "checkout">("cart");

    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = () => {
        try {
            const stored = localStorage.getItem("wishlist");
            if (stored) {
                setWishlistItems(JSON.parse(stored));
            }
        } catch (err) {
            console.error("Failed to load wishlist", err);
        } finally {
            setLoading(false);
        }
    };

    const removeFromWishlist = (id: number) => {
        const updated = wishlistItems.filter((item) => item.id !== id);
        setWishlistItems(updated);
        localStorage.setItem("wishlist", JSON.stringify(updated));
        // Dispatch a custom event so other components (like Navbar count if implemented) could update
        window.dispatchEvent(new Event("storage"));
    };

    const clearWishlist = () => {
        setWishlistItems([]);
        localStorage.removeItem("wishlist");
        window.dispatchEvent(new Event("storage"));
    };

    const handleAddToCart = (e: React.MouseEvent, product: ProductDto) => {
        e.preventDefault();
        e.stopPropagation();

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
                toast.show(`${product.name} added to cart`, "cart");
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
            toast.show(`${selectedProductForSpec.name} added to cart`, "cart");

            if (specModalMode === "checkout") {
                navigate("/cart");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Failed to add item to cart";
            toast.show(msg, "error");
            throw err;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-800 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-[60px] z-30">
                <div className="  mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Heart className="text-rose-600 fill-rose-600" size={28} />
                            {t("wishlist.title")}
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium">
                            {t("wishlist.subtitle")}
                        </p>
                    </div>

                    {wishlistItems.length > 0 && (
                        <button
                            onClick={clearWishlist}
                            className="self-start md:self-center px-4 py-2 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold hover:bg-cyan-50 hover:text-cyan-500 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={14} /> {t("wishlist.clearAll")}
                        </button>
                    )}
                </div>
            </div>

            <main className="  mx-auto px-4 sm:px-6 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-[4/5] bg-slate-50 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : wishlistItems.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm max-w-2xl mx-auto">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3">
                            <Heart className="text-rose-400" size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">
                            {t("wishlist.emptyTitle")}
                        </h3>
                        <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
                            {t("wishlist.emptyDescription")}
                        </p>
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-rose-600 text-white rounded-2xl font-bold text-sm hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-500/20 transition-all active:scale-95"
                        >
                            {t("wishlist.explore")} <ArrowRight size={16} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {wishlistItems.map((product, index) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white rounded-3xl p-4 hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300 border border-slate-100 hover:border-rose-100 relative"
                            >
                                <button
                                    onClick={() => removeFromWishlist(product.id)}
                                    className="absolute top-6 right-6 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 transition-colors shadow-sm"
                                    title={t("wishlist.removeTitle")}
                                >
                                    <Trash2 size={14} />
                                </button>

                                <Link to={`/products/${product.id}`} className="block">
                                    {/* Image */}
                                    <div className="relative aspect-[4/5] bg-slate-50 rounded-2xl overflow-hidden mb-4">
                                        <img
                                            src={getBestProductImage(product) || "https://via.placeholder.com/400x500?text=Fresh+Catch"}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        {!product.is_available && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                                                <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest -rotate-6">
                                                    {t("wishlist.outOfStock")}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="space-y-2 px-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                                            {product.category_name || "Fresh"}
                                        </p>
                                        <h3 className="text-base font-black text-slate-900 leading-tight line-clamp-1" title={product.name}>
                                            {product.name}
                                        </h3>

                                        <div className="flex items-center justify-between pt-2">
                                            {product.discount_price ? (
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-[10px] text-slate-400 line-through">AED {Number(product.price).toFixed(2)}</span>
                                                    <span className="text-lg font-black text-slate-900">AED {Number(product.discount_price).toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-lg font-black text-slate-900">AED {Number(product.price).toFixed(2)}</span>
                                            )}

                                            <button
                                                onClick={(e) => handleAddToCart(e, product)}
                                                className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center group-hover:bg-rose-600 transition-colors shadow-lg shadow-slate-900/10 group-hover:shadow-rose-600/20 active:scale-90"
                                                aria-label="Add to Cart"
                                            >
                                                <ShoppingCart size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

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

export default WishlistPage;
