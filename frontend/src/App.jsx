import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

// Lazy load components for performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateStore = lazy(() => import('./pages/CreateStore'));
const ManageStore = lazy(() => import('./pages/ManageStore'));
const Home = lazy(() => import('./pages/Home'));
const StoreMenu = lazy(() => import('./pages/StoreMenu'));
const Cart = lazy(() => import('./pages/Cart'));
const OrderTracker = lazy(() => import('./pages/OrderTracker'));
const SuperAdminLogin = lazy(() => import('./pages/SuperAdminLogin'));
const SuperAdminPanel = lazy(() => import('./pages/SuperAdminPanel'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

import Navbar from './components/Navbar';
import RecentOrders from './components/RecentOrders';
import Footer from './components/Footer';
import NotificationsToast from './components/NotificationsToast';
import FloatingCart from './components/FloatingCart';
import LocationPortal from './components/LocationPortal';
import SplashScreen from './components/SplashScreen';
import ScrollToTop from './components/ScrollToTop';
import SessionGuard from './components/SessionGuard';
import { Sparkles, Zap, MapPin } from 'lucide-react';

const TopPromoBanner = () => {
  return (
    <div className="promo-banner" style={{
      height: 'var(--promo-height)',
      boxSizing: 'border-box',
      padding: '0 1rem',
      textAlign: 'center',
      color: 'white',
      fontWeight: '800',
      fontSize: '0.8125rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      boxShadow: '0 4px 15px rgba(239, 65, 35, 0.25)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1100,
      letterSpacing: '0.05em',
      textTransform: 'uppercase'
    }}>
      <Sparkles size={14} className="pulse" />
      <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
        ORDER 15 MIN EARLY. EAT FRESH.
      </span>
      <Zap size={14} className="pulse" />
    </div>
  );
};

const AppLayout = () => {
  const location = useLocation();
  const [selectedLocationId, setSelectedLocationId] = React.useState(localStorage.getItem('universe_location_id'));
  const [isSessionStarted, setIsSessionStarted] = React.useState(false);
  const isAdminPath = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/super-admin');

  React.useEffect(() => {
    const handleClearLocation = () => {
      setSelectedLocationId(null);
    };
    const handleSetLocation = (e) => {
      setSelectedLocationId(e.detail?._id || e.detail);
    };
    window.addEventListener('universe_clear_location', handleClearLocation);
    window.addEventListener('universe_set_location', handleSetLocation);
    return () => {
      window.removeEventListener('universe_clear_location', handleClearLocation);
      window.removeEventListener('universe_set_location', handleSetLocation);
    };
  }, []);

  const handleLocationSelect = (loc) => {
    setSelectedLocationId(loc._id);
  };

  if (!isSessionStarted && !isAdminPath && !location.pathname.startsWith('/order-tracker')) {
    return <SplashScreen onComplete={() => setIsSessionStarted(true)} />;
  }

  // If no location is selected and we are NOT on an admin path or a direct store path, show the portal
  if (!selectedLocationId && !isAdminPath && !location.pathname.startsWith('/store/')) {
    return <LocationPortal onLocationSelect={handleLocationSelect} />;
  }

  const hubType = localStorage.getItem('universe_location_type');

  const hasPromo = !isAdminPath && hubType === 'College';

  return (
    <div className={`app-container ${hasPromo ? 'has-promo' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SessionGuard />
      {hasPromo && <TopPromoBanner />}
      <Navbar bannerVisible={!isAdminPath && hubType === 'College'} />
      
      {/* Header Spacer - Manages Flow for Fixed Elements */}
      {!isAdminPath && (
        <div style={{ 
          height: hasPromo ? 'calc(var(--nav-height) + var(--promo-height))' : 'var(--nav-height)',
          flexShrink: 0 
        }} />
      )}
      <RecentOrders />
      <NotificationsToast />
      <FloatingCart />
      <div style={{ flex: 1 }}>
        <React.Suspense fallback={
          <div className="auth-wrapper">
            <div style={{ width: '100%', maxWidth: '800px', padding: '2rem' }}>
              <div className="skeleton skeleton-title" style={{ marginBottom: '2rem' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="skeleton-card-wrapper">
                  <div className="skeleton skeleton-img" style={{ height: '120px', width: '120px' }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: '1rem' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '1rem' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px' }}></div>
                  </div>
                </div>
                <div className="skeleton-card-wrapper">
                  <div className="skeleton skeleton-img" style={{ height: '120px', width: '120px' }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: '1rem' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '1rem' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/vendor/login" element={<Login />} />
            <Route path="/vendor/register" element={<Register />} />
            <Route path="/vendor/dashboard" element={<Dashboard />} />
            <Route path="/vendor/store/create" element={<CreateStore />} />
            <Route path="/vendor/store/manage" element={<ManageStore />} />
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route path="/super-admin/panel" element={<SuperAdminPanel />} />
            <Route path="/store/:id" element={<StoreMenu />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/order-tracker/:id" element={<OrderTracker />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </React.Suspense>
      </div>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      {/* <OneSignalInit /> */}
      <SocketProvider>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <AppLayout />
          </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
