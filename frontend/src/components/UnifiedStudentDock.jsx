import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  X, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  RotateCcw, 
  ChevronRight, 
  Sparkles, 
  User, 
  Phone,
  Flame,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { CartContext } from '../context/CartContext';

const UnifiedStudentDock = () => {
  const { cart, total, reorder } = useContext(CartContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('universe_customer_phone') || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reorderSuccessId, setReorderSuccessId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Paths where the dock should stay completely hidden
  const hidePaths = ['/vendor', '/super-admin', '/vendor-app-download'];
  const shouldHide = hidePaths.some(path => location.pathname.startsWith(path));

  // Hide the floating cart portion when on the /cart page itself
  const isCartPage = location.pathname.startsWith('/cart');

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Fetch full 24/7 Customer History & Active Orders
  const loadCustomerOrders = useCallback(async () => {
    const phone = localStorage.getItem('universe_customer_phone');
    const localRecent = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');

    if (!phone) {
      // Fallback to local storage if phone isn't set yet
      if (localRecent.length > 0) {
        // Rehydrate local storage orders
        try {
          const rehydrated = await Promise.all(localRecent.map(async (o) => {
            try {
              const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${o.id}`);
              return { ...o, ...res.data, id: o.id };
            } catch (_) {
              return o;
            }
          }));
          const active = rehydrated.filter(o => ['Payment Pending', 'Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status));
          const past = rehydrated.filter(o => ['Completed', 'Cancelled'].includes(o.status));
          setActiveOrders(active);
          setPastOrders(past);
        } catch (_) {
          setActiveOrders(localRecent);
        }
      }
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/customer/history?phone=${cleanPhone}`);
      
      if (res.data) {
        setActiveOrders(res.data.activeOrders || []);
        setPastOrders(res.data.orders || []);
        if (res.data.customer) {
          setCustomer(res.data.customer);
          if (res.data.customer.name) {
            localStorage.setItem('universe_customer_name', res.data.customer.name);
          }
        }
      }
    } catch (err) {
      console.error('[UnifiedStudentDock] Error loading customer history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldHide) {
      loadCustomerOrders();
      const interval = setInterval(loadCustomerOrders, 45000);

      // WebSockets for Real-time Status updates
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

      // Join rooms for all active orders
      activeOrders.forEach(order => {
        const orderId = order._id || order.id;
        if (orderId) socket.emit('join_order_room', orderId);
      });

      socket.on('order_status_update', (updatedOrder) => {
        // Audio Chimes for key events
        if (updatedOrder.status === 'Confirmed') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        } else if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Ready') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3').play().catch(() => {});
        }

        // Re-load customer history to get full updated record
        loadCustomerOrders();
      });

      const handleSync = () => {
        setCustomerPhone(localStorage.getItem('universe_customer_phone') || '');
        loadCustomerOrders();
      };
      window.addEventListener('universe_sync_data', handleSync);

      return () => {
        clearInterval(interval);
        socket.close();
        window.removeEventListener('universe_sync_data', handleSync);
      };
    }
  }, [location.pathname, shouldHide, loadCustomerOrders, activeOrders.length]);

  // Handle manual phone number link
  const handleSavePhone = (e) => {
    e.preventDefault();
    const clean = phoneInput.replace(/\D/g, '').slice(-10);
    if (clean.length === 10) {
      localStorage.setItem('universe_customer_phone', clean);
      setCustomerPhone(clean);
      setPhoneInput('');
      setTimeout(() => loadCustomerOrders(), 200);
    }
  };

  // 1-Tap Re-order Execution
  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    const storeId = order.store?._id || order.store;
    reorder(order.items, storeId);
    setReorderSuccessId(order._id || order.id);
    setTimeout(() => {
      setReorderSuccessId(null);
      setIsOpen(false);
      navigate('/cart');
    }, 800);
  };

  if (shouldHide) return null;

  const primaryActiveOrder = activeOrders[0];
  const hasActiveOrder = activeOrders.length > 0;
  const hasCart = totalCartItems > 0 && !isCartPage;

  return (
    <>
      {/* 🌟 FIXED FLOATING DOCK (Multi-Pill Bar at Bottom) */}
      <div 
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '94%',
          maxWidth: '720px',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          pointerEvents: 'none' // Allow click-through around buttons
        }}
      >
        {/* PILL 1: ACTIVE COOKING / READY ORDER TRACKER */}
        {hasActiveOrder && (
          <div
            onClick={() => navigate(`/order-tracker/${primaryActiveOrder._id || primaryActiveOrder.id}`)}
            style={{
              pointerEvents: 'auto',
              flex: hasCart ? '0 1 auto' : '1',
              background: primaryActiveOrder.status === 'Ready' 
                ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                : primaryActiveOrder.status === 'Cooking'
                ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                : primaryActiveOrder.status === 'Cancelled'
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              color: 'white',
              padding: '0.65rem 1rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: 'pulseGlow 2s infinite'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {primaryActiveOrder.status === 'Cooking' ? (
                <Flame size={16} className="pulse" />
              ) : primaryActiveOrder.status === 'Ready' ? (
                <CheckCircle2 size={16} />
              ) : (
                <Clock size={16} />
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                  #{primaryActiveOrder.orderNumber}
                </span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: '800', 
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.25)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '6px'
                }}>
                  {primaryActiveOrder.status === 'Cooking' ? 'PREPARING' : primaryActiveOrder.status}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {primaryActiveOrder.store?.name || primaryActiveOrder.storeName || 'Store'}
              </p>
            </div>

            <ChevronRight size={16} style={{ opacity: 0.8 }} />
          </div>
        )}

        {/* PILL 2: LIVE CART INDICATOR */}
        {hasCart && (
          <div
            onClick={() => navigate('/cart')}
            style={{
              pointerEvents: 'auto',
              flex: '1',
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '0.65rem 1rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 15px 35px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
              border: '1.5px solid rgba(239, 65, 35, 0.15)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(239, 65, 35, 0.1)',
                color: 'var(--primary, #ef4123)',
                padding: '0.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBag size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '800', fontSize: '0.9rem', color: '#0f172a' }}>
                  {totalCartItems} {totalCartItems === 1 ? 'Item' : 'Items'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
                  ₹{total}
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--primary, #ef4123)',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '800',
              padding: '0.5rem 0.9rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 4px 12px rgba(239, 65, 35, 0.3)'
            }}>
              View Cart <ArrowRight size={14} />
            </div>
          </div>
        )}

        {/* PILL 3: 24/7 CUSTOMER ORDER VAULT BUTTON */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) loadCustomerOrders();
          }}
          style={{
            pointerEvents: 'auto',
            background: isOpen ? '#0f172a' : 'rgba(255, 255, 255, 0.96)',
            color: isOpen ? 'white' : '#0f172a',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.08)',
            padding: '0.65rem 0.9rem',
            borderRadius: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="24/7 My Orders & 1-Tap Re-order"
        >
          {isOpen ? (
            <X size={18} />
          ) : (
            <>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Clock size={18} color="var(--primary, #ef4123)" strokeWidth={2.2} />
                {(pastOrders.length > 0 || activeOrders.length > 0) && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: 'var(--primary, #ef4123)',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: '900',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid white'
                  }}>
                    {activeOrders.length || pastOrders.length}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>Orders</span>
            </>
          )}
        </button>
      </div>

      {/* 📱 24/7 UNIFIED STUDENT DRAWER / MODAL */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              background: '#09090b',
              color: '#f8fafc',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              border: '1px solid #27272a',
              boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUpDrawer 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* DRAWER HEADER */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #27272a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ef4123 0%, #fcaf17 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '1.1rem'
                }}>
                  {customer?.name ? customer.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: 'white' }}>
                    {customer?.name ? `Hey, ${customer.name.split(' ')[0]}!` : 'My Campus Orders'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {customerPhone ? `+91 ${customerPhone.slice(-10)}` : '24/7 Order Vault'}
                    </span>
                    {customer?.totalOrders && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        color: '#34d399',
                        background: 'rgba(16, 185, 129, 0.15)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '6px'
                      }}>
                        {customer.totalOrders} Orders Placed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={loadCustomerOrders}
                  disabled={loading}
                  style={{
                    background: '#27272a',
                    border: 'none',
                    color: '#94a3b8',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Refresh Orders"
                >
                  <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: '#27272a',
                    border: 'none',
                    color: '#94a3b8',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* DRAWER BODY (SCROLLABLE) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              
              {/* PHONE NUMBER SYNC PROMPT (IF NOT SAVED) */}
              {!customerPhone && (
                <div style={{
                  background: 'rgba(239, 65, 35, 0.08)',
                  border: '1.5px dashed rgba(239, 65, 35, 0.3)',
                  padding: '1.2rem',
                  borderRadius: '18px',
                  marginBottom: '1.25rem',
                  textAlign: 'center'
                }}>
                  <Sparkles size={24} color="#ef4123" style={{ marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'white', fontSize: '0.95rem', fontWeight: '800' }}>
                    Sync Your Lifetime Campus Orders
                  </h4>
                  <p style={{ margin: '0 0 0.9rem 0', color: '#94a3b8', fontSize: '0.78rem', lineHeight: '1.4' }}>
                    Enter your 10-digit mobile number to access all past receipts and 1-tap re-order anytime.
                  </p>
                  <form onSubmit={handleSavePhone} style={{ display: 'flex', gap: '0.5rem', maxWidth: '320px', margin: '0 auto' }}>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      maxLength={10}
                      style={{
                        flex: 1,
                        background: '#18181b',
                        border: '1px solid #3f3f46',
                        color: 'white',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={phoneInput.replace(/\D/g, '').length < 10}
                      style={{
                        background: '#ef4123',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1rem',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Sync
                    </button>
                  </form>
                </div>
              )}

              {/* SECTION: ACTIVE LIVE ORDERS */}
              {activeOrders.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Flame size={14} /> Active Live Orders ({activeOrders.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeOrders.map(order => (
                      <div
                        key={order._id || order.id}
                        style={{
                          background: '#18181b',
                          border: '1.5px solid #3f3f46',
                          borderRadius: '18px',
                          padding: '1.1rem',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Status Stripe */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: '4px',
                          background: order.status === 'Ready' ? '#10b981' : order.status === 'Cooking' ? '#f59e0b' : '#3b82f6'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>
                              {order.store?.name || order.storeName || 'Campus Store'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                              Order #{order.orderNumber} • {new Date(order.createdAt || order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            background: order.status === 'Ready' 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : order.status === 'Cooking'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                            color: order.status === 'Ready' ? '#34d399' : order.status === 'Cooking' ? '#fbbf24' : '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            {order.status === 'Cooking' && <Clock size={12} className="spin" />}
                            {order.status === 'Ready' && <CheckCircle2 size={12} />}
                            {order.status?.toUpperCase()}
                          </span>
                        </div>

                        {/* Items preview */}
                        {order.items && order.items.length > 0 && (
                          <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                        )}

                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/order-tracker/${order._id || order.id}`);
                          }}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #ef4123 0%, #f97316 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.65rem 1rem',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 4px 15px rgba(239, 65, 35, 0.25)'
                          }}
                        >
                          ⚡ Track Live Status <ChevronRight size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: 24/7 LIFETIME PAST ORDERS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    24/7 Past Orders ({pastOrders.length})
                  </span>
                </div>

                {pastOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                    <ShoppingBag size={42} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#94a3b8' }}>No past orders found</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Your campus orders will stay saved here forever.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pastOrders.map(order => (
                      <div
                        key={order._id || order.id}
                        style={{
                          background: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '18px',
                          padding: '1rem',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>
                              {order.store?.name || order.storeName || 'Campus Store'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              #{order.orderNumber} • {new Date(order.createdAt || order.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(order.createdAt || order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'white', display: 'block' }}>
                              ₹{order.totalAmount || order.total || 0}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              color: order.status === 'Completed' ? '#34d399' : '#ef4444',
                              background: order.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginTop: '0.2rem'
                            }}>
                              {order.refundStatus === 'Refunded' ? 'REFUNDED' : order.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Items list */}
                        {order.items && order.items.length > 0 && (
                          <div style={{
                            background: '#09090b',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '10px',
                            margin: '0.5rem 0',
                            fontSize: '0.78rem',
                            color: '#cbd5e1'
                          }}>
                            {order.items.map((i, idx) => (
                              <span key={idx}>
                                {i.quantity}x {i.name}{idx < order.items.length - 1 ? ' • ' : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Bar */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          {/* 1-Tap Re-order Button */}
                          <button
                            onClick={() => handleReorder(order)}
                            disabled={reorderSuccessId === (order._id || order.id)}
                            style={{
                              flex: 1,
                              background: reorderSuccessId === (order._id || order.id) 
                                ? '#10b981' 
                                : 'rgba(239, 65, 35, 0.15)',
                              color: reorderSuccessId === (order._id || order.id) ? 'white' : '#f97316',
                              border: '1px solid rgba(239, 65, 35, 0.3)',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <RotateCcw size={13} />
                            {reorderSuccessId === (order._id || order.id) ? '✓ Added to Cart!' : '1-Tap Re-order'}
                          </button>

                          {/* View Details / Refund Status */}
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/order-tracker/${order._id || order.id}`);
                            }}
                            style={{
                              background: '#27272a',
                              color: '#94a3b8',
                              border: 'none',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            Details <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Smooth Transitions */}
      <style>{`
        @keyframes slideUpDrawer {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 10px 25px rgba(0,0,0,0.25); }
          50% { box-shadow: 0 12px 30px rgba(239, 65, 35, 0.4); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default UnifiedStudentDock;
