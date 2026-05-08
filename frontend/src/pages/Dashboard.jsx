import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import WhatsAppStatus from '../components/WhatsAppStatus';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import VendorFinance from '../components/VendorFinance';
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
  Plus,
  Phone,
  X,
  Menu,
  QrCode,
  Globe,
  AlertCircle,
  Utensils,
  Package,
  Volume2,
  Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CountdownTimer = ({ deadline, onAccept }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(deadline).getTime() - Date.now());
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline && timeLeft <= 0) return null;
  const isExpired = deadline && timeLeft <= 0;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  return (
    <>
      <button 
        onClick={onAccept} 
        disabled={isExpired}
        className="btn btn-primary" 
        style={{ 
          flex: 1, 
          padding: '0.75rem', 
          borderRadius: '12px', 
          fontSize: '0.875rem',
          opacity: isExpired ? 0.5 : 1,
          cursor: isExpired ? 'not-allowed' : 'pointer',
          background: isExpired ? 'var(--surface-border)' : 'var(--primary)',
          color: isExpired ? 'var(--text-secondary)' : 'white',
          border: 'none'
        }}
      >
        {isExpired ? 'Expired' : 'Accept'}
      </button>
      {!isExpired ? (
        <span style={{ 
          color: minutes === 0 && seconds < 60 ? 'var(--error)' : 'var(--primary)',
          fontWeight: '900',
          background: 'rgba(255,255,255,0.05)',
          padding: '0.4rem 0.75rem',
          borderRadius: '8px',
          border: `1px solid ${minutes === 0 && seconds < 60 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
          fontFamily: 'monospace',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <Clock size={16} /> {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      ) : (
        <span style={{ color: 'var(--error)', fontWeight: '800', fontSize: '0.9rem' }}>Expired...</span>
      )}
    </>
  );
};

const Dashboard = () => {
  const { token, vendor, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket, connected } = useSocket();
  const [orderFilter, setOrderFilter] = useState('Active');
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('orderSoundEnabled') !== 'false');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [verifyingScan, setVerifyingScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'finance', 'kds'
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 30000); // 30s tick
    return () => clearInterval(timerId);
  }, []);

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
      audio.play().catch(e => {
        console.warn('Audio blocked by browser. Please interact with the page first.', e);
        alert('Browser blocked audio. Please click anywhere on the page to enable sounds.');
      });
    }
  };

  const playTestSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().then(() => {
      alert('Sound is working!');
    }).catch(e => {
      alert('Sound blocked! Please check your site permissions and click on the page first.');
    });
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
          const savedStoreId = localStorage.getItem('preferredStoreId');
          const savedStore = storesRes.data.find(s => s._id === savedStoreId);
          setStore(savedStore || storesRes.data[0]);
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

  // Robust Wakeup Mechanism: Refetch data when returning from inactivity/sleep
  useEffect(() => {
    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Vendor Dashboard] Device woke up, syncing fresh data...');
        
        // 1. Hard fetch fresh orders to catch any missed during sleep
        if (store && token) {
           axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${store._id}/vendor-orders`, {
             headers: { Authorization: `Bearer ${token}` }
           })
           .then(res => setOrders(res.data))
           .catch(err => console.error('Wakeup sync failed', err));
        }

        // 2. Ensure Socket is locked in
        if (socket && connected && store) {
           socket.emit('join_store_room', store._id);
        }
      }
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
    };
  }, [store, token, socket, connected]);

  // Join relevant store room whenever the selected store changes
  useEffect(() => {
    if (socket && connected && store) {
      socket.emit('join_store_room', store._id);
      
      const handleNewOrder = (order) => {
        const orderStoreId = (typeof order.store === 'object') ? order.store._id : order.store;
        if (orderStoreId !== store._id) return;

        setOrders(prev => {
          const exists = prev.find(o => o._id === order._id);
          if (exists) return prev.map(o => o._id === order._id ? order : o);
          return [order, ...prev];
        });
      };

      socket.on('new_order', handleNewOrder);
      socket.on('order_status_update', handleNewOrder);
      
      return () => {
        socket.off('new_order', handleNewOrder);
        socket.off('order_status_update', handleNewOrder);
      };
    }
  }, [store, socket, connected]);

  // Persistent Audio Alert System - Every 20 seconds if pending orders exist
  useEffect(() => {
    let interval;
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    
    if (soundEnabled && pendingCount > 0) {
      const playAlert = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.8;
        audio.play().catch(e => console.log('Audio blocked by browser. User interaction needed.', e));
      };

      // Play immediately and then every 20s
      playAlert();
      interval = setInterval(playAlert, 20000);
    }
    
    return () => clearInterval(interval);
  }, [soundEnabled, orders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    // 1. Snapshot previous state for rollback
    const previousOrders = [...orders];
    
    // 2. Optimistic Update (Instant UI change)
    setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));

    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
    } catch (err) {
      // 3. Rollback on failure
      setOrders(previousOrders);
      console.error('Status Update Error:', err.response?.data || err.message);
      alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

  useEffect(() => {
    let scanner;
    if (showScanner) {
      // Small delay to ensure the container is rendered
      const timeoutId = setTimeout(() => {
        scanner = new Html5QrcodeScanner("reader", { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          aspectRatio: 1.0
        });

        const onScanSuccess = async (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.orderId && data.token) {
              scanner.clear().catch(e => console.error(e));
              handleVerifyHandover(data.orderId, data.token);
            }
          } catch (e) {
            console.error("Invalid QR Code content", e);
          }
        };

        const onScanFailure = (error) => {
          // Silent failure - common during scanning
        };

        scanner.render(onScanSuccess, onScanFailure);
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        if (scanner) {
          scanner.clear().catch(e => console.error("Scanner clear error", e));
        }
      };
    }
  }, [showScanner]);

  const handleVerifyHandover = async (orderId, handoverToken) => {
    setVerifyingScan(true);
    setScanResult(null);
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/verify-handover`, 
        { orderId, token: handoverToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setScanResult({ success: true, message: `Order #${response.data.order.orderNumber} Verified!` });
        // Update local state
        setOrders(prev => prev.map(o => o._id === orderId ? response.data.order : o));
        
        // Play success sound
        new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
        
        // Close scanner after pulse
        setTimeout(() => {
          setShowScanner(false);
          setScanResult(null);
        }, 2000);
      }
    } catch (err) {
      setScanResult({ success: false, message: err.response?.data?.message || 'Verification failed' });
    } finally {
      setVerifyingScan(false);
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

  const commissionRate = store?.commissionRate || 5;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const weeklyOrders = orders.filter(o => new Date(o.createdAt) >= startOfWeek);
  const monthlyOrders = orders.filter(o => new Date(o.createdAt) >= startOfMonth);
  const totalOrders = orders;

  const calculateFinanceForPeriod = (periodOrders) => {
    const completed = periodOrders.filter(o => o.status === 'Completed');
    const cancelled = periodOrders.filter(o => o.status === 'Cancelled' && o.paymentStatus === 'Confirmed');
    
    const gross = completed.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const cancelledVolume = cancelled.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const trialEnd = store?.trialEndDate ? new Date(store.trialEndDate) : null;
    const gatewayRate = 0.02;
    const penaltyRate = 0.04;
    const platformRate = 0.03;

    // Split revenue into trial (0% platform) and post-trial (3% platform)
    let trialRevenue = 0;
    let postTrialRevenue = 0;

    if (store?.isTrialStarted && trialEnd) {
      completed.forEach(order => {
        if (new Date(order.createdAt) <= trialEnd) {
          trialRevenue += order.totalAmount;
        } else {
          postTrialRevenue += order.totalAmount;
        }
      });
    } else {
      // If trial never started, everything is post-trial
      postTrialRevenue = gross;
    }

    const gatewayFee = gross * gatewayRate;
    const platformCommission = postTrialRevenue * platformRate;
    const cancellationPenalty = cancelledVolume * penaltyRate;

    const deductions = gatewayFee + platformCommission + cancellationPenalty;
    return { gross, net: gross - deductions };
  };

  const { gross: todayRevenue, net: todayNet } = calculateFinanceForPeriod(todayOrders);
  const { gross: weeklyRevenue, net: weeklyNet } = calculateFinanceForPeriod(weeklyOrders);
  const { gross: monthlyRevenue, net: monthlyNet } = calculateFinanceForPeriod(monthlyOrders);
  const { gross: totalRevenue, net: totalNet } = calculateFinanceForPeriod(totalOrders);

  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'Confirmed').length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;

  // --- NEW ANALYTICS ---
  const getFilteredAnalyticsOrders = () => {
    if (analyticsTimeframe === 'today') return todayOrders;
    if (analyticsTimeframe === 'week') return weeklyOrders;
    if (analyticsTimeframe === 'month') return monthlyOrders;
    
    const start = new Date(customStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);
    
    return orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
  };

  const getChartData = () => {
    const sourceOrders = getFilteredAnalyticsOrders();

    if (analyticsTimeframe === 'today') {
      const hours = Array.from({ length: 24 }, () => 0);
      sourceOrders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hours[h]++;
      });
      return hours.map((count, h) => ({
        label: `${h}:00`,
        orders: count
      })).filter((d, i) => {
        const currentHour = new Date().getHours();
        return d.orders > 0 || (i >= currentHour - 3 && i <= currentHour + 3);
      });
    } else if (analyticsTimeframe === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayCounts = [0, 0, 0, 0, 0, 0, 0];
      sourceOrders.forEach(o => {
        const d = new Date(o.createdAt).getDay();
        dayCounts[d]++;
      });
      return days.map((day, i) => ({
        label: day,
        orders: dayCounts[i]
      }));
    } else {
       // Month or Custom
       let start, end;
       if (analyticsTimeframe === 'month') {
          start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
          end = new Date(); end.setHours(23,59,59,999);
       } else {
          start = new Date(customStartDate); start.setHours(0,0,0,0);
          end = new Date(customEndDate); end.setHours(23,59,59,999);
       }
       
       const dateMap = {};
       for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateMap[dateStr] = 0;
       }
       
       sourceOrders.forEach(o => {
          const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dateMap[dateStr] !== undefined) dateMap[dateStr]++;
       });
       
       return Object.keys(dateMap).map(label => ({
          label,
          orders: dateMap[label]
       }));
    }
  };

  const getTrendingItems = () => {
    const sourceOrders = getFilteredAnalyticsOrders();

    const itemCounts = {};
    sourceOrders.filter(o => o.status !== 'Cancelled').forEach(o => {
      o.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };
  const trendingItems = getTrendingItems();
  const chartData = getChartData();

  // --- KDS UTILS ---
  const getKdsTimerStyle = (order) => {
    if (order.status === 'Ready') return { bg: '#3b82f615', text: '#3b82f6', border: '#3b82f6', label: 'WAITING PICKUP' };
    
    const now = currentTime;
    let diffMinutes = 0;
    
    if (order.isPreOrder && order.scheduledTime) {
      const [hours, minutes] = order.scheduledTime.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);
      
      diffMinutes = (scheduledDate - now) / 60000;
      
      if (diffMinutes < 0) return { bg: '#ef444415', text: '#ef4444', border: '#ef4444', label: 'OVERDUE' };
      if (diffMinutes <= 15) return { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b', label: `${Math.floor(diffMinutes)}m LEFT` };
      return { bg: '#10b98115', text: '#10b981', border: '#10b981', label: `${Math.floor(diffMinutes)}m LEFT` };
    } else {
      diffMinutes = (now - new Date(order.createdAt)) / 60000;
      if (diffMinutes > 20) return { bg: '#ef444415', text: '#ef4444', border: '#ef4444', label: `${Math.floor(diffMinutes)}m LATE` };
      if (diffMinutes > 10) return { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b', label: `${Math.floor(diffMinutes)}m WAITING` };
      return { bg: '#10b98115', text: '#10b981', border: '#10b981', label: `${Math.floor(diffMinutes)}m WAITING` };
    }
  };
  const kdsOrders = orders.filter(o => ['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  // ---------------------

  // Smart filtering
  const getFilteredOrders = () => {
    let filtered;
    switch (orderFilter) {
      case 'Active':
        filtered = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Cooking' || o.status === 'Ready');
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
      case 'Pre-Orders':
        filtered = orders.filter(o => o.isPreOrder);
        break;
      default:
        filtered = orders;
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(query)) ||
        (o.customerPhone && o.customerPhone.includes(query))
      );
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
      case 'Cooking': return '#f59e0b'; // Amber for Cooking
      case 'Ready': return '#8b5cf6'; // Indigo for Ready
      case 'Completed': return '#10b981';
      case 'Cancelled': return '#ef4444';
      default: return '#94a3b8';
    }
  };

   return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.4), inset 0 0 5px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.8), inset 0 0 10px rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 1); }
          100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.4), inset 0 0 5px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); }
        }
        .pending-order-glow {
          animation: pulse-glow 2s infinite ease-in-out !important;
          background: rgba(245, 158, 11, 0.08) !important;
          border-width: 2px !important;
          transform: scale(1.01);
          z-index: 10;
        }
      `}</style>
      {/* Sidebar - Hidden on mobile, or shown as overlay */}
      <aside style={{ 
        width: '280px', 
        background: '#ffffff', 
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
          <img src="/helmet-guy.png" alt="UNIVERSE Symbol" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }}>UNIVERSE <span style={{ color: 'var(--primary)', fontSize: '0.75rem', verticalAlign: 'top' }}>PRO</span></span>
        </div>

        <nav style={{ padding: '1rem', flex: 1 }}>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Main Menu</p>
            <button onClick={() => { setActiveTab('orders'); if (isMobile) setShowSidebar(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: activeTab === 'orders' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'orders' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <LayoutDashboard size={20} /> Dashboard
            </button>
            <button onClick={() => { setActiveTab('kds'); if (isMobile) setShowSidebar(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: activeTab === 'kds' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: activeTab === 'kds' ? '#f59e0b' : 'var(--text-secondary)', fontWeight: activeTab === 'kds' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <Utensils size={20} /> KDS View
            </button>
            <button onClick={() => { setActiveTab('finance'); if (isMobile) setShowSidebar(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: activeTab === 'finance' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: activeTab === 'finance' ? '#10b981' : 'var(--text-secondary)', fontWeight: activeTab === 'finance' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <Banknote size={20} /> Settlements
            </button>
            <Link to="/vendor/store/manage" onClick={() => isMobile && setShowSidebar(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--text-secondary)', fontWeight: '500', textDecoration: 'none', transition: 'var(--transition)' }}>
              <QrCode size={20} /> Store & Menu
            </Link>
            <Link to="/" onClick={() => isMobile && setShowSidebar(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--text-secondary)', fontWeight: '500', textDecoration: 'none', transition: 'var(--transition)' }}>
              <Globe size={20} /> View Home Page
            </Link>
          </div>

          <div>
            <p style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Support</p>
            <div onClick={() => isMobile && setShowSidebar(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
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
                style={{ background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.6rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <Menu size={20} />
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
                  localStorage.setItem('preferredStoreId', e.target.value);
                }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--surface-border)',
                  fontWeight: '700',
                  outline: 'none',
                  flex: isMobile ? 1 : 'none'
                }}
              >
                {stores.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.market || 'BH1 Market'})</option>
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
                  title="Toggle Alert Sounds"
                >
                  <Bell size={20} color={soundEnabled ? 'var(--secondary)' : 'var(--text-secondary)'} />
                </div>
                <div 
                  onClick={playTestSound}
                  style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', cursor: 'pointer' }}
                  title="Test Sound"
                >
                  <Volume2 size={18} color="var(--text-secondary)" />
                </div>
              </>
            )}
            <div 
              onClick={() => setShowScanner(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.4rem', 
                padding: '0 1rem', height: '46px',
                background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', 
                borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                border: '1px solid rgba(16, 185, 129, 0.2)' 
              }}
            >
              <QrCode size={18} /> {isMobile ? '' : 'Scan Handover'}
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', fontWeight: '800' }}>
              {vendor?.name?.charAt(0)}
            </div>
          </div>
        </header>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <div className="glass-card" style={{ 
              width: '100%', maxWidth: '500px', padding: '2rem', 
              borderRadius: '32px', textAlign: 'center', background: '#111' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, color: 'white' }}>Scan Handover QR</h3>
                <button 
                  onClick={() => setShowScanner(false)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>

              {scanResult ? (
                <div style={{ padding: '2rem' }}>
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', 
                    background: scanResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'
                  }}>
                    {scanResult.success ? <CheckCircle2 size={48} color="#10b981" /> : <X size={48} color="#ef4444" />}
                  </div>
                  <h4 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem' }}>{scanResult.success ? 'Success!' : 'Error'}</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>{scanResult.message}</p>
                  {!scanResult.success && (
                    <button 
                      onClick={() => setScanResult(null)} 
                      className="btn btn-primary" 
                      style={{ marginTop: '2rem', width: 'auto', padding: '0.75rem 2rem' }}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div id="reader" style={{ overflow: 'hidden', borderRadius: '24px', background: '#000', border: 'none' }}></div>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '2rem', fontSize: '0.875rem' }}>
                    Position the customer's QR code within the frame to verify handover.
                  </p>
                  {verifyingScan && (
                    <div style={{ marginTop: '1rem', color: 'var(--secondary)', fontWeight: '700' }}>
                      Verifying on Server...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

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
        ) : activeTab === 'finance' ? (
          <VendorFinance storeId={store?._id} />
        ) : activeTab === 'kds' ? (
          <div style={{ padding: isMobile ? '0' : '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>Kitchen Display</h2>
              <button onClick={() => setShowScanner(true)} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', borderRadius: '100px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <QrCode size={18} /> {isMobile ? 'Scan' : 'Scan Handover'}
              </button>
            </div>
            
            {kdsOrders.length === 0 ? (
               <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
                 <Utensils size={48} color="var(--text-secondary)" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                 <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '600' }}>Kitchen is clear. Great job!</p>
               </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '1.25rem',
                alignItems: 'start'
              }}>
                {kdsOrders.map(order => {
                  const tStyle = getKdsTimerStyle(order);
                  return (
                    <div key={order._id} style={{ 
                      background: '#fff', 
                      borderRadius: '20px', 
                      border: `2px solid ${tStyle.border}`,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ background: tStyle.bg, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${tStyle.border}` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: tStyle.text }}>#{order.orderNumber}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: tStyle.text, textTransform: 'uppercase', opacity: 0.8 }}>
                            {order.orderType === 'Take Away' ? '🎒 Take Away' : '🍽️ Dine In'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {order.isPreOrder && <span style={{ background: '#8b5cf6', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800' }}>PRE: {order.scheduledTime}</span>}
                          <span style={{ fontWeight: '900', color: tStyle.text, fontSize: '0.875rem' }}>{tStyle.label}</span>
                        </div>
                      </div>
                      
                      <div style={{ padding: '1.25rem', flex: 1 }}>
                        <div style={{ marginBottom: '1rem' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: idx === order.items.length - 1 ? 0 : '0.75rem', borderBottom: idx !== order.items.length - 1 ? '1px dashed var(--surface-border)' : 'none', paddingBottom: idx !== order.items.length - 1 ? '0.75rem' : '0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '700' }}>
                                <span>{item.quantity}x {item.name} {item.variant && <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>({item.variant})</span>}</span>
                              </div>
                              {item.isCombo && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1rem', marginTop: '0.4rem', borderLeft: '2px solid var(--surface-border)', marginLeft: '0.25rem' }}>
                                  {item.comboItems?.map((ci, cidx) => (
                                    <div key={cidx} style={{ marginBottom: '0.2rem', fontWeight: '600' }}>• {ci.quantity} {ci.name}</div>
                                  ))}
                                  {item.freeItems?.map((fi, fidx) => (
                                    <div key={fidx} style={{ color: '#10b981', fontWeight: '700', marginTop: '0.2rem' }}>+ Free {fi.quantity} {fi.name}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ padding: '1rem', background: 'var(--surface)', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '0.75rem' }}>
                        {order.status === 'Pending' && (
                          <button onClick={() => updateOrderStatus(order._id, 'Confirmed')} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: '#3b82f6', color: 'white', fontWeight: '800', border: 'none', fontSize: '1rem' }}>
                            Accept Order
                          </button>
                        )}
                        {order.status === 'Confirmed' && (
                          <button onClick={() => updateOrderStatus(order._id, 'Ready')} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: '#10b981', color: 'white', fontWeight: '800', border: 'none', fontSize: '1rem' }}>
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'Ready' && (
                          <button onClick={() => setShowScanner(true)} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '800', border: 'none', fontSize: '1rem', display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem' }}>
                            <QrCode size={18} /> Scan to Handover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.5rem' : '0' }}>
            {/* Main Section: Orders & Info - Prioritized on mobile */}
            <div style={{ order: isMobile ? 1 : 2, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
              {/* Live Orders Feed */}
              <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem', borderRadius: '32px' }}>
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
                
                {/* Quick Search Bar */}
                <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.5 }} />
                  <input 
                    type="text" 
                    placeholder="Search Order # or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--surface-border)'}
                  />
                  {searchQuery && (
                    <X 
                      size={16} 
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--error)', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem', borderRadius: '4px' }} 
                    />
                  )}
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Active', count: orders.filter(o => ['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)).length, color: '#f59e0b' },
                    { label: 'Pending', count: pendingOrders, color: '#f59e0b' },
                    { label: 'Confirmed', count: confirmedOrders, color: '#3b82f6' },
                    { label: 'Pre-Orders', count: orders.filter(o => o.isPreOrder).length, color: '#8b5cf6' },
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: isMobile ? 'none' : '65vh', overflowY: isMobile ? 'visible' : 'auto', paddingRight: '0.5rem' }}>
                  {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <Clock size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>{orderFilter === 'Active' ? 'No active orders right now.' : `No ${orderFilter.toLowerCase()} orders.`}</p>
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <div key={order._id} 
                        className={order.status === 'Pending' ? 'pending-order-glow' : ''}
                        style={{ 
                        padding: '1.25rem', 
                        paddingLeft: '1.5rem',
                        background: '#ffffff', 
                        borderRadius: '20px', 
                        border: `1px solid ${order.isPreOrder ? '#8b5cf666' : 'var(--surface-border)'}`, 
                        borderLeft: `4px solid ${order.isPreOrder ? '#8b5cf6' : getStatusColor(order.status)}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        boxShadow: order.isPreOrder ? '0 4px 12px rgba(139, 92, 246, 0.1)' : 'none'
                      }}>
                        {order.isPreOrder && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '20px',
                            background: '#8b5cf6',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '100px',
                            fontSize: '0.65rem',
                            fontWeight: '900',
                            boxShadow: '0 4px 10px rgba(139, 92, 246, 0.4)',
                            zIndex: 10
                          }}>
                            📅 PRE-ORDER
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                              <span style={{ 
                                fontWeight: '900', 
                                fontSize: '1.125rem', 
                                background: 'rgba(99, 102, 241, 0.15)', 
                                color: 'var(--primary)', 
                                padding: '0.3rem 0.8rem', 
                                borderRadius: '8px',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                letterSpacing: '0.02em'
                              }}>
                                #{order.orderNumber}
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
                                {order.status}
                              </span>
                              <span style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                background: order.paymentStatus === 'Confirmed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: order.paymentStatus === 'Confirmed' ? '#10b981' : '#f59e0b',
                                border: `1px solid ${order.paymentStatus === 'Confirmed' ? '#10b98188' : '#f59e0b88'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                💳 ONLINE
                                {order.paymentStatus === 'Confirmed' && (
                                  <span style={{ marginLeft: '4px', color: '#10b981' }}>● PAID</span>
                                )}
                                {order.paymentStatus !== 'Confirmed' && (
                                  <span style={{ marginLeft: '4px', color: '#f59e0b' }}>● UNPAID</span>
                                )}
                              </span>
                              {/* Order Type Badge */}
                              <span style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                background: order.orderType === 'Take Away' 
                                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.15))' 
                                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))',
                                color: order.orderType === 'Take Away' ? '#fbbf24' : '#a78bfa',
                                border: `1.5px solid ${order.orderType === 'Take Away' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(167, 139, 246, 0.4)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                boxShadow: order.orderType === 'Take Away' 
                                  ? '0 2px 8px rgba(245, 158, 11, 0.15)' 
                                  : '0 2px 8px rgba(99, 102, 241, 0.15)'
                              }}>
                                {order.orderType === 'Take Away' ? <Package size={11} /> : <Utensils size={11} />}
                                {order.orderType || 'Dine In'}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                              {getTimeAgo(order.createdAt)} • {order.items.length} Items
                            </p>
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                              {order.isPreOrder && (
                                <div style={{ 
                                  background: 'rgba(139, 92, 246, 0.1)', 
                                  padding: '0.4rem 0.8rem', 
                                  borderRadius: '10px', 
                                  border: '1px solid rgba(139, 92, 246, 0.2)',
                                  marginBottom: '0.5rem'
                                }}>
                                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: '#8b5cf6', textTransform: 'uppercase' }}>Pickup Time</p>
                                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#8b5cf6' }}>{order.scheduledTime}</p>
                                </div>
                              )}
                              <p style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>₹{order.totalAmount}</p>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--surface-border)' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: idx === order.items.length - 1 ? 0 : '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ fontWeight: '700' }}>{item.quantity}x {item.name} {item.variant && `(${item.variant})`}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>₹{item.price * item.quantity}</span>
                              </div>
                              {item.isCombo && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1rem', marginTop: '0.2rem', borderLeft: '2px solid var(--surface-border)', marginLeft: '0.25rem' }}>
                                  {item.comboItems?.map((ci, cidx) => (
                                    <div key={cidx}>• {ci.quantity} {ci.name}</div>
                                  ))}
                                  {item.freeItems?.map((fi, fidx) => (
                                    <div key={fidx} style={{ color: '#10b981' }}>+ Free {fi.quantity} {fi.name}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                           <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                             {order.status === 'Pending' && (
                               <>
                                 {(!order.acceptDeadline) ? (
                                   <button 
                                     onClick={() => updateOrderStatus(order._id, 'Confirmed')} 
                                     className="btn btn-primary" 
                                     style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontSize: '0.875rem' }}
                                   >
                                     Accept Order
                                   </button>
                                 ) : (
                                   <CountdownTimer deadline={order.acceptDeadline} onAccept={() => updateOrderStatus(order._id, 'Confirmed')} />
                                 )}
                               </>
                             )}
                             {order.status === 'Confirmed' && (
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                  {store?.storeType === 'Restaurant' && (
                                    <button 
                                      onClick={() => updateOrderStatus(order._id, 'Cooking')} 
                                      className="btn btn-secondary" 
                                      style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontSize: '0.875rem', background: '#f59e0b', color: 'white' }}
                                    >
                                      Mark Cooking
                                    </button>
                                  )}
                                  <button onClick={() => updateOrderStatus(order._id, 'Ready')} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontSize: '0.875rem', background: '#3b82f6', color: 'white' }}>{store?.storeType === 'Restaurant' ? 'Ready' : 'Mark Ready'}</button>
                                </div>
                              )}
                              {order.status === 'Cooking' && (
                                <button 
                                  onClick={() => updateOrderStatus(order._id, 'Ready')} 
                                  className="btn btn-secondary" 
                                  style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontSize: '0.875rem', background: '#3b82f6', color: 'white' }}
                                >
                                  Order Ready
                                </button>
                              )}
                              {order.status === 'Ready' && (
                                <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', fontSize: '0.875rem', fontWeight: '800', border: '1px dashed #8b5cf6' }}>
                                  Waiting for QR Scan
                                </div>
                              )}
                             {order.status === 'Pending' && (
                               <button onClick={() => updateOrderStatus(order._id, 'Cancelled')} style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'transparent', color: 'var(--error)', fontSize: '0.875rem' }}>Cancel</button>
                             )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions / Store Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', order: isMobile ? 3 : 2 }}>
                {store && (
                  <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                    <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><QrCode size={18} /> Store QR</h4>
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', textAlign: 'center', marginBottom: '1rem' }}>
                      <QRCodeSVG value={`${window.location.origin}/store/${store._id}?source=qr`} size={160} level="H" />
                    </div>
                    <button onClick={() => navigate('/vendor/store/manage')} className="btn btn-secondary" style={{ width: '100%', borderRadius: '12px' }}>Download QR</button>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Business Insights</h3>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {analyticsTimeframe === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.25rem 0.5rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'inherit', fontWeight: '600' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>to</span>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'inherit', fontWeight: '600' }}
                    />
                  </div>
                )}
                
                <div style={{ display: 'flex', background: 'var(--surface-border)', borderRadius: '12px', padding: '0.25rem' }}>
                  {['today', 'week', 'month', 'custom'].map(tf => (
                    <button 
                      key={tf}
                      onClick={() => setAnalyticsTimeframe(tf)}
                      style={{ 
                        padding: '0.4rem 1rem', 
                        borderRadius: '8px', 
                        border: 'none', 
                        background: analyticsTimeframe === tf ? 'var(--surface)' : 'transparent', 
                        color: analyticsTimeframe === tf ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: analyticsTimeframe === tf ? '800' : '600',
                        fontSize: '0.8rem',
                        textTransform: 'capitalize',
                        boxShadow: analyticsTimeframe === tf ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tf === 'today' ? 'Today' : tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem', marginBottom: '2rem', order: isMobile ? 2 : 1 }}>
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} /> {analyticsTimeframe === 'today' ? "Today's Rush Heatmap" : "Historical Volume"}</h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                      <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.orders > 5 ? '#f59e0b' : 'var(--primary)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingBag size={18} /> Trending Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {trendingItems.length > 0 ? trendingItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.name}</span>
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>{item.count} Sold</span>
                    </div>
                  )) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Not enough data for this period.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards - Moved below Live Orders on mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem', order: isMobile ? 3 : 2 }}>
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, color: '#10b981' }}><Banknote size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Net Profit</p>
                <h3 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0, color: '#10b981' }}>₹{Number(todayNet).toFixed(2)}</h3>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Gross: ₹{todayRevenue}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}><ShoppingBag size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Weekly Net Profit</p>
                <h3 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>₹{Number(weeklyNet).toFixed(2)}</h3>
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Sales: ₹{weeklyRevenue}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}><TrendingUp size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Monthly Net Profit</p>
                <h3 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>₹{Number(monthlyNet).toFixed(2)}</h3>
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Sales: ₹{monthlyRevenue}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}><TrendingUp size={100} /></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Life-time Net Profit</p>
                <h3 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>₹{Number(totalNet).toFixed(2)}</h3>
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Total Sales: ₹{totalRevenue}
                </div>
              </div>

              {/* Subscription Status Card */}
              {store && (
                <div className="glass-card" style={{ 
                  padding: '1.5rem', 
                  borderRadius: '24px', 
                  border: `1px solid ${store.isTrialStarted ? (store.daysLeftInTrial > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)') : 'var(--surface-border)'}`,
                  background: store.isTrialStarted ? (store.daysLeftInTrial > 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'var(--glass-bg)'
                }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Subscription Status</p>
                  {!store.isTrialStarted ? (
                    <div>
                      <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--secondary)' }}>Staging Phase</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Waiting for trial activation.</p>
                    </div>
                  ) : store.daysLeftInTrial > 0 ? (
                    <div>
                      <h3 style={{ fontSize: '1.75rem', margin: 0, color: '#10b981' }}>{store.daysLeftInTrial} Days</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Free Trial in progress (0% fees)</p>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--error)' }}>₹{(totalRevenue - totalNet).toFixed(2)}</h3>
                      <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem', fontWeight: '700' }}>{commissionRate}% Platform Fee Applied</p>
                    </div>
                  )}
                </div>
              )}

              <WhatsAppStatus store={store} />

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: store?.isOpen ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${store?.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                 <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>Store Visibility</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: store?.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={20} color={store?.isOpen ? '#10b981' : '#ef4444'} />
                    </div>
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', color: store?.isOpen ? '#10b981' : '#ef4444', display: 'block' }}>{store?.isOpen ? 'ONLINE' : 'OFFLINE'}</span>
                      <Link to={`/store/${store?._id}`} target="_blank" style={{ color: 'var(--primary)', fontSize: '0.75rem', textDecoration: 'underline', fontWeight: '700' }}>View Public Link</Link>
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
          background: '#ffffff', 
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

