import React from "react";
import { Helmet } from "react-helmet-async";
import Hero from "../../components/userside/heroSection";
import ShopByCategorySection from "../../components/userside/trustSection";
import BestsellersSection from "../../components/userside/bestsellersSection";
import HowItWorksSection from "../../components/userside/howitworksSection";
import FreshnessSection from "../../components/userside/freshnessSection";
import OffersSection from "../../components/userside/offersSection";
import ReviewsSection from "../../components/userside/reviewsSection";
import ProfileCompletionModal from "../../components/userside/ProfileCompletionModal";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const Home: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: any) => state.auth);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isAuthenticated && user) {
      const completedKey = `profile_completed_${user.id}`;
      const alreadyCompleted = localStorage.getItem(completedKey);

      const userLang = user?.profile?.preferred_language;
      const hasPreferredLanguage = userLang && ["en", "ar", "cn"].includes(userLang);

      if (hasPreferredLanguage) {
        // User already has a preferred language — apply it and skip modal
        if (i18n.language !== userLang) {
          i18n.changeLanguage(userLang);
          localStorage.setItem("i18nextLng", userLang);
        }
        if (!alreadyCompleted) {
          localStorage.setItem(completedKey, "true");
        }
      } else if (!alreadyCompleted) {
        // No preferred language set — show the modal
        setShowProfileModal(true);
      }
    }
  }, [isAuthenticated, user, i18n]);

  return (
    <div className="flex flex-col bg-white">
      <Helmet>
        <title>SIMAK FRESH - Fresh Seafood & Meat Delivery in Dubai</title>
        <meta name="description" content="Dubai's best online fresh seafood and meat shop. Get premium quality fish and cuts delivered fresh to your door." />
      </Helmet>
      <Hero />
      <ShopByCategorySection />
      <BestsellersSection />
      <HowItWorksSection />
      <FreshnessSection />
      <OffersSection />
      <ReviewsSection />

      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />
    </div>
  );
};

export default Home;
