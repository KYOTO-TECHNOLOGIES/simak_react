import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { bannerApi, type BannerDto } from "../features/admin/banners/bannerApi";
import { productsApi, type CategoryDto, type ProductsQuery } from "../features/admin/products/productApi";
import { profileApi } from "../features/user/profileApi";
import { reviewsApi } from "../features/admin/reviews/reviewsApi";
import { api } from "../services/api";

export interface DeliveryOfferDto {
    id: number;
    title: string;
    subtitle: string | null;
    badge: string | null;
    description: string | null;
    cta_text: string | null;
    cta_link: string | null;
    tickerText: string;
    is_active: boolean;
    order: number;
}

type OfferLanguage = "en" | "ar" | "cn";

type PromotionalTextsBundle = Record<string, string>;

type PromotionalTextsResponse = {
    promotional_texts?: Record<string, PromotionalTextsBundle>;
    results?: any[];
    data?: any[];
};

type CategoryLanguage = "en" | "ar" | "cn";

const normalizeCategoryLanguage = (lng?: string): CategoryLanguage => {
    const shortCode = String(lng ?? "en").toLowerCase().split("-")[0];
    if (shortCode === "ar") return "ar";
    if (shortCode === "cn" || shortCode === "zh") return "cn";
    return "en";
};

const normalizeOfferLanguage = (lng?: string): OfferLanguage => {
    const shortCode = String(lng ?? "en").toLowerCase().split("-")[0];
    if (shortCode === "ar") return "ar";
    if (shortCode === "cn" || shortCode === "zh") return "cn";
    return "en";
};

const getPromotionalTextsLanguageKey = (language: OfferLanguage): string => (language === "cn" ? "zh" : language);

const buildLocalizedKeyCandidates = (baseKey: string, language: OfferLanguage): string[] => {
    const suffixes = language === "ar"
        ? ["_ar", "_arabic"]
        : language === "cn"
            ? ["_cn", "_zh", "_zh_cn", "_chinese"]
            : ["_en", "_english"];

    return [...suffixes.map((suffix) => `${baseKey}${suffix}`), baseKey];
};

const pickLocalizedString = (item: any, baseKeys: string[], language: OfferLanguage): string | null => {
    for (const baseKey of baseKeys) {
        for (const candidateKey of buildLocalizedKeyCandidates(baseKey, language)) {
            const value = item?.[candidateKey];
            if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
            }
        }
    }

    return null;
};

const normalizeDeliveryOffer = (item: any, index: number, language: OfferLanguage): DeliveryOfferDto => {
    const title =
        pickLocalizedString(item, ["title", "name", "message", "description", "subtitle", "code"], language) ??
        `Offer ${index + 1}`;
    const subtitle = pickLocalizedString(item, ["subtitle", "short_description"], language);
    const badge = pickLocalizedString(item, ["badge", "tag", "label", "code"], language);
    const description = pickLocalizedString(item, ["description", "message"], language);
    const ctaText = pickLocalizedString(item, ["cta_text", "cta", "call_to_action"], language);
    const ctaLink = pickLocalizedString(item, ["cta_link", "link"], language);
    const tickerMessage =
        pickLocalizedString(item, ["ticker_text", "tickerText", "title", "message"], language) ?? title;
    const tickerParts = [badge, tickerMessage, subtitle].filter(Boolean);

    return {
        id: Number(item?.id ?? index + 1),
        title,
        subtitle,
        badge,
        description,
        cta_text: ctaText,
        cta_link: ctaLink,
        tickerText: tickerParts.join(" • "),
        is_active: item?.is_active ?? item?.active ?? true,
        order: Number(item?.sort_order ?? item?.order ?? item?.id ?? index + 1),
    };
};

type DeliveryOffersResponse = {
    results?: any[];
    data?: any[];
};

/* ══════════════════════════════════════════
   Banner Hooks
   ══════════════════════════════════════════ */

/** Fetch all banners — shared cache across Hero + Offers */
export const useBanners = () =>
    useQuery<BannerDto[]>({
        queryKey: ["banners"],
        queryFn: () => bannerApi.list(),
        staleTime: 5 * 60 * 1000,
    });

