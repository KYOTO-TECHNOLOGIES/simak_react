import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, Globe, Sparkles, ShieldCheck, Package, Ship, 
  Sprout, Store, Users, ArrowRight, Award, CheckCircle2
} from "lucide-react";

const AboutPage: React.FC = () => {
  const { t } = useTranslation("common");

  const sectorItems = [
    { key: "import", label: t("about.sectors.import", "Import"), icon: <Package size={24} />, color: "bg-blue-500", shadow: "shadow-blue-200" },
    { key: "export", label: t("about.sectors.export", "Export"), icon: <Ship size={24} />, color: "bg-cyan-500", shadow: "shadow-cyan-200" },
    { key: "farming", label: t("about.sectors.farming", "Farming"), icon: <Sprout size={24} />, color: "bg-teal-500", shadow: "shadow-teal-200" },
    { key: "retail", label: t("about.sectors.retail", "Retail"), icon: <Store size={24} />, color: "bg-emerald-500", shadow: "shadow-emerald-200" },
    { key: "wholesale", label: t("about.sectors.wholesale", "Wholesale"), icon: <Users size={24} />, color: "bg-green-500", shadow: "shadow-green-200" },
  ];

  /* containerVariants and itemVariants removed as they were unused */

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-cyan-500/30 font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-cyan-100 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-teal-100 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-indigo-100 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative mb-16 text-center"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full border border-cyan-200 bg-white shadow-xl shadow-cyan-100/50 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-600">
              {t("about.title", "Our Story")}
            </span>
          </motion.div>
          <h1 className="mb-6 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-600 bg-clip-text text-transparent">
              {t("about.heading", "Dubai roots, global seafood expertise")}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 font-medium">
            {t(
              "about.intro",
              "Since 2016, we have established a strong presence in the seafood industry across the Middle East, Asia and Africa, operating in diverse sectors with a passion for quality."
            )}
          </p>
        </motion.div>

        {/* Vision & Values */}
        <div className="grid gap-6 lg:grid-cols-3 mb-16">
          <motion.div 
            whileHover={{ y: -5 }}
            className="lg:col-span-2 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-50 rounded-full blur-3xl group-hover:bg-cyan-100/50 transition-colors" />
            <h2 className="relative text-2xl font-black mb-6 flex items-center gap-4 text-slate-900">
              <div className="p-3 rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-200">
                <Sparkles size={28} />
              </div>
              {t("about.ourMissionTitle", "Our Mission")}
            </h2>
            <div className="relative space-y-5 text-slate-600 text-base leading-relaxed">
              <p className="font-semibold text-slate-800">
                {t(
                  "about.ourMissionText",
                  "We deliver the freshest seafood with complete transparency, exceptional service, and a commitment to sustainability."
                )}
              </p>
              <p>
                {t(
                  "about.ourMissionText2",
                  "SIMAK FRESH is built on trust, reliability, and the belief that premium seafood should be available to families, restaurants, and retailers across the region and beyond."
                )}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {["Transparency", "Sustainability", "Quality Control", "Direct Sourcing"].map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-2xl shadow-blue-200 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <h2 className="relative text-2xl font-black mb-6">{t("about.whyChooseUsTitle", "The SIMAK Promise")}</h2>
            <div className="relative space-y-8">
              {[
                { icon: <MapPin />, title: "Dubai Expertise" },
                { icon: <Globe />, title: "Global Network" },
                { icon: <ShieldCheck />, title: "Freshness Guaranteed" },
                { icon: <Award />, title: "Premium Sourcing" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md group-hover:bg-white group-hover:text-cyan-600 transition-all">
                    {item.icon}
                  </div>
                  <span className="text-lg font-bold">{item.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sectors Section */}
        <section className="mb-16 px-4 py-12 rounded-[3rem] bg-white border border-slate-100 shadow-2xl shadow-slate-100">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-4 text-slate-900">{t("about.sectorsTitle", "Our Global Presence")}</h2>
            <div className="h-2 w-20 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full" />
            <p className="mt-6 text-slate-500 font-medium max-w-2xl mx-auto">
              Operating across multiple continents to bring you the best from the ocean.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
            {sectorItems.map((item, idx) => (
              <motion.div 
                key={item.key}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -12 }}
                className="group flex flex-col items-center"
              >
                <div className={`mb-5 rounded-[1.5rem] ${item.color} p-6 text-white shadow-2xl ${item.shadow} group-hover:scale-110 transition-transform duration-500`}>
                  {item.icon}
                </div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Timeline/Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {[
            { value: "2016", label: "Founded", color: "text-blue-600", bg: "bg-blue-50" },
            { value: "3", label: "Continents", color: "text-cyan-600", bg: "bg-cyan-50" },
            { value: "50+", label: "Seafood Varieties", color: "text-teal-600", bg: "bg-teal-50" },
            { value: "10k+", label: "Happy Clients", color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.05 }}
              className={`p-8 rounded-[2rem] ${stat.bg} flex flex-col items-center justify-center text-center`}
            >
              <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Vibrant CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-10 sm:p-14 text-center shadow-3xl shadow-slate-400"
        >
          {/* Animated colorful blobs inside CTA */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-cyan-600/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[150%] bg-blue-600/20 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black mb-6 text-white">
              {t("about.joinUsTitle", "Experience the SIMAK difference.")}
            </h2>
            <p className="mx-auto max-w-xl text-lg text-slate-300 mb-10 font-medium">
              Join us on our journey to redefine seafood freshness, quality, and trust across the world.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/products"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-cyan-500 px-8 py-4 text-base font-black text-white hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/30"
              >
                <span className="relative z-10">{t("about.shopNow", "Explore our Shop")}</span>
                <ArrowRight size={20} className="relative z-10 group-hover:translate-x-2 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 text-base font-black text-white hover:text-cyan-400 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default AboutPage;


