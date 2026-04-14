import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateStore from './pages/CreateStore';
import ManageStore from './pages/ManageStore';
import Home from './pages/Home';
import StoreMenu from './pages/StoreMenu';
import Cart from './pages/Cart';
import OrderTracker from './pages/OrderTracker';
import { CartProvider } from './context/CartContext';
import RecentOrders from './components/RecentOrders';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminPanel from './pages/SuperAdminPanel';
import Navbar from './components/Navbar';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Footer from './components/Footer';
import NotificationsToast from './components/NotificationsToast';
// import OneSignalInit from './components/OneSignalInit';
import FloatingCart from './components/FloatingCart';
import { Sparkles, Zap } from 'lucide-react';

const TopPromoBanner = () => {
  return (
    <div className="promo-banner" style={{
      padding: '0.75rem 1rem',
      textAlign: 'center',
      color: 'white',
      fontWeight: '800',
      fontSize: '0.8125rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      boxShadow: '0 4px 15px rgba(239, 65, 35, 0.25)',
      position: 'sticky',
      top: 0,
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
  const isAdminPath = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/super-admin');

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAdminPath && <TopPromoBanner />}
      <Navbar bannerVisible={!isAdminPath} />
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
            <AppLayout />
          </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
