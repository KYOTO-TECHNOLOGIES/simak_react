import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { fetchBanners, addBanner, updateBanner, deleteBanner, selectBanners, selectBannersLoading } from "./bannerSlice";
import type { BannerDto } from "./bannerApi";
import {
    Plus,
    Trash2,
    Edit2,
    Image as ImageIcon,
    Monitor,
    Smartphone,
    Save,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    GripVertical,
    Eye,
    Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BannersManagement: React.FC = () => {
    const dispatch = useAppDispatch();
    const banners = useAppSelector(selectBanners);
    const loading = useAppSelector(selectBannersLoading);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<BannerDto | null>(null);
    const [formData, setFormData] = useState({
        key: "",
        title: "",
        subtitle: "",
        description: "",
        tag: "",
        highlight: "",
        cta: "",
        is_active: true,
        position: "home_banner",
        sort_order: 0,
        start_at: "",
        end_at: "",
    });

    const [desktopImage, setDesktopImage] = useState<File | null>(null);
    const [mobileImage, setMobileImage] = useState<File | null>(null);
    const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
    const [mobilePreview, setMobilePreview] = useState<string | null>(null);
    const [previewBanner, setPreviewBanner] = useState<BannerDto | null>(null);

    useEffect(() => {
        dispatch(fetchBanners());
    }, [dispatch]);

    const resetForm = () => {
        setFormData({
            key: "",
            title: "",
            subtitle: "",            description: "",            tag: "",
            highlight: "",
            cta: "",
            is_active: true,
            position: "home_banner",
            sort_order: 0,
            start_at: "",
            end_at: "",
        });
        setEditingBanner(null);
        setDesktopImage(null);
        setMobileImage(null);
        setDesktopPreview(null);
        setMobilePreview(null);
    };

    const formatDateTimeLocal = (dateStr?: string | null) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "";
            // Format to YYYY-MM-DDTHH:mm
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
            return "";
        }
    };

    const handleOpenModal = (banner?: any) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                key: banner.key || "",
                title: banner.title || "",
                subtitle: banner.subtitle || "",
                description: banner.description || "",
                tag: banner.tag || "",
                highlight: banner.highlight || "",
                cta: banner.cta_text || "",
                is_active: banner.is_active,
                position: banner.position === "home_hero" ? "home_banner" : (banner.position || "home_banner"),
                sort_order: banner.order || 0,
                start_at: formatDateTimeLocal(banner.start_at),
                end_at: formatDateTimeLocal(banner.end_at),
            });
            setDesktopPreview(banner.desktop_image);
            setMobilePreview(banner.mobile_image);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: "desktop" | "mobile") => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === "desktop") {
                setDesktopImage(file);
                setDesktopPreview(URL.createObjectURL(file));
            } else {
                setMobileImage(file);
                setMobilePreview(URL.createObjectURL(file));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Manual validation for hidden file input
        if (!editingBanner && !desktopImage && formData.position !== 'popup') {
            alert("Please upload a desktop image for the banner.");
            return;
        }

        const data = new FormData();
        data.append("key", String(formData.key || ""));
        data.append("title", String(formData.title || ""));
        if (formData.subtitle) data.append("subtitle", String(formData.subtitle));
        if (formData.description) data.append("description", String(formData.description));
        if (formData.tag) data.append("tag", String(formData.tag));
        if (formData.highlight) data.append("highlight", String(formData.highlight));
        if (formData.cta) data.append("cta", String(formData.cta));
        data.append("is_active", String(!!formData.is_active));
        if (formData.position) data.append("position", String(formData.position));
        if (formData.sort_order !== undefined && formData.sort_order !== null) data.append("sort_order", String(formData.sort_order));
        if (formData.start_at) data.append("start_at", String(formData.start_at));
        if (formData.end_at) data.append("end_at", String(formData.end_at));

        if (desktopImage) data.append("desktop_image", desktopImage);
        if (mobileImage) data.append("mobile_image", mobileImage);

        try {
            if (editingBanner) {
                await dispatch(updateBanner({ id: editingBanner.id, payload: data })).unwrap();
                dispatch(fetchBanners());
            } else {
                await dispatch(addBanner(data)).unwrap();
                dispatch(fetchBanners());
            }
            handleCloseModal();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to save banner");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this banner?")) {
            try {
                await dispatch(deleteBanner(id)).unwrap();
            } catch (err: any) {
                console.error(err);
                alert(err.message || "Failed to delete banner");
            }
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Banner Management</h1>
                    <p className="text-slate-500 mt-1">Design and control your home page banners</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    <Plus size={20} /> Add New Banner
                </button>
            </div>

            {/* Banners List */}
            {loading && banners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Loader2 className="animate-spin text-slate-300 mb-4" size={40} />
                    <p className="text-slate-400 font-medium">Loading your banners...</p>
                </div>
            ) : banners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <ImageIcon className="text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-900">No Banners Found</h3>
                    <p className="text-slate-400 mb-6">Start by adding your first promotional banner.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-black hover:border-black transition-all"
                    >
                        Create Banner
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {[...banners].sort((a, b) => a.order - b.order).map((banner) => (
                            <motion.div
                                key={banner.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group relative bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                            >
                                {/* Image Preview Area */}
                                <div className="relative aspect-[16/9] overflow-hidden">
                                    <img
                                        src={banner.desktop_image}
                                        alt={banner.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />

                                    {/* Status Badge */}
                                    <div className="absolute top-4 left-4 flex items-center gap-2">
                                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${banner.is_active ? "bg-green-500 text-white" : "bg-slate-500 text-white"
                                            }`}>
                                            {banner.is_active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                            {banner.is_active ? "Active" : "Paused"}
                                        </span>
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white">
                                            {banner.position === 'home_banner' ? 'HOME BANNER' :
                                                banner.position === 'popup' ? 'POPUP' :
                                                    String(banner.position || "HOME BANNER").toUpperCase().replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Icon Badges */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg text-white" title="Desktop View">
                                            <Monitor size={14} />
                                        </div>
                                        {banner.mobile_image && (
                                            <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg text-white" title="Mobile View Available">
                                                <Smartphone size={14} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Text Overlay */}
                                    <div className="absolute bottom-6 left-6 right-6">
                                        {banner.tag && <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">{banner.tag}</p>}
                                        <h3 className="text-xl font-black text-white line-clamp-1">{banner.title}</h3>
                                        
                                        {/* Date Badges */}
                                        {(banner.start_at || banner.end_at) && (
                                            <div className="flex gap-2 mt-2">
                                                {banner.start_at && (
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-300 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                                        <Calendar size={10} />
                                                        S: {new Date(banner.start_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {banner.end_at && (
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-300 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                                        <Calendar size={10} />
                                                        E: {new Date(banner.end_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content & Actions */}
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <GripVertical size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Order: #{banner.order}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPreviewBanner(banner)}
                                                className="p-2.5 bg-slate-50 text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all active:scale-90"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(banner)}
                                                disabled={loading}
                                                className="p-2.5 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(banner.id)}
                                                disabled={loading}
                                                className="p-2.5 bg-slate-50 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal - Banner Form */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={handleCloseModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{editingBanner ? "Edit Banner" : "Add New Banner"}</h2>
                                    <p className="text-slate-500 text-sm mt-1">Fill in the details for your homepage highlight</p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Text Content */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Banner Key <span className="text-red-500">*</span></label>
                                            <input
                                                required
                                                value={formData.key}
                                                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                placeholder="e.g. banner_summer_sale"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Banner Title <span className="text-red-500">*</span></label>
                                            <input
                                                required
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                placeholder="e.g. Fresh King Prawns"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Subtitle</label>
                                            <input
                                                value={formData.subtitle}
                                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium placeholder:text-slate-300"
                                                placeholder="Short subtitle..."
                                            />
                                        </div>

                                        {formData.position !== 'popup' && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                                                <textarea
                                                    rows={3}
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium placeholder:text-slate-300"
                                                    placeholder="Full description..."
                                                />
                                            </div>
                                        )}

                                        {formData.position !== 'popup' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tag</label>
                                                    <input
                                                        value={formData.tag}
                                                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                        placeholder="e.g. SPECIAL"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Highlight</label>
                                                    <input
                                                        value={formData.highlight}
                                                        onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                        placeholder="e.g. 30% OFF"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">CTA</label>
                                                <input
                                                    value={formData.cta}
                                                    onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                    placeholder="e.g. Shop Now"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Banner Type</label>
                                                <select
                                                    value={formData.position}
                                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="home_banner">Home Banner</option>
                                                    <option value="popup">Popup</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sort Order</label>
                                                <input
                                                    type="number"
                                                    value={formData.sort_order}
                                                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                    placeholder="e.g. 2"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Active</label>
                                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        id="is_active"
                                                        checked={formData.is_active}
                                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                        className="w-5 h-5 accent-black rounded cursor-pointer"
                                                    />
                                                    <label htmlFor="is_active" className="text-sm font-bold text-slate-900 cursor-pointer">Visible on Home Page</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Start At</label>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.start_at}
                                                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">End At</label>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.end_at}
                                                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold placeholder:text-slate-300"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Images */}
                                    <div className="space-y-8">
                                        {/* Desktop Image */}
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                                <Monitor size={14} /> Desktop Image (1200x420)
                                            </label>
                                            <div
                                                className="relative aspect-[16/6] bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden group cursor-pointer"
                                                onClick={() => document.getElementById('desktop-input')?.click()}
                                            >
                                                {desktopPreview ? (
                                                    <img src={desktopPreview} className="w-full h-full object-cover" alt="Desktop preview" />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                                        <Plus size={32} />
                                                        <span className="text-xs font-bold mt-2">Upload Image</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <ImageIcon size={32} />
                                                </div>
                                                <input
                                                    id="desktop-input"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImageChange(e, "desktop")}
                                                />
                                            </div>
                                        </div>

                                        {/* Mobile Image */}
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                                <Smartphone size={14} /> Mobile Image (Optional - 600x600)
                                            </label>
                                            <div
                                                className="relative aspect-square max-w-[140px] sm:max-w-[170px] md:max-w-[200px] mx-auto bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden group cursor-pointer"
                                                onClick={() => document.getElementById('mobile-input')?.click()}
                                            >
                                                {mobilePreview ? (
                                                    <img src={mobilePreview} className="w-full h-full object-cover" alt="Mobile preview" />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                                        <Plus size={32} />
                                                        <span className="text-xs font-bold mt-2">Upload Mobile</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <Smartphone size={32} />
                                                </div>
                                                <input
                                                    id="mobile-input"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImageChange(e, "mobile")}
                                                />
                                            </div>
                                            <p className="text-[10px] text-center text-slate-400 font-medium">Auto-responsive fallback to desktop if omitted.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="mt-12 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        disabled={loading}
                                        className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={20} /> Save Banner
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewBanner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60"
                            onClick={() => setPreviewBanner(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 12 }}
                            className="relative w-full   bg-white rounded-[2rem] overflow-hidden shadow-2xl"
                        >
                            <div className="relative h-[420px] w-full">
                                <img src={previewBanner.desktop_image} alt={previewBanner.title} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent sm:via-black/40" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                <div className="absolute inset-0 z-10 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-24">
                                    <div className="max-w-2xl space-y-3">
                                        <div className="inline-flex items-center gap-2 mb-4">
                                            {previewBanner.highlight && (
                                                <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold uppercase tracking-wider rounded-full">
                                                    {previewBanner.highlight}
                                                </span>
                                            )}
                                            {previewBanner.tag && (
                                                <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
                                                    {previewBanner.tag}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white leading-[1.1] mb-3 tracking-tight">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                                                {previewBanner.title}
                                            </span>
                                        </h1>
                                        {previewBanner.subtitle && (
                                            <p className="text-sm sm:text-base text-slate-200 mb-4 max-w-lg leading-relaxed font-medium">
                                                {previewBanner.subtitle}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                            {(previewBanner.price_text || previewBanner.old_price_text) && (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider">
                                                        Starting at
                                                    </span>
                                                    <div className="flex items-baseline gap-2">
                                                        {previewBanner.price_text && (
                                                            <span className="text-3xl sm:text-4xl font-bold text-white">{previewBanner.price_text}</span>
                                                        )}
                                                        {previewBanner.old_price_text && (
                                                            <span className="text-lg text-slate-500 line-through decoration-2">{previewBanner.old_price_text}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {previewBanner.cta_text && (
                                                <button
                                                    onClick={() => { }}
                                                    className="group relative px-6 py-3 bg-cyan-600 text-white rounded-full font-bold text-sm sm:text-base shadow-lg shadow-cyan-600/30 overflow-hidden"
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        {previewBanner.cta_text}
                                                    </span>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewBanner(null)}
                                    className="absolute top-4 right-4 bg-white/80 rounded-full p-2 text-slate-600 hover:text-slate-900 z-20"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BannersManagement;
