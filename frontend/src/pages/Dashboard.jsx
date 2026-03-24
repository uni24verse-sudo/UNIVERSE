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
  Plus,
  Phone
} from 'lucide-react';

const Dashboard = () => {
  const { token, vendor, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [orderFilter, setOrderFilter] = useState('Active');
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('orderSoundEnabled') !== 'false');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const storesRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/my-stores', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStores(storesRes.data);
        if (storesRes.data.length > 0) {
          // Default to first store or keep previously selected
          setStore(storesRes.data[0]);
        } else {
          setStore(null);
        }
      } catch (err) {
        console.error('Failed to fetch stores', err);
        setStore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, navigate]);

  useEffect(() => {
    if (!store) return;
    
    const fetchStoreOrders = async () => {
      try {
        const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${store._id}/vendor-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(ordersRes.data);
      } catch (err) {
        console.error('Failed to fetch orders', err);
      }
    };
    fetchStoreOrders();
  }, [store, token]);

  useEffect(() => {
    if (store) {
      const newSocket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
      setSocket(newSocket);
      newSocket.emit('join_store_room', store._id);
      newSocket.on('new_order', (order) => {
        setOrders(prev => {
          const exists = prev.find(o => o._id === order._id);
          if (exists) {
            // Update existing order (e.g., payment verification request)
            return prev.map(o => o._id === order._id ? order : o);
          }
          
          // Truly new order
          // Play notification sound if enabled
          if (localStorage.getItem('orderSoundEnabled') === 'true') {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio blocked:', e));
          }
          return [order, ...prev];
        });
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
    if (!store) return;
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${store._id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(prev => ({ ...prev, isOpen: res.data.isOpen }));
      // Also update the store in the stores array so it persists on switch
      setStores(prev => prev.map(s => s._id === store._id ? { ...s, isOpen: res.data.isOpen } : s));
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
  const confirmedOrders = orders.filter(o => o.status === 'Confirmed').length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;

  // Smart filtering
  const getFilteredOrders = () => {
    let filtered;
    switch (orderFilter) {
      case 'Active':
        filtered = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed');
        break;
      case 'Pending':
        filtered = orders.filter(o => o.status === 'Pending');
        break;
      case 'Confirmed':
        filtered = orders.filter(o => o.status === 'Confirmed');
        break;
      case 'Completed':
        filtered = orders.filter(o => o.status === 'Completed');
        break;
      case 'Cancelled':
        filtered = orders.filter(o => o.status === 'Cancelled');
        break;
      default:
        filtered = orders;
    }
    // Sort: Pending first, then Confirmed, then by newest
    return filtered.sort((a, b) => {
      const priority = { 'Pending': 0, 'Confirmed': 1, 'Completed': 2, 'Cancelled': 3 };
      if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const filteredOrders = getFilteredOrders();

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'Confirmed': return '#3b82f6';
      case 'Completed': return '#10b981';
      case 'Cancelled': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Sidebar - Hidden on mobile, or shown as overlay */}
      <aside style={{ 
        width: '280px', 
        background: 'rgba(15, 23, 42, 0.95)', 
        borderRight: '1px solid var(--surface-border)', 
        display: isMobile ? (showSidebar ? 'flex' : 'none') : 'flex', 
        flexDirection: 'column', 
        position: 'fixed', 
        height: '100vh', 
        zIndex: 1000,
        backdropFilter: 'blur(20px)',
        transition: 'transform 0.3s ease',
        transform: isMobile && !showSidebar ? 'translateX(-100%)' : 'translateX(0)'
      }}>
        {isMobile && (
          <button 
            onClick={() => setShowSidebar(false)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white' }}
          >
            <X size={24} />
          </button>
        )}
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
      <main style={{ 
        marginLeft: isMobile ? '0' : '280px', 
        flex: 1, 
        padding: isMobile ? '1.5rem 1rem' : '2rem 3rem',
        paddingBottom: isMobile ? '100px' : '2rem'
      }}>
        <header style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: isMobile ? '1.5rem' : 0,
          marginBottom: isMobile ? '2rem' : '3rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            {isMobile && (
              <button 
                onClick={() => setShowSidebar(true)}
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0.6rem', borderRadius: '12px' }}
              >
                <LayoutDashboard size={20} />
              </button>
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Dashboard</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{vendor?.name}</p>
            </div>
            {isMobile && (
              <div 
                onClick={toggleSound}
                style={{ width: '40px', height: '40px', borderRadius: '12px', background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)' }}
              >
                <Bell size={18} color={soundEnabled ? 'var(--secondary)' : 'var(--text-secondary)'} />
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            alignItems: 'center', 
            gap: isMobile ? '0.75rem' : '1.5rem',
            width: isMobile ? '100%' : 'auto'
          }}>
            {stores.length > 0 && (
              <select 
                value={store?._id || ''} 
                onChange={(e) => {
                  const selected = stores.find(s => s._id === e.target.value);
                  setStore(selected);
                }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--glass-bg)',
                  color: 'white',
                  border: '1px solid var(--surface-border)',
                  fontWeight: '700',
                  outline: 'none',
                  flex: isMobile ? 1 : 'none'
                }}
              >
                {stores.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            )}
            
            {store && !isMobile && (
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
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: store.isOpen ? 'var(--secondary)' : 'var(--error)' }}></div>
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: store.isOpen ? 'var(--secondary)' : 'var(--error)' }}>
                   {store.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            )}
            
            {!isMobile && (
              <>
                <Link 
                  to="/vendor/store/create" 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.4rem', 
                    padding: '0 1rem', height: '46px',
                    background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', 
                    borderRadius: '12px', fontWeight: '700', textDecoration: 'none', 
                    border: '1px solid rgba(99, 102, 241, 0.2)' 
                  }}
                >
                  <Plus size={16} /> New Stall
                </Link>
                <div 
                  onClick={toggleSound}
                  style={{ width: '45px', height: '45px', borderRadius: '14px', background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', cursor: 'pointer' }}
                >
                  <Bell size={20} color={soundEnabled ? 'var(--secondary)' : 'var(--text-secondary)'} />
                </div>
              </>
            )}
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', fontWeight: '800' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
              {/* Live Orders Feed */}
              <div className="glass-card" style={{ padding: '2rem', borderRadius: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    Live Orders
                    {(pendingOrders + confirmedOrders) > 0 && (
                      <span style={{ 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: 'var(--error)', color: 'white', 
                        fontSize: '0.75rem', fontWeight: '900',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                        animation: 'pulse-border 2s infinite'
                      }}>
                        {pendingOrders + confirmedOrders}
                      </span>
                    )}
                  </h3>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Active', count: pendingOrders + confirmedOrders, color: '#f59e0b' },
                    { label: 'Pending', count: pendingOrders, color: '#f59e0b' },
                    { label: 'Confirmed', count: confirmedOrders, color: '#3b82f6' },
                    { label: 'Completed', count: completedOrders, color: '#10b981' },
                    { label: 'Cancelled', count: cancelledOrders, color: '#ef4444' },
                    { label: 'All', count: orders.length, color: '#94a3b8' },
                  ].map(tab => (
                    <button
                      key={tab.label}
                      onClick={() => setOrderFilter(tab.label)}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '100px',
                        border: orderFilter === tab.label ? `1px solid ${tab.color}` : '1px solid var(--surface-border)',
                        background: orderFilter === tab.label ? `${tab.color}15` : 'transparent',
                        color: orderFilter === tab.label ? tab.color : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tab.label}
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '6px',
                        background: orderFilter === tab.label ? `${tab.color}25` : 'rgba(255,255,255,0.05)',
                        fontWeight: '900'
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <Clock size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>{orderFilter === 'Active' ? 'No active orders right now.' : `No ${orderFilter.toLowerCase()} orders.`}</p>
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <div key={order._id} style={{ 
                        padding: '1.25rem', 
                        paddingLeft: '1.5rem',
                        background: order.status === 'Pending' ? 'rgba(245, 158, 11, 0.03)' : 'rgba(255,255,255,0.02)', 
                        borderRadius: '20px', 
                        border: '1px solid var(--surface-border)', 
                        borderLeft: `4px solid ${getStatusColor(order.status)}`,
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '800', fontSize: '1.125rem' }}>Order #{order.orderNumber}</span>
                              <span style={{ 
                                padding: '0.2rem 0.6rem', 
                                background: 'rgba(99, 102, 241, 0.1)', 
                                color: 'var(--primary)', 
                                borderRadius: '6px', 
                                fontSize: '0.65rem', 
                                fontWeight: '800',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                              }}>
                                {store?.market || 'BH1 Market'}
                              </span>
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '8px', 
                                fontSize: '0.65rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                background: order.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 
                                            order.status === 'Confirmed' ? 'rgba(59, 130, 246, 0.2)' : 
                                            order.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' :
                                            'rgba(16, 185, 129, 0.1)',
                                color: order.status === 'Pending' ? '#f59e0b' : 
                                       order.status === 'Confirmed' ? '#2563eb' : 
                                       order.status === 'Cancelled' ? '#ef4444' :
                                       '#10b981',
                                border: `1px solid ${
                                  order.status === 'Pending' ? '#f59e0b44' : 
                                  order.status === 'Confirmed' ? '#2563eb66' : 
                                  order.status === 'Cancelled' ? '#ef444444' :
                                  '#10b98144'
                                }`
                              }}>
                                {order.status === 'Confirmed' && order.paymentMethod === 'UPI' ? 'UPI PAID' : order.status}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                              {getTimeAgo(order.createdAt)} • {new Date(order.createdAt).toLocaleTimeString()} • {order.items.length} Items
                            </p>
                            {order.customerPhone && (
                              <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                                <Phone size={12} /> {order.customerPhone}
                              </p>
                            )}
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
                            <div key={idx} style={{ marginBottom: idx === order.items.length - 1 ? 0 : '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ fontWeight: '700' }}>
                                  {item.quantity}x {item.name} 
                                  {item.variant && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>({item.variant})</span>}
                                  {item.isCombo && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: '800', marginLeft: '0.5rem' }}>COMBO</span>}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>₹{item.price * item.quantity}</span>
                              </div>
                              
                              {item.isCombo && (
                                <div style={{ marginTop: '0.4rem', paddingLeft: '1.5rem', borderLeft: '2px solid var(--surface-border)' }}>
                                  {item.comboItems && item.comboItems.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {item.comboItems.map((ci, cidx) => (
                                        <div key={cidx}>• {ci.quantity} {ci.name}</div>
                                      ))}
                                    </div>
                                  )}
                                  {item.freeItems && item.freeItems.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem', fontWeight: '600' }}>
                                      {item.freeItems.map((fi, fidx) => (
                                        <div key={fidx}>+ Free {fi.quantity} {fi.name}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
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

                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Quick Actions / Store Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {store && (
                  <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                    <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><QrCode size={18} /> Store QR</h4>
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', textAlign: 'center', marginBottom: '1rem' }}>
                      <QRCodeSVG value={`${window.location.origin}/store/${store._id}`} size={160} level="H" />
                    </div>
                    <button onClick={() => navigate('/vendor/store/manage')} className="btn btn-secondary" style={{ width: '100%', borderRadius: '12px' }}>Download QR</button>
                  </div>
                )}

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

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          background: 'rgba(15, 23, 42, 0.95)', 
          backdropFilter: 'blur(20px)', 
          borderTop: '1px solid var(--surface-border)', 
          padding: '0.75rem 0.5rem', 
          display: 'flex', 
          justifyContent: 'space-around', 
          zIndex: 2000 
        }}>
          <Link to="/vendor/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none', flex: 1 }}>
            <LayoutDashboard size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>Home</span>
          </Link>
          <Link to="/vendor/store/manage" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', textDecoration: 'none', flex: 1 }}>
            <QrCode size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>Store</span>
          </Link>
          <div 
            onClick={toggleStoreStatus}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: store?.isOpen ? 'var(--secondary)' : 'var(--error)', cursor: 'pointer', flex: 1 }}
          >
            <Globe size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: '800' }}>{store?.isOpen ? 'Online' : 'Offline'}</span>
          </div>
          <div 
            onClick={handleLogout}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', cursor: 'pointer', flex: 1 }}
          >
            <LogOut size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>Exit</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

