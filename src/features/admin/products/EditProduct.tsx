import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UploadCloud, Trash2, Image as ImageIcon, Film, AlertCircle, Save, Link as LinkIcon, Eye } from "lucide-react";
import type { ProductDto, CategoryDto, ProductUnitDto } from "./productApi";
import { productsApi } from "./productApi";
import DeliveryTiersManager from "./DeliveryTiersManager";
import DiscountTiersManager from "./DiscountTiersManager";
import PreparationSpecsManager from "./PreparationSpecsManager";
import ProductLocationsField from "./ProductLocationsField";
import { extractProductLocationValues } from "./productLocationOptions";
import MediaLightbox, { type MediaItem } from "./MediaLightbox";

/* ─────────────────────────────────────────────
   Extended Interface for Form Handling
   ───────────────────────────────────────────── */
interface ProductFormValues extends Omit<Partial<ProductDto>, 'image'> {
    image?: string | FileList | null;
    new_gallery_images?: FileList;
    new_videos?: FileList;
    sortorder?: number;
    unit_id?: string;
}

/* ─────────────────────────────────────────────
   Wrapper Component: Handles Data Fetching
   ───────────────────────────────────────────── */
const EditProduct: React.FC = () => {
    const { id } = useParams();
    const productId = Number(id);
    const navigate = useNavigate();

    const [dto, setDto] = useState<ProductDto | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (isNaN(productId)) return;
        let cancelled = false;

        const fetchProduct = async () => {
            try {
                const data = await productsApi.details(productId);
                if (!cancelled) setDto(data);
            } catch (e: any) {
                if (!cancelled) setFetchError(e?.message || "Failed to load product");
            }
        };

        fetchProduct();
        return () => { cancelled = true; };
    }, [productId]);

    if (fetchError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FDFDFD]">
                <p className="text-rose-500 font-bold">{fetchError}</p>
                <button
                    onClick={() => navigate("/admin/products")}
                    className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold"
                >
                    Back to Products
                </button>
            </div>
        );
    }

    if (!dto) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
                <Loader2 className="animate-spin text-zinc-300" size={40} />
            </div>
        );
    }

    return <EditProductForm dto={dto} productId={productId} />;
};

/* ─────────────────────────────────────────────
   Form Component: Handles Logic & Submission
   ───────────────────────────────────────────── */
interface EditProductFormProps {
    dto: ProductDto;
    productId: number;
}

