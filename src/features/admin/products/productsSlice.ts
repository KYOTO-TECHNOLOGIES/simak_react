import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../../app/store";
import type { ProductsQuery } from "./productApi";

type Status = "idle" | "loading" | "succeeded" | "failed";

/* ── Normalised product for UI ── */
export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string;
    categoryId: number;
    categoryName: string;
    price: number;
    discountPrice: number | null;
    finalPrice: number;
    sku: string;
    stock: number;
    isAvailable: boolean;
    status: "Active" | "Draft" | "Out of Stock";
    imageUrl: string | null;
    images: { id: number; url: string; isFeature: boolean }[];
    videos: { id: number; url: string; title?: string }[];
    averageRating: number;
    totalReviews: number;
    expectedDeliveryTime: string | null;
    discountTiers: { id?: number; minQuantity: number; discountPercentage: number }[];
    deliveryTiers: { id?: number; minQuantity: number; deliveryDays: number }[];
    preparation_specifications?: any[];
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: number;
    name: string;
    name_arabic?: string;
    name_chinese?: string;
    localizedName?: string;
    slug: string;
    description: string;
    parent?: number | null;
    image?: string | null;
    productCount: number;
}

interface ProductsState {
    items: Product[];
    categories: Category[];
    newArrivals: Product[];
    relatedProducts: Product[];
    totalCount: number;
    currentPage: number;
    status: Status;
    error: string | null;
    selectedId: number | null;
    lastQuery: ProductsQuery | null;
}

const initialState: ProductsState = {
    items: [],
    categories: [],
    newArrivals: [],
    relatedProducts: [],
    totalCount: 0,
    currentPage: 1,
    status: "idle",
    error: null,
    selectedId: null,
    lastQuery: null,
};

const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        fetchProductsRequest: (
            state,
            action: PayloadAction<ProductsQuery | undefined>
        ) => {
            state.status = "loading";
            state.error = null;
            state.lastQuery = action.payload ?? null;
        },
        fetchProductsSuccess: (
            state,
            action: PayloadAction<{
                items: Product[];
                totalCount: number;
                page: number;
            }>
        ) => {
            state.status = "succeeded";
            state.items = action.payload.items;
            state.totalCount = action.payload.totalCount;
            state.currentPage = action.payload.page;
        },
        fetchProductsFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        setSelectedProductId: (state, action: PayloadAction<number | null>) => {
            state.selectedId = action.payload;
        },
        /* ── Create Product ── */
        createProductRequest: (state, _action: PayloadAction<any>) => {
            state.status = "loading"; // Re-using main status or could be separate
            state.error = null;
        },
        createProductSuccess: (state, action: PayloadAction<Product>) => {
            state.status = "succeeded";
            state.items.unshift(action.payload); // Add new product to top of list
            state.totalCount += 1;
        },
        createProductFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        /* ── Update Product ── */
        updateProductRequest: (state, _action: PayloadAction<{ id: number; data: any }>) => {
            state.status = "loading";
            state.error = null;
        },
        updateProductSuccess: (state, action: PayloadAction<Product>) => {
            state.status = "succeeded";
            const index = state.items.findIndex((p) => p.id === action.payload.id);
            if (index !== -1) {
                state.items[index] = action.payload;
            }
        },
        updateProductFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        /* ── Delete Product ── */
        deleteProductRequest: (state, _action: PayloadAction<number>) => {
            state.status = "loading";
            state.error = null;
        },
        deleteProductSuccess: (state, action: PayloadAction<number>) => {
            state.status = "succeeded";
            state.items = state.items.filter((p) => p.id !== action.payload);
            state.totalCount -= 1;
        },
        deleteProductFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        resetStatus: (state) => {
            state.status = "idle";
            state.error = null;
        },
        /* ── Discovery & Categories Actions ── */
        fetchCategoriesRequest: (state) => {
            state.status = "loading";
            state.error = null;
        },
        fetchCategoriesSuccess: (state, action: PayloadAction<Category[]>) => {
            state.status = "succeeded";
            state.categories = action.payload;
        },
        fetchCategoriesFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        createCategoryRequest: (state, _action: PayloadAction<any>) => {
            state.status = "loading";
            state.error = null;
        },
        createCategorySuccess: (state, action: PayloadAction<Category>) => {
            state.status = "succeeded";
            state.categories.unshift(action.payload);
        },
        createCategoryFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        fetchNewArrivalsRequest: (state) => {
            state.status = "loading";
            state.error = null;
        },
        fetchNewArrivalsSuccess: (state, action: PayloadAction<Product[]>) => {
            state.status = "succeeded";
            state.newArrivals = action.payload;
        },
        fetchNewArrivalsFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        },
        fetchRelatedProductsRequest: (state, _action: PayloadAction<number>) => {
            state.status = "loading";
            state.error = null;
        },
        fetchRelatedProductsSuccess: (state, action: PayloadAction<Product[]>) => {
            state.status = "succeeded";
            state.relatedProducts = action.payload;
        },
        fetchRelatedProductsFailure: (state, action: PayloadAction<string>) => {
            state.status = "failed";
            state.error = action.payload;
        }
    },
});

export const productsActions = productsSlice.actions;

export default productsSlice.reducer;

// Selectors
export const selectProducts = (state: RootState) => state.products.items;
export const selectProductsTotal = (state: RootState) => state.products.totalCount;
export const selectProductsPage = (state: RootState) => state.products.currentPage;
export const selectProductsStatus = (state: RootState) => state.products.status;
export const selectProductsError = (state: RootState) => state.products.error;
export const selectSelectedProductId = (state: RootState) => state.products.selectedId;
export const selectSelectedProduct = (state: RootState) => state.products.items.find((item) => item.id === state.products.selectedId);
export const selectCategories = (state: RootState) => state.products.categories;
export const selectNewArrivals = (state: RootState) => state.products.newArrivals;
export const selectRelatedProducts = (state: RootState) => state.products.relatedProducts;
