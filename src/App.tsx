import { useEffect, useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth, setReferralMessage } from "./features/auth/authSlice";
import { AppRoutes } from "./routes/AppRoutes";
import { useToast } from "./components/ui/Toast";
import { useInitializeCart } from "./hooks/useInitializeCart";
import { useNotificationPolling } from "./hooks/useNotificationPolling";
import { navigateTo } from "./utils/navigate";
import { rememberErrorReturnPath, reloadErrorReturnPath } from "./utils/errorRedirect";

function App() {
  const dispatch = useDispatch();
  const { checkingAuth, isAuthenticated, user, referralMessage } = useSelector((state: any) => state.auth);
  const toast = useToast();
  const wasAuthenticated = useRef(false);

  // Initialize cart data on app load for authenticated users
  useInitializeCart();
  useNotificationPolling();

  useEffect(() => {
    dispatch(checkAuth() as any);
  }, [dispatch]);

  // Global online/offline handling
  useEffect(() => {
    const handleOffline = () => {
      if (window.location.pathname !== "/network-error") {
        try {
          rememberErrorReturnPath();
          navigateTo("/network-error", { replace: true });
        } catch {}
      }
    };
    const handleOnline = () => {
      if (window.location.pathname === "/network-error") {
        try { reloadErrorReturnPath(); } catch {}
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Show toast on login/register success (only on transition)
  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current && !checkingAuth) {
      const name = user?.first_name || user?.name || "";
      toast.show(name ? `Welcome back, ${name}!` : "Welcome! You're signed in.", "success");
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, checkingAuth]);

  // Show referral code success toast
  useEffect(() => {
    if (referralMessage) {
      toast.show(referralMessage, "success");
      dispatch(setReferralMessage(null));
    }
  }, [referralMessage]);

  return (
    <>
      <div style={{ display: checkingAuth ? 'none' : 'block' }}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
