import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCategories } from "../../hooks/queries";
import { type CategoryDto } from "../../features/admin/products/productApi";

import logo from "../../assets/SIMAK FRESH FINAL LOGO-01.svg";

const ShopByCategorySection: React.FC = () => {
  const { t, i18n } = useTranslation("home");
  const { data: categories = [], isLoading } = useCategories(i18n.language);

  return (
    <section className="relative overflow-hidden bg-[#f8f9fa] py-3 px-4 sm:px-6 lg:px-8">
      <div className="relative mx-auto  ">
        {/* Header */}
        <div className="mb-5">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 rounded-full mb-3">
            <LayoutGrid size={12} className="text-cyan-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-800">
              {t("shopByCategory.kicker", "Browse")}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            {t("shopByCategory.title", "Shop by Category")}
          </h2>
        </div>

        {/* Horizontal Scroll Carousel */}
        {isLoading ? (
          <div className="flex gap-[6px] sm:gap-[10px] overflow-x-auto pb-3 scrollbar-hide w-full">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse shrink-0 w-[72px] sm:w-[104px] md:w-[120px]">
                <div className="aspect-square bg-zinc-200 rounded-[22%]" />
                <div className="mt-2 h-3 bg-zinc-200 rounded-full w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="flex gap-[6px] sm:gap-[10px] overflow-x-auto pb-3 scrollbar-hide w-full">
            {categories.map((cat, i) => (
              <CategoryCard key={cat.id} category={cat} index={i} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

/* Category Card */
const CategoryCard: React.FC<{ category: CategoryDto; index: number }> = ({
  category,
  index,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`shrink-0 w-[72px] sm:w-[104px] md:w-[120px] transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <Link
        to={`/products?category_name=${encodeURIComponent(category.name)}`}
        className="group block text-center"
      >
        <div className="aspect-square rounded-[22%] overflow-hidden bg-zinc-50 border border-zinc-100 shadow-sm group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-300">
          {category.image ? (
            <img
              src={category.image}
              alt={category.localizedName || category.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 p-4">
              <img src={logo} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="Logo fallback" />
            </div>
          )}
        </div>
        <h3 className="mt-1.5 text-[11px] sm:text-xs md:text-sm font-bold text-zinc-900 group-hover:text-cyan-600 transition-colors truncate px-1">
          {category.localizedName || category.name}
        </h3>
      </Link>
    </div>
  );
};

export default ShopByCategorySection;