import React from "react";
import {
    Mail,
    MapPin,
    Clock,
    Facebook,
    Instagram,
    Twitter,
    ArrowRight,
    CreditCard,
    MessageCircle,
    ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../../common/BrandLogo";
import brandNameSvg from "../../../assets/SIMAK FRESH FINAL SVG-01 riz.svg";
import { useCategories } from "../../../hooks/queries";
import { sortCategories } from "../../../utils/categories";
import { FaTiktok, FaSnapchat } from "react-icons/fa6";

const STORE_BADGES_IMAGE = "/app-store-png-logo-33123.png";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.simakfresh.app";
const APP_STORE_URL = "https://apps.apple.com/app/simak-fresh/id677057453";

type StoreBadgeLinkProps = {
    href: string;
    label: string;
    variant: "google-play" | "app-store";
};

const StoreBadgeLink: React.FC<StoreBadgeLinkProps> = ({ href, label, variant }) => (
    <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        aria-label={label}
        className="group relative block w-full max-w-[10.75rem] aspect-[3.35/1] overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10 transition-all duration-200 hover:scale-[1.03] hover:ring-yellow-400/50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
    >
        <img
            src={STORE_BADGES_IMAGE}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            draggable={false}
            className={`absolute left-0 w-full h-[200%] max-w-none object-contain ${
                variant === "google-play" ? "top-0 object-top" : "bottom-0 object-bottom"
            }`}
        />
    </a>
);

/* ── Component ── */
const Footer: React.FC = () => {
    const { t, i18n } = useTranslation("common");
    const year = new Date().getFullYear();
    const currentLanguage = i18n.language;
    const { data: categories = [], isLoading: categoriesLoading } = useCategories(i18n.language);
    const footerCategories = sortCategories(categories);

    const companyLinks = t("footer.companyLinks", { returnObjects: true }) as { label: string }[];
    const supportLinks = t("footer.supportLinks", { returnObjects: true }) as { label: string }[];
    const legalLinks = t("footer.legalLinks", { returnObjects: true }) as { label: string }[];
    const companyLinkPaths = [
        "/about",       // About Us
        "/",            // Freshness Promise
        "/careers",     // Careers
        "/",           // Blog
        "/",            // Press
    ];

    const supportLinkPaths = [
        "/support", // Help Center
        "/orders",  // Track Order
        "/support", // Contact Us
        null,        // FAQs
    ];
    const legalLinkPaths = [
        "/privacy-policy",
        "/terms-of-service",
    ];

    const getCategoryPath = (name: string) => {
        return `/products?category_name=${encodeURIComponent(name)}`;
    };

    const socials = [
        { icon: <Instagram size={18} />, href: "#", label: "Instagram" },
        { icon: <Facebook size={18} />, href: "#", label: "Facebook" },
        { icon: <Twitter size={18} />, href: "#", label: "Twitter" },
        { icon: <FaTiktok size={18} />, href: "#", label: "TikTok" },
        { icon: <FaSnapchat size={18} />, href: "#", label: "Snapchat" },
    ];

    return (
        <footer className="bg-cyan-950 text-cyan-200/80">
            {/* Newsletter Banner */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-6">
                <div className="mx-auto  ">
                    <div className="bg-cyan-900 border border-cyan-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">

                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">
                                {t("footer.newsletter.title")}
                            </h3>
                            <p className="text-xs text-cyan-200/60">
                                {t("footer.newsletter.subtitle")}
                            </p>
                        </div>
                        <div className="relative flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                            <input
                                type="email"
                                placeholder={t("footer.newsletter.placeholder")}
                                className="w-full sm:w-64 px-4 py-3 bg-cyan-950/50 border border-cyan-800 rounded-xl text-sm text-white placeholder:text-cyan-300/50 focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                            <button className="w-full sm:w-auto px-5 py-3 bg-yellow-500 text-cyan-900 rounded-xl text-sm font-bold hover:bg-yellow-400 transition-all shadow-lg hover:shadow-yellow-500/25 active:scale-[0.98] flex items-center justify-center gap-1.5">
                                {t("footer.newsletter.subscribe")}
                                <ArrowRight size={14} className="rtl-flip" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Footer Grid */}
            <div className="px-4 sm:px-6 lg:px-8 pb-6">
                <div className="mx-auto  ">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-8">
                        {/* Brand Column */}
                        <div className="col-span-2 sm:col-span-4 lg:col-span-2 flex flex-col sm:flex-row lg:flex-col gap-8 sm:gap-16 lg:gap-0">
                            {/* Logo & Description */}
                            <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <BrandLogo size={40} />
                                {currentLanguage === 'en' ? (
                                    <img 
                                        src={brandNameSvg} 
                                        alt="Simak Fresh" 
                                        className="h-6 w-auto object-contain brightness-0 invert mt-0"
                                    />
                                ) : (
                                    <span className="text-[13.5px] font-extrabold text-white tracking-tight">
                                        {t('brand.name')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-cyan-200/60 leading-relaxed mb-2 max-w-xs">
                                {t("footer.brandDescription")}
                            </p>
                            <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.1em] mb-5">
                                {t("brand.motto")}
                            </p>
                            </div>

                            {/* Contact & Socials */}
                            <div className="flex-1">
                                {/* Contact */}
                                <div className="space-y-2.5 mb-6">
                                <a 
                                    href="https://wa.me/971545446111" 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 text-xs hover:text-yellow-400 transition-colors"
                                >
                                    <MessageCircle size={13} className="text-emerald-400" />
                                    +971 545 446 111
                                </a>
                                <a href="mailto:support@simakfresh.ae" className="flex items-center gap-2.5 text-xs hover:text-yellow-400 transition-colors">
                                    <Mail size={13} className="text-cyan-300" />
                                    support@simakfresh.ae
                                </a>
                                <div className="flex items-start gap-2.5 text-xs hover:text-yellow-400 transition-colors">
                                    <MapPin size={13} className="text-cyan-300 shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1">
                                        <span>{t("footer.headOffice")}</span>
                                        <span>{t("footer.branch")}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs hover:text-yellow-400 transition-colors">
                                    <Clock size={13} className="text-cyan-300" />
                                    {t("footer.timing")}
                                </div>
                            </div>

                            {/* Socials */}
                            <div className="flex items-center gap-2">
                                {socials.map((s) => (
                                    <a
                                        key={s.label}
                                        href={s.href}
                                        aria-label={s.label}
                                        className="w-9 h-9 rounded-xl bg-cyan-900 hover:bg-yellow-500/20 border border-cyan-800 hover:border-yellow-500/40 flex items-center justify-center text-cyan-300 hover:text-yellow-400 transition-all"
                                    >
                                        {s.icon}
                                    </a>
                                ))}
                            </div>
                            </div>
                        </div>

                        {/* Shop */}
                        <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                                {t("footer.shop")}
                            </h4>
                            <ul className="space-y-2.5">
                                {categoriesLoading ? (
                                    [...Array(4)].map((_, i) => (
                                        <li key={i}>
                                            <span className="block h-3 w-24 rounded bg-cyan-800/60 animate-pulse" />
                                        </li>
                                    ))
                                ) : (
                                    footerCategories.map((category) => (
                                        <li key={category.id}>
                                            <Link
                                                to={getCategoryPath(category.name)}
                                                className="text-xs hover:text-yellow-400 transition-colors"
                                            >
                                                {category.localizedName || category.name}
                                            </Link>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                                {t("footer.company")}
                            </h4>
                            <ul className="space-y-2.5">
                                {Array.isArray(companyLinks) && companyLinks.map((link, idx) => {
                                    if (idx === 1) return null;

                                    const isStaticLabel = idx === 3 || idx === 4;

                                    return (
                                        <li key={idx}>
                                            {isStaticLabel ? (
                                                <span className="text-xs text-cyan-200/80">
                                                    {link.label}
                                                </span>
                                            ) : (
                                                <Link
                                                    to={companyLinkPaths[idx] || "/"}
                                                    className="text-xs hover:text-yellow-400 transition-colors"
                                                >
                                                    {link.label}
                                                </Link>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                                {t("footer.support")}
                            </h4>
                            <ul className="space-y-2.5">
                                {Array.isArray(supportLinks) && supportLinks.map((link, idx) => (
                                    <li key={idx}>
                                        {supportLinkPaths[idx] ? (
                                            <Link
                                                to={supportLinkPaths[idx]}
                                                className="text-xs hover:text-yellow-400 transition-colors"
                                            >
                                                {link.label}
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-cyan-200/80">
                                                {link.label}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Download & Payment */}
                        <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                                {t("footer.download")}
                            </h4>
                            <div className="flex flex-col gap-2.5 mb-6 w-full max-w-[10.75rem]">
                                <StoreBadgeLink
                                    href={PLAY_STORE_URL}
                                    variant="google-play"
                                    label={t("footer.googlePlayAlt", "Get it on Google Play")}
                                />
                                <StoreBadgeLink
                                    href={APP_STORE_URL}
                                    variant="app-store"
                                    label={t("footer.appStoreAlt", "Download on the App Store")}
                                />
                            </div>

                            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">
                                {t("footer.weAccept")}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { icon: <CreditCard size={14} />, label: t("footer.paymentMethods.cards") },
                                ].map((pm) => (
                                    <div
                                        key={pm.label}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-900 border border-cyan-800 rounded-lg"
                                    >
                                        <span className="text-cyan-300">{pm.icon}</span>
                                        <span className="text-[10px] font-medium text-cyan-200/80">{pm.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-cyan-900">
                <div className="mx-auto   px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-cyan-200/60">
                        <ShieldCheck size={14} className="text-yellow-500" />
                        <span>{t("footer.secure")}</span>
                    </div>

                    <p className="text-xs text-cyan-200/60">
                        © {year} {t('brand.name')}. {t("footer.rights")}
                    </p>

                    <div className="flex items-center gap-4">
                        {Array.isArray(legalLinks) && legalLinks.map((link, idx) => (
                            legalLinkPaths[idx] ? (
                                <Link
                                    key={idx}
                                    to={legalLinkPaths[idx] as string}
                                    className="text-[10px] text-cyan-200/60 hover:text-yellow-400 transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ) : (
                                <span key={idx} className="text-[10px] text-cyan-200/60">
                                    {link.label}
                                </span>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
