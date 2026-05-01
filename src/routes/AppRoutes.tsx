import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { setNavigator } from '../utils/navigate';

// ✅ import your language hook (ONLY user side)
import useLanguageToggle from '../hooks/useLanguageToggle';
import { useAppSelector } from '../hooks';

// User components
import Home from '../features/user/home';
import Register from '../features/user/register';
import Login from '../features/user/login';
import UserProductsPage from '../features/user/products';
import ProductProfile from '../features/user/productprofile';
import CartPage from '../features/user/cart';
import CheckoutPage from '../features/user/checkout';
import NotificationPage from '../features/user/notification';
import AboutPage from '../features/user/about';
import CareersPage from '../features/user/careers';
import PrivacyPolicyPage from '../features/user/privacy';
import TermsOfServicePage from '../features/user/terms';
import Navbar from '../components/layout/userside/navbar';
import Footer from '../components/layout/userside/footer';
import OrderPage from '../features/user/order';
import ProfilePage from '../features/user/profile';
import SupportPage from '../features/user/support';
// import WishlistPage from '../features/user/wishlist';

// Admin components
import Dashboard from '../features/admin/dashboard/dashboard';
import AdminLayout from '../components/layout/adminside/AdminLayout';
import OrderManagement from '../features/admin/orders/orders';
import OrderDetailsPage from '../features/admin/orders/OrderDetailsPage';
import CustomerManagement from '../features/admin/customers/customers';
import CustomerDetailsPage from '../features/admin/customers/CustomerDetailsPage';
import ReviewsManagement from '../features/admin/reviews/reviews';
import PaymentManagement from '../features/admin/payments/payments';
import ProductManagement from '../features/admin/products/products';
import AddProduct from '../features/admin/products/AddProduct';
import EditProduct from '../features/admin/products/EditProduct';
import ProductDetailsPage from '../features/admin/products/ProductDetailsPage';
import CategoriesPage from '../features/admin/products/Categories';
import BannersManagement from '../features/admin/banners/banner';
import AdminNotificationsPage from '../features/admin/notifications/AdminNotificationsPage';
import ContactMessagesPage from '../features/admin/support/ContactMessages';
import CouponManagement from '../features/admin/marketing/Coupons';
import SettingsPage from '../features/admin/settings/settings';

// Delivery components
import DeliveryLayout from '../components/layout/deliveryside/DeliveryLayout';
import DeliveryDashboard from '../features/delivery/DeliveryDashboard';
import AvailableOrders from '../features/delivery/AvailableOrders';
import MyOrders from '../features/delivery/MyOrders';
import DeliveryOrderDetail from '../features/delivery/DeliveryOrderDetail';
import DeliveryProfile from '../features/delivery/DeliveryProfile';

// Admin delivery components
import DeliveryBoysList from '../features/admin/delivery/DeliveryBoysList';
import AdminCancellationRequests from '../features/admin/delivery/AdminCancellationRequests';
import DeliveryBoyDetailPage from '../features/admin/delivery/DeliveryBoyDetailPage';

// Error Pages
import BadRequest400 from '../pages/errors/BadRequest400';
import Unauthorized401 from '../pages/errors/Unauthorized401';
import Forbidden403 from '../pages/errors/Forbidden403';
import NotFound404 from '../pages/errors/NotFound404';
import ServerError500 from '../pages/errors/ServerError500';
import NetworkError from '../pages/errors/NetworkError';

// Payment Result Pages
import PaymentSuccess from '../pages/payment/PaymentSuccess';
import PaymentCancelled from '../pages/payment/PaymentCancelled';
import PaymentFailed from '../pages/payment/PaymentFailed';
import { PaymentRoute } from './PaymentRoute';

/* ✅ Layout wrapper that adds Navbar to user-facing pages
   ✅ applies language + RTL only on user side
*/
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};

const UserLayout: React.FC = () => {
  // This hook sets <html lang="..."> and <html dir="rtl/ltr">
  // Runs ONLY on user routes because UserLayout is only used there.
  useLanguageToggle();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  // If admin or delivery boy is browsing user routes, redirect them
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (isAuthenticated && user?.role === 'delivery_boy') {
      navigate('/delivery', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator((to, options) => navigate(to, options));
  }, [navigate]);
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* --- ERROR ROUTES (Outside Layouts to be full screen) --- */}
        <Route path="/400" element={<BadRequest400 />} />
        <Route path="/401" element={<Unauthorized401 />} />
        <Route path="/403" element={<Forbidden403 />} />
        <Route path="/404" element={<NotFound404 />} />
        <Route path="/500" element={<ServerError500 />} />
        <Route path="/network-error" element={<NetworkError />} />

        {/* --- PAYMENT RESULT ROUTES (Protected - requires auth + valid order context) --- */}
        <Route path="/payment" element={<PaymentRoute />}>
          <Route path="success" element={<PaymentSuccess />} />
          <Route path="cancelled" element={<PaymentCancelled />} />
          <Route path="failed" element={<PaymentFailed />} />
        </Route>

        {/* --- USER ROUTES (with Navbar) --- */}
        <Route element={<UserLayout />}>
          {/* Public user routes */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<UserProductsPage />} />
          <Route path="/products/:id" element={<ProductProfile />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/support" element={<SupportPage />} />

          {/* Protected user routes — require login */}
          <Route element={<PrivateRoute />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrderPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationPage />} />
            {/* <Route path="/wishlist" element={<WishlistPage />} /> */}
          </Route>
        </Route>

        {/* --- ADMIN ROUTES (Nested) --- */}
        {/* AdminLayout is the "Parent". It contains the Sidebar and Header */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']} />}>
          <Route element={<AdminLayout />}>
            {/* Redirect /admin to /admin/dashboard automatically */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* These children will render inside the <Outlet /> of AdminLayout */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="users" element={<CustomerManagement />} />
            <Route path="users/:id" element={<CustomerDetailsPage />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="products/add" element={<AddProduct />} />
            <Route path="products/edit/:id" element={<EditProduct />} />
            <Route path="products/:id" element={<ProductDetailsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="reviews" element={<ReviewsManagement />} />
            <Route path="payments" element={<PaymentManagement />} />
            <Route path="payments/:id" element={<PaymentManagement />} />
            <Route path="marketing/coupons" element={<CouponManagement />} />
            <Route path="banners" element={<BannersManagement />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="support" element={<ContactMessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Admin delivery routes */}
            <Route path="delivery/boys" element={<DeliveryBoysList />} />
            <Route path="delivery/boys/:id" element={<DeliveryBoyDetailPage />} />
            <Route path="delivery/cancellations" element={<AdminCancellationRequests />} />
          </Route>
        </Route>

        {/* ─── DELIVERY BOY ROUTES ─── */}
        <Route path="/delivery" element={<PrivateRoute roles={['delivery_boy']} />}>
          <Route element={<DeliveryLayout />}>
            <Route index element={<DeliveryDashboard />} />
            <Route path="available" element={<AvailableOrders />} />
            <Route path="my-orders" element={<MyOrders />} />
            <Route path="orders/:id" element={<DeliveryOrderDetail />} />
            <Route path="profile" element={<DeliveryProfile />} />
          </Route>
        </Route>

        {/* Fallback for 404 - Render the NotFound404 page */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
};
