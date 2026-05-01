import { api } from "../../../services/api";

/* ── Product Image DTO ── */
export interface ProductImageDto {
  id: number;
  image: string;
  is_feature: boolean;
  created_at: string;
}

/* ── Product Video DTO ── */
export interface ProductVideoDto {
  id: number;
  video_file: string | null;
  video_url: string | null;
  title: string;
  created_at: string;
}

/* ── Discount Tier DTO ── */
export interface DiscountTierDto {
  id?: number;
  product?: number;
  min_quantity: number;
  discount_percentage: string;
  discount_price?: string;
}

/* ── Delivery Tier DTO ── */
export interface DeliveryTierDto {
  id?: number;
  product?: number;
  min_quantity: number;
  delivery_days: number;
  name?: string;
  cost?: string;
  estimated_days?: string;
}

/* ── Preparation Specification DTO ── */
export interface PreparationSpecificationDto {
  id: number;
  product?: number;
  name: string;
  description: string;
  image?: string | File | null;
  extra_price: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/* ── Product DTO returned by backend ── */
export interface ProductDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: number;
  category_name: string;
  unit?: string;
  price: string;
  discount_price: string | null;
  final_price: string;
  stock: number;
  is_available: boolean;
  image: string | null;
  sku: string;
  expected_delivery_time: string | null;
  images: ProductImageDto[];
  videos: ProductVideoDto[];
  discount_tiers: DiscountTierDto[];
  delivery_tiers: DeliveryTierDto[];
  preparation_specifications?: PreparationSpecificationDto[];
  available_locations?: string[];
  available_emirates?: string[];
  service_areas?: Array<string | Record<string, unknown>>;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export type ProductsQuery = {
  search?: string;
  category?: string;
  category_slug?: string;
  category_name?: string;
  min_price?: number;
  max_price?: number;
  is_available?: boolean;
  available_emirates?: string;
  ordering?: "price" | "-price" | "created_at" | "-created_at" | "stock" | "-stock";
  page?: number;
  limit?: number;
  offset?: number;
  q?: string;
  status?: string;
};

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent?: number | null;
  image?: string | null;
  product_count?: number;
}

