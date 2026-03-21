import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LayoutDashboard, 
  Store, 
  LogOut, 
  ShoppingBag, 
  TrendingUp, 
  Banknote, 
  CreditCard, 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  QrCode,
  Globe,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const { token, vendor, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('orderSoundEnabled') !== 'false'); // Default to true

  useEffect(() => {
    // Initialize sound preference
    if (localStorage.getItem('orderSoundEnabled') === null) {
      localStorage.setItem('orderSoundEnabled', 'true');
    }
  }, []);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('orderSoundEnabled', newVal.toString());
    
    // Play a test sound to give feedback and satisfy browser interaction requirement
    if (newVal) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio blocked:', e));
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/vendor/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const storeRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/my-store', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStore(storeRes.data);

        const ordersRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/orders/vendor-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(ordersRes.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setStore(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, navigate]);

  useEffect(() => {
    if (store) {
      const newSocket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
      setSocket(newSocket);
      newSocket.emit('join_store_room', store._id);
      newSocket.on('new_order', (order) => {
        setOrders(prev => [order, ...prev]);
        // Play notification sound if enabled
        if (localStorage.getItem('orderSoundEnabled') === 'true') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log('Audio blocked:', e));
        }
      });
      return () => newSocket.close();
    }
  }, [store]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  const toggleStoreStatus = async () => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(prev => ({ ...prev, isOpen: res.data.isOpen }));
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  if (loading) return (
    <div className="auth-wrapper">
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem' }}>Updating Dashboard...</p>
    </div>
  );

  const todayRevenue = orders
    .filter(o => o.status === 'Completed' && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const totalRevenue = orders
    .filter(o => o.status === 'Completed')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const pendingOrders = orders.filter(o => o.status === 'Pending').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'rgba(15, 23, 42, 0.8)', borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store color="white" size={24} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}>UniVerse <span style={{ color: 'var(--primary)', fontSize: '0.75rem', verticalAlign: 'top' }}>PRO</span></span>
        </div>

        <nav style={{ padding: '1rem', flex: 1 }}>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Main Menu</p>
            <Link to="/vendor/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/vendor/store/manage" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--text-secondary)', fontWeight: '500', textDecoration: 'none', transition: 'var(--transition)' }}>
              <QrCode size={20} /> Store & Menu
            </Link>
          </div>

          <div>
            <p style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Support</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
               <AlertCircle size={20} /> Help Center
            </div>
          </div>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)' }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '2rem 3rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Hello {vendor?.name}, here's what's happening today.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {store && (
              <div 
                onClick={toggleStoreStatus}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.5rem 1rem', 
                  background: store.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  borderRadius: '100px',
                  cursor: 'pointer',
                  border: `1px solid ${store.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: store.isOpen ? 'var(--secondary)' : 'var(--error)', boxShadow: store.isOpen ? '0 0 10px var(--secondary)' : 'none' }}></div>
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: store.isOpen ? 'var(--secondary)' : 'var(--error)' }}>
                   {store.isOpen ? 'STALL OPEN' : 'STALL CLOSED'}
                </span>
              </div>
            )}
            <div 
              onClick={toggleSound}
              title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
              style={{ width: '45px', height: '45px', borderRadius: '14px', background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'var(--transition)' }}
            >
              <Bell size={20} color={soundEnabled ? 'var(--secondary)' : 'var(--text-secondary)'} />
            </div>
            <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', cursor: 'pointer', fontWeight: '800' }}>
              {vendor?.name?.charAt(0)}
            </div>
          </div>
        </header>

        {!store ? (
          <div className="glass-card" style={{ padding: '5rem 2rem', textAlign: 'center', borderRadius: '40px' }}>
            <div style={{ width: '100px', height: '100px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem auto' }}>
              <Plus size={48} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Launch Your Stall</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>You haven't created a store yet. Set up your menu and generate your unique QR code to start receiving digital orders.</p>
            <Link to="/vendor/store/create" className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem', borderRadius: '16px' }}>
              Create My Store Now
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}><Banknote size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Today's Revenue</p>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>₹{todayRevenue}</h3>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: '700' }}>
                  <TrendingUp size={14} /> Live Updates
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}><ShoppingBag size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Active Orders</p>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>{pendingOrders}</h3>
                <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Waiting to be accepted</p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}><TrendingUp size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Total Life-time</p>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>₹{totalRevenue}</h3>
                <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Across {orders.length} orders</p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white' }}>
                 <p style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.8 }}>Store Visibility</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Globe size={24} />
                    <span style={{ fontSize: '1.25rem', fontWeight: '900' }}>ONLINE</span>
                 </div>
                 <Link to={`/store/${store._id}`} target="_blank" style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'underline' }}>View Public Link</Link>
              </div>
            </div>

            {/* Main Section: Orders & Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
              {/* Live Orders Feed */}
              <div className="glass-card" style={{ padding: '2rem', borderRadius: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Live Orders</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '100px', background: 'var(--surface-border)', color: 'var(--text-secondary)' }}>All Orders</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <Clock size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>Waiting for new orders...</p>
                    </div>
                  ) : (
                    orders.map(order => (
                      <div key={order._id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--surface-border)', transition: 'var(--transition)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '800', fontSize: '1.125rem' }}>Order #{order.orderNumber}</span>
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '8px', 
                                fontSize: '0.65rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                background: order.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : order.status === 'Confirmed' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                                color: order.status === 'Pending' ? '#f59e0b' : order.status === 'Confirmed' ? '#2563eb' : '#10b981',
                                border: `1px solid ${order.status === 'Pending' ? '#f59e0b44' : order.status === 'Confirmed' ? '#2563eb66' : '#10b98144'}`
                              }}>
                                {order.status === 'Confirmed' && order.paymentMethod === 'UPI' ? 'UPI PAID' : order.status}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleTimeString()} • {order.items.length} Items</p>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>₹{order.totalAmount}</p>
                            <p style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: '700',
                              color: order.paymentMethod === 'UPI' ? '#3b82f6' : 'var(--text-secondary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'flex-end', 
                              gap: '0.25rem' 
                            }}>
                              {order.paymentMethod === 'UPI' ? <CreditCard size={10} /> : <Banknote size={10} />} {order.paymentMethod}
                            </p>
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: idx === order.items.length - 1 ? 0 : '0.5rem' }}>
                              <span>{item.quantity}x {item.name}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {order.paymentMethod === 'Cash' && order.status === 'Pending' && (
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'Confirmed')} 
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '0.75rem', height: 'auto', borderRadius: '12px', fontSize: '0.875rem' }}
                              >
                                Accept Order (Cash)
                              </button>
                            )}
                            
                            {order.paymentMethod === 'UPI' && order.paymentStatus === 'Verification Requested' && (
                              <button 
                                onClick={async () => {
                                  try {
                                    const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${order._id}/verify-payment`, {}, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    setOrders(orders.map(o => o._id === order._id ? res.data : o));
                                  } catch (err) { alert('Verification failed'); }
                                }}
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '0.75rem', height: 'auto', borderRadius: '12px', fontSize: '0.875rem', background: '#2563eb', borderColor: '#2563eb' }}
                              >
                                Confirm Payment Received
                              </button>
                            )}

                            {order.status === 'Confirmed' && (
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'Completed')} 
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '0.75rem', height: 'auto', borderRadius: '12px', fontSize: '0.875rem', background: 'var(--secondary)', color: 'white', borderColor: 'var(--secondary)' }}
                              >
                                <CheckCircle2 size={18} style={{ marginRight: '0.5rem' }} /> Mark Ready
                              </button>
                            )}
                            
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'Cancelled')} 
                              style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {order.paymentStatus === 'Refund Requested' && (
                          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: '700' }}>Refund Requested</span>
                            <button 
                              onClick={async () => {
                                if (window.confirm("Mark as refund processed? (You should have sent the money back already)")) {
                                  try {
                                    const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${order._id}/process-refund`, {}, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    setOrders(orders.map(o => o._id === order._id ? res.data : o));
                                  } catch (err) { alert('Action failed'); }
                                }
                              }}
                              style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
                            >
                              Mark Refund Done
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Quick Actions / Store Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><QrCode size={18} /> Store QR</h4>
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', textAlign: 'center', marginBottom: '1rem' }}>
                    <QRCodeSVG value={`${window.location.origin}/store/${store._id}`} size={160} level="H" />
                  </div>
                  <button onClick={() => navigate('/vendor/store/manage')} className="btn btn-secondary" style={{ width: '100%', borderRadius: '12px' }}>Download QR</button>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Resources</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', fontSize: '0.875rem', cursor: 'pointer' }}>
                      📢 Promoting your stall
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', fontSize: '0.875rem', cursor: 'pointer' }}>
                      📈 Sales optimization
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

