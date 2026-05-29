import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Loader2,
    UploadCloud,
    Plus,
    Trash2,
    ImageIcon,
    Film,
    Link as LinkIcon,
} from "lucide-react";
import {
    productsActions,
    selectProductsStatus,
    selectProductsError,
} from "./productsSlice";
import { productsApi, type CategoryDto } from "./productApi";
import ProductLocationsField from "./ProductLocationsField";
import DeliveryTiersManager from "./DeliveryTiersManager";
import DiscountTiersManager from "./DiscountTiersManager";
import PreparationSpecsManager from "./PreparationSpecsManager";
import type { DeliveryTierDto, DiscountTierDto } from "./tierApi";
import type { PreparationSpecificationDto } from "./productApi";

/* ────────────────────── Types ────────────────────── */

interface ProductFormData {
    name: string;
    slug: string;
    description: string;
    category: string;
    unit: string;
    price: string;
    discount_price: string;
    stock: number;
    is_available: boolean;
    sku: string;
    expected_delivery_time: string;
}

interface ImageRow {
    id: string;
    file: File | null;
    preview: string | null;
    is_feature: boolean;
}

interface VideoRow {
    id: string;
    file: File | null;
    video_url: string;
    title: string;
}

/* ────────────────────── Helpers ────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 10);

const inputClass =
    "w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all";

const labelClass = "text-xs font-bold uppercase text-[#A1A1AA]";

/* ════════════════════════════════════════════════════
   ADD PRODUCT – MAIN COMPONENT
   ════════════════════════════════════════════════════ */

