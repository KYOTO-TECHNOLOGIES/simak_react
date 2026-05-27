import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Fish, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/ui/Toast';
import {
    fetchCartRequest,
    removeFromCart,
    updateQuantity,
    selectCartItems,
    selectCartError,
    selectUpdatingItemIds,
    isCartItemInStock,
} from '../admin/cart/cartSlice';
import { ordersApi, type DeliveryChargeSettingsDto } from '../admin/orders/ordersApi';
import { cartsApi } from '../admin/cart/cartApi';

import logo from "../../assets/SIMAK FRESH FINAL LOGO-01.svg";

const computeDeliveryCharge = (
    cartTotal: number,
    settings: DeliveryChargeSettingsDto | null
) => {
    if (!settings) return null;
    if (!settings.is_active) return 0;
    return cartTotal >= settings.min_order_for_free_delivery ? 0 : settings.delivery_charge_amount;
};

const CartPage: React.FC = () => {
    const { t } = useTranslation('cart');
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const cartItems = useAppSelector(selectCartItems);
    const cartError = useAppSelector(selectCartError);
    const updatingItemIds = useAppSelector(selectUpdatingItemIds);
    const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
    const checkingAuth = useAppSelector((s) => s.auth.checkingAuth);
    const [deliveryChargeSettings, setDeliveryChargeSettings] = useState<DeliveryChargeSettingsDto | null>(null);
    const [loadingDeliveryChargeSettings, setLoadingDeliveryChargeSettings] = useState(true);
    const [preparingCheckout, setPreparingCheckout] = useState(false);

    const inStockCartItems = cartItems.filter(isCartItemInStock);
    const outOfStockCartItems = cartItems.filter((item) => !isCartItemInStock(item));
    const inStockCartTotal = Number(
        inStockCartItems
            .reduce((total, item) => total + (item.subtotal ?? item.finalPrice * item.quantity), 0)
            .toFixed(2)
    );

    // Always fetch fresh cart data when the cart page mounts and user is authenticated.
    // Also refetch when the page regains focus to prevent caching.
    useEffect(() => {
        if (!checkingAuth && isAuthenticated) {
            dispatch(fetchCartRequest());
        }

        // Refetch cart whenever the window regains focus
        const handleFocus = () => {
            if (isAuthenticated) {
                dispatch(fetchCartRequest());
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [dispatch, isAuthenticated, checkingAuth]);

    useEffect(() => {
        let isMounted = true;

        const loadDeliveryChargeSettings = async () => {
            try {
                const data = await ordersApi.getDeliveryChargeSettings();
                if (isMounted) {
                    setDeliveryChargeSettings(data);
                }
            } catch (error) {
                console.error('Failed to load delivery charge settings', error);
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

    const deliveryCharge = computeDeliveryCharge(inStockCartTotal, deliveryChargeSettings);
    const totalWithDelivery = inStockCartTotal + (deliveryCharge ?? 0);

    const handleProceedToCheckout = async () => {
        if (preparingCheckout) return;

        setPreparingCheckout(true);
        try {
            if (outOfStockCartItems.length > 0) {
                await Promise.all(
                    outOfStockCartItems.map((item) =>
                        cartsApi.removeItem(item.id).catch(() => null)
                    )
                );

                dispatch(fetchCartRequest());
                toast.show(
                    t('cart.checkoutFilteredOutOfStock', {
                        count: outOfStockCartItems.length,
                        defaultValue:
                            outOfStockCartItems.length === 1
                                ? '1 out-of-stock item was removed from checkout.'
                                : `${outOfStockCartItems.length} out-of-stock items were removed from checkout.`,
                    }),
                    'warning'
                );
            }

            if (inStockCartItems.length === 0) {
                toast.show(
                    t('cart.noInStockForCheckout', {
                        defaultValue: 'Your cart has no in-stock items available for checkout.',
                    }),
                    'warning'
                );
                return;
            }

            navigate('/checkout');
        } finally {
            setPreparingCheckout(false);
        }
    };

    // Loading state removed as requested

    // Error state
    if (cartError) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4">
                <ShoppingBag size={40} className="text-stone-300" />
                <p className="text-cyan-500 font-bold">{t('cart.errorFetching')}</p>
                <button
                    onClick={() => navigate('/products')}
                    className="px-6 py-2 bg-cyan-900 text-white rounded-full font-bold hover:bg-cyan-800 transition-colors"
                >
                    {t('cart.continueShopping')}
                </button>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <ShoppingBag size={40} className="text-stone-300" />
                </div>
                <h2 className="text-2xl font-black text-stone-900 mb-2">{t('cart.emptyTitle')}</h2>
                <p className="text-stone-500 mb-8 max-w-sm text-center">
                    {t('cart.emptyDescription')}
                </p>
                <button
                    onClick={() => navigate('/products')}
                    className="px-8 py-3 bg-cyan-900 text-white rounded-full font-bold hover:bg-cyan-800 transition-colors flex items-center gap-2"
                >
                    {t('cart.startShopping')} <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 font-sans text-stone-800 pb-20">
            {/* Header */}
            <div className="bg-cyan-950 border-b border-cyan-900 sticky top-0 z-20 shadow-md">
                <div className="  mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-black text-white flex items-center gap-2">
                        <ShoppingBag size={20} className="text-yellow-500" /> {t('cart.title', { count: cartItems.length })}
                    </h1>
                    <button
                        onClick={() => navigate('/products')}
                        className="text-sm font-bold text-cyan-200 hover:text-white transition-colors"
                    >
                        {t('cart.continueShopping')}
                    </button>
                </div>
            </div>

            <main className="  mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                    <AnimatePresence>
                        {cartItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                className="bg-white rounded-2xl p-4 border border-stone-200 flex gap-4 hover:shadow-lg transition-shadow"
                            >
                                {/* Image */}
                                <div className="w-24 h-24 bg-stone-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-900 p-4">
                                            <img src={logo} className="w-full h-full object-contain" alt="Logo fallback" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <Link to={`/products/${item.id}`} className="font-bold text-stone-900 hover:text-cyan-600 transition-colors line-clamp-1">
                                                {item.name}
                                            </Link>
                                            <p className="text-xs text-stone-500 font-medium">{t('cart.itemUnit', { quantity: item.quantity })}</p>

                                            {item.preparationSpecificationDetails && (
                                                <div className="mt-1 bg-stone-50 p-2 rounded-lg border border-stone-100">
                                                    <p className="text-[11px] text-stone-600">
                                                        <span className="font-bold text-stone-800">Prep:</span> {item.preparationSpecificationDetails.name}
                                                    </p>
                                                    {item.preparationInstructions && (
                                                        <p className="text-[10px] text-stone-500 mt-0.5 italic">
                                                            Note: {item.preparationInstructions}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => dispatch(removeFromCart(item.cartItemId!))}
                                            className="text-stone-300 hover:text-cyan-500 transition-colors p-1"
                                            title={t('cart.removeFromCart')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-1 mt-2">
                                        {item.quantity >= item.stock && (
                                            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                                                <Fish size={13} /> That's our full catch! Only {item.stock} fresh from Simak.
                                            </p>
                                        )}
                                        <div className="flex items-end justify-between">
                                            {/* Quantity Control */}
                                            {(() => {
                                                const isUpdating = updatingItemIds.includes(item.cartItemId!);
                                                const atMax = item.quantity >= item.stock;
                                                return (
                                                    <div className={`flex items-center gap-3 bg-stone-50 rounded-lg p-1 border ${atMax ? 'border-amber-300' : 'border-stone-200'}`}>
                                                        <button
                                                            onClick={() => dispatch(updateQuantity({ cartItemId: item.cartItemId!, quantity: item.quantity - 1 }))}
                                                            className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-stone-600 hover:text-black shadow-sm disabled:opacity-50"
                                                            disabled={isUpdating || item.quantity <= 1}
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <div className="w-6 flex items-center justify-center">
                                                            {isUpdating ? (
                                                                <svg className="animate-spin h-4 w-4 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                                </svg>
                                                            ) : (
                                                                <span className="text-sm font-bold">{item.quantity}</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => dispatch(updateQuantity({ cartItemId: item.cartItemId!, quantity: item.quantity + 1 }))}
                                                            className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-stone-600 hover:text-black shadow-sm disabled:opacity-50"
                                                            disabled={isUpdating || atMax}
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            {/* Price */}
                                            <div className="text-right">
                                                {item.discountPrice ? (
                                                    <div className="flex flex-col items-end leading-none">
                                                        <span className="text-[10px] text-stone-400 line-through">
                                                            AED {((item.baseUnitPrice ?? item.price) * item.quantity).toFixed(2)}
                                                        </span>
                                                        <span className="text-lg font-black text-cyan-900">
                                                            AED {(item.subtotal ?? item.finalPrice * item.quantity).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-lg font-black text-cyan-900">
                                                        AED {(item.subtotal ?? item.finalPrice * item.quantity).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Summary Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm sticky top-24 space-y-6">
                        <h2 className="text-lg font-black text-stone-900">{t('cart.summaryTitle') || t('cart.subtotal')}</h2>

                        <div className="space-y-3 pb-6 border-b border-stone-100">
                            <div className="flex justify-between text-sm text-stone-500">
                                <span>{t('cart.subtotal')}</span>
                                <span className="font-bold text-stone-900">AED {inStockCartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-stone-500">
                                <span>{t('cart.shipping')}</span>
                                {deliveryCharge === null ? (
                                    <span className="font-bold text-stone-500">{t('cart.calculatedAtCheckout')}</span>
                                ) : (
                                    <span className={`font-bold ${deliveryCharge === 0 ? 'text-emerald-600' : 'text-stone-900'}`}>
                                        {deliveryCharge === 0 ? t('cart.free') : `AED ${deliveryCharge.toFixed(2)}`}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-stone-400 italic">
                                {loadingDeliveryChargeSettings
                                    ? t('cart.loadingDeliveryCharge', { defaultValue: 'Loading delivery charges...' })
                                    : deliveryChargeSettings
                                        ? deliveryChargeSettings.is_active
                                            ? t('cart.freeDeliveryNote', {
                                                amount: String(deliveryChargeSettings.min_order_for_free_delivery),
                                                defaultValue: `Free delivery on orders AED ${deliveryChargeSettings.min_order_for_free_delivery.toFixed(2)} and above.`,
                                            })
                                            : t('cart.deliveryDisabled', {
                                                defaultValue: 'Delivery charges are currently disabled.',
                                            })
                                        : t('cart.deliveryRuleFallback', {
                                            defaultValue: 'Delivery is calculated using the current delivery settings.',
                                        })}
                            </p>
                            {outOfStockCartItems.length > 0 && (
                                <p className="text-xs font-semibold text-amber-600">
                                    {t('cart.excludingOutOfStock', {
                                        count: outOfStockCartItems.length,
                                        defaultValue:
                                            outOfStockCartItems.length === 1
                                                ? '1 out-of-stock item will be excluded at checkout.'
                                                : `${outOfStockCartItems.length} out-of-stock items will be excluded at checkout.`,
                                    })}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-stone-900">{t('cart.itemsTotal')}</span>
                            <span className="text-2xl font-black text-cyan-900">AED {totalWithDelivery.toFixed(2)}</span>
                        </div>

                        <button
                            className="w-full py-4 bg-cyan-900 text-white rounded-xl font-bold hover:bg-cyan-800 transition-all shadow-lg flex items-center justify-center gap-2 group shadow-cyan-900/20"
                            onClick={() => {
                                void handleProceedToCheckout();
                            }}
                            disabled={preparingCheckout}
                        >
                            {preparingCheckout ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('cart.preparingCheckout', { defaultValue: 'Preparing checkout...' })}
                                </>
                            ) : (
                                <>
                                    {t('cart.proceedToCheckout')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center gap-2 text-xs text-stone-400 bg-stone-50 py-2 rounded-lg">
                            <ShieldCheck size={14} className="text-yellow-500" /> {t('cart.secureCheckout')}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CartPage;
