import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND_COLORS } from "../../constants/theme";
import { BrandLogo } from "../common/BrandLogo";
import { BrandSignature } from "../common/BrandSignature";

const LANG_TEXTS = [
  { a: "SIMAK", b: "FRESH" },
  { a: "思马克", b: "新鲜" },
  { a: "سيماك", b: "فريش" },
];

const ShrimpLoader = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % LANG_TEXTS.length), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white w-screen h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#ecfeff_0%,_#ffffff_65%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-5"
      >
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <BrandLogo size={96} className="drop-shadow-sm" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex items-baseline gap-2">
            <span 
              className="text-[22px] uppercase leading-none"
              style={{ 
                color: BRAND_COLORS.DARK_CYAN,
                fontFamily: "'SF Pro Display', sans-serif",
                fontWeight: 900,
                letterSpacing: "0.05em"
              }}
            >
              SIMAK
            </span>
            <span 
              className="text-[22px] uppercase leading-none"
              style={{ 
                color: BRAND_COLORS.CYAN,
                fontFamily: "'SF Pro Display', sans-serif",
                fontWeight: 900,
                letterSpacing: "0.05em"
              }}
            >
              FRESH
            </span>
          </div>
          <BrandSignature 
            language="en" 
            color={ BRAND_COLORS.ACCENT_CYAN }
            size="sm"
            className="opacity-60"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="h-5 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: 5, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -5, filter: "blur(3px)" }}
              transition={{ duration: 0.22 }}
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: BRAND_COLORS.ACCENT_CYAN }}
            >
              {LANG_TEXTS[idx].a}{" "}
              <span style={{ opacity: 0.7 }}>{LANG_TEXTS[idx].b}</span>
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="w-20 h-[2px] rounded-full bg-zinc-100 overflow-hidden"
        >
          <motion.div
            className="h-full w-7 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.CYAN}, transparent)`,
            }}
            animate={{ x: ["-100%", "380%"] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ShrimpLoader;
