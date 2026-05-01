import { call, put, select, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { productsApi } from "./productApi";
import { productsActions } from "./productsSlice";
import type { Product } from "./productsSlice";
import type { ProductDto, CategoryDto } from "./productApi";
import type { RootState } from "../../../app/store";
import type { Category } from "./productsSlice";

/* ── Map backend DTO → UI Product ── */
function mapProductDtoToProduct(dto: ProductDto): Product {
    const fallbackImage =
        dto.images?.find((img) => img.is_feature) ?? dto.images?.[0];

    let status: Product["status"] = "Active";
    if (!dto.is_available) status = "Draft";
    else if (dto.stock <= 0) status = "Out of Stock";

    const price = parseFloat(dto.price) || 0;
    const discountPrice = dto.discount_price ? parseFloat(dto.discount_price) : null;
    const finalPrice = parseFloat(dto.final_price) || price;

    return {
        id: dto.id,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        categoryId: dto.category,
        categoryName: dto.category_name ?? "Uncategorized",
        price,
        discountPrice,
        finalPrice,
        sku: dto.sku,
        stock: dto.stock,
        isAvailable: dto.is_available,
        status,
        imageUrl: dto.image ?? fallbackImage?.image ?? null,
        images: Array.isArray(dto.images)
            ? dto.images.map((img) => ({
                id: img.id,
                url: img.image,
                isFeature: img.is_feature,
            }))
            : [],
        videos: Array.isArray(dto.videos)
            ? dto.videos.map((vid) => ({
                id: vid.id,
                url: vid.video_file || vid.video_url || "",
                title: vid.title,
            }))
            : [],
        averageRating: dto.average_rating ?? 0,
        totalReviews: dto.total_reviews ?? 0,
        expectedDeliveryTime: dto.expected_delivery_time ?? null,
        discountTiers: Array.isArray(dto.discount_tiers)
            ? dto.discount_tiers.map((t) => ({
                id: t.id,
                minQuantity: t.min_quantity,
                discountPercentage: parseFloat(String(t.discount_percentage)) || 0,
            }))
            : [],
        deliveryTiers: Array.isArray(dto.delivery_tiers)
            ? dto.delivery_tiers.map((t) => ({
                id: t.id,
                minQuantity: t.min_quantity,
                deliveryDays: t.delivery_days || 0,
            }))
            : [],
        preparation_specifications: Array.isArray(dto.preparation_specifications)
            ? dto.preparation_specifications.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                image: s.image,
                extra_price: s.extra_price,
                sort_order: s.sort_order,
                is_active: s.is_active,
            }))
            : [],
        createdAt: dto.created_at,
        updatedAt: dto.updated_at,
    };
}

/* ── Map backend DTO → UI Category ── */
function mapCategoryDtoToCategory(dto: CategoryDto): Category {
    return {
        id: dto.id,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parent: dto.parent,
        image: dto.image,
        productCount: dto.product_count ?? 0,
    };
}

/** Normalize any API shape → Product[] */
function normalizeProducts(payload: any): Product[] {
    if (Array.isArray(payload?.results)) {
        return payload.results.map(mapProductDtoToProduct);
    }
    if (Array.isArray(payload)) return payload.map(mapProductDtoToProduct);
    if (Array.isArray(payload?.data))
        return payload.data.map(mapProductDtoToProduct);
    return [];
}

function* fetchProductsWorker(
    action: ReturnType<typeof productsActions.fetchProductsRequest>
): SagaIterator {
    try {
        const auth: any = yield select((state: RootState) => (state as any).auth);
        if (auth && auth.isAuthenticated === false) {
            yield put(productsActions.fetchProductsFailure("User not authenticated"));
            return;
        }

        const raw: any = yield call(productsApi.list, action.payload);
        const totalCount = raw?.count || 0;
        const items = normalizeProducts(raw);
        const page = action.payload?.page || 1;

        yield put(
            productsActions.fetchProductsSuccess({
                items,
                totalCount,
                page,
            })
        );
    } catch (e: any) {
        console.error("Fetch Products Error:", {
            status: e?.response?.status,
            data: e?.response?.data,
            message: e?.message,
        });

        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to fetch products";

        yield put(productsActions.fetchProductsFailure(errMsg));
    }
}

