import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app-container">
            <RecentOrders />
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
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
