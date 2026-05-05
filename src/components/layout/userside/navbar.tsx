import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ShoppingCart,
    User,
    MapPin,
    Phone,
    LogOut,
    LogIn,
    Bell,
    Package,
    Menu,
    X,
    ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { logout } from '../../../features/auth/authSlice';
import { selectCartItems } from '../../../features/admin/cart/cartSlice';
import { useTranslation } from 'react-i18next';

import useLanguageToggle from '../../../hooks/useLanguageToggle';
import { BRAND_COLORS } from '../../../constants/theme';
import { BrandSignature } from '../../common/BrandSignature';
import { BrandLogo } from '../../common/BrandLogo';

const Navbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isAuthenticated = useAppSelector((state: any) => state.auth.isAuthenticated);
    const user = useAppSelector((state: any) => state.auth.user);
    const cartItems = useAppSelector(selectCartItems);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const { t } = useTranslation();
    const { setLanguage, currentLanguage, isArabic } = useLanguageToggle();



    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 40);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div
            className="w-full text-slate-800 select-none sticky top-0 z-50"
        >
            {/* ═══ 1  TOP UTILITY BAR ════════════════════════════ */}
            <div className="bg-cyan-950 text-cyan-50 text-[11px]">
                <div className="  mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            to="/orders"
                            className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                            <Package size={12} className="text-yellow-400" />
                            {t('top.trackOrder')}
                        </Link>
                        <span className="hidden md:flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                            <Phone size={12} className="text-yellow-400" />
                            +971 545 446 111
                        </span>
                        <span className="hidden lg:inline-flex items-center text-cyan-300/60 font-bold uppercase tracking-wider text-[9px] border-l border-cyan-800 pl-5 ml-2">
                            {t('brand.motto')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Right links */}

                        {/* ✅ Language Switch */}
                        <div className="flex items-center gap-1.5 ml-1">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-2 py-1 rounded-md transition-all ${currentLanguage === 'en' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => setLanguage('cn')}
                                className={`px-2 py-1 rounded-md transition-all ${currentLanguage === 'cn' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                中文
                            </button>
                            <button
                                onClick={() => setLanguage('ar')}
                                className={`px-2 py-1 rounded-md transition-all ${currentLanguage === 'ar' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                العربية
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ 2  MAIN NAV ════════════════════════════════ */}
            <nav
                className={`bg-white border-b border-slate-100 transition-shadow duration-300 ${isScrolled ? 'shadow-md' : ''
                    }`}
            >
                <div className="  mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
                    <Link to="/" className="shrink-0 flex items-center gap-2 group">
                        <BrandLogo size={40} />
                        <div className="flex flex-col justify-center items-center text-center">
                            <span 
                                className="text-[20px] sm:text-[22px] uppercase leading-none"
                                style={{ 
                                    color: BRAND_COLORS.DARK_CYAN,
                                    fontFamily: "'SF Pro Display', sans-serif",
                                    fontWeight: 1000,
                                    letterSpacing: "-0.01em"
                                }}
                            >
                                {t('brand.name')}
                            </span>
                            <div className="mt-1 whitespace-nowrap">
                                <BrandSignature
                                    language={currentLanguage}
                                    signatureText={t('brand.signature')}
                                    color={BRAND_COLORS.ACCENT_CYAN}
                                    size="sm"
                                    wow={false}
                                />
                            </div>
                        </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Desktop Shop Link */}
                        <Link
                            to="/products"
                            className="hidden md:block text-xs font-bold text-slate-700 hover:text-cyan-600 transition-colors px-2"
                        >
                            {t('nav.shop')}
                        </Link>

                        {/* ✅ Cart Icon - Visible on all screen sizes */}
                        {isAuthenticated ? (
                            <Link
                                to="/cart"
                                className="relative flex flex-col items-center gap-0.5 min-w-14 py-1.5 rounded-xl hover:bg-stone-50 transition-colors group"
                            >
                                <div className="relative flex justify-center w-full">
                                    <ShoppingCart size={18} className="text-stone-400 group-hover:text-cyan-600 transition-colors" />
                                    {/* Badge */}
                                    {cartItems.length > 0 && (
                                        <span className="absolute -top-1 -inset-e-1 bg-cyan-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white min-w-4 min-h-4">
                                            {cartItems.length}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] font-semibold text-stone-400 group-hover:text-cyan-600 transition-colors">
                                    {t('nav.cart')}
                                </span>
                            </Link>
                        ) : null}

                        {/* Desktop Account Dropdown / Login Button */}
                        {isAuthenticated ? (
                            <div className="relative group z-50 hidden md:block">
                                <button className="flex flex-col items-center gap-0.5 min-w-14 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <User size={18} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                                    <span className="text-[9px] font-semibold text-slate-400 group-hover:text-cyan-600 transition-colors">
                                        {t('nav.account')}
                                    </span>
                                </button>

                                <div className="absolute inset-e-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform ltr:origin-top-right rtl:origin-top-left w-48">
                                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2">
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 hover:text-cyan-600"
                                        >
                                            <User size={14} /> {t('account.myProfile')}
                                        </Link>
                                        <Link
                                            to="/orders"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 hover:text-cyan-600"
                                        >
                                            <Package size={14} /> {t('account.myOrders')}
                                        </Link>
                                        <Link
                                            to="/notifications"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 hover:text-cyan-600"
                                        >
                                            <Bell size={14} /> {t('account.notifications')}
                                        </Link>
                                        <Link
                                            to="/support"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 hover:text-cyan-600"
                                        >
                                            <Phone size={14} /> {t('top.support')}
                                        </Link>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cyan-50 transition-colors text-xs font-bold text-slate-600 hover:text-cyan-600"
                                        >
                                            <LogOut size={14} /> {t('account.logout')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="hidden md:flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 hover:bg-cyan-700 transition-colors"
                            >
                                <LogIn size={14} /> {t('auth.login')}
                            </Link>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-cyan-600 transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══ MOBILE MENU DRAWER ════════════════════════════ */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 z-60 backdrop-blur-sm md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: isArabic ? '-100%' : '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: isArabic ? '-100%' : '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`fixed top-0 ${isArabic ? 'left-0' : 'right-0'} h-full w-70 bg-white z-70 shadow-2xl flex flex-col md:hidden`}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-cyan-50/50">
                                <span className="font-bold text-lg text-slate-800">{t('mobile.menu')}</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 hover:bg-cyan-100 text-slate-500 hover:text-cyan-600 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto py-4">

                                {/* User Section */}
                                <div className="px-4 mb-6">
                                    {isAuthenticated ? (
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 font-bold border border-cyan-100">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{user?.name || user?.first_name || t('mobile.welcomeBack')}</p>
                                                    <p className="text-xs text-slate-500">{user?.email || user?.phone_number || t('mobile.member')}</p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/profile"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:text-cyan-600 transition-colors"
                                            >
                                                {t('mobile.viewProfile')} <ChevronRight size={14} className="rtl-flip" />
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 text-center">
                                            <p className="text-sm font-bold text-cyan-900 mb-3">{t('mobile.welcomeBrand')}</p>
                                            <Link
                                                to="/login"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block w-full py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 hover:bg-cyan-700 transition-colors"
                                            >
                                                {t('mobile.loginRegister')}
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation Links */}
                                <div className="px-4 space-y-1">
                                    {[{ key: 'shop', label: t('nav.shop'), href: '/products', icon: <Package size={18} /> },
                                    ...(isAuthenticated ? [{ key: 'cart', label: t('nav.myCart'), href: '/cart', icon: <ShoppingCart size={18} />, badge: cartItems.length }] : [])
                                    ].map((link) => (
                                        <Link
                                            key={link.key}
                                            to={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 font-medium transition-colors"
                                        >
                                            <div className="w-5 flex justify-center text-slate-400">{link.icon}</div>
                                            <span className="flex-1">{link.label}</span>
                                            {link.badge !== undefined && link.badge > 0 && (
                                                <span className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    {link.badge}
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </div>

                                <div className="px-4 space-y-1">

                                    {[
                                        ...(isAuthenticated ? [{ key: 'track', label: t('top.trackOrder'), href: '/orders', icon: <MapPin size={18} /> }] : []),
                                        { key: 'notifications', label: t('account.notifications'), href: '/notifications', icon: <Bell size={18} /> },
                                        { key: 'support', label: t('top.support'), href: '/support', icon: <Phone size={18} /> },
                                    ].map((link) => (
                                        <Link
                                            key={link.key}
                                            to={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 font-medium transition-colors"
                                        >
                                            <div className="w-5 flex justify-center text-slate-400">{link.icon}</div>
                                            <span className="flex-1">{link.label}</span>
                                        </Link>
                                    ))}
                                </div>

                                {isAuthenticated && (
                                    <div className="px-4 mt-6">
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 font-bold transition-all border border-slate-100"
                                        >
                                            <div className="w-5 flex justify-center">
                                                <LogOut size={18} />
                                            </div>
                                            {t('account.logout')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Navbar;
