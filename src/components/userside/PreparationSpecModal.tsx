import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Zap, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProductDto } from "../../features/admin/products/productApi";

interface PreparationSpecModalProps {
    product: ProductDto | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (preparationId: number, instructions: string) => Promise<void>;
    mode: "cart" | "checkout";
}

const PreparationSpecModal: React.FC<PreparationSpecModalProps> = ({
    product,
    isOpen,
    onClose,
    onConfirm,
    mode,
}) => {
    const { t } = useTranslation("product");
    const [selectedPreparationId, setSelectedPreparationId] = useState<number | null>(null);
    const [preparationInstructions, setPreparationInstructions] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    if (!product) return null;

    const handleConfirm = async () => {
        if (!selectedPreparationId) return;
        setIsProcessing(true);
        try {
            await onConfirm(selectedPreparationId, preparationInstructions);
            onClose();
            // Reset state for next time
            setSelectedPreparationId(null);
            setPreparationInstructions("");
        } catch (error) {
            console.error("Failed to confirm preparation specification:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">
                                    {t("details.preparationCleaning", "Preparation & Cleaning")}
                                </h2>
                                <p className="text-xs text-slate-500 font-bold mt-1">
                                    {product.name}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="overflow-y-auto no-scrollbar pr-1 flex-1 space-y-6">
                            <div className="grid grid-cols-1 gap-3">
                                {product.preparation_specifications?.map((spec) => (
                                    <div
                                        key={spec.id}
                                        className={`group flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 ${
                                            selectedPreparationId === spec.id
                                                ? "border-cyan-600 bg-cyan-50/50 shadow-md ring-4 ring-cyan-600/5"
                                                : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                                        }`}
                                    >
                                        <div className="flex gap-4 items-center">
                                            {/* Selection Radio */}
                                            <button
                                                onClick={() => setSelectedPreparationId(spec.id)}
                                                className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                                                style={{ borderColor: selectedPreparationId === spec.id ? '#0891b2' : '#cbd5e1', backgroundColor: selectedPreparationId === spec.id ? '#0891b2' : '#fff' }}
                                            >
                                                {selectedPreparationId === spec.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <button
                                                        onClick={() => setSelectedPreparationId(spec.id)}
                                                        className={`text-left font-black text-sm transition-colors ${
                                                            selectedPreparationId === spec.id ? "text-cyan-950" : "text-slate-900"
                                                        }`}
                                                    >
                                                        {spec.name}
                                                    </button>
                                                    {parseFloat(spec.extra_price || "0") > 0 && (
                                                        <span className="shrink-0 text-[10px] font-black px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-lg">
                                                            +AED {parseFloat(spec.extra_price).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {spec.description && (
                                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                        {spec.description}
                                                    </p>
                                                )}
                                            </div>

                                            {spec.image && (
                                                <div className="relative group/img w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden bg-slate-200/50 border border-slate-100">
                                                    <img
                                                        src={typeof spec.image === 'string' ? spec.image : URL.createObjectURL(spec.image as File)}
                                                        alt={spec.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedImage(typeof spec.image === 'string' ? spec.image : URL.createObjectURL(spec.image as File));
                                                        }}
                                                        className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center transition-all duration-300 opacity-0 group-hover/img:opacity-100"
                                                    >
                                                        <span className="bg-white/90 text-slate-900 text-[8px] font-black px-2 py-1 rounded-full shadow-lg backdrop-blur-sm">
                                                            Expand
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                                    {t("details.specialInstructions", "Special Instructions")}
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">({t("details.optional", "Optional")})</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={preparationInstructions}
                                    onChange={(e) => setPreparationInstructions(e.target.value)}
                                    placeholder={t("details.instructionsPlaceholder", "e.g. Cut into small pieces, no skin...")}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 pt-5 border-t border-slate-100 shrink-0 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all duration-300"
                            >
                                {t("common.cancel", "Cancel")}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedPreparationId || isProcessing}
                                className="flex-1 py-3.5 text-xs font-black text-white bg-cyan-600 hover:bg-cyan-700 rounded-2xl shadow-lg shadow-cyan-600/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                            >
                                {isProcessing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    mode === "checkout" ? <Zap size={16} className="fill-current" /> : <ShoppingCart size={16} />
                                )}
                                {isProcessing 
                                    ? t("common.processing", "Processing...") 
                                    : mode === "checkout" 
                                        ? t("card.confirmAndBuy", "Confirm & Buy") 
                                        : t("card.confirmAndAdd", "Confirm & Add")}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Expanded Image View */}
        <AnimatePresence>
            {expandedImage && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
                    onClick={() => setExpandedImage(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative max-w-4xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={expandedImage}
                            alt="Expanded view"
                            className="w-full h-auto max-h-[80vh] object-contain rounded-3xl shadow-2xl border-4 border-white/10"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};

export default PreparationSpecModal;
