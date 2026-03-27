import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
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
import OneSignalInit from './components/OneSignalInit';

function App() {
  return (
    <AuthProvider>
      <OneSignalInit />
      <SocketProvider>
        <CartProvider>
          <Router>
            <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <RecentOrders />
              <NotificationsToast />
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
      <Analytics />
    </AuthProvider>
  );
}

export default App;