const AddProduct: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const status = useSelector(selectProductsStatus);
    const error = useSelector(selectProductsError);
    const submitted = useRef(false);

    /* ── Categories from API ── */
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [catsLoading, setCatsLoading] = useState(false);

    useEffect(() => {
        setCatsLoading(true);
        productsApi.listCategories()
            .then((data) => setCategories(data))
            .catch(() => {})
            .finally(() => setCatsLoading(false));
    }, []);

    /* ── react-hook-form ── */
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ProductFormData>({
        defaultValues: {
            is_available: true,
            stock: 0,
            slug: "",
            unit: "",
            expected_delivery_time: "",
            discount_price: "",
            sku: "",
        },
    });

    /* ── Dynamic image rows ── */
    const [imageRows, setImageRows] = useState<ImageRow[]>([
        { id: uid(), file: null, preview: null, is_feature: false },
    ]);

    const addImageRow = () =>
        setImageRows((prev) => [
            ...prev,
            { id: uid(), file: null, preview: null, is_feature: false },
        ]);

    const removeImageRow = (id: string) =>
        setImageRows((prev) => prev.filter((r) => r.id !== id));

    const updateImageFile = useCallback((id: string, file: File | null) => {
        setImageRows((prev) =>
            prev.map((r) => {
                if (r.id !== id) return r;
                if (r.preview) URL.revokeObjectURL(r.preview);
                return {
                    ...r,
                    file,
                    preview: file ? URL.createObjectURL(file) : null,
                };
            })
        );
    }, []);

    const toggleFeature = (id: string) =>
        setImageRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, is_feature: !r.is_feature } : r))
        );

    /* ── Dynamic video rows ── */
    const [videoRows, setVideoRows] = useState<VideoRow[]>([
        { id: uid(), file: null, video_url: "", title: "" },
    ]);

    const addVideoRow = () =>
        setVideoRows((prev) => [
            ...prev,
            { id: uid(), file: null, video_url: "", title: "" },
        ]);

    const removeVideoRow = (id: string) =>
        setVideoRows((prev) => prev.filter((r) => r.id !== id));

    const updateVideoField = (
        id: string,
        field: "video_url" | "title",
        value: string
    ) =>
        setVideoRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );

    const updateVideoFile = (id: string, file: File | null) =>
        setVideoRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, file } : r))
        );

    /* ── Tiers State ── */
    const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTierDto[]>([]);
    const [discountTiers, setDiscountTiers] = useState<DiscountTierDto[]>([]);
    const [preparationSpecs, setPreparationSpecs] = useState<Partial<PreparationSpecificationDto>[]>([]);

    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

    const toggleLocation = useCallback((location: string) => {
        setSelectedLocations((prev) =>
            Array.isArray(prev)
                ? prev.includes(location)
                    ? prev.filter((item) => item !== location)
                    : [...prev, location]
                : [location]
        );
    }, []);

    /* ── Main image state ── */
    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainPreview, setMainPreview] = useState<string | null>(null);

    const handleMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        if (mainPreview) URL.revokeObjectURL(mainPreview);
        setMainImage(f);
        setMainPreview(f ? URL.createObjectURL(f) : null);
    };

    /* ── SUBMIT ── */
    const onSubmit = (data: ProductFormData) => {
        const fd = new FormData();

        fd.append("name", data.name);
        if (data.slug) fd.append("slug", data.slug);
        fd.append("description", data.description);
        fd.append("category", String(data.category));
        if (data.unit) fd.append("unit", data.unit);
        fd.append("price", data.price);
        if (data.discount_price) fd.append("discount_price", data.discount_price);
        fd.append("stock", String(data.stock));
        fd.append("is_available", data.is_available ? "True" : "False");
        if (data.sku) fd.append("sku", data.sku);
        if (data.expected_delivery_time)
            fd.append("expected_delivery_time", data.expected_delivery_time);

        fd.append("available_emirates", JSON.stringify(selectedLocations));

        // Main image
        if (mainImage) fd.append("image", mainImage);

        // Prepare additional data for orchestration in Saga
        const additionalData = {
            images: imageRows
                .filter((r) => r.file)
                .map((r) => ({ file: r.file, is_feature: r.is_feature })),
            videos: videoRows
                .filter((r) => r.file || r.video_url)
                .map((r) => ({
                    file: r.file,
                    video_url: r.video_url,
                    title: r.title,
                })),
            deliveryTiers,
            discountTiers,
            preparationSpecs,
        };

        submitted.current = true;
        // @ts-ignore
        dispatch(productsActions.createProductRequest({ formData: fd, ...additionalData }));
    };

    /* ── Lifecycle ── */
    useEffect(() => {
        dispatch(productsActions.resetStatus());
        return () => {
            dispatch(productsActions.resetStatus());
        };
    }, [dispatch]);

    useEffect(() => {
        if (status === "succeeded" && submitted.current) navigate("/admin/products");
    }, [status, navigate]);

    /* cleanup previews on unmount */
    useEffect(() => {
        return () => {
            if (mainPreview) URL.revokeObjectURL(mainPreview);
            imageRows.forEach((r) => {
                if (r.preview) URL.revokeObjectURL(r.preview);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ════════════════════════════════════════════
       JSX
       ════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 space-y-8 animate-in slide-in-from-right duration-500">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admin/products")}
                        className="p-2 hover:bg-[#F4F4F5] rounded-full transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                            Add New Product
                        </h1>
                        <p className="text-xs md:text-sm text-[#71717A]">
                            Create a new item in your inventory.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/products")}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-product-form"
                        disabled={status === "loading"}
                        className="flex-1 sm:flex-none group relative px-7 py-2.5 bg-black hover:bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-black/20 disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-white/10"
                    >
                        {status === "loading" ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
                        )}
                        <span className="relative">
                            {status === "loading" ? "Creating..." : "Create Product"}
                        </span>
                    </button>
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="bg-cyan-50 text-cyan-600 p-4 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            {/* ───── FORM ───── */}
            <form
                id="add-product-form"
                onSubmit={handleSubmit(onSubmit)}
                className="max-w-4xl mx-auto space-y-8"
            >
                {/* ─── 1. Basic Info ─── */}
                <Section title="Basic Information">
                    <div className="grid gap-6">
                        <Field label="Product Name" error={errors.name?.message}>
                            <input
                                {...register("name", { required: "Name is required" })}
                                className={inputClass}
                                placeholder="e.g. Fresh Atlantic Salmon"
                            />
                        </Field>

                        <Field label="Slug (optional)">
                            <input
                                {...register("slug")}
                                className={inputClass}
                                placeholder="auto-generated if left blank"
                            />
                        </Field>

                        <Field
                            label="Description"
                            error={errors.description?.message}
                        >
                            <textarea
                                {...register("description", {
                                    required: "Description is required",
                                })}
                                className={`${inputClass} h-32 resize-none`}
                                placeholder="Detailed description of the product..."
                            />
                        </Field>
                    </div>
                </Section>

                {/* ─── 2. Pricing & Inventory ─── */}
                <Section title="Pricing & Inventory">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Field label="Price" error={errors.price?.message}>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#A1A1AA]">
                                    AED
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register("price", {
                                        required: "Price is required",
                                    })}
                                    className={`${inputClass} pl-14`}
                                    placeholder="0.00"
                                />
                            </div>
                        </Field>

                        <Field label="Discount Price (opt)">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#A1A1AA]">
                                    AED
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register("discount_price")}
                                    className={`${inputClass} pl-14`}
                                    placeholder="0.00"
                                />
                            </div>
                        </Field>

                        <Field label="Stock Quantity" error={errors.stock?.message}>
                            <input
                                type="number"
                                {...register("stock", {
                                    required: "Stock is required",
                                    min: 0,
                                })}
                                className={inputClass}
                                placeholder="0"
                            />
                        </Field>
                    </div>
                </Section>

                {/* ─── 3. Organisation ─── */}
                <Section title="Organization">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Category" error={errors.category?.message}>
                            <select
                                {...register("category", {
                                    required: "Category is required",
                                })}
                                disabled={catsLoading}
                                className={inputClass}
                            >
                                <option value="">{catsLoading ? "Loading..." : "— Select category —"}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Unit" error={errors.unit?.message}>
                            <select
                                {...register("unit", { required: "Unit is required" })}
                                className={inputClass}
                            >
                                <option value="">— Select unit —</option>
                                <option value="piece">Piece</option>
                                <option value="kg">Kg</option>
                                <option value="100g">100g</option>
                            </select>
                        </Field>

                        <Field label="SKU">
                            <input
                                {...register("sku")}
                                className={inputClass}
                                placeholder="e.g., FISH-001"
                            />
                        </Field>
                    </div>

                    <Field label="Expected Delivery Time">
                        <input
                            {...register("expected_delivery_time")}
                            className={inputClass}
                            placeholder="e.g., '30-60 mins', 'Next Day', '2-3 Business Days'"
                        />
                    </Field>

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            {...register("is_available")}
                            className="w-5 h-5 accent-black rounded cursor-pointer"
                        />
                        <label className="text-sm font-medium cursor-pointer">
                            Available for purchase
                        </label>
                    </div>
                </Section>

                <Section title="Availability by Location">
                    <ProductLocationsField
                        selectedValues={selectedLocations}
                        onToggle={toggleLocation}
                    />
                </Section>

                {/* ─── Tiers Grid ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Discount Tiers Manager */}
                    <DiscountTiersManager
                        productId={0}
                        finalPrice={watch("price") || 0}
                        onTiersChange={(tiers) => {
                            setDiscountTiers(tiers);
                            console.log("Discount tiers updated:", tiers);
                        }}
                    />

                    {/* Delivery Tiers Manager */}
                    <DeliveryTiersManager
                        productId={0}
                        onTiersChange={(tiers) => {
                            setDeliveryTiers(tiers);
                            console.log("Delivery tiers updated:", tiers);
                        }}
                    />
                </div>

                <PreparationSpecsManager
                    productId={0}
                    onSpecsChange={(specs) => {
                        setPreparationSpecs(specs);
                        console.log("Preparation specs updated:", specs);
                    }}
                />

                {/* ─── 4. Main Image ─── */}
                <Section title="Main Image">
                    <div
                        className={`border-2 border-dashed border-[#E4E4E7] rounded-xl flex flex-col items-center justify-center text-center bg-[#FAFAFA] hover:bg-[#F4F4F5] transition-colors relative cursor-pointer overflow-hidden ${mainPreview ? "p-0" : "p-8 gap-4"}`}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleMainImage}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {mainPreview ? (
                            <div className="relative w-full h-64">
                                <img
                                    src={mainPreview}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <p className="text-white font-bold text-sm">
                                        Click to change image
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-[#71717A]">
                                    <UploadCloud size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">
                                        Click to upload main image
                                    </p>
                                    <p className="text-xs text-[#A1A1AA]">
                                        SVG, PNG, JPG or GIF (max. 5MB)
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </Section>

                {/* ─── 5. Product Images ─── */}
                <Section title="Product Images">
                    <div className="space-y-4">
                        {/* Table header */}
                        <div className="hidden sm:grid grid-cols-[1fr_80px_60px] gap-4 text-[10px] font-bold uppercase text-[#A1A1AA] tracking-widest px-1">
                            <span>Image</span>
                            <span className="text-center">Is Feature</span>
                            <span className="text-center">Delete</span>
                        </div>

                        {imageRows.map((row) => (
                            <div
                                key={row.id}
                                className="grid grid-cols-1 sm:grid-cols-[1fr_80px_60px] gap-4 items-center bg-[#FAFAFA] rounded-xl p-4 border border-[#EEEEEE]"
                            >
                                {/* File picker / preview */}
                                <div className="flex items-center gap-3">
                                    {row.preview ? (
                                        <img
                                            src={row.preview}
                                            alt="thumb"
                                            className="w-14 h-14 rounded-lg object-cover border border-[#EEEEEE]"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-white border border-dashed border-[#D4D4D8] flex items-center justify-center text-[#A1A1AA]">
                                            <ImageIcon size={20} />
                                        </div>
                                    )}
                                    <label className="flex-1 relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                updateImageFile(
                                                    row.id,
                                                    e.target.files?.[0] ?? null
                                                )
                                            }
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <span className="block px-4 py-2.5 bg-white rounded-lg text-xs font-medium text-[#71717A] border border-[#EEEEEE] hover:border-black/20 transition-colors cursor-pointer truncate">
                                            {row.file
                                                ? row.file.name
                                                : "Choose file…"}
                                        </span>
                                    </label>
                                </div>

                                {/* Is feature */}
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={row.is_feature}
                                        onChange={() => toggleFeature(row.id)}
                                        className="w-4 h-4 accent-black cursor-pointer"
                                    />
                                </div>

                                {/* Remove */}
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeImageRow(row.id)}
                                        className="p-2 text-[#A1A1AA] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addImageRow}
                            className="flex items-center gap-2 text-xs font-bold text-black hover:text-black/70 transition-colors"
                        >
                            <Plus size={14} /> Add another Product Image
                        </button>
                    </div>
                </Section>

                {/* ─── 6. Product Videos ─── */}
                <Section title="Product Videos">
                    <div className="space-y-4">
                        {/* Table header */}
                        <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_60px] gap-4 text-[10px] font-bold uppercase text-[#A1A1AA] tracking-widest px-1">
                            <span>Video File</span>
                            <span>Video URL</span>
                            <span>Title</span>
                            <span className="text-center">Delete</span>
                        </div>

                        {videoRows.map((row) => (
                            <div
                                key={row.id}
                                className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_60px] gap-4 items-center bg-[#FAFAFA] rounded-xl p-4 border border-[#EEEEEE]"
                            >
                                {/* File */}
                                <label className="relative">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) =>
                                            updateVideoFile(
                                                row.id,
                                                e.target.files?.[0] ?? null
                                            )
                                        }
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <span className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg text-xs font-medium text-[#71717A] border border-[#EEEEEE] hover:border-black/20 transition-colors cursor-pointer truncate">
                                        <Film size={14} className="flex-shrink-0" />
                                        {row.file ? row.file.name : "Choose file…"}
                                    </span>
                                </label>

                                {/* URL */}
                                <div className="relative">
                                    <LinkIcon
                                        size={14}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
                                    />
                                    <input
                                        type="text"
                                        value={row.video_url}
                                        onChange={(e) =>
                                            updateVideoField(
                                                row.id,
                                                "video_url",
                                                e.target.value
                                            )
                                        }
                                        className={`${inputClass} pl-9`}
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>

                                {/* Title */}
                                <input
                                    type="text"
                                    value={row.title}
                                    onChange={(e) =>
                                        updateVideoField(
                                            row.id,
                                            "title",
                                            e.target.value
                                        )
                                    }
                                    className={inputClass}
                                    placeholder="Video title"
                                />

                                {/* Remove */}
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeVideoRow(row.id)}
                                        className="p-2 text-[#A1A1AA] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addVideoRow}
                            className="flex items-center gap-2 text-xs font-bold text-black hover:text-black/70 transition-colors"
                        >
                            <Plus size={14} /> Add another Product Video
                        </button>
                    </div>
                </Section>


            </form>
        </div>
    );
};

/* ════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
   ════════════════════════════════════════════════════ */

const Section = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
    </section>
);

const Field = ({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) => (
    <div className="space-y-2">
        <label className={labelClass}>{label}</label>
        {children}
        {error && <p className="text-cyan-500 text-xs">{error}</p>}
    </div>
);

export default AddProduct;
