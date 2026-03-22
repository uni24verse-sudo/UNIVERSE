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
  Activity
} from 'lucide-react';

const SuperAdminPanel = () => {
  const { token, vendor, logout } = useContext(AuthContext); // vendor holds admin data
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return navigate('/super-admin/login');
    fetchDashboardData();
  }, [token, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const [statsRes, vendorsRes, ordersRes, storesRes] = await Promise.all([
        axios.get(`${url}/api/super-admin/stats`, { headers }),
        axios.get(`${url}/api/super-admin/vendors`, { headers }),
        axios.get(`${url}/api/super-admin/orders`, { headers }),
        axios.get(`${url}/api/super-admin/stores`, { headers })
      ]);

      setStats(statsRes.data);
      setVendors(vendorsRes.data);
      setOrders(ordersRes.data);
      setStores(storesRes.data);
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

  const deleteVendor = async (vendorId, vendorName) => {
    if (!window.confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to permanently delete vendor "${vendorName}" AND their store AND all their orders?\n\nThis cannot be undone.`)) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData(); // Refresh everything
    } catch (err) {
      alert('Failed to delete vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return (
    <div className="auth-wrapper" style={{ background: '#0a0a0a' }}>
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem', color: 'white' }}>Initializing Command Center...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#111', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #333' }}>
          <Shield color="var(--primary)" size={32} />
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'block' }}>UniVerse</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Super Admin</span>
          </div>
        </div>

        <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'overview', icon: Activity, label: 'Platform Overview' },
            { id: 'vendors', icon: Users, label: 'Vendor Registry' },
            { id: 'stores', icon: Store, label: 'Store Directory' },
            { id: 'orders', icon: ShoppingBag, label: 'Global Orders' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                borderRadius: '12px', background: activeTab === tab.id ? 'var(--primary)' : 'transparent', 
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)', 
                border: 'none', cursor: 'pointer', fontWeight: '600', textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
          <button onClick={() => { logout(); navigate('/super-admin/login'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
            <LogOut size={20} /> Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem 3rem' }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div>
            <header style={{ marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>Global Analytics</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Welcome back, Commander. Here's the platform pulse.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {/* Stat Cards */}
              <div style={{ padding: '1.5rem', background: '#111', borderRadius: '24px', border: '1px solid #333' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Banknote size={16} /> Total Platform Revenue</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--secondary)' }}>₹{stats.totalRevenue}</h3>
                <p style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.875rem', fontWeight: '600' }}>+ ₹{stats.todayRevenue} today</p>
              </div>

              <div style={{ padding: '1.5rem', background: '#111', borderRadius: '24px', border: '1px solid #333' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16} /> Registered Vendors</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{stats.totalVendors}</h3>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Operating {stats.totalStores} stores</p>
              </div>

              <div style={{ padding: '1.5rem', background: '#111', borderRadius: '24px', border: '1px solid #333' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16} /> Total Processed Orders</p>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{stats.totalOrders}</h3>
                <p style={{ marginTop: '0.5rem', color: '#f59e0b', fontSize: '0.875rem', fontWeight: '600' }}>{stats.activeOrders} active right now</p>
              </div>
            </div>
            
            <div style={{ padding: '3rem', background: '#111', borderRadius: '24px', border: '1px solid #333', textAlign: 'center' }}>
              <Shield size={64} style={{ opacity: 0.1, margin: '0 auto 1.5rem' }} />
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
              <span style={{ padding: '0.5rem 1rem', background: '#111', border: '1px solid #333', borderRadius: '100px', fontSize: '0.875rem' }}>{vendors.length} Total Vendors</span>
            </header>
            
            <div style={{ background: '#111', borderRadius: '24px', border: '1px solid #333', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Vendor Details</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Associated Store</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Performance</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Destructive Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v._id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>{v.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{v.email}</div>
                        {v.upiId && <div style={{ color: '#3b82f6', fontSize: '0.75rem', marginTop: '0.25rem', padding: '0.1rem 0.4rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', display: 'inline-block' }}>{v.upiId}</div>}
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        {v.store ? (
                          <>
                            <div style={{ fontWeight: '600' }}>{v.store.name}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.store.productCount} Menu Items</span>
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
                      <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => deleteVendor(v._id, v.name)}
                          style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                          onMouseLeave={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.color = '#ef4444'; }}
                        >
                          <Trash2 size={16} /> Terminate
                        </button>
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
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {stores.map(store => (
                <div key={store._id} style={{ padding: '1.5rem', background: '#111', borderRadius: '24px', border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>{store.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Managed by: <span style={{ color: 'white' }}>{store.admin?.name || 'Unknown'}</span>
                      </p>
                    </div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: store.isOpen ? '#10b981' : '#ef4444', boxShadow: store.isOpen ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: '700' }}>{store.category}</span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: '#222', color: 'var(--text-secondary)', borderRadius: '6px', fontWeight: '600' }}>{store.productCount} SKUs</span>
                  </div>

                  <div style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Total Store Revenue</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>₹{store.totalRevenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
           <div>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Global Orders Feed</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Live view of the last 100 transactions across all platform stores.</p>
            </header>

            <div style={{ background: '#111', borderRadius: '24px', border: '1px solid #333', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Order ID & Time</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Store</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Items</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Amount & Payment</th>
                    <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '700', fontFamily: 'monospace', color: 'white' }}>#{o.orderNumber}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{new Date(o.createdAt).toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '1.25rem', fontWeight: '600', color: 'var(--primary)' }}>
                        {o.store?.name || 'Deleted Store'}
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                           {o.items.length} unique items
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '800', color: 'white' }}>₹{o.totalAmount}</div>
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
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders across the platform yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminPanel;
