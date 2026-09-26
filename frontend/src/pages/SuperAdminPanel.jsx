import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Shield, 
  Users, 
  Store, 
  ShoppingBag, 
  Banknote, 
  TrendingUp, 
  LogOut,
  Ban,
  Trash2,
  CheckCircle,
  Activity,
  Send,
  Eye,
  EyeOff,
  MapPin,
  GraduationCap,
  Building2,
  Plus,
  Edit2,
  Globe,
  Sparkles,
  FileText,
  Radio,
  GitBranch,
  Sliders,
  RotateCcw,
  Search,
  Database,
  AlertCircle,
  PieChart,
  Clock,
  Phone,
  Mail,
  Tag
} from 'lucide-react';
import SuperAdmin3DAnalytics from '../components/superadmin/SuperAdmin3DAnalytics';
import SuperAdminMasterTemplates from '../components/superadmin/SuperAdminMasterTemplates';
import SuperAdminBroadcasting from '../components/superadmin/SuperAdminBroadcasting';
import SuperAdminJourneyBuilder from '../components/superadmin/SuperAdminJourneyBuilder';
import SuperAdminChannelSettings from '../components/superadmin/SuperAdminChannelSettings';
import SuperAdminCustomerIntelligence from '../components/superadmin/SuperAdminCustomerIntelligence';
import SuperAdminMasterData from '../components/superadmin/SuperAdminMasterData';
import SuperAdminRefunds from '../components/superadmin/SuperAdminRefunds';
import SuperAdminHeroPromotions from '../components/superadmin/SuperAdminHeroPromotions';
import SuperAdminOrdersFeed from '../components/superadmin/SuperAdminOrdersFeed';
import SuperAdminPartnerEquity from '../components/superadmin/SuperAdminPartnerEquity';
import SuperAdminOffersMaster from '../components/superadmin/SuperAdminOffersMaster';
import { useSocket } from '../context/SocketContext';

