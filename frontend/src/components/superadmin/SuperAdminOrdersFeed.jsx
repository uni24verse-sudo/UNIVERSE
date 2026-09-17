import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  X, 
  Calendar, 
  Store, 
  CreditCard, 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';

const SuperAdminOrdersFeed = ({ token, socket, stores = [], locations = [] }) => {
  // Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedStoreId, setSelectedStoreId] = useState('All');
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', '7days', '30days'
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Data States
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [metrics, setMetrics] = useState({ totalRevenue: 0, aov: 0, completedOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset to page 1 when any filter changes
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/super-admin/orders`, {
        ...authConfig,
        params: {
          paginated: 'true',
          page,
          limit,
          search: debouncedSearch,
          status,
          storeId: selectedStoreId,
          market: selectedMarket,
          paymentStatus,
          dateFilter
        }
      });

      if (res.data && res.data.orders) {
        setOrders(res.data.orders);
        setTotalOrders(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
        setCounts(res.data.counts || { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
        setMetrics(res.data.metrics || { totalRevenue: 0, aov: 0, completedOrders: 0 });
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
        setTotalOrders(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch orders feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, limit, debouncedSearch, status, selectedStoreId, selectedMarket, paymentStatus, dateFilter]);

  // Socket listener for real-time live order updates
  useEffect(() => {
    if (!socket) return;
    const handleLiveOrder = () => fetchOrders();
    socket.on('new_order', handleLiveOrder);
    socket.on('order_status_update', handleLiveOrder);
    return () => {
      socket.off('new_order', handleLiveOrder);
      socket.off('order_status_update', handleLiveOrder);
    };
  }, [socket]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('All');
    setSelectedStoreId('All');
    setSelectedMarket('All');
    setPaymentStatus('All');
    setDateFilter('all');
    setPage(1);
  };

  const hasActiveFilters = search || status !== 'All' || selectedStoreId !== 'All' || selectedMarket !== 'All' || paymentStatus !== 'All' || dateFilter !== 'all';

  // Export to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return alert('No orders to export.');
    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'Store Name', 'Market', 'Total Amount', 'Payment Method', 'Payment Status', 'Order Status'];
    const rows = orders.map(o => [
      o.orderNumber || o._id,
      new Date(o.createdAt).toLocaleString(),
      `"${o.customerName || 'Anonymous'}"`,
      o.customerPhone || '',
      `"${o.store?.name || 'Store'}"`,
      `"${o.store?.market || ''}"`,
      o.totalAmount,
      o.paymentMethod || 'UPI',
      o.paymentStatus || 'Confirmed',
      o.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UniVerse_Global_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order platform-wide?')) return;
    try {
      await axios.put(`${API_URL}/api/super-admin/order/${orderId}/cancel`, {}, authConfig);
      fetchOrders();
    } catch (err) {
      alert('Failed to cancel order: ' + (err.response?.data?.message || err.message));
    }
  };

  // Distinct markets from stores
  const distinctMarkets = useMemo(() => {
    const set = new Set();
    stores.forEach(s => {
      if (s.market) set.add(s.market);
    });
    return Array.from(set).sort();
  }, [stores]);

  return (
    <div>
      {/* Top Header & Overview KPI Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
              Global Orders Control Feed
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Real-time platform ledger with live telemetry, multi-dimensional filtering, and drill-down inspection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
              }}
            >
              <FileSpreadsheet size={16} color="#10b981" /> Export CSV
            </button>
            <button
              onClick={fetchOrders}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--primary)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 65, 35, 0.25)'
              }}
            >
              <RotateCcw size={16} /> Refresh Feed
            </button>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filtered Transactions</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{totalOrders.toLocaleString()}</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Matching current query</span>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gross Volume</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#10b981', marginTop: '0.25rem' }}>₹{metrics.totalRevenue.toLocaleString()}</div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>{metrics.completedOrders} Completed Orders</span>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Average Order Value</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#6366f1', marginTop: '0.25rem' }}>₹{metrics.aov}</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Per completed basket</span>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Order Pagination</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#f59e0b', marginTop: '0.25rem' }}>Page {page} <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>/ {totalPages}</span></div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{limit} orders per view</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '20px', 
        border: '1px solid var(--surface-border)', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
      }}>
        {/* Row 1: Search & Date Pills */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search by Order #, Customer Name, Phone, or Stall..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 2.75rem',
                borderRadius: '12px',
                border: '1px solid var(--surface-border)',
                background: 'var(--background)',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                fontWeight: '600',
                outline: 'none'
              }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Date Range Selector Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => handleFilterChange(setDateFilter)(d.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '100px',
                  border: dateFilter === d.id ? '1px solid var(--primary)' : '1px solid var(--surface-border)',
                  background: dateFilter === d.id ? 'rgba(239, 65, 35, 0.1)' : 'transparent',
                  color: dateFilter === d.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Store, Market, Payment) */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Store Filter */}
          <div style={{ minWidth: '180px', flex: 1 }}>
            <select
              value={selectedStoreId}
              onChange={(e) => handleFilterChange(setSelectedStoreId)(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="All">All Stalls / Stores ({stores.length})</option>
              {stores.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name} ({s.market || 'Campus'})
                </option>
              ))}
            </select>
          </div>

          {/* Market / Location Filter */}
          <div style={{ minWidth: '160px', flex: 1 }}>
            <select
              value={selectedMarket}
              onChange={(e) => handleFilterChange(setSelectedMarket)(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="All">All Markets / Locations</option>
              {distinctMarkets.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              value={paymentStatus}
              onChange={(e) => handleFilterChange(setPaymentStatus)(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="All">All Payment Statuses</option>
              <option value="Confirmed">Confirmed / Paid</option>
              <option value="Pending">Pending Payment</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* STATUS TABS PILL BAR */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'All', label: 'All Orders', count: counts.all },
          { id: 'Pending', label: 'Pending', count: counts.pending, color: '#f59e0b' },
          { id: 'Confirmed', label: 'Confirmed', count: counts.confirmed, color: '#3b82f6' },
          { id: 'Completed', label: 'Completed', count: counts.completed, color: '#10b981' },
          { id: 'Cancelled', label: 'Cancelled', count: counts.cancelled, color: '#ef4444' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleFilterChange(setStatus)(tab.id)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '100px',
              border: status === tab.id ? '1px solid var(--primary)' : '1px solid var(--surface-border)',
              background: status === tab.id ? 'rgba(239, 65, 35, 0.1)' : '#ffffff',
              color: status === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
              boxShadow: status === tab.id ? '0 2px 8px rgba(239, 65, 35, 0.15)' : 'none'
            }}
          >
            {tab.label}
            <span style={{
              background: status === tab.id ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
              color: status === tab.id ? '#ffffff' : 'var(--text-secondary)',
              padding: '0.15rem 0.5rem',
              borderRadius: '100px',
              fontSize: '0.75rem',
              fontWeight: '900'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ORDERS TABLE CARD */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid var(--surface-border)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="pulse-container" style={{ margin: '0 auto 1rem auto' }}><div className="pulse-dot"></div></div>
            <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Loading transactions from platform ledger...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShoppingBag size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Orders Found</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Try relaxing your search terms or clearing your date/status filters.</p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="btn btn-primary"
                style={{ marginTop: '1.25rem', padding: '0.5rem 1.5rem', borderRadius: '10px' }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID & Time</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stall & Location</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items & Quantity</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount & Method</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const itemCount = Array.isArray(o.items) ? o.items.length : 0;
                  const totalUnits = Array.isArray(o.items) ? o.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
                  const isCancelable = ['Pending', 'Confirmed', 'Cooking'].includes(o.status);

                  return (
                    <tr 
                      key={o._id || o.id}
                      style={{ 
                        borderBottom: '1px solid var(--surface-border)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Order ID & Time */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            #{o.orderNumber || o._id?.slice(-5)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(o.orderNumber || o._id, o._id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                            title="Copy Order Number"
                          >
                            {copiedId === o._id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          </button>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </td>

                      {/* Customer Profile */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {o.customerName || 'Anonymous Student'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                          <Phone size={12} />
                          <a 
                            href={`tel:${o.customerPhone}`}
                            style={{ color: 'inherit', textDecoration: 'none', fontWeight: '600' }}
                          >
                            {o.customerPhone || 'No Phone'}
                          </a>
                        </div>
                      </td>

                      {/* Store & Location */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.9rem' }}>
                          {o.store?.name || 'Stall # ' + (o.storeId?.slice(-4) || '')}
                        </div>
                        <div style={{ display: 'inline-block', fontSize: '0.7rem', color: '#64748b', background: 'rgba(0,0,0,0.04)', padding: '0.15rem 0.5rem', borderRadius: '4px', marginTop: '0.25rem', fontWeight: '600' }}>
                          {o.store?.market || 'Campus Stall'}
                        </div>
                      </td>

                      {/* Items & Quantity */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            color: '#6366f1',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {itemCount} {itemCount === 1 ? 'Dish' : 'Dishes'} ({totalUnits} pcs) • View
                        </button>
                      </td>

                      {/* Amount & Payment */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: '900', color: 'var(--text-primary)', fontSize: '1rem' }}>
                          ₹{o.totalAmount}
                        </div>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: '700', 
                          marginTop: '0.2rem',
                          color: o.paymentStatus === 'Confirmed' ? '#10b981' : o.paymentStatus === 'Failed' ? '#ef4444' : '#f59e0b'
                        }}>
                          {o.paymentMethod || 'UPI'} • {o.paymentStatus || 'Confirmed'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          background: o.status === 'Pending' ? 'rgba(245, 158, 11, 0.12)' :
                                      o.status === 'Confirmed' ? 'rgba(59, 130, 246, 0.12)' :
                                      o.status === 'Cooking' ? 'rgba(245, 158, 11, 0.12)' :
                                      o.status === 'Ready' ? 'rgba(139, 92, 246, 0.12)' :
                                      o.status === 'Completed' ? 'rgba(16, 185, 129, 0.12)' :
                                      'rgba(239, 68, 68, 0.12)',
                          color: o.status === 'Pending' ? '#f59e0b' :
                                 o.status === 'Confirmed' ? '#3b82f6' :
                                 o.status === 'Cooking' ? '#f59e0b' :
                                 o.status === 'Ready' ? '#8b5cf6' :
                                 o.status === 'Completed' ? '#10b981' :
                                 '#ef4444'
                        }}>
                          {o.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '8px',
                              background: 'rgba(0,0,0,0.04)',
                              border: '1px solid var(--surface-border)',
                              color: 'var(--text-primary)',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Details
                          </button>

                          {isCancelable && (
                            <button
                              onClick={() => handleCancelOrder(o._id || o.id)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Abort
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid var(--surface-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#f8fafc'
        }}>
          {/* Left: Row range info */}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalOrders > 0 ? (page - 1) * limit + 1 : 0}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(page * limit, totalOrders)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalOrders.toLocaleString()}</strong> orders
          </div>

          {/* Center: Rows per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                fontWeight: '700',
                fontSize: '0.85rem'
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Right: Pagination Controls */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: page <= 1 ? '#cbd5e1' : 'var(--text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: page <= 1 ? '#cbd5e1' : 'var(--text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Current Page Number Pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = page - 2 + i;
              if (page < 3) pNum = i + 1;
              if (page > totalPages - 2) pNum = totalPages - 4 + i;
              if (pNum < 1 || pNum > totalPages) return null;

              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={{
                    minWidth: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: page === pNum ? 'none' : '1px solid var(--surface-border)',
                    background: page === pNum ? 'var(--primary)' : '#ffffff',
                    color: page === pNum ? '#ffffff' : 'var(--text-primary)',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: page >= totalPages ? '#cbd5e1' : 'var(--text-primary)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: page >= totalPages ? '#cbd5e1' : 'var(--text-primary)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* FULL ORDER DETAIL INSPECTION MODAL */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            color: 'var(--text-primary)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <ShoppingBag size={14} /> ORDER AUDIT DETAIL
                </div>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '900' }}>
                  Order #{selectedOrder.orderNumber}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer & Stall Summary Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>Customer Details</span>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', marginTop: '0.25rem' }}>{selectedOrder.customerName || 'Anonymous'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: '600', marginTop: '0.15rem' }}>📞 {selectedOrder.customerPhone}</div>
                {selectedOrder.customerEmail && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>✉️ {selectedOrder.customerEmail}</div>}
              </div>

              <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>Stall & Location</span>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--primary)', marginTop: '0.25rem' }}>{selectedOrder.store?.name || 'Stall'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '0.15rem' }}>📍 {selectedOrder.store?.market || 'Campus'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Order Type: {selectedOrder.orderType || 'Take Away'}</div>
              </div>
            </div>

            {/* Dissected Dish Items List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                Dishes Ordered ({selectedOrder.items?.length || 0})
              </span>
              <div style={{ border: '1px solid var(--surface-border)', borderRadius: '16px', overflow: 'hidden' }}>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: idx === selectedOrder.items.length - 1 ? 'none' : '1px solid var(--surface-border)',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                        {item.name || item.dishName || 'Food Item'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Qty: {item.quantity} × ₹{item.price}
                      </div>
                    </div>
                    <div style={{ fontWeight: '900', fontSize: '0.95rem' }}>
                      ₹{(item.price || 0) * (item.quantity || 1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown Card */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--surface-border)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span>Subtotal Items</span>
                <span>₹{selectedOrder.totalAmount - (selectedOrder.packagingChargeApplied || 0)}</span>
              </div>
              {selectedOrder.packagingChargeApplied > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <span>Packaging Charge</span>
                  <span>₹{selectedOrder.packagingChargeApplied}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-primary)', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-border)' }}>
                <span>Total Paid by Student</span>
                <span style={{ color: 'var(--primary)' }}>₹{selectedOrder.totalAmount}</span>
              </div>
            </div>

            {/* Status & Gateway Information */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong>Payment Method:</strong> {selectedOrder.paymentMethod} • {selectedOrder.paymentStatus}
              </div>
              <div>
                <strong>Status:</strong> <span style={{ fontWeight: '800', color: selectedOrder.status === 'Completed' ? '#10b981' : '#f59e0b' }}>{selectedOrder.status}</span>
              </div>
            </div>

            {/* Close Button */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2rem', borderRadius: '12px' }}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminOrdersFeed;
