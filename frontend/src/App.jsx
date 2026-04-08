import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
    <div style={{
      background: 'linear-gradient(90deg, #ef4123 0%, #fcaf17 50%, #ef4123 100%)',
      backgroundSize: '200% auto',
      animation: 'gradientMove 3s linear infinite',
      padding: '0rem 1rem',
      textAlign: 'center',
      color: 'white',
      fontWeight: '800',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      boxShadow: '0 4px 15px rgba(239, 65, 35, 0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      letterSpacing: '0.5px'
    }}>
      <Sparkles size={16} className="pulse" />
      <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
        ORDER 15 MIN EARLY. EAT FRESH.
      </span>
      <Zap size={16} className="pulse" />
      
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .pulse {
          animation: icon-pulse 2s infinite;
        }
        @keyframes icon-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
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
            <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <TopPromoBanner />
              <Navbar bannerVisible={true} />
              <RecentOrders />
              <NotificationsToast />
              <FloatingCart />
              <div style={{ flex: 1 }}>
                <React.Suspense fallback={<div className="auth-wrapper"><div className="pulse-container"><div className="pulse-dot"></div></div></div>}>
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
          </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
