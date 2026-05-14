import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    Tag,
    Copy,
    Check,
    Clock,
    Zap,
    Gift,
    Percent,
    Truck,
    ArrowRight,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { type BannerDto } from "../../features/admin/banners/bannerApi";
import { useBanners } from "../../hooks/queries";
import { BrandLogo } from "../common/BrandLogo";


const OffersSection: React.FC = () => {
    const { t } = useTranslation("home");
    // ✅ TanStack Query — shared banner cache with Hero
    const { data: allBanners, isLoading: loading } = useBanners();

    const offerCards = useMemo(() => {
        if (!allBanners) return [] as BannerDto[];
        return allBanners.filter(b => b.position === 'home_offer_card');
    }, [allBanners]);

    const promoBanner = useMemo(() => {
        if (!allBanners) return null;
        return allBanners.find(b => b.position === 'home_promo_banner') || null;
    }, [allBanners]);

    // Merge API data with icons and styles from existing mocks
    const displayOffers = useMemo(() => {
        if (offerCards.length > 0) {
            const icons = [<Gift size={20} />, <Zap size={20} />, <Truck size={20} />, <Percent size={20} />];
            const gradients = ["bg-cyan-600", "bg-yellow-500", "bg-cyan-800", "bg-yellow-600"];
            const glows = ["bg-cyan-500/20", "bg-yellow-500/20", "bg-cyan-500/20", "bg-yellow-500/20"];

            return offerCards.map((b: BannerDto, i: number) => ({
                id: b.id,
                badge: b.tag || t(`offers.list.${i}.badge`),
                title: b.title || t(`offers.list.${i}.title`),
                subtitle: b.subtitle || t(`offers.list.${i}.subtitle`),
                code: b.cta_text || "OFFER", // Using cta_text as coupon code for now
                gradient: gradients[i % gradients.length],
                glow: glows[i % glows.length],
                icon: icons[i % icons.length],
                expiry: b.highlight || t(`offers.list.${i}.expiry`),
                terms: t(`offers.list.${i}.terms`),
                image: b.desktop_image || b.image || null, // Capture image from API
            }));
        }

        return [];
    }, [offerCards, t]);

    const displayPromo = {
        title: promoBanner?.title || t("offers.bannerTitle"),
        subtitle: promoBanner?.subtitle || t("offers.bannerSubtitle"),
        cta: promoBanner?.cta_text || t("offers.bannerCTA"),
        cta_link: promoBanner?.cta_link,
        image: promoBanner?.desktop_image || promoBanner?.image || null,
        gradient: "bg-cyan-950",
    };

    // ✅ Slider Navigation Logic
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
        }
    };

    useEffect(() => {
        handleScroll();
        window.addEventListener("resize", handleScroll);
        return () => window.removeEventListener("resize", handleScroll);
    }, [displayOffers]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const { clientWidth } = scrollRef.current;
            // Scroll by slightly less than full width to peek at the next card
            const scrollAmount = direction === "left" ? -clientWidth + 40 : clientWidth - 40;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    return (
        <section className="relative bg-[#FAFAF8] py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Decorative */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-50/50 rounded-full blur-3xl" />

            <div className="relative mx-auto  ">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-50 border border-cyan-100 rounded-full mb-4">
                        <Tag size={14} className="text-cyan-500" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-600">
                            {t("offers.kicker")}
                        </span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                        {t("offers.title")}{" "}
                        <span className="text-cyan-600">
                            {t("offers.titleHighlight")}
                        </span>
                    </h2>
                    <p className="mt-3 text-zinc-500 text-sm max-w-md mx-auto">
                        {t("offers.subtitle")}
                    </p>
                </div>

                {/* Skeleton Loader */}
                {loading && (
                    <div className="flex lg:grid lg:grid-cols-4 gap-5 overflow-hidden pb-6 px-1 -mx-1">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 h-64 bg-zinc-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Offer Cards Slider / Grid */}
                {!loading && displayOffers.length > 0 && (
                    <div className="relative group/slider">

                        {/* ✅ Left Arrow (Hidden on Desktop grid) */}
                        {canScrollLeft && (
                            <button
                                onClick={() => scroll("left")}
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/90 backdrop-blur-sm shadow-lg rounded-full text-zinc-600 hover:text-cyan-600 hover:bg-white hover:scale-110 active:scale-95 transition-all lg:hidden"
                                aria-label={t("offers.scrollLeft", "Scroll left")}
                            >
                                <ChevronLeft size={20} className="rtl-flip" />
                            </button>
                        )}

                        {/* ✅ Right Arrow (Hidden on Desktop grid) */}
                        {canScrollRight && (
                            <button
                                onClick={() => scroll("right")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/90 backdrop-blur-sm shadow-lg rounded-full text-zinc-600 hover:text-cyan-600 hover:bg-white hover:scale-110 active:scale-95 transition-all lg:hidden"
                                aria-label={t("offers.scrollRight", "Scroll right")}
                            >
                                <ChevronRight size={20} className="rtl-flip" />
                            </button>
                        )}

                        <div
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="flex lg:grid lg:grid-cols-4 gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-6 px-1 -mx-1"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                            {displayOffers.map((offer, i) => (
                                <OfferCard
                                    key={offer.id}
                                    offer={offer as any}
                                    index={i}
                                    className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center lg:snap-align-none"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Banner CTA */}
                {!loading && displayPromo.title && <BannerCTA bannerOffer={displayPromo} />}
            </div>

            {/* Hide scrollbar CSS */}
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        </section>
    );
};

/* ── Offer Card ── */
interface Offer {
    id: number;
    badge: string;
    title: string;
    subtitle: string;
    code: string;
    gradient: string;
    glow: string;
    icon: React.ReactNode;
    expiry: string;
    terms: string;
    image: string | null;
}

const OfferCard: React.FC<{ offer: Offer; index: number; className?: string }> = ({ offer, index, className = "" }) => {
    const { t } = useTranslation("home");
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true); },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(offer.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            ref={ref}
            className={`group relative bg-white border border-zinc-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-default ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                } ${className}`}
            style={{ transitionDelay: `${index * 80}ms` }}
        >
            {/* Top gradient strip */}
            <div className={`h-1.5 ${offer.gradient}`} />

            {/* Optional Banner Image via API */}
            {offer.image && (
                <div className="w-full h-32 bg-slate-100 overflow-hidden shrink-0">
                    <img
                        src={offer.image}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
            )}

            <div className="p-5 flex flex-col items-center text-center sm:items-start sm:text-left h-full">
                {/* Badge + Icon */}
                <div className="flex items-center justify-center sm:justify-between w-full mb-4">
                    <span className={`px-2.5 py-1 ${offer.gradient} text-white rounded-lg text-[9px] font-bold uppercase tracking-wider`}>
                        {offer.badge}
                    </span>
                    <div className={`hidden sm:block p-2 rounded-xl ${offer.glow} transition-transform group-hover:scale-110 duration-300`}>
                        {offer.icon}
                    </div>
                </div>

                {/* Mobile Icon (centered) */}
                <div className={`sm:hidden p-3 rounded-2xl ${offer.glow} mb-4`}>
                    {offer.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-extrabold text-zinc-900 mb-1">{offer.title}</h3>
                <p className="text-xs text-zinc-500 mb-4 leading-relaxed">{offer.subtitle}</p>

                {/* Coupon Code (Pushed to bottom using mt-auto if container expands) */}
                <div className="flex items-center gap-2 mb-4 w-full mt-auto">
                    <div className="flex-1 px-3 py-2.5 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-zinc-700 tracking-wider">
                            {offer.code}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="p-1 hover:bg-zinc-200 rounded-md transition-colors"
                            title={t("offers.copyCode")}
                        >
                            {copied ? (
                                <Check size={14} className="text-cyan-600" />
                            ) : (
                                <Copy size={14} className="text-zinc-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 w-full">
                    <div className="flex items-center gap-1 text-zinc-400">
                        <Clock size={11} />
                        <span className="text-[10px] font-medium">{offer.expiry}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{offer.terms}</span>
                </div>
            </div>
        </div>
    );
};

/* ── Banner CTA ── */
const BannerCTA: React.FC<{ bannerOffer: any }> = ({ bannerOffer }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true); },
            { threshold: 0.2 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`relative rounded-3xl ${bannerOffer.gradient} overflow-hidden transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
        >
            {/* Glow effects */}
            <div className="absolute -top-20 left-1/4 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />

            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]">
                <div
                    className="h-full w-full"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* Optional Banner Image from API */}
            {bannerOffer.image && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={bannerOffer.image}
                        alt={bannerOffer.title}
                        className="w-full h-full object-cover opacity-40 mix-blend-overlay"
                    />
                </div>
            )}

            <div className="relative flex flex-col sm:flex-row items-center justify-between p-8 sm:p-12 gap-6 z-10 text-center sm:text-left">
                <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                        <BrandLogo size={40} className="shrink-0" />
                        {bannerOffer.title}
                    </h3>
                    <p className="text-sm text-zinc-400">{bannerOffer.subtitle}</p>
                </div>
                <Link
                    to={bannerOffer.cta_link || "/products"}
                    className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-cyan-900 rounded-2xl text-sm font-bold shadow-xl hover:shadow-2xl hover:bg-zinc-50 transition-all duration-300 active:scale-[0.98] shrink-0 w-full sm:w-auto"
                >
                    {bannerOffer.cta}
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </div>
    );
};

export default OffersSection;