export const useDeliveryOffers = (lng: string = "en") => {
    const language = normalizeOfferLanguage(lng);

    return useQuery<string[]>({
        queryKey: ["delivery-offers", language],
        queryFn: async () => {
            const response = await api.get<PromotionalTextsResponse | DeliveryOffersResponse | DeliveryOfferDto[] | any>("/marketing/promotional/delivery_offers/", {
                params: { language: getPromotionalTextsLanguageKey(language) },
                headers: { "Accept-Language": getPromotionalTextsLanguageKey(language) },
            });

            const promotionalTexts = response.data?.promotional_texts;
            if (promotionalTexts && typeof promotionalTexts === "object") {
                const preferredLanguage = getPromotionalTextsLanguageKey(language);
                const fallbackLanguage = "en";
                const resolvedBundle =
                    promotionalTexts[preferredLanguage] ??
                    promotionalTexts[fallbackLanguage] ??
                    Object.values(promotionalTexts)[0];

                if (resolvedBundle && typeof resolvedBundle === "object") {
                    return Object.values(resolvedBundle)
                        .map((message) => String(message).trim())
                        .filter(Boolean);
                }
            }

            const rawItems = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.results)
                    ? response.data.results
                    : Array.isArray(response.data?.data)
                        ? response.data.data
                        : [];

            return rawItems
                .map((item: any, index: number) => normalizeDeliveryOffer(item, index, language).tickerText)
                .map((message: string) => String(message).trim())
                .filter(Boolean);
        },
        staleTime: 5 * 60 * 1000,
    });
};

/* ══════════════════════════════════════════
   Product Hooks
   ══════════════════════════════════════════ */

/** Bestsellers for the home page */
export const useBestsellers = () =>
    useQuery({
        queryKey: ["bestsellers"],
        queryFn: () => productsApi.list({ limit: 12, ordering: "created_at" }),
        staleTime: 5 * 60 * 1000,
    });

/** Product list with pagination, search, and category filters */
export const useProducts = (params: ProductsQuery) =>
    useQuery({
        queryKey: ["products", params],
        queryFn: () => productsApi.list(params),
        staleTime: 2 * 60 * 1000,
        placeholderData: keepPreviousData,
    });

/** Infinite product list for Load More pagination */
export const useInfiniteProducts = (
    filters: Omit<ProductsQuery, "offset">,
    limit: number = 12
) =>
    useInfiniteQuery({
        queryKey: ["products-infinite", filters],
        queryFn: ({ pageParam = 0 }) =>
            productsApi.list({ ...filters, limit, offset: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
            return loaded < lastPage.count ? loaded : undefined;
        },
        staleTime: 2 * 60 * 1000,
    });

/** Single product details by ID */
export const useProductDetails = (id: number | undefined) =>
    useQuery({
        queryKey: ["product", id],
        queryFn: () => productsApi.details(id!),
        enabled: !!id,
        staleTime: 3 * 60 * 1000,
    });

export const useProductReviews = (id: number | undefined, limit: number = 10) =>
    useQuery({
        queryKey: ["product-reviews", id, limit],
        queryFn: () => reviewsApi.list({ product: id!, is_visible: true, limit }),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    });

/* ══════════════════════════════════════════
   User Profile Hook
   ══════════════════════════════════════════ */

/**
 * User profile hook — uses Redux state as initial data and only fetches if not present in Redux
 */
export const useUserProfile = (enabled: boolean = true) => {
    const user = useSelector((state: any) => state.auth.user);
    return useQuery({
        queryKey: ["userProfile"],
        queryFn: () => profileApi.getMe(),
        enabled: enabled, // Always enable if requested (authenticated)
        staleTime: 5 * 60 * 1000,
        initialData: user || undefined,
    });
};

/* ══════════════════════════════════════════
   Category Hooks
   ══════════════════════════════════════════ */

export const useCategories = (lng: string = "en") => {
    const language = normalizeCategoryLanguage(lng);
    const apiLanguage = language === "cn" ? "zh" : language;

    return useQuery<CategoryDto[]>({
        queryKey: ["categories", language],
        queryFn: async () => {
            const res = await api.get<CategoryDto[] | { results?: CategoryDto[] }>("/products/categories/", {
                params: { language: apiLanguage },
                headers: { "Accept-Language": apiLanguage },
            });
            const data = res.data;
            return Array.isArray(data) ? data : (data?.results ?? []);
        },
        staleTime: 10 * 60 * 1000, // Categories change slowly
    });
};
