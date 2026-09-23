import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import WhatsAppStatus from '../components/WhatsAppStatus';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import VendorFinance from '../components/VendorFinance';
import EmployeeManagement from '../components/EmployeeManagement';
import VendorPromotionManager from '../components/VendorPromotionManager';
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
  Share2,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  Users,
  Sparkles,
  Smartphone,
  Zap
} from 'lucide-react';
import { playOrderCompletedSound } from '../utils/soundHelper';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CountdownTimer = ({ deadline, onAccept }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    return deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0;
  });

  useEffect(() => {
    if (!deadline) return;
    setTimeLeft(Math.max(0, new Date(deadline).getTime() - Date.now()));
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

const NewFeatureBadge = () => (
  <span style={{ 
    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', 
    color: 'white', 
    fontSize: '0.65rem', 
    fontWeight: '900', 
    padding: '0.2rem 0.5rem', 
    borderRadius: '100px', 
    letterSpacing: '0.05em', 
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '0.5rem',
    animation: 'pulse-glow 2s infinite ease-in-out'
  }}>
    NEW
  </span>
);

const MODAL_KEY = 'v1.1_modal';
const KDS_KEY = 'v1.1_kds';
const INSIGHTS_KEY = 'v1.1_insights';

const Dashboard = () => {
  const { token, vendor, logout, updateVendor, triggerSessionExpired, isSessionExpired } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeFetchFailed, setStoreFetchFailed] = useState(false);
  const { socket, connected } = useSocket();
  const [orderFilter, setOrderFilter] = useState('Active');
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('orderSoundEnabled') !== 'false');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [verifyingScan, setVerifyingScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scannerMode, setScannerMode] = useState('camera');
  const [manualOrderId, setManualOrderId] = useState('');
  const [manualHandoverCode, setManualHandoverCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'finance', 'kds'
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState(null);
  const [bulkCompleting, setBulkCompleting] = useState(false);

  useEffect(() => {
    const vendorId = vendor?.id || vendor?._id;
    if (vendorId) {
      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem('universe_vendor_seen_features') || '[]');
      } catch (e) {}
      const hasSeenModal = vendor.seenFeatures?.includes(MODAL_KEY) || stored.includes(MODAL_KEY);
      if (!hasSeenModal) {
        setShowReleaseModal(true);
      }
    }
  }, [vendor]);

  const markFeatureAsSeen = (featureKey) => {
    const vendorId = vendor?.id || vendor?._id;
    if (vendorId) {
      try {
        const stored = JSON.parse(localStorage.getItem('universe_vendor_seen_features') || '[]');
        if (!stored.includes(featureKey)) {
          stored.push(featureKey);
          localStorage.setItem('universe_vendor_seen_features', JSON.stringify(stored));
        }
      } catch (e) {}

      if (!vendor.seenFeatures?.includes(featureKey)) {
        axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/mark-feature-seen`, 
          { featureKey },
          { headers: { 'Authorization': `Bearer ${token}` } }
        ).then(res => {
          if (res.data?.admin) {
            updateVendor(res.data.admin);
          }
        }).catch(() => {
          // Gracefully fallback when feature flag route is omitted
        });
      }
    }
  };

  const closeReleaseModal = () => {
    setShowReleaseModal(false);
    markFeatureAsSeen(MODAL_KEY);
  };

  // Watch for analytics interactions to mark insights as seen
  useEffect(() => {
    if (analyticsTimeframe !== 'today') {
      markFeatureAsSeen(INSIGHTS_KEY);
    }
  }, [analyticsTimeframe]);

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
        setStoreFetchFailed(false);
        const storesRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/my-stores', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStores(storesRes.data);
        if (storesRes.data.length > 0) {
          const savedStoreId = localStorage.getItem('preferredStoreId');
          const savedStore = storesRes.data.find(s => (s._id === savedStoreId || s.id === savedStoreId));
          setStore(savedStore || storesRes.data[0]);
        } else {
          setStore(null);
        }
      } catch (err) {
        console.error('Failed to fetch stores', err);
        setStoreFetchFailed(true);
        if (err?.response?.status === 401 || err?.response?.data?.code === 'TOKEN_EXPIRED') {
          triggerSessionExpired?.();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, navigate, triggerSessionExpired]);

  useEffect(() => {
    if (!store) return;
    
    const fetchStoreOrders = async () => {
      try {
        const storeId = store._id || store.id;
        const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${storeId}/vendor-orders`, {
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
           const storeId = store._id || store.id;
           axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${storeId}/vendor-orders`, {
             headers: { Authorization: `Bearer ${token}` }
           })
           .then(res => setOrders(res.data))
           .catch(err => console.error('Wakeup sync failed', err));
        }

        // 2. Ensure Socket is locked in
        if (socket && connected && store) {
           const storeId = store._id || store.id;
           socket.emit('join_store_room', storeId);
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
      const currentStoreId = store._id || store.id;
      socket.emit('join_store_room', currentStoreId);
      
      const handleNewOrder = (order) => {
        const orderStoreId = (typeof order.store === 'object') ? (order.store._id || order.store.id) : order.store;
        if (orderStoreId !== currentStoreId) return;

        setOrders(prev => {
          const exists = prev.find(o => (o._id === order._id || o.id === order.id));
          if (exists) return prev.map(o => (o._id === order._id || o.id === order.id) ? order : o);
          return [order, ...prev];
        });
      };

      const handleStoreStatus = ({ storeId, isOpen }) => {
        const currentStoreId = store._id || store.id;
        if (storeId === currentStoreId) {
          setStore(prev => ({ ...prev, isOpen }));
          setStores(prev => prev.map(s => (s._id === storeId || s.id === storeId) ? { ...s, isOpen } : s));
        }
      };

      const handleStoreAutoAccept = ({ storeId, autoAcceptOrders }) => {
        const currentStoreId = store._id || store.id;
        if (storeId === currentStoreId) {
          setStore(prev => ({ ...prev, autoAcceptOrders }));
          setStores(prev => prev.map(s => (s._id === storeId || s.id === storeId) ? { ...s, autoAcceptOrders } : s));
        }
      };

      socket.on('new_order', handleNewOrder);
      socket.on('order_status_update', handleNewOrder);
      socket.on('store_status_update', handleStoreStatus);
      socket.on('store_auto_accept_update', handleStoreAutoAccept);
      
      return () => {
        socket.off('new_order', handleNewOrder);
        socket.off('order_status_update', handleNewOrder);
        socket.off('store_status_update', handleStoreStatus);
        socket.off('store_auto_accept_update', handleStoreAutoAccept);
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

  const updateOrderStatus = async (orderId, newStatus, reason) => {
    // 1. Snapshot previous state for rollback
    const previousOrders = [...orders];
    
    // 2. Optimistic Update (Instant UI change)
    setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));

    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/status`, 
        { status: newStatus, reason },
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
    if (showScanner && scannerMode === 'camera') {
      // Small delay to ensure the container is rendered
      const timeoutId = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            aspectRatio: 1.0
          });

          const onScanSuccess = async (decodedText) => {
            try {
              const data = JSON.parse(decodedText);
              const targetOrderId = data.orderId || data.id || data.orderNumber;
              const targetToken = data.handoverToken || data.token;
              if (targetOrderId && targetToken) {
                scanner.clear().catch(e => console.error(e));
                handleVerifyHandover(targetOrderId, targetToken);
              } else {
                setScanResult({ success: false, message: 'Invalid QR Code: Missing Order ID or Handover Token' });
              }
            } catch (e) {
              console.error("Invalid QR Code content", e);
              setScanResult({ success: false, message: 'Could not read QR code. Ensure it is a valid UniVerse customer QR.' });
            }
          };

          const onScanFailure = (error) => {
            // Silent failure - common during scanning
          };

          scanner.render(onScanSuccess, onScanFailure);
        } catch (e) {
          console.error("Failed to initialize scanner:", e);
        }
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        if (scanner) {
          scanner.clear().catch(e => console.error("Scanner clear error", e));
        }
      };
    }
  }, [showScanner, scannerMode]);

  const downloadDashboardQR = () => {
    const svg = document.getElementById('dashboard-store-qr');
    if (!svg || !store) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 60;
        canvas.height = img.height + 140;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw store name
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(store.name || 'Store', canvas.width / 2, 40);
        
        ctx.drawImage(img, 30, 65);
        
        // Draw footer
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Scan to order via UniVerse', canvas.width / 2, canvas.height - 30);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${(store.name || 'Store').replace(/[^a-zA-Z0-9_-]/g, '_')}_QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Failed to download dashboard QR:', err);
    }
  };

  const handleVerifyHandover = async (orderId, handoverToken) => {
    setVerifyingScan(true);
    setScanResult(null);
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/verify-handover`, 
        { orderId, handoverToken, token: handoverToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setScanResult({ success: true, message: `Order #${response.data.order?.orderNumber || ''} Verified & Handed Over!` });
        // Update local state
        const completedOrder = response.data.order;
        setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? (completedOrder || { ...o, status: 'Completed' }) : o));
        
        // Play success sound
        playOrderCompletedSound();
        
        // Close scanner after pulse
        setTimeout(() => {
          setShowScanner(false);
          setScanResult(null);
          setManualOrderId('');
          setManualHandoverCode('');
        }, 1800);
      }
    } catch (err) {
      setScanResult({ success: false, message: err.response?.data?.message || 'Verification failed' });
    } finally {
      setVerifyingScan(false);
    }
  };

  const handleDirectHandover = async (orderId) => {
    try {
      setCompletingOrderId(orderId);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/handover-direct`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        const completedOrder = res.data.order;
        setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? (completedOrder || { ...o, status: 'Completed' }) : o));
        playOrderCompletedSound();
      }
    } catch (err) {
      console.error('Direct Handover Error:', err);
      alert(err.response?.data?.message || 'Failed to complete handover');
    } finally {
      setCompletingOrderId(null);
    }
  };

  const handleCompleteAllReady = async () => {
    const readyOrdersCount = orders.filter(o => o.status === 'Ready').length;
    if (readyOrdersCount === 0) return;

    const confirmed = window.confirm(`Complete all ${readyOrdersCount} Ready orders? This marks them as handed over to students.`);
    if (!confirmed) return;

    const targetStoreId = store?._id || store?.id;
    if (!targetStoreId) return;

    try {
      setBulkCompleting(true);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/store/${targetStoreId}/complete-all-ready`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success && Array.isArray(res.data?.orders)) {
        const completedMap = new Map(res.data.orders.map(o => [o.id || o._id, o]));
        setOrders(prev => prev.map(o => completedMap.get(o._id) || completedMap.get(o.id) || o));
        playOrderCompletedSound();
      }
    } catch (err) {
      console.error('Bulk Complete Error:', err);
      alert(err.response?.data?.message || 'Failed to bulk complete orders');
    } finally {
      setBulkCompleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  const toggleStoreStatus = async () => {
    if (!store) return;
    const targetId = store._id || store.id;
    const nextStatus = !store.isOpen;
    // Instant optimistic update
    setStore(prev => ({ ...prev, isOpen: nextStatus }));
    setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, isOpen: nextStatus } : s));

    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${targetId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.isOpen !== undefined) {
        setStore(prev => ({ ...prev, isOpen: res.data.isOpen }));
        setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, isOpen: res.data.isOpen } : s));
      }
    } catch (err) {
      alert('Failed to toggle status');
      setStore(prev => ({ ...prev, isOpen: !nextStatus }));
      setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, isOpen: !nextStatus } : s));
    }
  };

  const toggleAutoAccept = async () => {
    if (!store) return;
    const targetId = store._id || store.id;
    const nextStatus = !store.autoAcceptOrders;
    // Instant optimistic update
    setStore(prev => ({ ...prev, autoAcceptOrders: nextStatus }));
    setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, autoAcceptOrders: nextStatus } : s));

    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${targetId}/toggle-auto-accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.autoAcceptOrders !== undefined) {
        setStore(prev => ({ ...prev, autoAcceptOrders: res.data.autoAcceptOrders }));
        setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, autoAcceptOrders: res.data.autoAcceptOrders } : s));
      }
    } catch (err) {
      alert('Failed to update Auto-Accept setting');
      setStore(prev => ({ ...prev, autoAcceptOrders: !nextStatus }));
      setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, autoAcceptOrders: !nextStatus } : s));
    }
  };

  if (loading) return (
    <div className="auth-wrapper">
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem' }}>Updating Dashboard...</p>
    </div>
  );

  const commissionRate = store?.commissionRate || 5;
  const platformRate = 0.03;
  const gatewayRate = 0.02;
  const penaltyRate = 0.04;

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

    // Standard rates — 3% UniVerse platform commission + 2% payment gateway
    const gatewayFee = gross * gatewayRate;
    const platformCommission = gross * platformRate;
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
  function parseScheduledTimeIST(scheduledTimeStr) {
    if (!scheduledTimeStr) return null;
    const trimmed = scheduledTimeStr.trim().toUpperCase();
    const isPM = trimmed.includes('PM');
    const isAM = trimmed.includes('AM');
    const cleanStr = trimmed.replace(/[^\d:]/g, '');
    const parts = cleanStr.split(':');
    if (parts.length < 2) return null;

    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utcMs + (5.5 * 3600000));

    const istScheduled = new Date(istNow);
    istScheduled.setHours(hours, minutes, 0, 0);

    const diffMinutes = (istScheduled.getTime() - istNow.getTime()) / (1000 * 60);
    return {
      diffMinutes: Math.round(diffMinutes),
      hours,
      minutes,
      formattedTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
  }

  const getKdsTimerStyle = (order) => {
    if (order.status === 'Ready') return { bg: '#3b82f615', text: '#3b82f6', border: '#3b82f6', label: 'WAITING PICKUP' };
    
    const now = currentTime;
    let diffMinutes = 0;
    
    if (order.isPreOrder && order.scheduledTime) {
      const parsed = parseScheduledTimeIST(order.scheduledTime);
      diffMinutes = parsed ? parsed.diffMinutes : 0;
      
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
      const priority = { 'Pending': 0, 'Confirmed': 1, 'Cooking': 2, 'Ready': 3, 'Completed': 4, 'Cancelled': 5 };
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
            <button onClick={() => { setActiveTab('kds'); if (isMobile) setShowSidebar(false); markFeatureAsSeen(KDS_KEY); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '14px', background: activeTab === 'kds' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: activeTab === 'kds' ? '#f59e0b' : 'var(--text-secondary)', fontWeight: activeTab === 'kds' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Utensils size={20} /> KDS View
              </div>
              {!vendor?.seenFeatures?.includes(KDS_KEY) && <NewFeatureBadge />}
            </button>
            <button onClick={() => { setActiveTab('finance'); if (isMobile) setShowSidebar(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: activeTab === 'finance' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: activeTab === 'finance' ? '#10b981' : 'var(--text-secondary)', fontWeight: activeTab === 'finance' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <Banknote size={20} /> Settlements
            </button>
            <button onClick={() => { setActiveTab('employees'); if (isMobile) setShowSidebar(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: activeTab === 'employees' ? 'rgba(139, 92, 246, 0.1)' : 'transparent', color: activeTab === 'employees' ? '#8b5cf6' : 'var(--text-secondary)', fontWeight: activeTab === 'employees' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <Users size={20} /> Employees
            </button>
            <button onClick={() => { setActiveTab('promotions'); if (isMobile) setShowSidebar(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '14px', background: activeTab === 'promotions' ? 'rgba(239, 65, 35, 0.1)' : 'transparent', color: activeTab === 'promotions' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'promotions' ? '700' : '500', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Sparkles size={20} /> Promote Stall
              </div>
              <NewFeatureBadge />
            </button>

            <Link to="/vendor-app-download" onClick={() => isMobile && setShowSidebar(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', fontWeight: '700', textDecoration: 'none', transition: 'var(--transition)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Smartphone size={20} /> UNIVERSE App (APK)
              </div>
              <span style={{ fontSize: '0.65rem', background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>APP</span>
            </Link>
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
                value={(store?._id || store?.id) || ''} 
                onChange={(e) => {
                  const selected = stores.find(s => (s._id === e.target.value || s.id === e.target.value));
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
                {stores.map(s => {
                  const sId = s._id || s.id;
                  return <option key={sId} value={sId}>{s.name} ({s.market || 'BH1 Market'})</option>;
                })}
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

            {store && !isMobile && (
              <div 
                onClick={toggleAutoAccept}
                title={store.autoAcceptOrders ? "Auto-Accept Orders is ON. Click to turn OFF." : "Auto-Accept Orders is OFF. Click to turn ON."}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  padding: '0.5rem 1rem', 
                  background: store.autoAcceptOrders ? 'rgba(239, 65, 35, 0.12)' : 'rgba(100, 116, 139, 0.08)', 
                  borderRadius: '100px',
                  cursor: 'pointer',
                  border: `1px solid ${store.autoAcceptOrders ? 'rgba(239, 65, 35, 0.35)' : 'rgba(100, 116, 139, 0.2)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                <Zap size={14} color={store.autoAcceptOrders ? '#ef4123' : '#64748b'} fill={store.autoAcceptOrders ? '#ef4123' : 'none'} />
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: store.autoAcceptOrders ? '#ef4123' : '#64748b' }}>
                   Auto-Accept: {store.autoAcceptOrders ? 'ON' : 'OFF'}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, color: 'white' }}>Verify Handover</h3>
                <button 
                  onClick={() => {
                    setShowScanner(false);
                    setScanResult(null);
                  }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '14px' }}>
                <button 
                  onClick={() => { setScannerMode('camera'); setScanResult(null); }}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
                    background: scannerMode === 'camera' ? 'var(--primary)' : 'transparent',
                    color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <QrCode size={16} /> Camera Scanner
                </button>
                <button 
                  onClick={() => { setScannerMode('manual'); setScanResult(null); }}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
                    background: scannerMode === 'manual' ? 'var(--primary)' : 'transparent',
                    color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <Sparkles size={16} /> Enter Code
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
              ) : scannerMode === 'camera' ? (
                <>
                  <div id="reader" style={{ overflow: 'hidden', borderRadius: '24px', background: '#000', border: 'none' }}></div>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                    Position the customer's QR code within the frame to verify handover.
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Camera blocked or on desktop? Switch to <strong>Enter Code</strong> above.
                  </p>
                  {verifyingScan && (
                    <div style={{ marginTop: '1rem', color: 'var(--secondary)', fontWeight: '700' }}>
                      Verifying on Server...
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'left', padding: '0.5rem 0' }}>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                    Select Ready Order
                  </label>
                  <select 
                    value={manualOrderId} 
                    onChange={e => setManualOrderId(e.target.value)}
                    style={{
                      width: '100%', padding: '0.85rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white', fontSize: '0.9rem', marginBottom: '1.25rem', outline: 'none'
                    }}
                  >
                    <option value="" style={{ background: '#1e293b' }}>-- Select Ready Order --</option>
                    {orders.filter(o => o.status === 'Ready').map(o => (
                      <option key={o._id} value={o._id} style={{ background: '#1e293b' }}>
                        Order #{o.orderNumber} - {o.customerName || 'Customer'} (₹{o.totalAmount})
                      </option>
                    ))}
                  </select>

                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                    6-Character Pickup Code
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. 9B2X4A"
                    maxLength={10}
                    value={manualHandoverCode}
                    onChange={e => setManualHandoverCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%', padding: '0.85rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '2px',
                      textTransform: 'uppercase', marginBottom: '1.5rem', outline: 'none'
                    }}
                  />

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      disabled={verifyingScan || !manualOrderId || !manualHandoverCode.trim()}
                      onClick={() => handleVerifyHandover(manualOrderId, manualHandoverCode.trim())}
                      className="btn btn-primary"
                      style={{
                        flex: 1, padding: '0.9rem', borderRadius: '12px',
                        fontWeight: '800', fontSize: '0.95rem',
                        cursor: (!manualOrderId || !manualHandoverCode.trim() || verifyingScan) ? 'not-allowed' : 'pointer',
                        opacity: (!manualOrderId || !manualHandoverCode.trim() || verifyingScan) ? 0.6 : 1
                      }}
                    >
                      {verifyingScan ? 'Verifying...' : 'Verify & Handover'}
                    </button>
                    {manualOrderId && (
                      <button
                        onClick={() => {
                          handleDirectHandover(manualOrderId);
                          setShowScanner(false);
                        }}
                        style={{
                          padding: '0.9rem 1.25rem', borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white', fontWeight: '800', border: 'none',
                          cursor: 'pointer', fontSize: '0.9rem'
                        }}
                        title="Bypass code verification and complete order directly"
                      >
                        1-Click Complete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {storeFetchFailed ? (
          <div className="glass-card" style={{ padding: '4.5rem 2rem', textAlign: 'center', borderRadius: '32px', border: '1px solid rgba(239, 65, 35, 0.15)' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(239, 65, 35, 0.08)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertCircle size={40} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              {isSessionExpired ? 'Session Expired' : 'Unable to Load Stall Data'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
              {isSessionExpired 
                ? 'Your vendor session has ended for security. Please log in again to continue managing your stalls.' 
                : 'There was a temporary issue syncing your stall information. Please refresh the dashboard.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {isSessionExpired ? (
                <button onClick={() => triggerSessionExpired?.()} className="btn btn-primary" style={{ width: 'auto', padding: '0.85rem 2.5rem', borderRadius: '14px' }}>
                  Log In Again
                </button>
              ) : (
                <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ width: 'auto', padding: '0.85rem 2.5rem', borderRadius: '14px' }}>
                  Refresh Dashboard
                </button>
              )}
            </div>
          </div>
        ) : !store ? (
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
          <VendorFinance storeId={store?._id || store?.id} />
        ) : activeTab === 'employees' ? (
          <EmployeeManagement storeId={store?._id || store?.id} />
        ) : activeTab === 'promotions' ? (
          <VendorPromotionManager store={store} />
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: tStyle.text }}>#{order.orderNumber}</span>
                          <span style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            fontSize: '0.65rem', fontWeight: '900', color: order.orderType === 'Take Away' ? '#d97706' : '#7c3aed', 
                            textTransform: 'uppercase', background: 'white', padding: '0.25rem 0.5rem', borderRadius: '100px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                          }}>
                            {order.orderType === 'Take Away' ? <Package size={12} /> : <Utensils size={12} />}
                            {order.orderType === 'Take Away' ? 'Take Away' : 'Dine In'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {order.isPreOrder && <span style={{ background: '#8b5cf6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>PRE: {order.scheduledTime}</span>}
                          <span style={{ 
                            background: tStyle.text, color: 'white', 
                            padding: '0.35rem 0.75rem', borderRadius: '100px', 
                            fontWeight: '900', fontSize: '0.85rem',
                            boxShadow: `0 4px 12px ${tStyle.text}44`
                          }}>
                            {tStyle.label}
                          </span>
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

                      <div style={{ padding: '1rem', background: 'var(--surface)', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {order.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
                            <CountdownTimer 
                              deadline={order.acceptDeadline || (order.createdAt ? new Date(new Date(order.createdAt).getTime() + (order.isPreOrder ? 15 : 5) * 60 * 1000).toISOString() : null)} 
                              onAccept={() => updateOrderStatus(order._id, 'Confirmed')} 
                            />
                          </div>
                        )}
                        {order.status === 'Confirmed' && (
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <button onClick={() => updateOrderStatus(order._id, 'Ready')} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: '#10b981', color: 'white', fontWeight: '800', border: 'none', fontSize: '1rem', cursor: 'pointer' }}>
                              Mark Ready
                            </button>
                            {store?.autoAcceptOrders && (
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Item out of stock? This will cancel Order #${order.orderNumber} and trigger an instant refund of ₹${order.totalAmount} to the student.`)) {
                                    updateOrderStatus(order._id, 'Cancelled', 'Item out of stock');
                                  }
                                }} 
                                style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '800', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontSize: '0.85rem' }}
                                title="Cancel and refund if item unexpectedly ran out"
                              >
                                Cancel & Refund
                              </button>
                            )}
                          </div>
                        )}
                        {order.status === 'Ready' && (
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <button 
                              onClick={() => handleDirectHandover(order._id || order.id)}
                              disabled={completingOrderId === (order._id || order.id)}
                              style={{ 
                                flex: 1.2, 
                                padding: '1rem', 
                                borderRadius: '12px', 
                                background: 'linear-gradient(135deg, #10b981, #059669)', 
                                color: 'white', 
                                fontWeight: '800', 
                                border: 'none', 
                                fontSize: '0.95rem', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                cursor: completingOrderId === (order._id || order.id) ? 'wait' : 'pointer',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                              }}
                            >
                              <Zap size={18} /> {completingOrderId === (order._id || order.id) ? 'Completing...' : 'Complete Handover'}
                            </button>
                            <button 
                              onClick={() => {
                                setManualOrderId(order._id || order.id);
                                setShowScanner(true);
                              }} 
                              style={{ 
                                flex: 0.8, 
                                padding: '1rem', 
                                borderRadius: '12px', 
                                background: 'rgba(255, 255, 255, 0.08)', 
                                color: 'white', 
                                fontWeight: '800', 
                                border: '1px solid rgba(255, 255, 255, 0.15)', 
                                fontSize: '0.95rem', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                cursor: 'pointer'
                              }}
                            >
                              <QrCode size={18} /> Scan / Code
                            </button>
                          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Main Section: Orders & Info - Prioritized on mobile */}
            <div style={{ order: 3, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
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
                
                {/* Mobile Quick Control Strip */}
                {isMobile && store && (
                  <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div 
                      onClick={toggleStoreStatus}
                      style={{ 
                        flex: 1,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '0.45rem', 
                        padding: '0.55rem 0.75rem', 
                        background: store.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: `1px solid ${store.isOpen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: store.isOpen ? 'var(--secondary)' : 'var(--error)' }}></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: store.isOpen ? 'var(--secondary)' : 'var(--error)' }}>
                         {store.isOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <div 
                      onClick={toggleAutoAccept}
                      style={{ 
                        flex: 1.2,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '0.4rem', 
                        padding: '0.55rem 0.75rem', 
                        background: store.autoAcceptOrders ? 'rgba(239, 65, 35, 0.12)' : 'rgba(100, 116, 139, 0.08)', 
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: `1px solid ${store.autoAcceptOrders ? 'rgba(239, 65, 35, 0.35)' : 'rgba(100, 116, 139, 0.2)'}`
                      }}
                    >
                      <Zap size={13} color={store.autoAcceptOrders ? '#ef4123' : '#64748b'} fill={store.autoAcceptOrders ? '#ef4123' : 'none'} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: store.autoAcceptOrders ? '#ef4123' : '#64748b' }}>
                         Auto-Accept: {store.autoAcceptOrders ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                )}

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

                {/* Bulk Complete All Ready Banner */}
                {orders.filter(o => o.status === 'Ready').length > 0 && ['Active', 'Ready', 'All'].includes(orderFilter) && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
                    border: '1.5px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '16px',
                    padding: '0.9rem 1.25rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#065f46' }}>
                        <strong>{orders.filter(o => o.status === 'Ready').length}</strong> Ready for Pickup
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#047857', opacity: 0.8 }}>
                        (Fast rush-hour or closing clear without scanning)
                      </span>
                    </div>
                    <button
                      onClick={handleCompleteAllReady}
                      disabled={bulkCompleting}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: 'white',
                        padding: '0.55rem 1.1rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '900',
                        cursor: bulkCompleting ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Zap size={14} /> {bulkCompleting ? 'Completing...' : `Complete All Ready (${orders.filter(o => o.status === 'Ready').length})`}
                    </button>
                  </div>
                )}

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
                               <div style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
                                 <CountdownTimer deadline={order.acceptDeadline || (order.createdAt ? new Date(new Date(order.createdAt).getTime() + (order.isPreOrder ? 15 : 5) * 60 * 1000).toISOString() : null)} onAccept={() => updateOrderStatus(order._id, 'Confirmed')} />
                               </div>
                             )}
                             {order.status === 'Confirmed' && (
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
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
                                  {store?.autoAcceptOrders && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Item out of stock? This will cancel Order #${order.orderNumber} and trigger an instant refund of ₹${order.totalAmount} to the student.`)) {
                                          updateOrderStatus(order._id, 'Cancelled', 'Item out of stock');
                                        }
                                      }}
                                      style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
                                        fontWeight: '800',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem'
                                      }}
                                      title="Cancel and refund if item unexpectedly ran out"
                                    >
                                      <X size={15} /> Cancel & Refund
                                    </button>
                                  )}
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
                                <div style={{ display: 'flex', gap: '0.6rem', flex: 1, flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleDirectHandover(order._id || order.id)}
                                    disabled={completingOrderId === (order._id || order.id)}
                                    style={{
                                      flex: 1.2,
                                      padding: '0.75rem 1rem',
                                      borderRadius: '12px',
                                      border: 'none',
                                      background: 'linear-gradient(135deg, #10b981, #059669)',
                                      color: 'white',
                                      fontSize: '0.85rem',
                                      fontWeight: '900',
                                      cursor: completingOrderId === (order._id || order.id) ? 'wait' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.4rem',
                                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                                    }}
                                  >
                                    <Zap size={15} /> {completingOrderId === (order._id || order.id) ? 'Completing...' : 'Complete Handover'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setManualOrderId(order._id || order.id);
                                      setShowScanner(true);
                                    }}
                                    style={{
                                      flex: 0.8,
                                      padding: '0.75rem 0.85rem',
                                      borderRadius: '12px',
                                      border: '1px solid rgba(139, 92, 246, 0.4)',
                                      background: 'rgba(139, 92, 246, 0.08)',
                                      color: '#7c3aed',
                                      fontSize: '0.85rem',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.35rem'
                                    }}
                                  >
                                    <QrCode size={15} /> Scan / Code
                                  </button>
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
                      <QRCodeSVG id="dashboard-store-qr" value={`${window.location.origin}/store/${store._id || store.id}?source=qr`} size={160} level="H" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <button onClick={downloadDashboardQR} className="btn btn-primary" style={{ width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <Download size={16} /> Download QR Code
                      </button>
                      <button onClick={() => navigate('/vendor/store/manage')} className="btn btn-secondary" style={{ width: '100%', borderRadius: '12px' }}>
                        Manage Stall
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Section */}
            <div style={{ order: 2, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>Business Insights {!vendor?.seenFeatures?.includes(INSIGHTS_KEY) && <NewFeatureBadge />}</h3>
              
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
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
            </div>

            {/* Stats Cards - Moved to Top */}
            <div style={{ order: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
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

              {/* Commission Plan Card */}
              {store && (
                <div className="glass-card" style={{ 
                  padding: '1.5rem', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>Commission Plan</p>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '999px', 
                      background: 'rgba(99, 102, 241, 0.15)', 
                      color: '#6366f1' 
                    }}>
                      STANDARD 5%
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: '800', color: 'var(--text-primary)' }}>
                    ₹{(totalRevenue * 0.05).toFixed(2)}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Platform Fee (3%):</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{(totalRevenue * 0.03).toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Payment Gateway (2%):</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{(totalRevenue * 0.02).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Status Cards */}
            <div style={{ order: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <WhatsAppStatus store={store} />

              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: store?.isOpen ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${store?.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                 <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>Store Visibility</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: store?.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={20} color={store?.isOpen ? '#10b981' : '#ef4444'} />
                    </div>
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', color: store?.isOpen ? '#10b981' : '#ef4444', display: 'block' }}>{store?.isOpen ? 'ONLINE' : 'OFFLINE'}</span>
                      <Link to={`/store/${store?._id || store?.id}`} target="_blank" style={{ color: 'var(--primary)', fontSize: '0.75rem', textDecoration: 'underline', fontWeight: '700' }}>View Public Link</Link>
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

      {/* Release Modal */}
      {showReleaseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.5rem' : '1rem' }}>
          <div className="glass-card" style={{ background: '#ffffff', borderRadius: isMobile ? '24px' : '32px', width: '100%', maxWidth: '480px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button onClick={closeReleaseModal} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
            <div style={{ height: isMobile ? '160px' : '200px', background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', width: '200%', height: '200%', background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)', animation: 'spin 10s linear infinite' }}></div>
              <img src="/helmet-guy.png" alt="UNIVERSE" style={{ width: isMobile ? '60px' : '80px', height: isMobile ? '60px' : '80px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))', objectFit: 'contain', zIndex: 1 }} />
            </div>
            <div style={{ padding: isMobile ? '1.5rem 1.25rem' : '2.5rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: '900', padding: '0.2rem 0.6rem', borderRadius: '100px', letterSpacing: '0.05em' }}>UPDATE</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600' }}>v1.1 is here</span>
              </div>
              <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '1.25rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>UNIVERSE Pro just got an upgrade.</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f59e0b' }}>
                    <Utensils size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>New KDS View</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Fully redesigned KDS with live wait timers and combo breakdowns.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8b5cf6' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Business Insights</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Visual volume tracking with heatmaps and trending item analytics.</p>
                  </div>
                </div>
              </div>
              <button onClick={closeReleaseModal} style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'var(--text-primary)', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.3)' }}>
                Awesome, let's go!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

