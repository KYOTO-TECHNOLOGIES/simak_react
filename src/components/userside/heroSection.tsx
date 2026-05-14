import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, Zap, Clock, ShoppingBag, Truck, Fish } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBanners, useDeliveryOffers } from '../../hooks/queries';
import { BRAND_COLORS } from '../../constants/theme';

const Hero: React.FC = () => {
  const { t, i18n } = useTranslation('home');
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [, setDirection] = useState(1);
  const isRtl = i18n.dir() === 'rtl';

  const { data: allBanners, isLoading: loading } = useBanners();
  const { data: deliveryOffers = [] } = useDeliveryOffers(i18n.language);

  // Colorful variants for the items is removed as it's unused

  const banners = useMemo(() => {
    if (!allBanners) return [];
    return allBanners.filter(b => b.position === 'home_banner' && b.is_active);
  }, [allBanners]);

  const next = useCallback(() => {
    if (banners.length === 0) return;
    setDirection(1);
    setCurrent((p) => (p + 1) % banners.length);
  }, [banners.length]);

  const goTo = (i: number) => {
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  };

  const promoTickerItems = useMemo(() => {
    const items = deliveryOffers.map((m) => String(m).trim()).filter(Boolean);
    return items.length > 0 ? items : [
      t('hero.promoOne', 'Fast UAE Delivery'),
      t('hero.promoTwo', 'Daily Fresh Deals'),
      t('hero.promoThree', 'Verified Quality'),
      t('hero.promoFour', 'Easy 7-Day Returns')
    ];
  }, [deliveryOffers, t]);

  const getMessageConfig = (msg: string, index: number) => {
    const lower = msg.toLowerCase();
    
    // Purchase / Rewards / Free Delivery -> BRAND CYAN
    if (lower.includes('aed') || lower.includes('purchase') || lower.includes('free delivery')) {
      return { 
        Icon: ShoppingBag, 
        color: 'text-cyan-700', 
        bg: 'bg-cyan-50/70', 
        border: 'border-cyan-100',
        iconColor: 'text-cyan-600'
      };
    }
    
    // Timing / Delivery Logistics -> BRAND GOLD/AMBER
    if (lower.includes('delivery') || lower.includes('shipping') || lower.includes('tomorrow') || lower.includes('now')) {
      return { 
        Icon: Truck, 
        color: 'text-amber-700', 
        bg: 'bg-amber-50/70', 
        border: 'border-amber-100',
        iconColor: 'text-amber-600'
      };
    }

    // Freshness / Quality -> SOFT CYAN
    if (lower.includes('fish') || lower.includes('fresh') || lower.includes('quality')) {
      return { 
        Icon: Fish, 
        color: 'text-cyan-700', 
        bg: 'bg-cyan-50/70', 
        border: 'border-cyan-100',
        iconColor: 'text-cyan-600'
      };
    }

    // Fallback -> Brand Colors
    const fallbacks = [
      { Icon: Zap, color: 'text-cyan-700', bg: 'bg-cyan-50/70', border: 'border-cyan-100', iconColor: 'text-cyan-600' },
      { Icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50/70', border: 'border-amber-100', iconColor: 'text-amber-600' },
    ];
    
    return fallbacks[index % fallbacks.length];
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(next, 8000);
    return () => clearInterval(id);
  }, [next, banners.length]);

  const media = banners[current];
  const title = media?.title;
  const subtitle = media?.subtitle;
  const highlight = media?.highlight;
  const tag = media?.tag;
  const cta = media?.cta_text || null;



  if (loading) return (
    <div className="w-full h-105 bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="w-full bg-white font-sans text-slate-800 select-none pb-4">
      {/* Banner - Kept original */}
      {banners.length > 0 && (
        <section className="relative w-full mx-auto px-0 sm:px-4 pt-2 sm:pt-4 group/carousel">
          <div className="relative h-75 sm:h-90 md:h-105 w-full overflow-hidden sm:rounded-4xl shadow-xl shadow-slate-200" style={{ backgroundColor: BRAND_COLORS.BLACK }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={media.id}
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 z-0"
              >
                <img src={media.desktop_image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/50 to-transparent rtl:bg-linear-to-l" />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 z-10 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-24 pointer-events-none">
              <div className="max-w-2xl pointer-events-auto">
                <AnimatePresence mode="wait">
                  <motion.div key={media.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div className="inline-flex items-center gap-2 mb-4">
                      {highlight && <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold uppercase rounded-full">{highlight}</span>}
                      {tag && <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs px-3 py-1 rounded-full">{tag}</span>}
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white leading-tight mb-3">
                      <span className="text-transparent bg-clip-text bg-linear-to-r from-white to-slate-200">{title}</span>
                    </h1>
                    {subtitle && <p className="text-sm sm:text-base text-slate-200 mb-4 max-w-lg line-clamp-2">{subtitle}</p>}
                    {cta && (
                      <button onClick={() => navigate('/products')} className="px-6 py-3 bg-cyan-600 text-white rounded-full font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-cyan-600/30">
                        {cta} <ChevronRight size={16} className="rtl-flip" />
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="absolute bottom-6 inset-e-6 sm:inset-e-auto sm:inset-s-12 md:inset-s-20 lg:inset-s-24 z-20 flex gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-cyan-500' : 'w-2 bg-white/40 hover:bg-white/60'}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RESPONSIVE TRUST BAR */}
      {promoTickerItems.length > 0 && (
        <div className="mx-auto px-4 sm:px-6 mt-4">
          <div className="flex sm:hidden flex-col gap-2">
            {promoTickerItems.map((message, index) => {
              const { Icon, color, bg, border, iconColor } = getMessageConfig(message, index);
              return (
                <div
                  key={index}
                  className={`flex items-center gap-4 py-3 px-4 ${bg} border ${border} rounded-2xl transition-all active:scale-[0.99]`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Icon size={20} strokeWidth={2.5} className={iconColor} />
                  </div>
                  <span className={`text-sm font-bold ${color} leading-tight`}>
                    {message}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Desktop: Full Horizontal List */}
          <div 
            dir={isRtl ? 'rtl' : 'ltr'}
            className="hidden sm:flex flex-nowrap items-center overflow-x-auto no-scrollbar gap-3 py-3 px-4 bg-slate-50 border border-slate-100 rounded-full justify-center"
          >
            {promoTickerItems.map((message, index) => {
              const { Icon, color, bg, border, iconColor } = getMessageConfig(message, index);
              return (
                <div
                  key={index}
                  className={`flex items-center shrink-0 group px-5 py-1.5 ${bg} border ${border} rounded-full transition-all duration-300 hover:shadow-sm`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                      <Icon size={16} strokeWidth={2.5} className={iconColor} />
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${color} whitespace-nowrap`}>
                      {message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Hero;
