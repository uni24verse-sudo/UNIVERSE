import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sparkles
} from 'lucide-react';
import SuperAdmin3DAnalytics from '../components/superadmin/SuperAdmin3DAnalytics';

const SuperAdminPanel = () => {
  const { token, vendor, logout } = useContext(AuthContext); // vendor holds admin data
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('3d_analytics');
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
  
  // New Location Form State
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('College');
  const [locationCity, setLocationCity] = useState('');

  useEffect(() => {
    if (!token) return navigate('/super-admin/login');
    fetchDashboardData();
  }, [token, navigate]);

  // Robust Wakeup Mechanism: Refetch data when returning from inactivity/sleep
  useEffect(() => {
    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SuperAdminPanel] Device woke up, syncing fresh data...');
        // Silent fetch to ensure no data was missed while the screen was off/backgrounded
        fetchDashboardData(true);
      }
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
    };
  }, [token]);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const [statsRes, vendorsRes, ordersRes, storesRes, financeRes, historyRes, locationsRes] = await Promise.all([
        axios.get(`${url}/api/super-admin/stats`, { headers }),
        axios.get(`${url}/api/super-admin/vendors`, { headers }),
        axios.get(`${url}/api/super-admin/orders`, { headers }),
        axios.get(`${url}/api/super-admin/stores`, { headers }),
        axios.get(`${url}/api/super-admin/finance/summary`, { headers }),
        axios.get(`${url}/api/super-admin/finance/history`, { headers }),
        axios.get(`${url}/api/super-admin/locations`, { headers })
      ]);

      setStats(statsRes.data);
      setVendors(vendorsRes.data);
      setOrders(ordersRes.data);
      setStores(storesRes.data);
      setFinanceData(financeRes.data);
      setSettlementHistory(historyRes.data);
      setLocations(locationsRes.data);
    } catch (err) {
      if (err.response?.status === 403) {
        alert('Forbidden: You are not a super admin.');
        logout();
        navigate('/vendor/login');
      } else {
        console.error('Failed to fetch SA data', err);
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
      const payload = { name: locationName, type: locationType, city: locationCity };

      if (editingLocation) {
        await axios.put(`${url}/api/super-admin/locations/${editingLocation._id}`, payload, { headers });
      } else {
        await axios.post(`${url}/api/super-admin/locations`, payload, { headers });
      }

      setShowLocationForm(false);
      setEditingLocation(null);
      setLocationName('');
      setLocationCity('');
      fetchDashboardData(true);
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
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
      await axios.put(`${url}/api/super-admin/store/${storeId}/assign-location`, 
        { locationId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDashboardData(true);
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteVendor = async (vendorId, vendorName) => {
    if (!window.confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to permanently delete vendor "${vendorName}" AND their store AND all their orders?\n\nThis cannot be undone.`)) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData(true); // Refresh everything
    } catch (err) {
      alert('Failed to delete vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return (
    <div className="auth-wrapper" style={{ background: 'var(--background)' }}>
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>Initializing Command Center...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#ffffff', borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--surface-border)' }}>
          <img src="/helmet-guy.png" alt="UNIVERSE Symbol" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', display: 'block', color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif" }}>UNIVERSE</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Super Admin</span>
          </div>
        </div>

        <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: '3d_analytics', icon: Globe, label: '3D Live Analytics', badge: 'REALTIME' },
            { id: 'overview', icon: Activity, label: 'Platform Overview' },
            { id: 'vendors', icon: Users, label: 'Vendor Registry' },
            { id: 'stores', icon: Store, label: 'Store Directory' },
            { id: 'locations', icon: MapPin, label: 'Location Manager' },
            { id: 'finance', icon: Banknote, label: 'Finance Tracker' },
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
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem 3rem' }}>
        
        {/* 3D LIVE ANALYTICS TAB */}
        {activeTab === '3d_analytics' && (
          <SuperAdmin3DAnalytics token={token} />
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
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} color="var(--secondary)" /> Total Platform Profit</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--primary)' }}>₹{stats.totalProfit || 0}</h3>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Net earnings after trial & fees</p>
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
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Vendor Registry</h1>
              <span style={{ padding: '0.5rem 1rem', background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '100px', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>{vendors.length} Total Vendors</span>
            </header>
            
            <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Vendor Details</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Associated Store</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Performance</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Platform Profit</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Destructive Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v._id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {v.name}
                          {v.isBanned && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: '#ef4444', color: 'white', borderRadius: '4px', fontWeight: '900', letterSpacing: '0.05em' }}>SUSPENDED</span>}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{v.email}</div>
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
                        <div style={{ fontWeight: '800', color: 'var(--secondary)' }}>₹{v.stats.revenue} generated</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Across {v.stats.orderCount} total orders</div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.1rem' }}>₹{v.stats.profitGenerated || 0}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.25rem', fontWeight: '600' }}>
                          {v.store && v.store.isTrialStarted ? (
                             new Date(v.store.trialEndDate) > new Date() ? 'Currently in Trial (0%)' : 'Post-Trial (3%)'
                          ) : 'Trial Not Started'}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={async () => {
                              try {
                                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${v._id}/suspend`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                fetchDashboardData(true);
                              } catch(err) { alert('Action failed'); }
                            }}
                            style={{ padding: '0.5rem 1rem', background: v.isBanned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: v.isBanned ? '#10b981' : '#f59e0b', border: `1px solid ${v.isBanned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <Ban size={16} /> {v.isBanned ? 'Unban' : 'Suspend'}
                          </button>
                          <button 
                            onClick={() => deleteVendor(v._id, v.name)}
                            style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.color = '#ef4444'; }}
                          >
                            <Trash2 size={16} /> Terminate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No vendors registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STORES TAB */}
        {activeTab === 'stores' && (
          <div>
             <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Store Directory</h1>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
              {stores.map(store => (
                <div key={store._id} style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>{store.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Managed by: <span style={{ color: 'var(--text-primary)' }}>{store.admin?.name || 'Unknown'}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                         onClick={async () => {
                           try {
                             await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/toggle-hidden`, {}, { headers: { Authorization: `Bearer ${token}` } });
                             fetchDashboardData(true);
                           } catch(err) { alert('Action failed'); }
                         }}
                         style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '800', background: 'rgba(255,255,255,0.05)', color: store.isHidden ? '#10b981' : '#f59e0b', border: `1px solid ${store.isHidden ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                         {store.isHidden ? <><Eye size={12}/> Unhide</> : <><EyeOff size={12}/> Hide</>}
                      </button>
                      <button 
                         onClick={async () => {
                           try {
                             await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/toggle-status`, {}, { headers: { Authorization: `Bearer ${token}` } });
                             fetchDashboardData(true);
                           } catch(err) { alert('Action failed'); }
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
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '6px', fontWeight: '700' }}>{store.market || 'BH1 Market'}</span>
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

                  {/* Trial & Billing Section */}
                  <div style={{ padding: '1rem', background: store.isTrialStarted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)', borderRadius: '16px', border: `1px solid ${store.isTrialStarted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <p style={{ 
                          fontSize: '0.75rem', 
                          margin: 0, 
                          fontWeight: '800', 
                          textTransform: 'uppercase', 
                          color: store.daysLeftInTrial > 0 ? '#10b981' : '#f59e0b' 
                        }}>
                          {store.isTrialStarted 
                            ? (store.daysLeftInTrial > 0 ? 'Free Trial Active' : 'Trial Period Expired') 
                            : 'Trial Not Started'}
                        </p>
                       {!store.isTrialStarted && (
                         <button 
                          onClick={async () => {
                            if(window.confirm(`Start 30-day free trial for ${store.name}?`)) {
                              try {
                                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/store/${store._id}/start-trial`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                fetchDashboardData(true);
                              } catch(err) { alert('Action failed'); }
                            }
                          }}
                          style={{ padding: '0.4rem 0.8rem', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
                         >
                          Start 30-Day Trial
                         </button>
                       )}
                    </div>
                    
                    {store.isTrialStarted ? (
                      <div>
                        {store.daysLeftInTrial > 0 ? (
                          <p style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>{store.daysLeftInTrial} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Days Remaining</span></p>
                        ) : (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '800', marginBottom: '0.25rem' }}>SUBSCRIPTION ACTIVE (5%)</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>₹{store.estimatedFees} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Fees</span></p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Store is currently in early access.</p>
                    )}
                  </div>

                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--surface-border)', marginTop: 'auto' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Overall Stall Revenue</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>₹{store.totalRevenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOCATIONS TAB */}
        {activeTab === 'locations' && (
          <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Location Manager</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage Colleges and External expansion regions.</p>
              </div>
              <button 
                onClick={() => { setShowLocationForm(true); setEditingLocation(null); setLocationName(''); setLocationCity(''); }}
                style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} /> Add New Location
              </button>
            </header>

            {showLocationForm && (
              <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>{editingLocation ? 'Edit Location' : 'Register New Hub'}</h3>
                <form onSubmit={handleLocationSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Hub Name (e.g. LPU)</label>
                    <input 
                      type="text" 
                      required 
                      value={locationName} 
                      onChange={e => setLocationName(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }} 
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
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>City (Optional)</label>
                    <input 
                      type="text" 
                      value={locationCity} 
                      onChange={e => setLocationCity(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }} 
                    />
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {locations.map(loc => {
                const storeCount = stores.filter(s => s.locationId === loc._id).length;
                return (
                  <div key={loc._id} style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: loc.type === 'College' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(56, 189, 248, 0.1)', color: loc.type === 'College' ? 'var(--primary)' : '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {loc.type === 'College' ? <GraduationCap size={20} /> : <Building2 size={20} />}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            setEditingLocation(loc);
                            setLocationName(loc.name);
                            setLocationType(loc.type);
                            setLocationCity(loc.city || '');
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
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: '600' }}>{loc.city || 'No City Specified'}</p>
                    
                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
           <div>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Global Orders Feed</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Live view of the last 100 transactions across all platform stores.</p>
            </header>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '100px',
                    border: orderFilter === status ? `1px solid var(--primary)` : '1px solid var(--surface-border)',
                    background: orderFilter === status ? 'rgba(239, 65, 35, 0.1)' : 'transparent',
                    color: orderFilter === status ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {status}
                  <span style={{ marginLeft: '0.5rem', opacity: 0.5, fontSize: '0.75rem' }}>
                    {status === 'All' ? orders.length : orders.filter(o => o.status === status).length}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Order ID & Time</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Customer Profile</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Store</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Items</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Amount & Payment</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter(o => orderFilter === 'All' ? true : o.status === orderFilter)
                    .map(o => (
                    <tr key={o._id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)' }}>#{o.orderNumber}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{new Date(o.createdAt).toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                         <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{o.customerName || 'Anonymous'}</div>
                         <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>📞 {o.customerPhone || 'No Phone'}</div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{o.store?.name || 'Deleted Store'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{o.store?.market || 'Unknown Market'}</div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                           {o.items.length} unique items
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>₹{o.totalAmount}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '600', color: o.paymentMethod === 'UPI' ? '#3b82f6' : 'var(--text-secondary)' }}>
                           {o.paymentMethod} • {o.paymentStatus}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                        <span style={{ 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: o.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 
                                      o.status === 'Confirmed' ? 'rgba(59, 130, 246, 0.1)' : 
                                      o.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' :
                                      'rgba(16, 185, 129, 0.1)',
                          color: o.status === 'Pending' ? '#f59e0b' : 
                                 o.status === 'Confirmed' ? '#3b82f6' : 
                                 o.status === 'Cancelled' ? '#ef4444' :
                                 '#10b981',
                        }}>
                          {o.status}
                        </span>
                        
                        {(o.status === 'Pending' || o.status === 'Confirmed') && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <button
                              onClick={async () => {
                                if(window.confirm('Abort this order globally? The vendor and customer will see it as cancelled instantly.')) {
                                  try {
                                    await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/order/${o._id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                    fetchDashboardData(true);
                                  } catch(err) { alert('Action failed'); }
                                }
                              }}
                              style={{ padding: '0.3rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', textTransform: 'uppercase' }}
                            >
                              Abort Order
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.filter(o => orderFilter === 'All' ? true : o.status === orderFilter).length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders found for this status.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
           </div>
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
                      .map(f => (
                      <tr key={f.storeId} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '1.25rem' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{f.storeName}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{f.ownerName}</div>
                          <div style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '700', marginTop: '0.25rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'inline-block' }}>{f.upiId}</div>
                          {f.isTrialActive && (
                            <div style={{ marginTop: '0.25rem', display: 'block', fontSize: '0.65rem', color: '#10b981', fontWeight: '900' }}>• TRIAL ACTIVE (2% ONLY)</div>
                          )}
                        </td>
                        <td style={{ padding: '1.25rem' }}>
                          <div style={{ fontWeight: '600' }}>₹{f.totalRevenue.toLocaleString()}</div>
                        </td>
                        <td style={{ padding: '1.25rem' }}>
                          <div style={{ fontWeight: '800', color: '#10b981' }}>₹{f.liveUnsettledRevenue?.toLocaleString() || '0'}</div>
                        </td>
                        <td style={{ padding: '1.25rem', color: 'var(--text-secondary)' }}>
                          <div style={{ fontWeight: '600' }}>₹{f.gatewayFee.toLocaleString()}</div>
                        </td>
                        <td style={{ padding: '1.25rem', color: f.platformProfit > 0 ? '#f59e0b' : '#333' }}>
                          <div style={{ fontWeight: '800' }}>{f.platformProfit > 0 ? `₹${f.platformProfit.toLocaleString()}` : '₹0 (Trial)'}</div>
                        </td>
                        <td style={{ padding: '1.25rem' }}>
                          {f.cancellationPenalty > 0 ? (
                            <div>
                              <div style={{ fontWeight: '800', color: '#ef4444' }}>₹{f.cancellationPenalty.toLocaleString()}</div>
                            </div>
                          ) : (
                            <div style={{ fontWeight: '600', color: '#333' }}>₹0</div>
                          )}
                        </td>
                        <td style={{ padding: '1.25rem', color: '#10b981' }}>
                          <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>₹{f.netPayable.toLocaleString()}</div>
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
                                    await axios.post(`${url}/api/super-admin/finance/settle`, {
                                      storeId: f.storeId,
                                      utrNumber: utrNumber.trim()
                                    }, { headers: { Authorization: `Bearer ${token}` } });
                                    fetchDashboardData(true);
                                    alert('Successfully marked as settled and UTR recorded.');
                                  } catch (err) { alert('Settlement failed: ' + (err.response?.data?.message || err.message)); }
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
                    ))}
                    {financeData.length === 0 && (
                      <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No financial data available for this month.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
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
      </main>
    </div>
  );
};

export default SuperAdminPanel;
