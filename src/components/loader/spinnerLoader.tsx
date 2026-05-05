import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "../common/BrandLogo";
import { BRAND_COLORS } from "../../constants/theme";
import { LOADER_LANGUAGES } from "../../constants/languages";
import fish1 from "../../assets/fish1.png";
import fish2 from "../../assets/fish2.png";
import fish3 from "../../assets/fish3.png";

const getStoredLangIndex = (): number => {
  try {
    const stored = localStorage.getItem("i18nextLng");
    if (stored) {
      const langCode = stored.includes('-') ? stored.split('-')[0] : stored;
      const idx = LOADER_LANGUAGES.findIndex((t) => t.lang === langCode);
      if (idx !== -1) return idx;
    }
  } catch { }
  return -1;
};

const BOUNCE_CONFIGS = [
  { img: fish1, color: BRAND_COLORS.CYAN, delay: 0    },
  { img: fish2, color: BRAND_COLORS.GOLD, delay: 0.18 },
  { img: fish3, color: BRAND_COLORS.RED,  delay: 0.36 },
] as const;

const BounceFish = ({ img, color, delay, glow }: { img: string; color: string; delay: number; glow: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <motion.div
      animate={{ y: [0, -30] }}
      transition={{ duration: 0.46, repeat: Infinity, repeatType: "mirror", ease: "easeOut", delay }}
      style={{
        willChange: "transform",
        ...(glow && { filter: `drop-shadow(0 0 8px ${color}88)` }),
      }}
    >
      <img src={img} style={{ height: 38, width: "auto", display: "block" }} />
    </motion.div>
    <div
      style={{
        width: 40,
        height: 4,
        borderRadius: "50%",
        background: `radial-gradient(ellipse, ${color}40 0%, transparent 70%)`,
        marginTop: 3,
      }}
    />
  </div>
);

const InitialLoader = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const orderedTexts = useMemo(() => {
    const startIdx = getStoredLangIndex();
    const idx = startIdx === -1 ? 0 : startIdx;
    
    // Default cycle starts with the current language
    const defaultCycle = [...LOADER_LANGUAGES.slice(idx), ...LOADER_LANGUAGES.slice(0, idx)];
    
    // If the first language is not Arabic, ensure Arabic is the second one
    if (defaultCycle[0].lang !== 'ar') {
      const arabicItemIdx = defaultCycle.findIndex(item => item.lang === 'ar');
      if (arabicItemIdx !== -1 && arabicItemIdx !== 1) {
        const result = [...defaultCycle];
        const [arabicItem] = result.splice(arabicItemIdx, 1);
        result.splice(1, 0, arabicItem);
        return result;
      }
    }
    
    return defaultCycle;
  }, []);
  const [langIndex, setLangIndex] = useState(0);

  useEffect(() => {
    let timer: number;
    if (langIndex < orderedTexts.length - 1) {
      const delay = langIndex === 0 ? 1400 : 900;
      timer = window.setTimeout(() => setLangIndex((p) => p + 1), delay);
    } else {
      timer = window.setTimeout(() => setIsVisible(false), 1000);
    }
    return () => clearTimeout(timer);
  }, [langIndex, orderedTexts]);

  const lang = orderedTexts[langIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            overflow: "hidden",
            willChange: "transform, opacity",
            backgroundColor: "rgba(4, 12, 30, 0.95)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
              >
                <BrandLogo size={60} />
              </motion.div>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={lang.lang}
                  initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
                >
                  <div
                    className="animate-text-shimmer"
                    style={{
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      fontWeight: 900,
                      fontSize: 32,
                      letterSpacing: "-0.02em",
                      color: "transparent",
                      backgroundImage: `linear-gradient(90deg, #F6DE37, #fef08a, #ffffff, #fef08a, #F6DE37)`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      textTransform: "uppercase",
                      lineHeight: 1,
                      filter: "drop-shadow(0 0 12px rgba(4, 188, 177, 0.3)) drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
                      backgroundSize: "200% auto",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                  >
                    {lang.a}{" "}<span style={{ color: "inherit" }}>{lang.b}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <svg width="180" height="7" viewBox="0 0 180 7" fill="none" style={{ marginBottom: 6 }}>
                <path
                  d="M0 3.5 Q22.5 0 45 3.5 Q67.5 7 90 3.5 Q112.5 0 135 3.5 Q157.5 7 180 3.5"
                  stroke="rgba(4,188,177,0.5)"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
              <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
                {BOUNCE_CONFIGS.map((cfg, i) => (
                  <BounceFish key={i} img={cfg.img} color={cfg.color} delay={cfg.delay} glow={!isMobile} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitialLoader;
