import { API_BASE_URL } from "../config/constants";

/**
 * Normalizes a media URL from the backend.
 * If the URL is relative, it prepends the backend base URL.
 */
export const normalizeMediaUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // If it's already an absolute URL, return it
    if (/^https?:\/\//i.test(url)) return url;
    
    // If it's data URL, return it
    if (url.startsWith('data:')) return url;

    // Remove any leading slashes or dots
    const cleanUrl = url.replace(/^\.?\/*/, "");
    
    // If it's an empty string after cleaning, return null
    if (!cleanUrl || cleanUrl === "null" || cleanUrl === "undefined") return null;

    // Build the base URL
    // We assume the media is served from the same domain as the API, usually under /media/
    // If VITE_MEDIA_BASE_URL is set, use it.
    const mediaBase = (import.meta as any).env?.VITE_MEDIA_BASE_URL;
    if (mediaBase) {
        return `${mediaBase.replace(/\/+$/, "")}/${cleanUrl}`;
    }

    // Otherwise, try to derive it from API_BASE_URL or window.location
    let base = "";
    if (API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL)) {
        base = new URL(API_BASE_URL).origin;
    } else if (typeof window !== "undefined") {
        base = window.location.origin;
    }

    // If the URL doesn't start with 'media/', we might need to add it, 
    // but usually the backend provides the full relative path from the root.
    return `${base}/${cleanUrl}`;
};