const SuperAdminPanel = () => {
  const { token, vendor, logout } = useContext(AuthContext); // vendor holds admin data
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '3d_analytics');
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [locations, setLocations] = useState([]);
  const [financeData, setFinanceData] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [financeSubTab, setFinanceSubTab] = useState('dues');
  const [historySearch, setHistorySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('All');
  const [pendingRefundCount, setPendingRefundCount] = useState(0);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeStatusFilter, setStoreStatusFilter] = useState('all');
  const [vendorSubTab, setVendorSubTab] = useState('active');
  const [selectedActiveVendors, setSelectedActiveVendors] = useState([]);
  const [selectedPendingVendors, setSelectedPendingVendors] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const pendingVendors = React.useMemo(() => (vendors || []).filter(v => v.status === 'PENDING_APPROVAL'), [vendors]);
  const activeVendors = React.useMemo(() => (vendors || []).filter(v => v.status !== 'PENDING_APPROVAL'), [vendors]);
  
  // Aggregate Finance Totals directly from table data for 100% mathematical integrity
  const financeTotals = React.useMemo(() => {
    let gross = 0;
    let live = 0;
    let gateway = 0;
    let platform = 0;
    let cancel = 0;
    let transfer = 0;
    (financeData || []).forEach(f => {
      const isAcc = f.settlementStatus === 'accumulating';
      gross += Number(f.totalRevenue || 0);
      live += Number(f.liveUnsettledRevenue || 0);
      gateway += Number(isAcc ? (f.projectedGatewayFee || 0) : (f.gatewayFee || 0));
      platform += Number(isAcc ? (f.projectedPlatformProfit || 0) : (f.platformProfit || 0));
      cancel += Number(isAcc ? (f.projectedCancellationPenalty || 0) : (f.cancellationPenalty || 0));
      transfer += Number(isAcc ? (f.projectedNetPayable || 0) : (f.netPayable || 0));
    });
    return {
      gross,
      live,
      gateway,
      platform,
      cancel,
      transfer,
      totalDeductions: gateway + platform + cancel
    };
  }, [financeData]);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('College');
  const [locationCity, setLocationCity] = useState('');
  const [locationDietaryType, setLocationDietaryType] = useState('both');
  const [locationMarkets, setLocationMarkets] = useState('');

  useEffect(() => {
    if (!token) return navigate('/super-admin/login');
    fetchDashboardData();
  }, [token, navigate]);

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Robust Wakeup Mechanism: Refetch data when returning from inactivity/sleep
  useEffect(() => {
    let wakeupTimer = null;
    const handleWakeup = () => {
      if (document.visibilityState !== 'visible') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      if (wakeupTimer) clearTimeout(wakeupTimer);
      // Debounce by 800ms to allow laptop/mobile Wi-Fi to establish connection after waking from sleep
      wakeupTimer = setTimeout(() => {
        console.log('[SuperAdminPanel] Device woke up and online, syncing fresh data...');
        fetchDashboardData(true);
      }, 800);
    };

    const handleOnline = () => {
      console.log('[SuperAdminPanel] Network reconnected, syncing fresh data...');
      if (wakeupTimer) clearTimeout(wakeupTimer);
      wakeupTimer = setTimeout(() => {
        fetchDashboardData(true);
      }, 500);
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);
    window.addEventListener('online', handleOnline);

    return () => {
      if (wakeupTimer) clearTimeout(wakeupTimer);
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('online', handleOnline);
    };
  }, [token]);

  // Join SuperAdmin Socket Room for real-time telemetry, QR pairing & broadcast progress
  useEffect(() => {
    if (socket && connected && token) {
      socket.emit('join_superadmin_room', { token });

      const handleNewRefund = () => setPendingRefundCount(prev => prev + 1);
      const handleRefundSettled = () => setPendingRefundCount(prev => Math.max(0, prev - 1));

      socket.on('new_refund_request', handleNewRefund);
      socket.on('refund_settled', handleRefundSettled);

      return () => {
        socket.off('new_refund_request', handleNewRefund);
        socket.off('refund_settled', handleRefundSettled);
      };
    }
  }, [socket, connected, token]);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = (typeof window !== 'undefined' && window.location.hostname && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1')
        ? window.location.origin
        : (import.meta.env.VITE_API_URL || 'http://localhost:5000');
      const config = { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000 
      };
      
      const [statsRes, vendorsRes, ordersRes, storesRes, financeRes, historyRes, locationsRes, refundsRes] = await Promise.all([
        axios.get(`${url}/api/super-admin/stats`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/vendors`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/orders`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/stores`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/finance`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/finance/history`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/locations`, config).catch(e => ({ isError: true })),
        axios.get(`${url}/api/super-admin/refunds/pending`, config).catch(e => ({ isError: true }))
      ]);

      if (!refundsRes.isError && Array.isArray(refundsRes.data)) {
        setPendingRefundCount(refundsRes.data.length);
      }

      // ONLY update state if the API call succeeded! Never overwrite existing valid data with empty arrays
      if (!statsRes.isError && statsRes.data) setStats(statsRes.data);
      if (!vendorsRes.isError && Array.isArray(vendorsRes.data)) setVendors(vendorsRes.data);
      if (!ordersRes.isError && Array.isArray(ordersRes.data)) setOrders(ordersRes.data);
      if (!storesRes.isError && Array.isArray(storesRes.data)) setStores(storesRes.data);
      if (!financeRes.isError && Array.isArray(financeRes.data)) setFinanceData(financeRes.data);
      if (!historyRes.isError && Array.isArray(historyRes.data)) setSettlementHistory(historyRes.data);
      if (!locationsRes.isError && Array.isArray(locationsRes.data)) setLocations(locationsRes.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        logout();
        navigate('/super-admin/login');
      } else {
        console.error('Failed to fetch SuperAdmin data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const headers = { Authorization: `Bearer ${token}` };
      const payload = { 
        name: locationName, 
        type: locationType, 
        city: locationCity,
        dietaryType: locationDietaryType,
        markets: locationMarkets
      };

      if (editingLocation) {
        await axios.put(`${url}/api/super-admin/locations/${editingLocation._id}`, payload, { headers });
      } else {
        await axios.post(`${url}/api/super-admin/locations`, payload, { headers });
      }

      setShowLocationForm(false);
      setEditingLocation(null);
      setLocationName('');
      setLocationCity('');
      setLocationDietaryType('both');
      setLocationMarkets('');
      fetchDashboardData(true);
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAssignMarket = async (storeId, market, addToLocation = false, locationId = null) => {
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${url}/api/super-admin/store/${storeId}/assign-market`, 
        { market: market || null }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // If user typed a custom zone and requested adding it to the campus hub
      if (addToLocation && locationId && market && market.trim()) {
        const targetLoc = locations.find(l => (l._id || l.id) === locationId);
        if (targetLoc) {
          const currentList = targetLoc.markets ? targetLoc.markets.split(',').map(m => m.trim()).filter(Boolean) : [];
          if (!currentList.includes(market.trim())) {
            currentList.push(market.trim());
            await axios.put(`${url}/api/super-admin/locations/${targetLoc._id}`, {
              name: targetLoc.name,
              type: targetLoc.type,
              city: targetLoc.city,
              dietaryType: targetLoc.dietaryType,
              markets: currentList.join(', ')
            }, { headers: { Authorization: `Bearer ${token}` } });
          }
        }
      }

      fetchDashboardData(true);
    } catch (err) {
      alert('Market update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQuickAddZone = async (loc) => {
    const newZone = window.prompt(`Add new campus market / zone to "${loc.name}":\n(e.g. Food Court 1, Block B, Main Gate)`);
    if (!newZone || !newZone.trim()) return;
    const currentMarkets = loc.markets ? loc.markets.split(',').map(m => m.trim()).filter(Boolean) : [];
    if (currentMarkets.includes(newZone.trim())) {
      alert('This market zone is already configured for this location.');
      return;
    }
    currentMarkets.push(newZone.trim());
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${url}/api/super-admin/locations/${loc._id}`, {
        name: loc.name,
        type: loc.type,
        city: loc.city,
        dietaryType: loc.dietaryType,
        markets: currentMarkets.join(', ')
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData(true);
    } catch (err) {
      alert('Failed to add zone: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQuickRemoveZone = async (loc, zoneToRemove) => {
    if (!window.confirm(`Remove zone "${zoneToRemove}" from ${loc.name}?`)) return;
    const currentMarkets = loc.markets ? loc.markets.split(',').map(m => m.trim()).filter(Boolean) : [];
    const updated = currentMarkets.filter(m => m !== zoneToRemove);
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${url}/api/super-admin/locations/${loc._id}`, {
        name: loc.name,
        type: loc.type,
        city: loc.city,
        dietaryType: loc.dietaryType,
        markets: updated.join(', ')
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData(true);
    } catch (err) {
      alert('Failed to remove zone: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleLocationDelete = async (id) => {
    if (!window.confirm('Delete this location? All stores must be unlinked first.')) return;
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.delete(`${url}/api/super-admin/locations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData(true);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAssignLocation = async (storeId, locationId) => {
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const targetStore = stores.find(s => (s._id === storeId || s.id === storeId));
      const targetLoc = locations.find(l => (l._id === locationId || l.id === locationId));
      const locMarkets = targetLoc?.markets 
        ? targetLoc.markets.split(',').map(m => m.trim()).filter(Boolean)
        : (targetLoc?.name?.toLowerCase().includes('lpu') || targetLoc?.name?.toLowerCase().includes('lovely'))
          ? ['BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market']
          : [];
      
      const shouldKeepMarket = targetStore?.market && locMarkets.includes(targetStore.market);
      const newMarket = shouldKeepMarket ? targetStore.market : '';

      await axios.put(`${url}/api/super-admin/store/${storeId}/assign-location`, 
        { locationId: locationId || null, market: newMarket }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDashboardData(true);
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Active Vendors Checkbox & Bulk Actions
  const toggleSelectActiveVendor = (id) => {
    setSelectedActiveVendors(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllActiveVendors = () => {
    if (selectedActiveVendors.length === activeVendors.length) {
      setSelectedActiveVendors([]);
    } else {
      setSelectedActiveVendors(activeVendors.map(v => v._id || v.id));
    }
  };

  const deleteVendor = async (vendorId, vendorName) => {
    if (!window.confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to permanently delete vendor "${vendorName}" AND their store AND all their orders?\n\nThis cannot be undone.`)) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedActiveVendors(prev => prev.filter(id => id !== vendorId));
      fetchDashboardData(true); // Refresh everything
    } catch (err) {
      alert('Failed to delete vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  const bulkDeleteActiveVendors = async () => {
    if (selectedActiveVendors.length === 0) return;
    if (!window.confirm(`CRITICAL WARNING:\n\nAre you sure you want to permanently delete ${selectedActiveVendors.length} selected vendors AND their stores AND orders?\n\nThis cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendors/bulk-delete`, 
        { ids: selectedActiveVendors },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedActiveVendors([]);
      fetchDashboardData(true);
      alert('Selected vendors successfully deleted.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Pending Vendors Checkbox & Bulk Actions
  const toggleSelectPendingVendor = (id) => {
    setSelectedPendingVendors(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPendingVendors = () => {
    if (selectedPendingVendors.length === pendingVendors.length) {
      setSelectedPendingVendors([]);
    } else {
      setSelectedPendingVendors(pendingVendors.map(v => v._id || v.id));
    }
  };

  const approveVendor = async (vendorId, vendorName) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${vendorId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Vendor "${vendorName}" has been successfully approved! They can now log in and manage their stall.`);
      fetchDashboardData(true);
    } catch (err) {
      alert('Failed to approve vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  const rejectVendor = async (vendorId, vendorName) => {
    if (!window.confirm(`REJECT & PERMANENTLY PURGE:\n\nAre you sure you want to REJECT and PERMANENTLY PURGE applicant "${vendorName}"?\n\nThis will completely eradicate their login credentials and draft stall from the database so no fake/spam account remains.`)) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${vendorId}/reject`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedPendingVendors(prev => prev.filter(id => id !== vendorId));
      alert(`Applicant "${vendorName}" rejected and credentials permanently purged.`);
      fetchDashboardData(true);
    } catch (err) {
      alert('Failed to reject vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  const bulkRejectPendingVendors = async () => {
    if (selectedPendingVendors.length === 0) return;
    if (!window.confirm(`REJECT & PURGE:\n\nAre you sure you want to reject and purge ${selectedPendingVendors.length} selected vendor applications?`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendors/reject/bulk-delete`, 
        { ids: selectedPendingVendors },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedPendingVendors([]);
      fetchDashboardData(true);
      alert('Selected vendor applications rejected and purged.');
    } catch (err) {
      alert('Bulk reject failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Stores Delete & Checkbox Handlers
  const toggleSelectStore = (id) => {
    setSelectedStores(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStores = (visibleStoreIds) => {
    if (selectedStores.length === visibleStoreIds.length && visibleStoreIds.length > 0) {
      setSelectedStores([]);
    } else {
      setSelectedStores(visibleStoreIds);
    }
  };

  const deleteStore = async (storeId, storeName) => {
    if (!window.confirm(`PERMANENT STORE DELETION:\n\nAre you sure you want to permanently delete store "${storeName}"?\n\nThis will remove all menu items, orders, and settlements associated with this stall.`)) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedStores(prev => prev.filter(id => id !== storeId));
      fetchDashboardData(true);
      alert(`Store "${storeName}" deleted successfully.`);
    } catch (err) {
      alert('Failed to delete store: ' + (err.response?.data?.message || err.message));
    }
  };

  const bulkDeleteStores = async () => {
    if (selectedStores.length === 0) return;
    if (!window.confirm(`PERMANENT BULK DELETION:\n\nAre you sure you want to delete ${selectedStores.length} selected stores and all their associated orders and menu data?\n\nThis action cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/stores/bulk-delete`, 
        { ids: selectedStores },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedStores([]);
      fetchDashboardData(true);
      alert('Selected stores deleted successfully.');
    } catch (err) {
      alert('Bulk store delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Locations Delete & Checkbox Handlers
  const toggleSelectLocation = (id) => {
    setSelectedLocations(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLocations = () => {
    if (selectedLocations.length === locations.length && locations.length > 0) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locations.map(l => l._id || l.id));
    }
  };

  const bulkDeleteLocations = async () => {
    if (selectedLocations.length === 0) return;
    if (!window.confirm(`Delete ${selectedLocations.length} selected locations?\n\nLocations with active linked stores will be skipped automatically.`)) return;

    try {
      setIsDeleting(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/locations/bulk-delete`, 
        { ids: selectedLocations },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedLocations([]);
      fetchDashboardData(true);
      alert(res.data.message || 'Locations deleted.');
    } catch (err) {
      alert('Bulk location delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div className="auth-wrapper" style={{ background: 'var(--background)' }}>
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>Initializing Command Center...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar Navigation */}
      <aside style={{ 
        width: '280px', 
        background: '#ffffff', 
        borderRight: '1px solid var(--surface-border)', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 100,
        overflowY: 'auto'
      }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4123 0%, #ea580c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(239, 65, 35, 0.2)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>UniVerse</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Super Admin</span>
          </div>
        </div>

        <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: '3d_analytics', icon: TrendingUp, label: 'Executive Analytics', badge: 'LIVE' },
            { id: 'refunds', icon: RotateCcw, label: '⚡ Instant Refunds', badge: pendingRefundCount > 0 ? `${pendingRefundCount} PENDING` : null },
            { id: 'customers', icon: Users, label: 'Customer 360 & Audit', badge: 'NEW' },
            { id: 'master_data', icon: Database, label: 'Master Data', badge: 'SUPERADMIN' },
            { id: 'master_templates', icon: FileText, label: 'Master Templates' },
            { id: 'broadcasting', icon: Radio, label: 'Broadcasting Hub' },
            { id: 'journey_builder', icon: GitBranch, label: 'Journey Builder' },
            { id: 'hero_promotions', icon: Sparkles, label: 'Hero Promotions', badge: '5 SLOTS' },
            { id: 'offers_master', icon: Tag, label: 'Offers & Deals Master', badge: 'CAMPUS' },
            { id: 'channel_settings', icon: Sliders, label: 'Channels & Devices', badge: '5 SLOTS' },
            { id: 'overview', icon: Activity, label: 'Platform Overview' },
            { id: 'vendors', icon: Users, label: 'Vendor Registry', badge: pendingVendors.length > 0 ? `${pendingVendors.length} PENDING` : null },
            { id: 'stores', icon: Store, label: 'Store Directory' },
            { id: 'locations', icon: MapPin, label: 'Location Manager' },
            { id: 'finance', icon: Banknote, label: 'Finance Tracker' },
            { id: 'partner_equity', icon: PieChart, label: 'Partner Profit & Equity', badge: 'PRO' },
            { id: 'orders', icon: ShoppingBag, label: 'Global Orders' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', 
                borderRadius: '12px', background: activeTab === tab.id ? 'var(--primary)' : 'transparent', 
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)', 
                border: 'none', cursor: 'pointer', fontWeight: '600', textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <tab.icon size={20} /> {tab.label}
              </div>
              {tab.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: '900',
                  letterSpacing: '0.05em',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(239, 65, 35, 0.15)',
                  color: activeTab === tab.id ? '#ffffff' : '#ef4123'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)' }}>
          <button onClick={() => { logout(); navigate('/super-admin/login'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
            <LogOut size={20} /> Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: '280px',
        flex: 1,
        width: 'calc(100vw - 280px)',
        maxWidth: 'calc(100vw - 280px)',
        boxSizing: 'border-box',
        padding: activeTab === 'journey_builder' ? '1.25rem 1.5rem' : '2.5rem 3rem',
        overflowX: 'hidden'
      }}>
        
        {/* 3D LIVE ANALYTICS TAB */}
        {activeTab === '3d_analytics' && (
          <SuperAdmin3DAnalytics token={token} />
        )}

        {/* ⚡ INSTANT DIRECT REFUNDS DESK */}
        {activeTab === 'refunds' && (
          <SuperAdminRefunds token={token} socket={socket} />
        )}

        {/* CUSTOMER 360 & AUDIT LEDGER TAB */}
        {activeTab === 'customers' && (
          <SuperAdminCustomerIntelligence token={token} socket={socket} />
        )}

        {/* MASTER DATA AUDIENCE & INGESTION TAB */}
        {activeTab === 'master_data' && (
          <SuperAdminMasterData token={token} />
        )}

        {/* MASTER TEMPLATES TAB */}
        {activeTab === 'master_templates' && (
          <SuperAdminMasterTemplates token={token} />
        )}

        {/* BROADCASTING TAB */}
        {activeTab === 'broadcasting' && (
          <SuperAdminBroadcasting token={token} socket={socket} />
        )}

        {/* JOURNEY BUILDER TAB */}
        {activeTab === 'journey_builder' && (
          <SuperAdminJourneyBuilder token={token} />
        )}

        {/* CHANNELS & DEVICE SETTINGS TAB */}
        {activeTab === 'channel_settings' && (
          <SuperAdminChannelSettings token={token} socket={socket} />
        )}

        {/* HERO PROMOTIONS & BANNER MANAGEMENT TAB */}
        {activeTab === 'hero_promotions' && (
          <SuperAdminHeroPromotions token={token} socket={socket} />
        )}

        {/* OFFERS & DEALS MASTER TAB */}
        {activeTab === 'offers_master' && (
          <SuperAdminOffersMaster token={token} socket={socket} />
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div>
            <header style={{ marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>Global Analytics</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Welcome back, Commander. Here's the platform pulse.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {/* Stat Cards */}
              <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Banknote size={16} /> Total Platform Revenue</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--secondary)' }}>₹{stats.totalRevenue}</h3>
                <p style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.875rem', fontWeight: '600' }}>+ ₹{stats.todayRevenue} today</p>
              </div>

              <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16} /> Registered Vendors</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{stats.totalVendors}</h3>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Operating {stats.totalStores} stores</p>
              </div>

              <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16} /> Total Processed Orders</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{stats.totalOrders}</h3>
                <p style={{ marginTop: '0.5rem', color: '#f59e0b', fontSize: '0.875rem', fontWeight: '600' }}>{stats.activeOrders} active right now</p>
              </div>

              <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'linear-gradient(135deg, #ffffff 0%, rgba(252, 175, 23, 0.05) 100%)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} color="var(--secondary)" /> UniVerse Net Take</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--primary)' }}>₹{typeof stats.totalUniVerseNetTake === 'number' ? stats.totalUniVerseNetTake.toFixed(2) : (typeof stats.totalProfit === 'number' ? stats.totalProfit.toFixed(2) : (stats.totalProfit || '0.00'))}</h3>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>3% Commission + 2% Net Penalty (Excludes 2% PG)</p>
              </div>
            </div>
            
            <div style={{ padding: '3rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', textAlign: 'center' }}>
              <Shield size={64} color="var(--primary)" style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
              <h3 style={{ fontSize: '1.25rem' }}>System Operational</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>All backend services and sockets are actively listening.</p>
            </div>
          </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>Vendor Registry</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                  Manage verified campus vendors and review new merchant applications.
                </p>
              </div>

              {/* Sub-Tabs: Active Vendors vs Pending Approvals */}
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '14px', border: '1px solid var(--surface-border)' }}>
                <button
                  type="button"
                  onClick={() => setVendorSubTab('active')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: vendorSubTab === 'active' ? '#ffffff' : 'transparent',
                    color: vendorSubTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: vendorSubTab === 'active' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Users size={16} />
                  Active Vendors ({activeVendors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVendorSubTab('pending')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: vendorSubTab === 'pending' ? '#ef4123' : (pendingVendors.length > 0 ? 'rgba(239, 65, 35, 0.1)' : 'transparent'),
                    color: vendorSubTab === 'pending' ? '#ffffff' : (pendingVendors.length > 0 ? '#ef4123' : 'var(--text-secondary)'),
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: vendorSubTab === 'pending' ? '0 2px 8px rgba(239, 65, 35, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Clock size={16} />
                  Pending Approvals
                  {pendingVendors.length > 0 && (
                    <span style={{
                      background: vendorSubTab === 'pending' ? 'rgba(255,255,255,0.3)' : '#ef4123',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontSize: '0.75rem',
                      fontWeight: '800'
                    }}>
                      {pendingVendors.length}
                    </span>
                  )}
                </button>
              </div>
            </header>

            {/* PENDING APPROVALS QUEUE */}
            {vendorSubTab === 'pending' && (
              <div>
                {pendingVendors.length === 0 ? (
                  <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                      <CheckCircle size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>All Caught Up!</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      There are currently no new vendor applications awaiting review. All registered merchant accounts have been verified.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Bulk Selection Bar for Pending Vendors */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={selectedPendingVendors.length === pendingVendors.length && pendingVendors.length > 0}
                          onChange={toggleSelectAllPendingVendors}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Select All Applicants ({pendingVendors.length})
                      </label>
                      {selectedPendingVendors.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#b91c1c' }}>
                            {selectedPendingVendors.length} selected
                          </span>
                          <button
                            type="button"
                            onClick={bulkRejectPendingVendors}
                            disabled={isDeleting}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.9rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} /> Reject & Purge Selected ({selectedPendingVendors.length})
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                      {pendingVendors.map(v => {
                        const vId = v._id || v.id;
                        const isChecked = selectedPendingVendors.includes(vId);
                        return (
                          <div 
                            key={vId}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              border: isChecked ? '2px solid #ef4444' : '2px solid rgba(239, 65, 35, 0.2)',
                              padding: '1.75rem',
                              boxShadow: '0 10px 25px -5px rgba(239, 65, 35, 0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              position: 'relative'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => toggleSelectPendingVendor(vId)}
                                    style={{ marginTop: '0.25rem', cursor: 'pointer', width: '16px', height: '16px' }}
                                  />
                                  <div>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '100px', background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                      <Clock size={12} /> Awaiting Verification
                                    </span>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0.25rem 0 0 0', color: 'var(--text-primary)' }}>
                                      {v.name}
                                    </h3>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : 'Recent'}
                                </span>
                              </div>

                              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                                  Proposed Stall / Brand Name
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary)' }}>
                                  <Store size={18} />
                                  {v.store?.name || 'Unassigned / Not Specified'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Mail size={15} style={{ color: 'var(--text-secondary)' }} />
                                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{v.email}</span>
                                </div>
                                {v.phone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={15} style={{ color: 'var(--text-secondary)' }} />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{v.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                              <button
                                type="button"
                                onClick={() => approveVendor(v._id || v.id, v.name)}
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  padding: '0.75rem 1rem',
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontWeight: '700',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <CheckCircle size={16} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectVendor(v._id || v.id, v.name)}
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  padding: '0.75rem 1rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '10px',
                                  fontWeight: '700',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Trash2 size={16} /> Reject & Purge
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE VENDORS TABLE */}
            {vendorSubTab === 'active' && (
              <div>
                {/* Bulk Actions Banner for Active Vendors */}
                {selectedActiveVendors.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.875rem' }}>
                        {selectedActiveVendors.length} vendor{selectedActiveVendors.length > 1 ? 's' : ''} selected
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedActiveVendors([])} 
                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Clear Selection
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={bulkDeleteActiveVendors}
                      disabled={isDeleting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} /> Terminate Selected ({selectedActiveVendors.length})
                    </button>
                  </div>
                )}

                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                        <th style={{ width: '48px', padding: '1.25rem 0.5rem 1.25rem 1.25rem' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedActiveVendors.length === activeVendors.length && activeVendors.length > 0} 
                            onChange={toggleSelectAllActiveVendors} 
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }} 
                          />
                        </th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Vendor Details</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Associated Store</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Performance</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Platform Profit</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Destructive Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeVendors.map(v => {
                        const vId = v._id || v.id;
                        const isChecked = selectedActiveVendors.includes(vId);
                        return (
                          <tr key={vId} style={{ borderBottom: '1px solid var(--surface-border)', background: isChecked ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                            <td style={{ width: '48px', padding: '1.25rem 0.5rem 1.25rem 1.25rem' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => toggleSelectActiveVendor(vId)} 
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }} 
                              />
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {v.name}
                                {v.isBanned && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: '#ef4444', color: 'white', borderRadius: '4px', fontWeight: '900', letterSpacing: '0.05em' }}>SUSPENDED</span>}
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{v.email}</div>
                              {v.phone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>📞 {v.phone}</div>}
                              {v.upiId && <div style={{ color: '#3b82f6', fontSize: '0.75rem', marginTop: '0.25rem', padding: '0.1rem 0.4rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', display: 'inline-block' }}>{v.upiId}</div>}
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              {v.store ? (
                                <>
                                  <div style={{ fontWeight: '600' }}>{v.store.name}</div>
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>{v.store.market || 'BH1 Market'}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.store.productCount} Items</span>
                                    <span style={{ fontSize: '0.75rem', color: v.store.isOpen ? '#10b981' : '#ef4444' }}>• {v.store.isOpen ? 'ONLINE' : 'OFFLINE'}</span>
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.875rem' }}>No store created</span>
                              )}
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              <div style={{ fontWeight: '800', color: 'var(--secondary)' }}>₹{v.stats?.revenue || 0} generated</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Across {v.stats?.orderCount || 0} total orders</div>
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.1rem' }}>₹{v.stats?.profitGenerated || 0}</div>
                              <div style={{ color: '#6366f1', fontSize: '0.7rem', marginTop: '0.25rem', fontWeight: '700' }}>Standard (3% Platform)</div>
                            </td>
                            <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={async () => {
                                    try {
                                      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${vId}/suspend`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                      fetchDashboardData(true);
                                    } catch(err) { alert('Action failed'); }
                                  }}
                                  style={{ padding: '0.5rem 1rem', background: v.isBanned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: v.isBanned ? '#10b981' : '#f59e0b', border: `1px solid ${v.isBanned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                  <Ban size={16} /> {v.isBanned ? 'Unban' : 'Suspend'}
                                </button>
                                <button 
                                  onClick={() => deleteVendor(vId, v.name)}
                                  style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                                  onMouseLeave={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.color = '#ef4444'; }}
                                >
                                  <Trash2 size={16} /> Terminate
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {activeVendors.length === 0 && (
                        <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active vendors registered yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STORES TAB */}
        {activeTab === 'stores' && (() => {
          const filteredStores = stores.filter(store => {
            const matchesSearch = !storeSearch.trim() || 
              (store.name && store.name.toLowerCase().includes(storeSearch.toLowerCase())) ||
              (store.admin?.name && store.admin.name.toLowerCase().includes(storeSearch.toLowerCase())) ||
              (store.category && store.category.toLowerCase().includes(storeSearch.toLowerCase()));

            if (!matchesSearch) return false;

            if (storeStatusFilter === 'open') return store.isOpen && !store.isHidden;
            if (storeStatusFilter === 'closed') return !store.isOpen && !store.isHidden;
            if (storeStatusFilter === 'hidden') return store.isHidden;
            return true;
          });

          return (
            <div>
              <header style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>Store Directory</h1>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    Control stall operational status, auto-scheduling, location assignments, and 5% commission profiles.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ padding: '0.5rem 1rem', background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {stores.length} Total Stalls
                  </span>
                  <span style={{ padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '800' }}>
                    {stores.filter(s => s.isOpen).length} Live Online
                  </span>
                </div>
              </header>

              {/* Search & Filter Bar */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '420px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text"
                    placeholder="Search stall, category, or vendor name..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.85rem',
                      borderRadius: '14px',
                      border: '1px solid var(--surface-border)',
                      background: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      outline: 'none',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: '#f1f5f9', padding: '0.35rem', borderRadius: '14px' }}>
                  {[
                    { id: 'all', label: 'All Stalls', count: stores.length },
                    { id: 'open', label: 'Online', count: stores.filter(s => s.isOpen && !s.isHidden).length },
                    { id: 'closed', label: 'Offline', count: stores.filter(s => !s.isOpen && !s.isHidden).length },
                    { id: 'hidden', label: 'Hidden', count: stores.filter(s => s.isHidden).length }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setStoreStatusFilter(filter.id)}
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: storeStatusFilter === filter.id ? '#ffffff' : 'transparent',
                        color: storeStatusFilter === filter.id ? '#0f172a' : 'var(--text-secondary)',
                        boxShadow: storeStatusFilter === filter.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        fontWeight: '800',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {filter.label}
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '100px', background: storeStatusFilter === filter.id ? 'rgba(15,23,42,0.08)' : 'rgba(0,0,0,0.05)', fontWeight: '900' }}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bulk Selection Bar for Stores */}
              {filteredStores.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={filteredStores.length > 0 && filteredStores.every(s => selectedStores.includes(s._id || s.id))}
                      onChange={() => toggleSelectAllStores(filteredStores.map(s => s._id || s.id))}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Select All Visible Stalls ({filteredStores.length})
                  </label>
                  {selectedStores.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#b91c1c' }}>
                        {selectedStores.length} selected
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedStores([])} 
                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Clear Selection
                      </button>
                      <button
                        type="button"
                        onClick={bulkDeleteStores}
                        disabled={isDeleting}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.9rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} /> Delete Selected Stalls ({selectedStores.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
                {filteredStores.map(store => {
                  const sId = store._id || store.id;
                  const isChecked = selectedStores.includes(sId);
                  return (
                  <div key={sId} style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: isChecked ? '2px solid #ef4444' : '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: isChecked ? '0 10px 25px -5px rgba(239, 68, 68, 0.1)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleSelectStore(sId)}
                          style={{ marginTop: '0.35rem', cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>{store.name}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            Managed by: <span style={{ color: 'var(--text-primary)' }}>{store.admin?.name || 'Unknown'}</span>
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                         onClick={async () => {
                           const targetId = store._id || store.id;
                           const nextHidden = !store.isHidden;
                           setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, isHidden: nextHidden } : s));
                           try {
                             await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${targetId}/toggle-hidden`, {}, { headers: { Authorization: `Bearer ${token}` } });
                           } catch(err) {
                             alert('Action failed');
                             fetchDashboardData(true);
                           }
                         }}
                         style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '800', background: 'rgba(255,255,255,0.05)', color: store.isHidden ? '#10b981' : '#f59e0b', border: `1px solid ${store.isHidden ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                         {store.isHidden ? <><Eye size={12}/> Unhide</> : <><EyeOff size={12}/> Hide</>}
                      </button>
                      <button 
                         onClick={async () => {
                           const targetId = store._id || store.id;
                           const nextOpen = !store.isOpen;
                           setStores(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? { ...s, isOpen: nextOpen } : s));
                           try {
                             await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${targetId}/toggle-status`, {}, { headers: { Authorization: `Bearer ${token}` } });
                           } catch(err) {
                             alert('Action failed');
                             fetchDashboardData(true);
                           }
                         }}
                         style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '800', background: 'rgba(255,255,255,0.05)', color: store.isOpen ? '#ef4444' : '#10b981', border: `1px solid ${store.isOpen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, borderRadius: '6px', cursor: 'pointer' }}
                      >
                         Force {store.isOpen ? 'Offline' : 'Online'}
                      </button>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: store.isOpen ? '#10b981' : '#ef4444', boxShadow: store.isOpen ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none' }}></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: '700' }}>{store.category}</span>
                    {(() => {
                      const storeLoc = locations.find(l => (l._id === store.locationId || l.id === store.locationId));
                      const isExternal = storeLoc?.type === 'External';
                      const locMarkets = storeLoc?.markets 
                        ? storeLoc.markets.split(',').map(m => m.trim()).filter(Boolean)
                        : (storeLoc?.name?.toLowerCase().includes('lpu') || storeLoc?.name?.toLowerCase().includes('lovely'))
                          ? ['BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market']
                          : [];
                      
                      if (isExternal) {
                        return (
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '6px', fontWeight: '700' }}>
                            Commercial Hub
                          </span>
                        );
                      }

                      if (!store.market) {
                        return (
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: 'var(--text-secondary)', borderRadius: '6px', fontWeight: '600' }}>
                            General Campus
                          </span>
                        );
                      }

                      const isInvalid = !locMarkets.includes(store.market);
                      return (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.2rem 0.6rem', 
                          background: isInvalid ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                          color: isInvalid ? '#dc2626' : '#10b981', 
                          borderRadius: '6px', 
                          fontWeight: '700' 
                        }}>
                          {isInvalid ? `⚠️ ${store.market} (Invalid)` : `📍 ${store.market}`}
                        </span>
                      );
                    })()}
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: 'var(--text-secondary)', borderRadius: '6px', fontWeight: '600' }}>{store.productCount} SKUs</span>
                    {store.telegramChatId ? (
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(0, 136, 204, 0.1)', color: '#0088cc', borderRadius: '6px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Send size={12} /> Telegram Active
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--text-secondary)', borderRadius: '6px', fontWeight: '600', opacity: 0.5 }}>
                        Telegram Missing
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: store.isAutomated ? 'rgba(79, 70, 229, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: store.isAutomated ? 'var(--primary)' : '#f59e0b', borderRadius: '6px', fontWeight: '800' }}>
                      {store.isAutomated ? `⏰ Auto: ${store.openingTime}-${store.closingTime}` : '🛑 Manual Mode'}
                    </span>
                  </div>

                  {/* Location Assignment */}
                  <div style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                    <p style={{ margin: 0, fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', color: '#0ea5e9', marginBottom: '0.75rem' }}>Hub / Location</p>
                    <select 
                      value={store.locationId || ''}
                      onChange={(e) => handleAssignLocation(store._id, e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.875rem', fontWeight: '600' }}
                    >
                      <option value="">Unassigned</option>
                      {locations.map(loc => (
                        <option key={loc._id} value={loc._id}>{loc.name} ({loc.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Market / Zone Assignment (Strictly Scoped to Assigned Campus) */}
                  {(() => {
                    const storeLoc = locations.find(l => l._id === store.locationId || l.id === store.locationId);
                    const isExternal = storeLoc?.type === 'External';
                    const locMarkets = storeLoc?.markets 
                      ? storeLoc.markets.split(',').map(m => m.trim()).filter(Boolean)
                      : (storeLoc?.name?.toLowerCase().includes('lpu') || storeLoc?.name?.toLowerCase().includes('lovely'))
                        ? ['BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market']
                        : [];

                    if (!store.locationId || !storeLoc) {
                      return (
                        <div style={{ padding: '1rem', marginTop: '0.75rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                          <p style={{ margin: 0, fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Market / Campus Zone</p>
                          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Please assign a Hub / Location first to configure market zones.
                          </p>
                        </div>
                      );
                    }

                    if (isExternal) {
                      return (
                        <div style={{ padding: '1rem', marginTop: '0.75rem', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '16px', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Building2 size={16} color="#0284c7" />
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', color: '#0284c7' }}>External Hub Area</p>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Campus hostel/block zones do not apply to external locations like {storeLoc.name}.
                          </p>
                        </div>
                      );
                    }

                    const hasInvalidMarket = store.market && !locMarkets.includes(store.market);

                    return (
                      <div style={{ padding: '1rem', marginTop: '0.75rem', background: 'rgba(249, 115, 22, 0.04)', borderRadius: '16px', border: '1px solid rgba(249, 115, 22, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Store size={15} color="#ea580c" />
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ea580c' }}>
                              Campus Zone
                            </p>
                          </div>
                          <button 
                            type="button"
                            onClick={async () => {
                              const custom = window.prompt(`Enter new custom zone for "${storeLoc.name}":\n(e.g. Food Court 1, Block B, Main Gate)`);
                              if (custom && custom.trim()) {
                                await handleAssignMarket(store._id, custom.trim(), true, store.locationId);
                              }
                            }}
                            style={{ 
                              background: 'rgba(234, 88, 12, 0.1)', 
                              border: 'none', 
                              color: '#ea580c', 
                              fontSize: '0.72rem', 
                              fontWeight: '800', 
                              cursor: 'pointer', 
                              padding: '0.25rem 0.6rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Plus size={12} /> Add New Zone
                          </button>
                        </div>

                        {/* If no zones exist at all for this campus */}
                        {locMarkets.length === 0 ? (
                          <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '12px', border: '1px dashed rgba(234, 88, 12, 0.3)', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              No campus zones configured for <strong>{storeLoc.name}</strong> yet.
                            </p>
                            <button
                              type="button"
                              onClick={async () => {
                                const custom = window.prompt(`Add the first zone for "${storeLoc.name}":\n(e.g. Food Court 1, Block B, Main Gate)`);
                                if (custom && custom.trim()) {
                                  await handleAssignMarket(store._id, custom.trim(), true, store.locationId);
                                }
                              }}
                              style={{ padding: '0.4rem 0.85rem', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                            >
                              + Create First Zone
                            </button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <select 
                              value={store.market || ''}
                              onChange={(e) => {
                                if (e.target.value === '__add_custom__') {
                                  const custom = window.prompt(`Enter new custom zone for "${storeLoc.name}":\n(e.g. Food Court 1, Block B, Main Gate)`);
                                  if (custom && custom.trim()) {
                                    handleAssignMarket(store._id, custom.trim(), true, store.locationId);
                                  }
                                } else {
                                  handleAssignMarket(store._id, e.target.value);
                                }
                              }}
                              style={{ 
                                width: '100%', 
                                padding: '0.65rem 0.85rem', 
                                borderRadius: '12px', 
                                border: '1.5px solid rgba(234, 88, 12, 0.25)', 
                                fontSize: '0.85rem', 
                                fontWeight: '700',
                                background: '#ffffff',
                                color: store.market && !hasInvalidMarket ? '#ea580c' : 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">🏫 General Campus (No Specific Zone)</option>
                              {locMarkets.map(m => (
                                <option key={m} value={m}>📍 {m}</option>
                              ))}
                              {hasInvalidMarket && (
                                <option value={store.market}>⚠️ {store.market} (Out of campus)</option>
                              )}
                              <option value="__add_custom__">+ Create New Zone for {storeLoc.name}...</option>
                            </select>
                          </div>
                        )}

                        {/* Clear Warning for Out-of-Campus Market */}
                        {hasInvalidMarket && (
                          <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <AlertCircle size={14} color="#dc2626" />
                              <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: '700' }}>
                                Currently set to "{store.market}" from another campus!
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAssignMarket(store._id, '')}
                              style={{ background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Clear Zone
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Stall Hours & Automation */}
                  <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)' }}>Stall Automation</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Automatically manage status</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={store.isAutomated} 
                        onChange={async (e) => {
                          try {
                            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/update-details`, 
                              { isAutomated: e.target.checked }, 
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            fetchDashboardData(true);
                          } catch(err) { alert('Failed to update automation'); }
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </div>
                    
                    {/* Persona Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.5rem', background: 'white', borderRadius: '10px' }}>
                       <div>
                         <p style={{ margin: 0, fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--secondary)' }}>Stall Persona</p>
                         <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{store.storeType === 'Restaurant' ? 'Dining Mode (No Timer)' : 'Vendor Mode (Timed)'}</p>
                       </div>
                       <select 
                         value={store.storeType || 'FastFood'}
                         onChange={async (e) => {
                           try {
                             await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/update-details`, 
                               { storeType: e.target.value }, 
                               { headers: { Authorization: `Bearer ${token}` } }
                             );
                             fetchDashboardData(true);
                           } catch(err) { alert('Failed to update persona'); }
                         }}
                         style={{ border: 'none', background: 'transparent', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', color: 'var(--secondary)' }}
                       >
                         <option value="FastFood">VENDOR</option>
                         <option value="Restaurant">RESTAURANT</option>
                       </select>
                    </div>
                    
                    {/* Auto-Timing Schedule Control */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0.4rem 0.6rem', background: store.isAutomated ? 'rgba(79, 70, 229, 0.08)' : '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: store.isAutomated ? '#4f46e5' : '#64748b' }}>
                        {store.isAutomated ? '⏰ Auto-Schedule Active' : '🛑 Manual Open/Close'}
                      </span>
                      <button 
                        onClick={async () => {
                          try {
                            const newStatus = !store.isAutomated;
                            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/update-details`, 
                              { isAutomated: newStatus }, 
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setStores(stores.map(s => s._id === store._id ? { ...s, isAutomated: newStatus } : s));
                            fetchDashboardData(true);
                          } catch(err) { alert('Failed to toggle auto timing'); }
                        }}
                        style={{ border: 'none', background: store.isAutomated ? '#ef4444' : '#4f46e5', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {store.isAutomated ? 'Turn OFF Auto' : 'Turn ON Auto'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem', fontWeight: '700' }}>Opens at</label>
                        <input 
                          type="time" 
                          value={store.openingTime || '10:00'}
                          onChange={(e) => {
                            const updatedStores = stores.map(s => s._id === store._id ? {...s, openingTime: e.target.value} : s);
                            setStores(updatedStores);
                          }}
                          onBlur={async (e) => {
                            try {
                              await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/update-details`, 
                                { openingTime: e.target.value }, 
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                              fetchDashboardData(true);
                            } catch(err) { alert('Failed to update time'); }
                          }}
                          style={{ width: '100%', background: '#fff', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.75rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem', fontWeight: '700' }}>Closes at</label>
                        <input 
                          type="time" 
                          value={store.closingTime || '22:00'}
                          onChange={(e) => {
                            const updatedStores = stores.map(s => s._id === store._id ? {...s, closingTime: e.target.value} : s);
                            setStores(updatedStores);
                          }}
                          onBlur={async (e) => {
                            try {
                              await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/update-details`, 
                                { closingTime: e.target.value }, 
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                              fetchDashboardData(true);
                            } catch(err) { alert('Failed to update time'); }
                          }}
                          style={{ width: '100%', background: '#fff', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Manual Ranking Control */}
                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Store Ranking (Lower is Higher)</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="number" 
                        defaultValue={store.priority}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          if (val == store.priority) return;
                          try {
                            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/update-details`, 
                              { priority: val }, 
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            fetchDashboardData(true);
                          } catch(err) { alert('Failed to update priority'); }
                        }}
                        style={{ flex: 1, background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text-primary)' }}
                      />
                      <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center' }}>Pos: {store.priority}</div>
                    </div>
                  </div>

                  {/* Commission Profile Section */}
                  <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', margin: 0, fontWeight: '800', textTransform: 'uppercase', color: '#6366f1' }}>Commission Profile</p>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '800' }}>ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>UniVerse Platform</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>3%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Payment Gateway</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>2%</span>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(99, 102, 241, 0.15)', margin: '0.25rem 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>Total Deduction</span>
                        <span style={{ color: '#6366f1', fontWeight: '900' }}>5%</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>T+1 Automated Settlement</div>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--surface-border)', marginTop: 'auto' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Overall Stall Revenue</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>₹{store.totalRevenue}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteStore(store._id || store.id, store.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                  >
                    <Trash2 size={15} /> Delete Stall & Data
                  </button>
                </div>
              );
            })}
              {filteredStores.length === 0 && (
                <div style={{ padding: '4rem 2rem', background: '#ffffff', borderRadius: '24px', border: '1px dashed var(--surface-border)', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <Store size={48} color="var(--primary)" style={{ opacity: 0.25, margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Stalls Found</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                    {stores.length === 0 ? 'No registered stores found in the database. Ensure vendors have onboarded properly.' : 'No stores match your search or filter criteria.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

        {/* LOCATIONS TAB */}
        {activeTab === 'locations' && (
          <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Location Manager</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage Colleges and External expansion regions.</p>
              </div>
              <button 
                onClick={() => { setShowLocationForm(true); setEditingLocation(null); setLocationName(''); setLocationCity(''); setLocationDietaryType('both'); setLocationMarkets(''); }}
                style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} /> Add New Location
              </button>
            </header>

            {showLocationForm && (
              <div style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '1.5rem' }}>{editingLocation ? 'Edit Hub / Location' : 'Add New Hub / Location'}</h3>
                <form onSubmit={handleLocationSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: '500px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Name</label>
                    <input 
                      type="text" 
                      required 
                      value={locationName} 
                      onChange={e => setLocationName(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }} 
                      placeholder="e.g. Chandigarh University"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Type</label>
                    <select 
                      value={locationType} 
                      onChange={e => setLocationType(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}
                    >
                      <option value="College">College / University</option>
                      <option value="External">External Area</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Dietary Policy</label>
                    <select 
                      value={locationDietaryType} 
                      onChange={e => setLocationDietaryType(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}
                    >
                      <option value="both">Both (Veg & Non-Veg)</option>
                      <option value="veg">Pure Veg Only (Hides non-veg filters & veg badges)</option>
                      <option value="non-veg">Non-Veg Only</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>City (Optional)</label>
                    <input 
                      type="text" 
                      value={locationCity} 
                      onChange={e => setLocationCity(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Campus Markets / Zones (Comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Food Court 1, Block B, Main Gate, Hostel 3"
                      value={locationMarkets} 
                      onChange={e => setLocationMarkets(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }} 
                    />
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Configured market zones for this campus. Can be added or edited anytime.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                      {editingLocation ? 'Update Hub' : 'Create Hub'}
                    </button>
                    <button type="button" onClick={() => setShowLocationForm(false)} style={{ padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--surface-border)', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bulk Selection Bar for Locations */}
            {locations.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--surface-border)', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={locations.length > 0 && selectedLocations.length === locations.length}
                    onChange={toggleSelectAllLocations}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  Select All Locations ({locations.length})
                </label>
                {selectedLocations.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#b91c1c' }}>
                      {selectedLocations.length} selected
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedLocations([])} 
                      style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={bulkDeleteLocations}
                      disabled={isDeleting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.9rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} /> Delete Selected Locations ({selectedLocations.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {locations.map(loc => {
                const lId = loc._id || loc.id;
                const isChecked = selectedLocations.includes(lId);
                const storeCount = stores.filter(s => s.locationId === lId).length;
                return (
                  <div key={lId} style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: isChecked ? '2px solid #ef4444' : '1px solid var(--surface-border)', boxShadow: isChecked ? '0 10px 25px -5px rgba(239, 68, 68, 0.1)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleSelectLocation(lId)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: loc.type === 'College' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(56, 189, 248, 0.1)', color: loc.type === 'College' ? 'var(--primary)' : '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {loc.type === 'College' ? <GraduationCap size={20} /> : <Building2 size={20} />}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            setEditingLocation(loc);
                            setLocationName(loc.name);
                            setLocationType(loc.type);
                            setLocationCity(loc.city || '');
                            setLocationDietaryType(loc.dietaryType || (loc.name?.toLowerCase().includes('lpu') || loc.name?.toLowerCase().includes('lovely') ? 'veg' : 'both'));
                            setLocationMarkets(loc.markets || '');
                            setShowLocationForm(true);
                          }}
                          style={{ p: '0.4rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleLocationDelete(loc._id)}
                          style={{ p: '0.4rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>{loc.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>{loc.city || 'No City Specified'}</p>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {loc.dietaryType === 'veg' || (!loc.dietaryType && (loc.name?.toLowerCase().includes('lpu') || loc.name?.toLowerCase().includes('lovely'))) ? (
                        <span style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          🌿 Pure Veg Only
                        </span>
                      ) : loc.dietaryType === 'non-veg' ? (
                        <span style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#dc2626', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          🍗 Non-Veg Only
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#d97706', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                          🌿🍗 Both (Veg & Non-Veg)
                        </span>
                      )}
                    </div>

                    {/* Configured Market Zones Display */}
                    <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Campus Market Zones
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAddZone(loc)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Plus size={12} /> Add Zone
                        </button>
                      </div>

                      {loc.markets && loc.markets.trim() ? (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {loc.markets.split(',').map(m => m.trim()).filter(Boolean).map(m => (
                            <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', background: '#ffffff', color: '#475569', border: '1px solid rgba(0,0,0,0.08)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '600' }}>
                              📍 {m}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleQuickRemoveZone(loc, m); }}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', lineHeight: 1, fontSize: '0.8rem' }}
                                title="Remove zone"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No specific market zones configured yet. Click "+ Add Zone" to create one.
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>{storeCount} STORES LINKED</span>
                      <span style={{ fontSize: '0.625rem', background: loc.isHidden ? '#ef4444' : '#10b981', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '900' }}>
                        {loc.isHidden ? 'HIDDEN' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'orders' && (
          <SuperAdminOrdersFeed 
            token={token} 
            socket={socket} 
            stores={stores} 
            locations={locations} 
          />
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Finance & Revenue Distribution</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Monthly billing cycles and commission settlement status.</p>
              </div>
              
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', gap: '0.4rem' }}>
                <button 
                  onClick={() => setFinanceSubTab('dues')}
                  style={{ 
                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', 
                    background: financeSubTab === 'dues' ? 'white' : 'transparent',
                    color: financeSubTab === 'dues' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer',
                    boxShadow: financeSubTab === 'dues' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Current Dues
                </button>
                <button 
                  onClick={() => setFinanceSubTab('history')}
                  style={{ 
                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', 
                    background: financeSubTab === 'history' ? 'white' : 'transparent',
                    color: financeSubTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer',
                    boxShadow: financeSubTab === 'history' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Settlement History
                </button>
              </div>
            </header>

            {financeSubTab === 'dues' ? (
              <>
                {/* Executive Finance Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  <div style={{ padding: '1.25rem 1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Total Gross Volume</p>
                    <h3 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                      ₹{(financeTotals.gross + financeTotals.live).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      Settled ₹{financeTotals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })} + Live ₹{financeTotals.live.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.06) 0%, rgba(245, 158, 11, 0.08) 100%)', borderRadius: '20px', border: '1.5px solid rgba(239, 65, 35, 0.25)', boxShadow: '0 4px 14px rgba(239, 65, 35, 0.06)' }}>
                    <p style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={15} /> Total Platform Deductions
                    </p>
                    <h3 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0, color: 'var(--primary)' }}>
                      ₹{financeTotals.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      2% PG (₹{financeTotals.gateway.toFixed(2)}) + 3% Profit (₹{financeTotals.platform.toFixed(2)}) + 4% Penalty (₹{financeTotals.cancel.toFixed(2)})
                    </p>
                  </div>

                  <div style={{ padding: '1.25rem 1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Total Net to Vendors</p>
                    <h3 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0, color: '#10b981' }}>
                      ₹{financeTotals.transfer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                      Cleared & Scheduled Vendor Transfers
                    </p>
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Stall & UPI</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Monthly Gross</th>
                        <th style={{ padding: '1.25rem', color: '#10b981', fontWeight: '800', fontSize: '0.875rem' }}>Live Volume</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Gateway Fee (2%)</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Platform Profit (3%)</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Cancel Penalty (4%)</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Transfer Amount</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Settlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeData
                        .map(f => {
                          // For ACCUMULATING rows: show projected (live) fees not stale settled history
                          const isAccumulating = f.settlementStatus === 'accumulating';
                          const displayGatewayFee = isAccumulating ? f.projectedGatewayFee : f.gatewayFee;
                          const displayPlatformProfit = isAccumulating ? f.projectedPlatformProfit : f.platformProfit;
                          const displayCancellationPenalty = isAccumulating ? (f.projectedCancellationPenalty || 0) : f.cancellationPenalty;
                          const displayNetPayable = isAccumulating ? f.projectedNetPayable : f.netPayable;

                          // Platform profit label: settled-at-zero (trial era) vs genuinely zero vs positive
                          let platformProfitLabel;
                          let platformProfitColor;
                          if (displayPlatformProfit > 0) {
                            platformProfitLabel = `₹${displayPlatformProfit.toLocaleString()}${isAccumulating ? ' (Projected)' : ''}`;
                            platformProfitColor = '#f59e0b';
                          } else if (f.wasSettledUnderTrial && !isAccumulating) {
                            platformProfitLabel = '₹0 (Settled under Trial)';
                            platformProfitColor = 'var(--text-secondary)';
                          } else {
                            platformProfitLabel = '₹0';
                            platformProfitColor = '#333';
                          }

                          return (
                          <tr key={f.storeId} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                            <td style={{ padding: '1.25rem' }}>
                              <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{f.storeName}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{f.ownerName}</div>
                              <div style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '700', marginTop: '0.25rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'inline-block' }}>{f.upiId}</div>
                              <div style={{ marginTop: '0.25rem', display: 'block', fontSize: '0.65rem', color: '#6366f1', fontWeight: '700' }}>• Standard (3% Platform + 2% PG)</div>
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              <div style={{ fontWeight: '600' }}>₹{f.totalRevenue.toLocaleString()}</div>
                              {f.totalRevenue === 0 && f.liveUnsettledRevenue > 0 && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: '600' }}>accumulating live</span>
                              )}
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              <div style={{ fontWeight: '800', color: '#10b981' }}>₹{f.liveUnsettledRevenue?.toLocaleString() || '0'}</div>
                            </td>
                            <td style={{ padding: '1.25rem', color: 'var(--text-secondary)' }}>
                              <div style={{ fontWeight: '600' }}>
                                ₹{displayGatewayFee?.toLocaleString()}
                                {isAccumulating && <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'block', fontWeight: '700' }}>projected</span>}
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem', color: platformProfitColor }}>
                              <div style={{ fontWeight: '800' }}>{platformProfitLabel}</div>
                            </td>
                            <td style={{ padding: '1.25rem' }}>
                              {displayCancellationPenalty > 0 ? (
                                <div>
                                  <div style={{ fontWeight: '800', color: '#ef4444' }}>
                                    ₹{displayCancellationPenalty.toLocaleString()}
                                    {isAccumulating && <span style={{ fontSize: '0.65rem', color: '#ef4444', display: 'block', fontWeight: '700' }}>4% on cancelled</span>}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontWeight: '600', color: '#333' }}>₹0</div>
                              )}
                            </td>
                            <td style={{ padding: '1.25rem', color: '#10b981' }}>
                              <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>
                                ₹{displayNetPayable?.toLocaleString()}
                                {isAccumulating && <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'block', fontWeight: '700' }}>projected</span>}
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                              {f.settlementStatus === 'paid' ? (
                                <span style={{ color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <CheckCircle size={16} /> SETTLED
                                </span>
                              ) : f.settlementStatus === 'accumulating' ? (
                                <span style={{ color: '#f59e0b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <Activity size={16} /> ACCUMULATING
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const utrNumber = window.prompt(`Enter UTR/Reference Number for settling ₹${f.netPayable.toLocaleString()} to ${f.storeName}:`);
                                    if (utrNumber && utrNumber.trim() !== '') {
                                      try {
                                        const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                                        await axios.post(`${url}/api/super-admin/finance/settle/${f.storeId}`, { utr: utrNumber.trim() }, {
                                          headers: { Authorization: `Bearer ${token}` }
                                        });
                                        alert('Settlement processed successfully!');
                                        fetchDashboardData();
                                      } catch (err) {
                                        alert(err.response?.data?.message || 'Settlement failed');
                                      }
                                    } else if (utrNumber !== null) {
                                      alert('UTR Number is required to complete settlement.');
                                    }
                                  }}
                                  style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}
                                >
                                  SETTLE DUES ({f.pendingCount})
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {financeData.length === 0 && (
                        <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No financial data available for this month.</td></tr>
                      )}
                    </tbody>
                    {financeData.length > 0 && (
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--surface-border)', fontWeight: '800' }}>
                          <td style={{ padding: '1.25rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '900' }}>TOTAL (ALL STALLS)</td>
                          <td style={{ padding: '1.25rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '900' }}>
                            ₹{financeTotals.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1.25rem', color: '#10b981', fontSize: '0.9rem', fontWeight: '900' }}>
                            ₹{financeTotals.live.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '800' }}>
                            ₹{financeTotals.gateway.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1.25rem', color: '#f59e0b', fontSize: '0.9rem', fontWeight: '900' }}>
                            ₹{financeTotals.platform.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1.25rem', color: '#ef4444', fontSize: '0.9rem', fontWeight: '900' }}>
                            ₹{financeTotals.cancel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1.25rem', color: '#10b981', fontSize: '1rem', fontWeight: '900' }}>
                            ₹{financeTotals.transfer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1.25rem' }}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            ) : (
              <div>
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Search by store name..." 
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'white' }}
                  />
                </div>

                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Store & Period</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Type</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Revenue</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Fees</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Net Amount</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                        <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Proof / UTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementHistory
                        .filter(s => s.store?.name?.toLowerCase().includes(historySearch.toLowerCase()))
                        .map(s => (
                        <tr key={s._id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                          <td style={{ padding: '1.25rem' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{s.store?.name || 'Deleted Store'}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              {new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem' }}>
                            <span style={{ 
                              padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                              background: s.settlementType === 'monthly' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: s.settlementType === 'monthly' ? 'var(--primary)' : '#10b981'
                            }}>
                              {s.settlementType}
                            </span>
                          </td>
                          <td style={{ padding: '1.25rem' }}>
                            <div style={{ fontWeight: '600' }}>₹{s.totalRevenue.toLocaleString()}</div>
                          </td>
                          <td style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              G: ₹{s.feesBreakdown.gatewayFee.toLocaleString()}<br/>
                              P: ₹{s.feesBreakdown.platformProfit.toLocaleString()}<br/>
                              C: ₹{s.feesBreakdown.cancellationPenalty.toLocaleString()}
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem' }}>
                            <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>₹{s.netPayable.toLocaleString()}</div>
                          </td>
                          <td style={{ padding: '1.25rem' }}>
                            <span style={{ 
                              padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase',
                              background: s.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: s.status === 'completed' ? '#10b981' : '#f59e0b'
                            }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                            {s.utrNumber ? (
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#3b82f6' }}>{s.utrNumber}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Paid: {new Date(s.paidAt).toLocaleString()}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Pending Payment</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {settlementHistory.length === 0 && (
                        <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No settlement history found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARTNER EQUITY & PROFIT DISTRIBUTION TAB */}
        {activeTab === 'partner_equity' && (
          <SuperAdminPartnerEquity token={token} />
        )}
      </main>
    </div>
  );
};

export default SuperAdminPanel;