export const productsApi = {
  list: async (
    params?: ProductsQuery
  ): Promise<{ results: ProductDto[]; count: number }> => {
    const { page: _page, ...requestParams } = params ?? {};
    const res = await api.get<{ results: ProductDto[]; count: number }>(
      "/products/products/",
      { params: requestParams }
    );
    return res.data;
  },

  details: async (id: number): Promise<ProductDto> => {
    const res = await api.get<ProductDto>(`/products/products/${id}/`);
    return res.data;
  },

  newArrivals: async (): Promise<ProductDto[]> => {
    const res = await api.get<ProductDto[]>("/products/products/new_arrivals/");
    return res.data;
  },

  related: async (id: number): Promise<ProductDto[]> => {
    const res = await api.get<ProductDto[]>(`/products/products/${id}/related/`);
    return res.data;
  },

  notifyStock: async (id: number): Promise<void> => {
    await api.post(`/products/products/${id}/notify_stock/`);
  },

  create: async (payload: Partial<ProductDto> | FormData): Promise<ProductDto> => {
    const isFormData = payload instanceof FormData;
    const res = await api.post<ProductDto>("/products/products/", payload, {
      ...(isFormData && { timeout: 60000 }),
    });
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<ProductDto> | FormData
  ): Promise<ProductDto> => {
    const isFormData = payload instanceof FormData;
    const res = await api.patch<ProductDto>(`/products/products/${id}/`, payload, {
      ...(isFormData && { timeout: 60000 }),
    });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/products/${id}/`);
  },

  /* ── Categories ── */
  listCategories: async (): Promise<CategoryDto[]> => {
    const res = await api.get<any>("/products/categories/");
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  createCategory: async (payload: Partial<CategoryDto> | FormData): Promise<CategoryDto> => {
    const res = await api.post<CategoryDto>("/products/categories/", payload);
    return res.data;
  },

  updateCategory: async (id: number, payload: Partial<CategoryDto> | FormData): Promise<CategoryDto> => {
    const res = await api.patch<CategoryDto>(`/products/categories/${id}/`, payload);
    return res.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/products/categories/${id}/`);
  },

  /* ── Delivery Tiers ── */
  listDeliveryTiers: async (
    productId?: number
  ): Promise<{ results: DeliveryTierDto[]; count: number }> => {
    const res = await api.get<{ results: DeliveryTierDto[]; count: number }>(
      "/products/delivery-tiers/",
      { params: { ...(productId && { product: productId }) } }
    );
    return res.data;
  },

  createDeliveryTier: async (payload: {
    product: number;
    min_quantity: number;
    delivery_days: number;
  }): Promise<DeliveryTierDto> => {
    const res = await api.post<DeliveryTierDto>("/products/delivery-tiers/", payload);
    return res.data;
  },

  updateDeliveryTier: async (
    id: number,
    payload: Partial<DeliveryTierDto>
  ): Promise<DeliveryTierDto> => {
    const res = await api.patch<DeliveryTierDto>(
      `/products/delivery-tiers/${id}/`,
      payload
    );
    return res.data;
  },

  deleteDeliveryTier: async (id: number): Promise<void> => {
    await api.delete(`/products/delivery-tiers/${id}/`);
  },

  /* ── Discount Tiers ── */
  listDiscountTiers: async (
    productId?: number
  ): Promise<{ results: DiscountTierDto[]; count: number }> => {
    const res = await api.get<{ results: DiscountTierDto[]; count: number }>(
      "/products/discount-tiers/",
      { params: { ...(productId && { product: productId }) } }
    );
    return res.data;
  },

  createDiscountTier: async (payload: {
    product: number;
    min_quantity: number;
    discount_percentage: number;
  }): Promise<DiscountTierDto> => {
    const res = await api.post<DiscountTierDto>("/products/discount-tiers/", payload);
    return res.data;
  },

  updateDiscountTier: async (
    id: number,
    payload: Partial<DiscountTierDto>
  ): Promise<DiscountTierDto> => {
    const res = await api.patch<DiscountTierDto>(
      `/products/discount-tiers/${id}/`,
      payload
    );
    return res.data;
  },

  deleteDiscountTier: async (id: number): Promise<void> => {
    await api.delete(`/products/discount-tiers/${id}/`);
  },

  /* ── Product Images ── */
  addProductImage: async (data: FormData): Promise<ProductImageDto> => {
    const res = await api.post<ProductImageDto>("/products/product-images/", data, { timeout: 60000 });
    return res.data;
  },

  updateProductImage: async (id: number, data: FormData | { is_feature: boolean }): Promise<ProductImageDto> => {
    const res = await api.patch<ProductImageDto>(`/products/product-images/${id}/`, data);
    return res.data;
  },

  deleteProductImage: async (id: number): Promise<void> => {
    await api.delete(`/products/product-images/${id}/`);
  },

  /* ── Product Videos ── */
  addProductVideo: async (data: FormData | { product: number; video_url: string; title?: string }): Promise<ProductVideoDto> => {
    const isFormData = data instanceof FormData;
    const res = await api.post<ProductVideoDto>("/products/product-videos/", data, {
      ...(isFormData && { timeout: 60000 }),
    });
    return res.data;
  },

  updateProductVideo: async (id: number, data: Partial<ProductVideoDto> | FormData): Promise<ProductVideoDto> => {
    const res = await api.patch<ProductVideoDto>(`/products/product-videos/${id}/`, data);
    return res.data;
  },

  deleteProductVideo: async (id: number): Promise<void> => {
    await api.delete(`/products/product-videos/${id}/`);
  },
  /* ── Preparation Specifications ── */
  listPreparationSpecs: async (
    productId: number
  ): Promise<PreparationSpecificationDto[]> => {
    const res = await api.get<any>(
      `/products/products/${productId}/preparation-specs/`
    );
    return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
  },

  createPreparationSpec: async (
    productId: number,
    payload: Partial<PreparationSpecificationDto> | FormData
  ): Promise<PreparationSpecificationDto> => {
    const isFormData = payload instanceof FormData;
    const res = await api.post<PreparationSpecificationDto>(
      `/products/products/${productId}/preparation-specs/`,
      payload,
      {
        ...(isFormData && { timeout: 60000 }),
      }
    );
    return res.data;
  },

  updatePreparationSpec: async (
    id: number,
    payload: Partial<PreparationSpecificationDto> | FormData
  ): Promise<PreparationSpecificationDto> => {
    const isFormData = payload instanceof FormData;
    const res = await api.patch<PreparationSpecificationDto>(
      `/products/preparation-specs/${id}/`,
      payload,
      {
        ...(isFormData && { timeout: 60000 }),
      }
    );
    return res.data;
  },

  deletePreparationSpec: async (id: number): Promise<void> => {
    await api.delete(`/products/preparation-specs/${id}/`);
  },
};