function* createProductWorker(
    action: ReturnType<typeof productsActions.createProductRequest>
): SagaIterator {
    try {
        const { formData, images, videos, deliveryTiers, discountTiers, preparationSpecs } = action.payload;

        // 1. Create main product
        const dto: ProductDto = yield call(productsApi.create, formData);
        const productId = dto.id;

        // 2. Save secondary images
        if (Array.isArray(images) && images.length > 0) {
            for (const img of images) {
                const fd = new FormData();
                fd.append("product", String(productId));
                fd.append("image", img.file);
                fd.append("is_feature", img.is_feature ? "True" : "False");
                yield call(productsApi.addProductImage, fd);
            }
        }

        // 3. Save videos
        if (Array.isArray(videos) && videos.length > 0) {
            for (const vid of videos) {
                if (vid.file) {
                    const fd = new FormData();
                    fd.append("product", String(productId));
                    fd.append("video_file", vid.file);
                    fd.append("title", vid.title || "");
                    yield call(productsApi.addProductVideo, fd);
                } else if (vid.video_url) {
                    yield call(productsApi.addProductVideo, {
                        product: productId,
                        video_url: vid.video_url,
                        title: vid.title || "",
                    } as any);
                }
            }
        }

        // 4. Save delivery tiers
        if (Array.isArray(deliveryTiers) && deliveryTiers.length > 0) {
            for (const tier of deliveryTiers) {
                yield call(productsApi.createDeliveryTier, {
                    product: productId,
                    min_quantity: tier.min_quantity,
                    delivery_days: tier.delivery_days,
                });
            }
        }

        // 5. Save discount tiers
        if (Array.isArray(discountTiers) && discountTiers.length > 0) {
            for (const tier of discountTiers) {
                yield call(productsApi.createDiscountTier, {
                    product: productId,
                    min_quantity: tier.min_quantity,
                    discount_percentage: Number(tier.discount_percentage),
                });
            }
        }

        // 6. Save preparation specifications
        if (Array.isArray(preparationSpecs) && preparationSpecs.length > 0) {
            for (const spec of preparationSpecs) {
                const payload = {
                    name: spec.name,
                    description: spec.description || "",
                    extra_price: spec.extra_price || "0.00",
                    sort_order: spec.sort_order || 1,
                    is_active: spec.is_active ?? true,
                } as any;
                
                let dataToSubmit: any = payload;
                if (spec.image instanceof File) {
                    const fd = new FormData();
                    Object.keys(payload).forEach(k => fd.append(k, payload[k]));
                    fd.append('image', spec.image);
                    dataToSubmit = fd;
                }

                yield call(productsApi.createPreparationSpec, productId, dataToSubmit);
            }
        }

        // 7. Fetch final product details to get all nested objects populated
        const finalDto: ProductDto = yield call(productsApi.details, productId);
        const product = mapProductDtoToProduct(finalDto);

        yield put(productsActions.createProductSuccess(product));
    } catch (e: any) {
        console.error("Create Product Orchestration Error:", e);
        const data = e?.response?.data;
        let errMsg = "Failed to create product";

        if (typeof data === "string") {
            errMsg = data;
        } else if (data?.detail) {
            errMsg = data.detail;
        } else if (data?.message) {
            errMsg = data.message;
        } else if (data && typeof data === "object") {
            const fieldErrors = Object.entries(data)
                .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
                .join(" | ");
            if (fieldErrors) errMsg = fieldErrors;
        } else if (e?.message) {
            errMsg = e.message;
        }

        yield put(productsActions.createProductFailure(errMsg));
    }
}

