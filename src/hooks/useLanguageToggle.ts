import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux"; // Import Redux selector and dispatch
import { setUser } from "../features/auth/authSlice"; // Import setUser action
import { profileApi } from "../features/user/profileApi";

type Lang = "en" | "ar" | "cn";

const useLanguageToggle = () => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();

  // 1. Listen to the User Preference from Redux
  // Replace 'state.auth.user' with your actual selector path
  const user = useSelector((state: any) => state.auth.user);
  const preferredLang = user?.profile?.preferred_language as Lang;

  const setHtmlAttributes = useCallback((lang: Lang) => {
    const html = document.documentElement;
    const newDir = lang === "ar" ? "rtl" : "ltr";

    const currentDir = html.getAttribute("dir");
    const currentLang = html.getAttribute("lang");

    if (currentDir !== newDir || currentLang !== lang) {
      document.body.style.transition = "none";

      html.setAttribute("lang", lang);
      html.setAttribute("dir", newDir);
      html.classList.toggle("rtl", newDir === "rtl");

      requestAnimationFrame(() => {
        document.body.style.transition = "";
      });
    }
  }, []);

  // 2. SYNC: Only apply profile preference when there is no explicit user-chosen language in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("i18nextLng") as Lang | null;
    const hasStoredChoice = stored && (["en", "ar", "cn"] as Lang[]).includes(stored);
    if (hasStoredChoice) return;
    if (preferredLang && i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang);
      localStorage.setItem("i18nextLng", preferredLang);
    }
  }, [preferredLang, i18n]);

  // 3. APPLY: Watch i18next and update HTML attributes (dir/lang)
  useEffect(() => {
    const lang = (i18n.language as Lang) || "en";
    setHtmlAttributes(lang);
  }, [i18n.language, setHtmlAttributes]);

  const setLanguage = useCallback(
    (lang: Lang) => {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);

      // Update Redux state to prevent the sync effect from reverting the change
      if (user) {
        dispatch(setUser({
          ...user,
          profile: {
            ...user.profile,
            preferred_language: lang
          }
        }));

        // Persist to backend (fire-and-forget)
        profileApi.updateProfile(user.id, {
          profile: { preferred_language: lang }
        }).catch(() => {
          // Silently ignore — local state is already updated
        });
      }
    },
    [i18n, user, dispatch]
  );

  const toggleLanguage = useCallback(() => {
    const current = (i18n.language as Lang) || "en";
    const next = current === "ar" ? "en" : "ar";
    setLanguage(next);
  }, [i18n, setLanguage]);

  const currentLanguage = (i18n.language as Lang) || "en";

  return {
    currentLanguage,
    setLanguage,
    toggleLanguage,
    isArabic: currentLanguage === "ar",
    isEnglish: currentLanguage === "en",
    isChinese: currentLanguage === "cn",
  };
};

export default useLanguageToggle;