import type { CategoryDto } from "../features/admin/products/productApi";

/** Preferred display order: Live → Organic → Fresh → Frozen → Dry */
const CATEGORY_SORT_KEYS = ["live", "organic", "fresh", "frozen", "dry"] as const;

function getCategorySortIndex(category: CategoryDto): number {
    const token = `${category.slug} ${category.name}`.toLowerCase();
    const idx = CATEGORY_SORT_KEYS.findIndex((key) => token.includes(key));
    return idx === -1 ? CATEGORY_SORT_KEYS.length : idx;
}

export function sortCategories(categories: CategoryDto[]): CategoryDto[] {
    return [...categories].sort((a, b) => {
        const orderDiff = getCategorySortIndex(a) - getCategorySortIndex(b);
        if (orderDiff !== 0) return orderDiff;
        return (a.localizedName || a.name).localeCompare(b.localizedName || b.name);
    });
}