function* updateProductWorker(
    action: ReturnType<typeof productsActions.updateProductRequest>
): SagaIterator {
    try {
        const { id, data } = action.payload;
        // API call
        const dto: ProductDto = yield call(productsApi.update, id, data);

        // Map DTO to UI model
        const product = mapProductDtoToProduct(dto);

        yield put(productsActions.updateProductSuccess(product));
    } catch (e: any) {
        console.error("Update Product Error:", e);
        const responseData = e?.response?.data;
        let errMsg = "Failed to update product";

        if (typeof responseData === "string") {
            errMsg = responseData;
        } else if (responseData?.detail) {
            errMsg = responseData.detail;
        } else if (responseData?.message) {
            errMsg = responseData.message;
        } else if (responseData && typeof responseData === "object") {
            const fieldErrors = Object.entries(responseData)
                .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
                .join(" | ");
            if (fieldErrors) errMsg = fieldErrors;
        } else if (e?.message) {
            errMsg = e.message;
        }

        yield put(productsActions.updateProductFailure(errMsg));
    }
}

function* deleteProductWorker(
    action: ReturnType<typeof productsActions.deleteProductRequest>
): SagaIterator {
    try {
        const id = action.payload;
        // API call
        yield call(productsApi.delete, id);

        yield put(productsActions.deleteProductSuccess(id));
    } catch (e: any) {
        console.error("Delete Product Error:", e);
        const errMsg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to delete product";
        yield put(productsActions.deleteProductFailure(errMsg));
    }
}

function* fetchCategoriesWorker(): SagaIterator {
    try {
        const results: CategoryDto[] = yield call(productsApi.listCategories);
        const categories = results.map(mapCategoryDtoToCategory);
        yield put(productsActions.fetchCategoriesSuccess(categories));
    } catch (e: any) {
        yield put(productsActions.fetchCategoriesFailure(e.message || "Failed to fetch categories"));
    }
}

function* createCategoryWorker(
    action: ReturnType<typeof productsActions.createCategoryRequest>
): SagaIterator {
    try {
        const dto: CategoryDto = yield call(productsApi.createCategory, action.payload);
        const category = mapCategoryDtoToCategory(dto);
        yield put(productsActions.createCategorySuccess(category));
    } catch (e: any) {
        yield put(productsActions.createCategoryFailure(e.message || "Failed to create category"));
    }
}

function* fetchNewArrivalsWorker(): SagaIterator {
    try {
        const results: ProductDto[] = yield call(productsApi.newArrivals);
        const products = results.map(mapProductDtoToProduct);
        yield put(productsActions.fetchNewArrivalsSuccess(products));
    } catch (e: any) {
        yield put(productsActions.fetchNewArrivalsFailure(e.message || "Failed to fetch new arrivals"));
    }
}

function* fetchRelatedProductsWorker(
    action: ReturnType<typeof productsActions.fetchRelatedProductsRequest>
): SagaIterator {
    try {
        const results: ProductDto[] = yield call(productsApi.related, action.payload);
        const products = results.map(mapProductDtoToProduct);
        yield put(productsActions.fetchRelatedProductsSuccess(products));
    } catch (e: any) {
        yield put(productsActions.fetchRelatedProductsFailure(e.message || "Failed to fetch related products"));
    }
}

export function* productsSaga(): SagaIterator {
    yield takeLatest(productsActions.fetchProductsRequest.type, fetchProductsWorker);
    yield takeLatest(productsActions.createProductRequest.type, createProductWorker);
    yield takeLatest(productsActions.updateProductRequest.type, updateProductWorker);
    yield takeLatest(productsActions.deleteProductRequest.type, deleteProductWorker);
    yield takeLatest(productsActions.fetchCategoriesRequest.type, fetchCategoriesWorker);
    yield takeLatest(productsActions.createCategoryRequest.type, createCategoryWorker);
    yield takeLatest(productsActions.fetchNewArrivalsRequest.type, fetchNewArrivalsWorker);
    yield takeLatest(productsActions.fetchRelatedProductsRequest.type, fetchRelatedProductsWorker);
}
