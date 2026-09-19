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
  Receipt,
  Store
} from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { CartContext } from '../context/CartContext';

const UnifiedStudentDock = () => {
  const { cart, total, reorder, cartLocationId } = useContext(CartContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('universe_customer_phone') || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [reorderSuccessId, setReorderSuccessId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Paths where the dock should stay completely hidden
  const hidePaths = ['/vendor', '/super-admin', '/vendor-app-download'];
  const shouldHide = hidePaths.some(path => location.pathname.startsWith(path));

  // Hide the floating cart portion when on the /cart page itself or when browsing a different campus
  const isCartPage = location.pathname.startsWith('/cart');
  const activeLocationId = localStorage.getItem('universe_location_id');
  const isCartForCurrentLocation = !cartLocationId || !activeLocationId || cartLocationId === activeLocationId;
  const totalCartItems = isCartForCurrentLocation ? cart.reduce((acc, item) => acc + item.quantity, 0) : 0;

  // Fetch full 24/7 Customer History & Active Orders (Silent sync without jarring flicker)
  const loadCustomerOrders = useCallback(async (silent = true) => {
    const phone = localStorage.getItem('universe_customer_phone');
    const localRecent = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');

    if (!phone) {
      if (localRecent.length > 0) {
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
    }
  }, []);

  useEffect(() => {
    if (!shouldHide) {
      loadCustomerOrders(true);
      const interval = setInterval(() => loadCustomerOrders(true), 45000);

      // WebSockets for Real-time Status updates
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

      activeOrders.forEach(order => {
        const orderId = order._id || order.id;
        if (orderId) socket.emit('join_order_room', orderId);
      });

      socket.on('order_status_update', (updatedOrder) => {
        if (updatedOrder.status === 'Confirmed') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        } else if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Ready') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3').play().catch(() => {});
        }
        loadCustomerOrders(true);
      });

      const handleSync = () => {
        setCustomerPhone(localStorage.getItem('universe_customer_phone') || '');
        loadCustomerOrders(true);
      };
      window.addEventListener('universe_sync_data', handleSync);

      return () => {
        clearInterval(interval);
        socket.close();
        window.removeEventListener('universe_sync_data', handleSync);
      };
    }
  }, [location.pathname, shouldHide, loadCustomerOrders, activeOrders.length]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSavePhone = (e) => {
    e.preventDefault();
    const clean = phoneInput.replace(/\D/g, '').slice(-10);
    if (clean.length === 10) {
      localStorage.setItem('universe_customer_phone', clean);
      setCustomerPhone(clean);
      setPhoneInput('');
      setTimeout(() => loadCustomerOrders(false), 200);
    }
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    const storeId = order.store?._id || order.store;
    reorder(order.items, storeId);
    setReorderSuccessId(order._id || order.id);
    setTimeout(() => {
      setReorderSuccessId(null);
      setIsOpen(false);
      navigate('/cart');
    }, 600);
  };

  if (shouldHide) return null;

  const primaryActiveOrder = activeOrders[0];
  const hasActiveOrder = activeOrders.length > 0;
  const hasCart = totalCartItems > 0 && !isCartPage;
  // If on legal pages with no active order or cart, don't show dock
  const isLegalPage = location.pathname.startsWith('/terms') || location.pathname.startsWith('/privacy');
  if (isLegalPage && !hasActiveOrder && !hasCart) return null;

  const showDock = hasActiveOrder || hasCart || pastOrders.length > 0 || customerPhone;
  if (!showDock) return null;

  return (
    <>
      {/* 🌟 UNIFIED FLOATING DOCK (Clean, High-End Capsule Bar with Branded Shadow) */}
      <div 
        style={{
          position: 'fixed',
          bottom: '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'max-content',
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <div 
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding: (hasActiveOrder || hasCart) ? '6px 8px' : '4px 6px',
            borderRadius: '26px',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.14), 0 6px 18px rgba(239, 65, 35, 0.1), 0 0 0 1px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: (hasActiveOrder || hasCart) ? 'min(620px, calc(100vw - 32px))' : 'auto',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* 1. ACTIVE ORDER STATUS PILL */}
          {hasActiveOrder && (
            <div
              onClick={() => navigate(`/order-tracker/${primaryActiveOrder._id || primaryActiveOrder.id}`)}
              style={{
                flex: '1',
                minWidth: 0,
                background: primaryActiveOrder.status === 'Ready'
                  ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                  : primaryActiveOrder.status === 'Cooking'
                  ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: primaryActiveOrder.status === 'Ready'
                  ? '1.5px solid #10b981'
                  : primaryActiveOrder.status === 'Cooking'
                  ? '1.5px solid #f59e0b'
                  : '1.5px solid #cbd5e1',
                padding: '8px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: primaryActiveOrder.status === 'Ready' ? '#10b981' : primaryActiveOrder.status === 'Cooking' ? '#f59e0b' : '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {primaryActiveOrder.status === 'Ready' ? (
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                ) : primaryActiveOrder.status === 'Cooking' ? (
                  <Flame size={16} className="pulse" />
                ) : (
                  <Clock size={16} />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                    #{primaryActiveOrder.orderNumber}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    background: primaryActiveOrder.status === 'Ready' ? '#10b981' : primaryActiveOrder.status === 'Cooking' ? '#f59e0b' : '#64748b',
                    color: 'white'
                  }}>
                    {primaryActiveOrder.status === 'Ready' ? 'READY' : primaryActiveOrder.status === 'Cooking' ? 'PREPARING' : primaryActiveOrder.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {primaryActiveOrder.store?.name || primaryActiveOrder.storeName || 'Campus Counter'}
                </p>
              </div>

              <ChevronRight size={16} color="#64748b" />
            </div>
          )}

          {/* 2. CART PILL (IF ACTIVE) */}
          {hasCart && (
            <div
              onClick={() => navigate('/cart')}
              style={{
                flex: hasActiveOrder ? '0 1 auto' : '1',
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: '1.5px solid rgba(239, 65, 35, 0.25)',
                padding: '8px 14px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: 'var(--primary, #ef4123)',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShoppingBag size={15} strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>
                    {totalCartItems} {totalCartItems === 1 ? 'Item' : 'Items'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--primary, #ef4123)', fontWeight: '800' }}>
                    ₹{total}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--primary, #ef4123)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '6px 10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(239, 65, 35, 0.25)'
              }}>
                View Cart <ArrowRight size={13} />
              </div>
            </div>
          )}

          {/* 3. 24/7 ORDERS BUTTON (UNIVERSE BRANDED) */}
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) loadCustomerOrders(true);
            }}
            style={{
              background: isOpen ? '#0f172a' : '#ffffff',
              color: isOpen ? '#ffffff' : '#0f172a',
              border: (hasActiveOrder || hasCart) ? '1.5px solid rgba(0,0,0,0.08)' : 'none',
              padding: (hasActiveOrder || hasCart) ? '8px 14px' : '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.2)' : ((hasActiveOrder || hasCart) ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'),
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isOpen ? (
              <X size={18} />
            ) : (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Clock size={17} color="var(--primary, #ef4123)" strokeWidth={2.3} />
                  {(activeOrders.length > 0 || pastOrders.length > 0) && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-7px',
                      background: 'var(--primary, #ef4123)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: '900',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(239, 65, 35, 0.3)'
                    }}>
                      {activeOrders.length || pastOrders.length}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: '800' }}>Orders</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 📱 24/7 UNIFIED STUDENT DRAWER (100% UNIVERSE LIGHT CAMPUS THEME) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '85vh',
              background: '#ffffff',
              color: '#0f172a',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              boxShadow: '0 -20px 50px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'dockSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* TOP HANDLE */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px 0' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: '#e2e8f0' }} />
            </div>

            {/* DRAWER HEADER (LIGHT THEME) */}
            <div style={{
              padding: '1rem 1.4rem 1.2rem 1.4rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ef4123 0%, #fcaf17 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '1.15rem',
                  boxShadow: '0 4px 14px rgba(239, 65, 35, 0.25)'
                }}>
                  {customer?.name ? customer.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>
                    {customer?.name ? `Hey, ${customer.name.split(' ')[0]}!` : 'My Campus Orders'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                      {customerPhone ? `+91 ${customerPhone.slice(-10)}` : '24/7 Orders Vault'}
                    </span>
                    {customer?.totalOrders && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        color: '#059669',
                        background: '#ecfdf5',
                        padding: '0.15rem 0.5rem',
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
                  onClick={() => loadCustomerOrders(false)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    padding: '0.45rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Refresh Orders"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    padding: '0.45rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* DRAWER BODY (SCROLLABLE) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', background: '#f8fafc' }}>
              
              {/* PHONE SYNC PROMPT (IF EMPTY) */}
              {!customerPhone && (
                <div style={{
                  background: '#ffffff',
                  border: '1.5px dashed rgba(239, 65, 35, 0.3)',
                  padding: '1.2rem',
                  borderRadius: '18px',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                  <Sparkles size={22} color="var(--primary, #ef4123)" style={{ marginBottom: '0.4rem' }} />
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '0.95rem', fontWeight: '800' }}>
                    Sync Your Campus Order Vault
                  </h4>
                  <p style={{ margin: '0 0 0.85rem 0', color: '#64748b', fontSize: '0.78rem' }}>
                    Enter your mobile number to view receipts and 1-tap re-order anytime.
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
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        padding: '0.55rem 0.8rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={phoneInput.replace(/\D/g, '').length < 10}
                      style={{
                        background: 'var(--primary, #ef4123)',
                        color: 'white',
                        border: 'none',
                        padding: '0.55rem 1rem',
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

              {/* 1. ACTIVE LIVE ORDERS */}
              {activeOrders.length > 0 && (
                <div style={{ marginBottom: '1.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                    <Flame size={15} color="#ea580c" />
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Live Orders ({activeOrders.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeOrders.map(order => (
                      <div
                        key={order._id || order.id}
                        style={{
                          background: '#ffffff',
                          border: order.status === 'Ready' ? '1.5px solid #10b981' : '1.5px solid #fde68a',
                          borderRadius: '18px',
                          padding: '1.1rem',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                              {order.store?.name || order.storeName || 'Campus Store'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                              Order #{order.orderNumber} • {new Date(order.createdAt || order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '8px',
                            background: order.status === 'Ready' ? '#ecfdf5' : order.status === 'Cooking' ? '#fef3c7' : '#eff6ff',
                            color: order.status === 'Ready' ? '#059669' : order.status === 'Cooking' ? '#d97706' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            {order.status === 'Ready' && <CheckCircle2 size={12} />}
                            {order.status === 'Cooking' && <Clock size={12} className="spin" />}
                            {order.status?.toUpperCase()}
                          </span>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#475569', fontWeight: '500' }}>
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
                            background: 'linear-gradient(135deg, #ef4123 0%, #fcaf17 100%)',
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
                          ⚡ Track Live Status <ChevronRight size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. 24/7 PAST ORDERS VAULT */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <Receipt size={15} color="#64748b" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    24/7 Past Orders ({pastOrders.length})
                  </span>
                </div>

                {pastOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                    <ShoppingBag size={38} style={{ margin: '0 auto 0.5rem auto', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: '#64748b' }}>No past orders found</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem' }}>Your campus orders will stay saved here forever.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pastOrders.map(order => (
                      <div
                        key={order._id || order.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '18px',
                          padding: '1rem',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                              {order.store?.name || order.storeName || 'Campus Store'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              #{order.orderNumber} • {new Date(order.createdAt || order.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(order.createdAt || order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#0f172a', display: 'block' }}>
                              ₹{order.totalAmount || order.total || 0}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              color: order.refundStatus === 'Refunded' ? '#059669' : order.status === 'Completed' ? '#059669' : '#dc2626',
                              background: order.refundStatus === 'Refunded' ? '#ecfdf5' : order.status === 'Completed' ? '#ecfdf5' : '#fef2f2',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginTop: '0.2rem'
                            }}>
                              {order.refundStatus === 'Refunded' ? 'REFUNDED' : order.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div style={{
                            background: '#f8fafc',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '10px',
                            margin: '0.5rem 0',
                            fontSize: '0.78rem',
                            color: '#475569',
                            fontWeight: '500'
                          }}>
                            {order.items.map((i, idx) => (
                              <span key={idx}>
                                {i.quantity}x {i.name}{idx < order.items.length - 1 ? ' • ' : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button
                            onClick={() => handleReorder(order)}
                            disabled={reorderSuccessId === (order._id || order.id)}
                            style={{
                              flex: 1,
                              background: reorderSuccessId === (order._id || order.id) ? '#10b981' : '#fff7ed',
                              color: reorderSuccessId === (order._id || order.id) ? '#ffffff' : '#ea580c',
                              border: '1px solid rgba(239, 65, 35, 0.25)',
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

                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/order-tracker/${order._id || order.id}`);
                            }}
                            style={{
                              background: '#f1f5f9',
                              color: '#475569',
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

      {/* Global CSS for Animations */}
      <style>{`
        @keyframes dockSlideUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
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
