import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  FileText, 
  Smartphone, 
  Mail, 
  Calendar, 
  CreditCard, 
  ChevronRight, 
  ExternalLink, 
  Eye, 
  X, 
  Filter, 
  TrendingUp,
  Store,
  Zap,
  MapPin,
  Copy,
  Check,
  Activity,
  Banknote,
  Receipt,
  Layers,
  ShoppingBag
} from 'lucide-react';

const SuperAdminCustomerIntelligence = ({ token }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Aggregated platform stats
  const [statsSummary, setStatsSummary] = useState({
    totalCustomers: 0,
    totalGMV: 0,
    totalOrders: 0,
    totalRefunded: 0
  });

  // 360 Drawer State
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [customer360, setCustomer360] = useState(null);
  const [loading360, setLoading360] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Order Timeline Modal State
  const [activeTimelineOrder, setActiveTimelineOrder] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Refund State
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundResult, setRefundResult] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchGlobalSummary = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/super-admin/customers`, {
        headers,
        params: { limit: 1000 }
      });
      if (res.data.success && res.data.customers) {
        const allCust = res.data.customers;
        const gmv = allCust.reduce((acc, c) => acc + (c.metrics?.totalSpent || 0), 0);
        const orders = allCust.reduce((acc, c) => acc + (c.metrics?.totalOrders || 0), 0);
        const refunded = allCust.reduce((acc, c) => acc + (c.metrics?.totalRefunded || 0), 0);
        setStatsSummary({
          totalCustomers: res.data.total || allCust.length,
          totalGMV: gmv,
          totalOrders: orders,
          totalRefunded: refunded
        });
      }
    } catch (e) {
      console.warn('Could not fetch global summary:', e.message);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/super-admin/customers`, {
        headers,
        params: { search, page, limit: 20, status: filterStatus }
      });

      if (res.data.success) {
        setCustomers(res.data.customers || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalSummary();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, filterStatus, page]);

  const handleOpen360 = async (userId) => {
    setSelectedUserId(userId);
    setLoading360(true);
    setCopiedId(false);
    try {
      const res = await axios.get(`${apiUrl}/api/super-admin/customers/${userId}`, { headers });
      if (res.data.success) {
        setCustomer360(res.data);
      }
    } catch (err) {
      alert('Error fetching customer profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading360(false);
    }
  };

  const handleOpenTimeline = async (order) => {
    setActiveTimelineOrder(order);
    setLoadingTimeline(true);
    setRefundResult('');
    try {
      const res = await axios.get(`${apiUrl}/api/super-admin/customers/orders/${order._id}/timeline`, { headers });
      if (res.data.success) {
        setTimelineEvents(res.data.timeline || []);
      }
    } catch (err) {
      console.error('Error fetching order timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleTriggerRefund = async (orderId) => {
    if (!refundReason.trim()) {
      alert('Please specify a reason for this refund.');
      return;
    }
    setProcessingRefund(true);
    try {
      const res = await axios.post(`${apiUrl}/api/super-admin/customers/orders/${orderId}/refund`, {
        reason: refundReason
      }, { headers });

      if (res.data.success) {
        setRefundResult(`✅ Refund Processed! Ref ID: ${res.data.refundId}`);
        if (selectedUserId) handleOpen360(selectedUserId);
        if (activeTimelineOrder) handleOpenTimeline({ ...activeTimelineOrder, _id: orderId });
      }
    } catch (err) {
      setRefundResult(`❌ Refund Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessingRefund(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  return (
    <div>
      {/* Super Admin Standard Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Customer 360 & Audit
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Live customer intelligence, lifetime spend metrics, and tamper-proof order timeline.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ padding: '0.5rem 1rem', background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '100px', fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            {totalCount} Total Customers
          </span>
        </div>
      </header>

      {/* Super Admin Standard Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} color="var(--primary)" /> Registered Students
          </p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{totalCount}</h3>
          <p style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.875rem', fontWeight: '600' }}>Active in ecosystem</p>
        </div>

        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Banknote size={16} color="var(--secondary)" /> Lifetime Student GMV
          </p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--secondary)' }}>
            ₹{statsSummary.totalGMV.toLocaleString('en-IN')}
          </h3>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Across completed campus orders</p>
        </div>

        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={16} color="var(--primary)" /> Total Orders Placed
          </p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{statsSummary.totalOrders}</h3>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Lifetime order snapshots</p>
        </div>

        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RotateCcw size={16} color="#ef4444" /> Total Auto-Refunded
          </p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: '#ef4444' }}>
            ₹{statsSummary.totalRefunded.toLocaleString('en-IN')}
          </h3>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Returned with ₹0 deduction</p>
        </div>
      </div>

      {/* Filter & Search Bar matching Super Admin */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid var(--surface-border)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by User ID, Phone Number, Name, or Email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              borderRadius: '12px',
              border: '1px solid var(--surface-border)',
              fontSize: '0.875rem',
              fontWeight: '600',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Customers' },
            { id: 'Active', label: 'Active Status' },
            { id: 'Flagged', label: 'High Refund / Flagged' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterStatus(tab.id); setPage(1); }}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                border: filterStatus === tab.id ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                background: filterStatus === tab.id ? 'rgba(239, 65, 35, 0.1)' : '#ffffff',
                color: filterStatus === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Registry Table matching Vendor Registry styling */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.875rem' }}>Customer Details</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.875rem' }}>Campus / Market</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.875rem' }}>Order Activity</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.875rem' }}>Total Spent</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.875rem' }}>Refund Risk</th>
              <th style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.875rem', textAlign: 'right' }}>360° Profile</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Loading customer directory...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No customer records found matching your query.
                </td>
              </tr>
            ) : (
              customers.map(c => {
                const refundRate = c.metrics?.refundRate || 0;
                const isHighRefund = refundRate > 30 && (c.metrics?.totalOrders || 0) >= 2;

                return (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background 0.15s' }}>
                    {/* Customer Details */}
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.currentName}
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '6px', fontFamily: 'monospace', fontWeight: '800' }}>
                          {c.userId}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Smartphone size={13} color="var(--primary)" />
                        <span>{c.phone}</span>
                        {c.email && (
                          <>
                            <span>•</span>
                            <Mail size={13} />
                            <span>{c.email}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Campus / Location */}
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {c.campus?.split(' • ')[0] || 'Lovely Professional University'}
                      </div>
                      {c.campus?.includes(' • ') ? (
                        <div style={{ marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: '700' }}>
                            {c.campus.split(' • ')[1]}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: 'var(--text-secondary)', borderRadius: '6px', fontWeight: '600', marginTop: '0.25rem', display: 'inline-block' }}>
                          Main Campus
                        </span>
                      )}
                    </td>

                    {/* Order Activity */}
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1rem' }}>
                        {c.metrics?.totalOrders || 0} Total Orders
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
                          ✓ {c.metrics?.completedOrders || 0} Done
                        </span>
                        {c.metrics?.cancelledOrders > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700' }}>
                            • {c.metrics.cancelledOrders} Cancelled
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Spent */}
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.2rem' }}>
                        ₹{c.metrics?.totalSpent?.toLocaleString('en-IN') || 0}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '600' }}>
                        Lifetime Value
                      </div>
                    </td>

                    {/* Refund Rate */}
                    <td style={{ padding: '1.25rem' }}>
                      <span style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        background: isHighRefund ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isHighRefund ? '#ef4444' : '#10b981',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {refundRate}% Rate
                      </span>
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpen360(c.userId)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 8px rgba(239, 65, 35, 0.25)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Eye size={15} /> View 360°
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination matching Super Admin Panel */}
        {totalPages > 1 && (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Page {page} of {totalPages} ({totalCount} verified student records)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Super Admin Standard 360° Drawer Modal */}
      {selectedUserId && customer360 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '720px',
            height: '100vh',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{ padding: '1.75rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: '800' }}>
                    {customer360.customer.userId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(customer360.customer.userId)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    {copiedId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                  {customer360.customer.currentName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', border: '1px solid var(--surface-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Profile Card */}
              <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid var(--surface-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Phone Number</p>
                  <p style={{ margin: '0.25rem 0 0', fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>{customer360.customer.phone}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Email Address</p>
                  <p style={{ margin: '0.25rem 0 0', fontWeight: '700', fontSize: '0.95rem', color: customer360.customer.email ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {customer360.customer.email || 'None Provided (Optional)'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Campus / Market</p>
                  <p style={{ margin: '0.25rem 0 0', fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {customer360.customer.campus || 'Lovely Professional University'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Account Status</p>
                  <p style={{ margin: '0.25rem 0 0', fontWeight: '800', fontSize: '0.95rem', color: customer360.customer.status === 'Active' ? '#10b981' : '#ef4444' }}>
                    ● {customer360.customer.status}
                  </p>
                </div>
              </div>

              {/* Financial Scorecard Grid */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--primary)" /> Financial Performance
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Orders</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                      {customer360.customer.metrics?.totalOrders || 0}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Done</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>
                      {customer360.customer.metrics?.completedOrders || 0}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>GMV Spent</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: '900', color: 'var(--secondary)' }}>
                      ₹{customer360.customer.metrics?.totalSpent?.toLocaleString('en-IN') || 0}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase' }}>Refunded</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#ef4444' }}>
                      ₹{customer360.customer.metrics?.totalRefunded?.toLocaleString('en-IN') || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historical Order Ledger */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={18} color="var(--primary)" /> Historical Order Ledger & Audit Trails
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Click any order below to expand its payment gateway record, automated refund status, and lifecycle timeline.
                </p>

                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                        <th style={{ padding: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem' }}>Order #</th>
                        <th style={{ padding: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem' }}>Outlet</th>
                        <th style={{ padding: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem' }}>Checkout Name</th>
                        <th style={{ padding: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem' }}>Amount</th>
                        <th style={{ padding: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textAlign: 'right' }}>Audit Trail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer360.orders?.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No orders found for this customer.
                          </td>
                        </tr>
                      ) : (
                        customer360.orders?.map(ord => {
                          const isExpanded = activeTimelineOrder?._id === ord._id;

                          return (
                            <React.Fragment key={ord._id}>
                              <tr 
                                onClick={() => isExpanded ? setActiveTimelineOrder(null) : handleOpenTimeline(ord)}
                                style={{ 
                                  borderBottom: '1px solid var(--surface-border)', 
                                  cursor: 'pointer',
                                  background: isExpanded ? 'rgba(239, 65, 35, 0.03)' : 'transparent',
                                  transition: 'background 0.15s'
                                }}
                              >
                                <td style={{ padding: '0.9rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                  #{ord.orderNumber}
                                </td>
                                <td style={{ padding: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                  {ord.store?.name || 'Counter'}
                                </td>
                                <td style={{ padding: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                  {ord.customerName}
                                </td>
                                <td style={{ padding: '0.9rem', fontWeight: '900', color: 'var(--primary)' }}>
                                  ₹{ord.totalAmount}
                                </td>
                                <td style={{ padding: '0.9rem' }}>
                                  <span style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    background: ord.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : (ord.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                    color: ord.status === 'Completed' ? '#10b981' : (ord.status === 'Cancelled' ? '#ef4444' : '#f59e0b')
                                  }}>
                                    {ord.status}
                                  </span>
                                </td>
                                <td style={{ padding: '0.9rem', textAlign: 'right' }}>
                                  <span style={{
                                    padding: '0.35rem 0.75rem',
                                    background: isExpanded ? 'var(--primary)' : '#f8fafc',
                                    border: '1px solid var(--surface-border)',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '0.75rem',
                                    color: isExpanded ? '#ffffff' : 'var(--text-primary)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}>
                                    {isExpanded ? 'Hide Details' : 'View Audit'}
                                    <ChevronRight size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                  </span>
                                </td>
                              </tr>

                              {/* INLINE EXPANDABLE AUDIT CARD */}
                              {isExpanded && (
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                                  <td colSpan="6" style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                      
                                      {/* Transaction & Refund Overview Banner */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                        <div style={{ background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Razorpay Payment</p>
                                          <p style={{ margin: '0.2rem 0 0', fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                            {ord.transactionId || 'CAPTURED_UPI'} (₹{ord.totalAmount})
                                          </p>
                                        </div>

                                        <div style={{ background: ord.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${ord.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, borderRadius: '12px', padding: '0.75rem 1rem' }}>
                                          <p style={{ margin: 0, fontSize: '0.7rem', color: ord.status === 'Cancelled' ? '#ef4444' : '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Refund Status</p>
                                          <p style={{ margin: '0.2rem 0 0', fontWeight: '800', fontSize: '0.85rem', color: ord.status === 'Cancelled' ? '#ef4444' : '#10b981' }}>
                                            {ord.status === 'Cancelled' ? `✅ Full Refund Processed (₹${ord.totalAmount})` : 'N/A (Order Completed)'}
                                          </p>
                                        </div>

                                        <div style={{ background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>WhatsApp Notification</p>
                                          <p style={{ margin: '0.2rem 0 0', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                            📱 Alert Dispatched to {ord.customerPhone}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Items Summary */}
                                      {ord.items && ord.items.length > 0 && (
                                        <div style={{ background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                                          <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Items Ordered</p>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {ord.items.map((it, idx) => (
                                              <span key={idx} style={{ padding: '0.25rem 0.6rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {it.quantity}x {it.name} (₹{it.price * it.quantity})
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Evidentiary Lifecycle Events */}
                                      <div style={{ background: '#ffffff', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '1rem' }}>
                                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <ShieldCheck size={14} color="var(--primary)" /> Append-Only Lifecycle Audit Stream
                                        </p>

                                        {loadingTimeline ? (
                                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading timeline events...</p>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingLeft: '1rem', borderLeft: '2px solid var(--surface-border)', marginLeft: '4px' }}>
                                            {timelineEvents.map((evt, idx) => (
                                              <div key={evt._id || idx} style={{ position: 'relative' }}>
                                                <div style={{
                                                  position: 'absolute',
                                                  left: '-1.35rem',
                                                  top: '4px',
                                                  width: '10px',
                                                  height: '10px',
                                                  borderRadius: '50%',
                                                  background: evt.eventType.includes('REFUND') || evt.eventType.includes('CANCEL') ? '#ef4444' : (evt.eventType.includes('COMPLETED') ? '#10b981' : 'var(--primary)'),
                                                  border: '2px solid #ffffff'
                                                }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                    {evt.eventType.replace(/_/g, ' ')}
                                                  </span>
                                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                  </span>
                                                </div>
                                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                  Logged by <strong style={{ color: 'var(--text-primary)' }}>{evt.actorType}</strong> ({evt.actorId})
                                                </p>
                                                {evt.metadata?.refundId && (
                                                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#ef4444', fontWeight: '700' }}>
                                                    Ref ID: {evt.metadata.refundId}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminCustomerIntelligence;