const EditProductForm: React.FC<EditProductFormProps> = ({ dto, productId }) => {
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    /* ── Categories from API ── */
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [catsLoading, setCatsLoading] = useState(false);
    const [units, setUnits] = useState<ProductUnitDto[]>([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState("");
    const [creatingUnit, setCreatingUnit] = useState(false);
    const [unitError, setUnitError] = useState<string | null>(null);

    useEffect(() => {
        setCatsLoading(true);
        productsApi.listCategories()
            .then((data) => setCategories(data))
            .catch(() => {})
            .finally(() => setCatsLoading(false));
    }, []);

    useEffect(() => {
        setUnitsLoading(true);
        productsApi.listUnits()
            .then((data) => setUnits(data))
            .catch(() => setUnitError("Failed to load product units."))
            .finally(() => setUnitsLoading(false));
    }, []);

    // Once categories are loaded, re-apply the category value so the select finds the matching option
    useEffect(() => {
        if (categories.length > 0 && dto?.category) {
            setValue("category", String(dto.category) as any);
        }
    }, [categories]);

    const [existingImages, setExistingImages] = useState(dto.images || []);
    const [existingVideos, setExistingVideos] = useState(dto.videos || []);
    const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
    const [removedVideoIds, setRemovedVideoIds] = useState<number[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [newVideoUrl, setNewVideoUrl] = useState("");
    const [newVideoTitle, setNewVideoTitle] = useState("");

    /* ── Lightbox ── */
    const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null);

    const openLightbox = (items: MediaItem[], index: number) => setLightbox({ items, index });
    const [selectedLocations, setSelectedLocations] = useState<string[]>(() =>
        extractProductLocationValues(
            dto.available_locations ?? dto.available_emirates ?? dto.service_areas
        )
    );

    const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<ProductFormValues>({
        defaultValues: dto
    });

    useEffect(() => {
        if (units.length === 0) return;
        const explicitUnitId = (dto as ProductDto & { unit_id?: number | null }).unit_id;
        const matchedUnit =
            typeof explicitUnitId === "number"
                ? units.find((unit) => unit.id === explicitUnitId)
                : units.find(
                    (unit) =>
                        unit.name.trim().toLowerCase() === String(dto.unit || "").trim().toLowerCase()
                );
        if (matchedUnit) {
            setValue("unit_id", String(matchedUnit.id), { shouldValidate: false });
        }
    }, [dto, units, setValue]);

    // NOTE: Removed useFieldArray for discount/delivery tiers - using new tier managers instead

    useEffect(() => {
        if (dto) {
            reset({
                ...dto,
                name: dto.name || "",
                description: dto.description || "",
                unit: dto.unit || "",
                unit_id: "",
                price: dto.price,
                discount_price: dto.discount_price || "",
                stock: dto.stock,
                category: String(dto.category) as any,
                sku: dto.sku || "",
                is_available: dto.is_available,
                expected_delivery_time: dto.expected_delivery_time || "",
                sortorder: (dto as any)?.sortorder ?? 1,
            });
            setExistingImages(dto.images || []);
            setExistingVideos(dto.videos || []);
            setRemovedImageIds([]);
            setRemovedVideoIds([]);
            setSelectedLocations(
                extractProductLocationValues(
                    dto.available_locations ?? dto.available_emirates ?? dto.service_areas
                )
            );
        }
    }, [dto, reset]);

    // Handle Frontend Validation failures to ensure silent blocking doesn't happen
    const onInvalid = (errors: any) => {
        console.error("Form Validation Errors:", errors);
        setValidationError("Please fill out all required fields correctly.");
    };

    const onSubmit = async (data: ProductFormValues) => {
        setValidationError(null);
        setSaveError(null);
        setIsSaving(true);
        try {
            const formData = new FormData();

            // Product fields
            formData.append("name", data.name || "");
            formData.append("description", data.description || "");
            formData.append("category", String(data.category));
            formData.append("price", String(data.price));
            formData.append("stock", String(data.stock));
            formData.append("is_available", data.is_available ? "True" : "False");
            if (data.discount_price) formData.append("discount_price", String(data.discount_price));
            else formData.append("discount_price", "");
            if (data.unit_id) formData.append("unit_id", String(data.unit_id));
            if (data.sku) formData.append("sku", data.sku);
            if (data.expected_delivery_time) formData.append("expected_delivery_time", data.expected_delivery_time);
            if (Number.isFinite(data.sortorder)) formData.append("sortorder", String(data.sortorder));
            formData.append("available_emirates", JSON.stringify(selectedLocations));

            // Main image
            if (data.image && data.image instanceof FileList && data.image.length > 0) {
                formData.append("image", data.image[0]);
            }

            // 1. Update product
            await productsApi.update(productId, formData);

            // 2. Delete removed gallery images
            await Promise.all(removedImageIds.map(id => productsApi.deleteProductImage(id)));

            // 3. Upload new gallery images
            if (data.new_gallery_images && data.new_gallery_images.length > 0) {
                await Promise.all(Array.from(data.new_gallery_images).map(file => {
                    const fd = new FormData();
                    fd.append("product", String(productId));
                    fd.append("image", file);
                    return productsApi.addProductImage(fd);
                }));
            }

            // 4. Delete removed videos
            await Promise.all(removedVideoIds.map(id => productsApi.deleteProductVideo(id)));

            // 5. Upload new video files
            if (data.new_videos && data.new_videos.length > 0) {
                await Promise.all(Array.from(data.new_videos).map(file => {
                    const fd = new FormData();
                    fd.append("product", String(productId));
                    fd.append("video_file", file);
                    return productsApi.addProductVideo(fd);
                }));
            }

            // 6. Add new video URL if provided
            if (newVideoUrl.trim()) {
                await productsApi.addProductVideo({
                    product: productId,
                    video_url: newVideoUrl.trim(),
                    title: newVideoTitle.trim() || undefined,
                });
            }

            navigate("/admin/products");
        } catch (err: any) {
            const msg = err?.response?.data?.detail
                || err?.response?.data?.error
                || (typeof err?.response?.data === 'string' ? err.response.data : null)
                || err?.message
                || "Failed to save changes";
            setSaveError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateUnit = async () => {
        const name = newUnitName.trim();
        if (!name) {
            setUnitError("Unit name is required.");
            return;
        }

        setCreatingUnit(true);
        setUnitError(null);
        try {
            const created = await productsApi.createUnit({ name });
            setUnits((prev) => [...prev, created]);
            setValue("unit_id", String(created.id), { shouldValidate: true, shouldDirty: true });
            setNewUnitName("");
            setShowAddUnit(false);
        } catch (err: any) {
            const message =
                err?.response?.data?.detail ||
                err?.response?.data?.name?.[0] ||
                err?.message ||
                "Failed to create unit.";
            setUnitError(message);
        } finally {
            setCreatingUnit(false);
        }
    };

    const toggleLocation = (location: string) => {
        setSelectedLocations((prev) =>
            Array.isArray(prev)
                ? prev.includes(location)
                    ? prev.filter((item) => item !== location)
                    : [...prev, location]
                : [location]
        );
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 space-y-8 animate-in slide-in-from-right duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/admin/products")} className="p-2 hover:bg-[#F4F4F5] rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Edit Product</h1>
                        <p className="text-xs md:text-sm text-[#71717A]">Update inventory, pricing tiers, and media.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/products")}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all active:scale-95"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        form="edit-product-form"
                        disabled={isSaving}
                        className="flex-1 sm:flex-none group relative px-7 py-2.5 bg-black hover:bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-black/20 disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-white/10"
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
                        )}
                        <span className="relative">{isSaving ? "Saving..." : "Save Product"}</span>
                    </button>
                </div>
            </div>

            {/* Error Displays */}
            {(saveError || validationError) && (
                <div className="max-w-4xl mx-auto bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-200 flex items-start gap-3">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold">Failed to save changes</p>
                        <p className="opacity-90">{validationError || saveError}</p>
                    </div>
                </div>
            )}

            <form id="edit-product-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="max-w-4xl mx-auto space-y-8 pb-12">

                {/* Basic Info */}
                <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-lg font-bold">Basic Information</h2>
                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-3 py-1 rounded-lg w-fit">Slug: {dto.slug}</span>
                    </div>
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Product Name</label>
                            <input
                                {...register("name", { required: "Name is required" })}
                                className={`w-full px-4 py-3 bg-[#FAFAFA] border-2 rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${errors.name ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-100' : 'border-transparent focus:border-black focus:ring-black/5'}`}
                                placeholder="Product name"
                            />
                            {errors.name && <p className="text-rose-500 text-[10px] font-bold">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Description</label>
                            <textarea
                                {...register("description", { required: "Description is required" })}
                                className={`w-full px-4 py-3 bg-[#FAFAFA] border-2 rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all h-32 resize-none ${errors.description ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-100' : 'border-transparent focus:border-black focus:ring-black/5'}`}
                                placeholder="Describe the product..."
                            />
                            {errors.description && <p className="text-rose-500 text-[10px] font-bold">{errors.description.message}</p>}
                        </div>
                    </div>
                </section>

                {/* Pricing & Inventory */}
                <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-lg font-bold">Pricing & Inventory</h2>
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg w-fit">
                            Final Price: AED {dto.final_price}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Price (AED)</label>
                            <input
                                type="number" step="0.01"
                                {...register("price", { required: "Price is required" })}
                                className="w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Discount Price</label>
                            <input
                                type="number" step="0.01"
                                {...register("discount_price")}
                                className="w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Stock</label>
                            <input
                                type="number"
                                {...register("stock", { required: "Stock is required", min: 0 })}
                                className="w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Advanced Tiers Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Discount Tiers Manager */}
                    <DiscountTiersManager
                        productId={productId}
                        finalPrice={dto.final_price}
                    />

                    {/* Delivery Tiers Manager */}
                    <DeliveryTiersManager
                        productId={productId}
                    />
                </div>

                <PreparationSpecsManager
                    productId={productId}
                />

                {/* Organization */}
                <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold">Organization</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Category</label>
                            <select
                                {...register("category", { required: "Category is required" })}
                                disabled={catsLoading}
                                className={`w-full px-4 py-3 bg-[#FAFAFA] border-2 rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${errors.category ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-100' : 'border-transparent focus:border-black focus:ring-black/5'}`}
                            >
                                <option value="">{catsLoading ? "Loading..." : "— Select category —"}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {errors.category && <p className="text-rose-500 text-[10px] font-bold">{errors.category.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Unit</label>
                            <div className="space-y-3">
                                <select
                                    {...register("unit_id")}
                                    disabled={unitsLoading}
                                    className="w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                                >
                                    <option value="">
                                        {unitsLoading ? "Loading units..." : "— Select unit —"}
                                    </option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={String(unit.id)}>
                                            {unit.name}
                                        </option>
                                    ))}
                                </select>
                                {dto.unit && !units.some((unit) => unit.name.trim().toLowerCase() === String(dto.unit).trim().toLowerCase()) && (
                                    <p className="text-[11px] text-amber-600">
                                        Current unit "{dto.unit}" is not in the unit list. Add it below to keep it synced.
                                    </p>
                                )}
                                {unitError && <p className="text-[10px] font-bold text-rose-500">{unitError}</p>}
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddUnit((prev) => !prev);
                                            setUnitError(null);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                                    >
                                        Add unit
                                    </button>
                                    <span className="text-xs text-zinc-500">
                                        Units are loaded from the database.
                                    </span>
                                </div>
                                {showAddUnit && (
                                    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:flex-row">
                                        <input
                                            value={newUnitName}
                                            onChange={(e) => setNewUnitName(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                                            placeholder="e.g. box, tray, 500g"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCreateUnit}
                                                disabled={creatingUnit}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                                            >
                                                {creatingUnit ? <Loader2 size={16} className="animate-spin" /> : "Save unit"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddUnit(false);
                                                    setNewUnitName("");
                                                    setUnitError(null);
                                                }}
                                                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-600 hover:bg-white"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">SKU</label>
                            <input
                                {...register("sku")}
                                className="w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[#A1A1AA]">Sort Order</label>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                {...register("sortorder", {
                                    valueAsNumber: true,
                                    min: { value: 1, message: "Sort order must be at least 1" },
                                    validate: (v) =>
                                        v == null || Number.isInteger(v) || "Sort order must be a whole number",
                                })}
                                className={`w-full px-4 py-3 bg-[#FAFAFA] border-2 rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${errors.sortorder ? "border-rose-200 focus:border-rose-400 focus:ring-rose-100" : "border-transparent focus:border-black focus:ring-black/5"}`}
                                placeholder="1"
                            />
                            {errors.sortorder && (
                                <p className="text-rose-500 text-[10px] font-bold">
                                    {String(errors.sortorder.message)}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            {...register("is_available")}
                            className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <label className="text-sm font-medium cursor-pointer">Available for purchase</label>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-[#A1A1AA]">Expected Delivery Time</label>
                        <input
                            {...register("expected_delivery_time")}
                            placeholder="e.g. 2-3 business days"
                            className="w-full px-4 py-3 bg-[#FAFAFA] border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                        />
                    </div>
                </section>

                <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold">Availability by Location</h2>
                    <ProductLocationsField
                        selectedValues={selectedLocations}
                        onToggle={toggleLocation}
                    />
                </section>

                {/* Media Section */}
                <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-8">
                    <h2 className="text-lg font-bold">Product Media</h2>

                    {/* Main Cover Image */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ImageIcon size={16} /> Main Cover Image</h3>
                        <MainImageUpload register={register} watch={watch} existingImageUrl={dto.image || undefined} />
                    </div>

                    <hr className="border-slate-100" />

                    {/* Gallery Images */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ImageIcon size={16} /> Gallery Images</h3>

                        {/* Existing Images */}
                        {existingImages.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {existingImages.map((img, idx) => {
                                    const galleryItems: MediaItem[] = existingImages.map(i => ({ id: i.id, type: "image", src: i.image }));
                                    return (
                                        <div key={img.id} className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shrink-0 group">
                                            <img src={img.image} alt="Gallery" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                                <button
                                                    type="button"
                                                    onClick={() => openLightbox(galleryItems, idx)}
                                                    className="bg-white/90 text-slate-700 p-1.5 rounded-md"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRemovedImageIds(prev => [...prev, img.id]);
                                                        setExistingImages(prev => prev.filter(i => i.id !== img.id));
                                                    }}
                                                    className="bg-white/90 text-rose-500 p-1.5 rounded-md"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add New Images Input */}
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer">
                            <input type="file" multiple accept="image/*" {...register("new_gallery_images")} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-bold text-cyan-600">Select new gallery images to add</p>
                            <p className="text-xs text-slate-400 mt-1">{(watch("new_gallery_images")?.length || 0)} files selected</p>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Videos */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Film size={16} /> Videos</h3>

                        {existingVideos.length > 0 && (
                            <div className="flex flex-col gap-2">
                                {existingVideos.map((vid) => {
                                    const videoItems: MediaItem[] = existingVideos
                                        .filter(v => v.video_url || v.video_file)
                                        .map(v => ({ id: v.id, type: "video", src: (v.video_url || v.video_file)!, title: v.title || undefined }));
                                    const videoIdx = videoItems.findIndex(v => v.id === vid.id);
                                    return (
                                        <div key={vid.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700 truncate">{vid.title || "Product Video"}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {(vid.video_url || vid.video_file) && videoIdx !== -1 && (
                                                    <button type="button" onClick={() => openLightbox(videoItems, videoIdx)} className="text-slate-500 p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                                                        <Eye size={15} />
                                                    </button>
                                                )}
                                                <a href={(vid.video_url || vid.video_file) || undefined} target="_blank" rel="noreferrer" className="text-cyan-600 p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium">
                                                    ↗
                                                </a>
                                                <button type="button" onClick={() => {
                                                    setRemovedVideoIds(prev => [...prev, vid.id]);
                                                    setExistingVideos(prev => prev.filter(v => v.id !== vid.id));
                                                }} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer">
                            <input type="file" multiple accept="video/*" {...register("new_videos")} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-bold text-cyan-600">Select new videos to upload</p>
                            <p className="text-xs text-slate-400 mt-1">{(watch("new_videos")?.length || 0)} files selected</p>
                        </div>

                        {/* Add Video by URL */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-[#A1A1AA] flex items-center gap-1"><LinkIcon size={12} /> Or add by URL</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={newVideoUrl}
                                    onChange={e => setNewVideoUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 px-4 py-2.5 bg-[#FAFAFA] border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                                />
                                <input
                                    type="text"
                                    value={newVideoTitle}
                                    onChange={e => setNewVideoTitle(e.target.value)}
                                    placeholder="Title (optional)"
                                    className="sm:w-44 px-4 py-2.5 bg-[#FAFAFA] border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>
                    </div>

                </section>


            </form>

            {/* Media Lightbox */}
            {lightbox && (
                <MediaLightbox
                    items={lightbox.items}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onChange={(i) => setLightbox(prev => prev ? { ...prev, index: i } : null)}
                />
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main Image Sub-component
   ───────────────────────────────────────────── */
const MainImageUpload = ({ register, watch, existingImageUrl }: any) => {
    const files = watch("image");
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (files && files.length > 0 && files[0] instanceof Blob) {
            const objectUrl = URL.createObjectURL(files[0]);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [files]);

    const activePreview = preview || existingImageUrl;

    return (
        <div className={`border-2 border-dashed border-[#E4E4E7] rounded-xl flex flex-col items-center justify-center text-center bg-[#FAFAFA] relative cursor-pointer overflow-hidden ${activePreview ? "p-0" : "p-10"}`}>
            <input type="file" accept="image/*" {...register("image")} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
            {activePreview ? (
                <div className="relative w-full h-48 sm:h-72">
                    <img src={activePreview} alt="Main Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        <span className="bg-white text-black px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold shadow-lg">Replace Image</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="w-12 h-12 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm"><UploadCloud size={24} className="text-zinc-400" /></div>
                    <p className="text-sm font-bold text-slate-600">Click to upload main product image</p>
                </div>
            )}
        </div>
    );
};

export default EditProduct;
