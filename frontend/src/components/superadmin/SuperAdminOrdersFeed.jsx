import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  X, 
  Calendar, 
  CalendarDays,
  Store, 
  MapPin,
  CreditCard, 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet,
  Loader2,
  CheckCheck,
  Trash2
} from 'lucide-react';

// Premium Custom Dropdown Component (Replaces Ugly Native Browser Selects)
const PremiumDropdown = ({ 
  icon: Icon, 
  label, 
  value, 
  options, 
  onChange, 
  minWidth = '210px', 
  badge = null,
  searchable = false
}) => {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : label;

  const filteredOptions = searchable && filterText.trim()
    ? options.filter(o => o.label.toLowerCase().includes(filterText.toLowerCase()))
    : options;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', minWidth, flex: '1 1 210px' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          padding: '0.7rem 1rem',
          borderRadius: '14px',
          border: open ? '1.5px solid var(--primary, #ef4123)' : '1px solid var(--surface-border, #e2e8f0)',
          background: '#ffffff',
          color: 'var(--text-primary, #0f172a)',
          fontWeight: '700',
          fontSize: '0.85rem',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(239, 65, 35, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
          {Icon && <Icon size={16} color="var(--primary, #ef4123)" style={{ flexShrink: 0 }} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {badge !== null && badge !== undefined && (
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '100px', background: '#f1f5f9', color: '#64748b', fontWeight: '800' }}>
              {badge}
            </span>
          )}
          <ChevronDown 
            size={15} 
            color="#64748b" 
            style={{ 
              transform: open ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s ease' 
            }} 
          />
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          {searchable && (
            <div style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9' }}>
              <input 
                type="text"
                placeholder="Search..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
            </div>
          )}
          <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.4rem' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                No options found
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setFilterText('');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: isSelected ? 'rgba(239, 65, 35, 0.08)' : 'transparent',
                      color: isSelected ? 'var(--primary, #ef4123)' : '#0f172a',
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      {opt.dotColor && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.dotColor, flexShrink: 0 }} />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && <Check size={14} color="var(--primary, #ef4123)" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SuperAdminOrdersFeed = ({ token, socket, stores = [], locations = [] }) => {
  // Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedStoreId, setSelectedStoreId] = useState('All');
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', '7days', '30days', 'this_month', 'custom'
  
  // Custom Date Range State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDateBar, setShowCustomDateBar] = useState(false);

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
  const [exporting, setExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Internal store fallback cache to prevent "(0)" stalls
  const [internalStores, setInternalStores] = useState(stores);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // Ensure stores are populated even if parent prop is delayed
  useEffect(() => {
    if (stores && stores.length > 0) {
      setInternalStores(stores);
    } else {
      axios.get(`${API_URL}/api/super-admin/stores`, authConfig)
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setInternalStores(res.data);
          }
        })
        .catch(() => {});
    }
  }, [stores, authConfig]);

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
      const params = {
        paginated: 'true',
        page,
        limit,
        search: debouncedSearch,
        status,
        storeId: selectedStoreId,
        market: selectedMarket,
        paymentStatus,
        dateFilter
      };

      if (dateFilter === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await axios.get(`${API_URL}/api/super-admin/orders`, {
        ...authConfig,
        params
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
  }, [page, limit, debouncedSearch, status, selectedStoreId, selectedMarket, paymentStatus, dateFilter, startDate, endDate]);

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
    setStartDate('');
    setEndDate('');
    setShowCustomDateBar(false);
    setPage(1);
  };

  const hasActiveFilters = search || status !== 'All' || selectedStoreId !== 'All' || selectedMarket !== 'All' || paymentStatus !== 'All' || dateFilter !== 'all' || startDate || endDate;

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOrders = () => {
    const pageOrderIds = orders.map(o => o._id || o.id);
    const allSelected = pageOrderIds.length > 0 && pageOrderIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !pageOrderIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => [...new Set([...prev, ...pageOrderIds])]);
    }
  };

  const handleDeleteSingleOrder = async (orderId, orderNum) => {
    if (!window.confirm(`Are you sure you want to permanently delete order #${orderNum || orderId}? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API_URL}/api/super-admin/order/${orderId}`, authConfig);
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
      fetchOrders();
    } catch (err) {
      alert('Failed to delete order: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedOrderIds.length} selected orders? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${API_URL}/api/super-admin/orders/bulk-delete`, 
        { ids: selectedOrderIds }, 
        authConfig
      );
      setSelectedOrderIds([]);
      fetchOrders();
      alert('Selected orders deleted successfully.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Comprehensive Export to CSV (Downloads ALL records matching current date range & filters)
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {
        exportAll: 'true',
        search: debouncedSearch,
        status,
        storeId: selectedStoreId,
        market: selectedMarket,
        paymentStatus,
        dateFilter
      };

      if (dateFilter === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await axios.get(`${API_URL}/api/super-admin/orders`, {
        ...authConfig,
        params
      });

      const exportOrders = res.data?.orders || [];
      if (exportOrders.length === 0) {
        alert('No orders found matching the active range and filter criteria.');
        return;
      }

      const headers = [
        'Order ID',
        'Order Number',
        'Date',
        'Time',
        'Customer Name',
        'Customer Phone',
        'Stall / Store',
        'Market / Hub',
        'Items Summary',
        'Total Items Qty',
        'Gross Amount (INR)',
        'Payment Method',
        'Payment Status',
        'Order Status'
      ];

      const rows = exportOrders.map(o => {
        const orderDate = new Date(o.createdAt);
        const dateStr = orderDate.toLocaleDateString();
        const timeStr = orderDate.toLocaleTimeString();
        const itemsSummary = Array.isArray(o.items) 
          ? o.items.map(i => `${i.quantity || 1}x ${i.product?.name || i.name || 'Item'}`).join('; ')
          : '1 Item';
        const totalItems = Array.isArray(o.items)
          ? o.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
          : 1;

        return [
          `"${o.id || o._id}"`,
          `"${o.orderNumber || ''}"`,
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${(o.customerName || 'Customer').replace(/"/g, '""')}"`,
          `"${o.customerPhone || ''}"`,
          `"${(o.store?.name || 'Store').replace(/"/g, '""')}"`,
          `"${(o.store?.market || o.market || '').replace(/"/g, '""')}"`,
          `"${itemsSummary.replace(/"/g, '""')}"`,
          totalItems,
          o.totalAmount || 0,
          `"${o.paymentMethod || 'Online'}"`,
          `"${o.paymentStatus || 'Confirmed'}"`,
          `"${o.status}"`
        ];
      });

      // UTF-8 BOM for Excel character encoding
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateRangeTag = dateFilter === 'custom' && startDate && endDate ? `${startDate}_to_${endDate}` : dateFilter;
      link.setAttribute('href', url);
      link.setAttribute('download', `UniVerse_Global_Orders_${dateRangeTag}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export orders:', err);
      alert('Failed to download orders data: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
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

  // Distinct markets from internal stores & locations
  const distinctMarkets = useMemo(() => {
    const set = new Set();
    internalStores.forEach(s => {
      if (s.market) set.add(s.market);
    });
    if (locations && locations.length > 0) {
      locations.forEach(l => {
        if (l.name) set.add(l.name);
      });
    }
    return Array.from(set).sort();
  }, [internalStores, locations]);

  // Build options for Stalls
  const storeOptions = useMemo(() => [
    { value: 'All', label: `All Stalls / Stores (${internalStores.length})` },
    ...internalStores.map(s => ({
      value: s._id || s.id,
      label: `${s.name} (${s.market || 'Campus'})`
    }))
  ], [internalStores]);

  // Build options for Markets
  const marketOptions = useMemo(() => [
    { value: 'All', label: 'All Markets / Locations' },
    ...distinctMarkets.map(m => ({ value: m, label: m }))
  ], [distinctMarkets]);

  // Build options for Payment Status
  const paymentOptions = [
    { value: 'All', label: 'All Payment Statuses' },
    { value: 'Confirmed', label: 'Confirmed / Paid', dotColor: '#10b981' },
    { value: 'Pending', label: 'Pending Payment', dotColor: '#f59e0b' },
    { value: 'Failed', label: 'Failed Transactions', dotColor: '#ef4444' }
  ];

  // Quick preset pills
  const datePresets = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: '7 Days' },
    { id: '30days', label: '30 Days' },
    { id: 'this_month', label: 'This Month' }
  ];

  return (
    <div>
      {/* Top Header & Overview KPI Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 20, 
          background: '#f8fafc', 
          paddingTop: '0.25rem', 
          paddingBottom: '1.25rem', 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em', color: '#0f172a' }}>
              Global Orders Control Feed
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Real-time platform ledger with live telemetry, custom date ranges, and full ledger export.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.4rem',
                borderRadius: '14px',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(16, 185, 129, 0.05) 100%)',
                color: '#059669',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: exporting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
                transition: 'all 0.15s ease'
              }}
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Exporting All...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} color="#10b981" /> Download All ({totalOrders.toLocaleString()})
                </>
              )}
            </button>
            <button
              onClick={fetchOrders}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.25rem',
                borderRadius: '14px',
                border: 'none',
                background: 'var(--primary, #ef4123)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 65, 35, 0.25)'
              }}
            >
              <RotateCcw size={16} /> Refresh Feed
            </button>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filtered Transactions</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{totalOrders.toLocaleString()}</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
              {dateFilter === 'custom' && startDate && endDate ? `${startDate} to ${endDate}` : 'Matching active range'}
            </span>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gross Volume</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#10b981', marginTop: '0.25rem' }}>₹{metrics.totalRevenue.toLocaleString()}</div>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700' }}>{metrics.completedOrders} Completed Orders</span>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Order Value</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#6366f1', marginTop: '0.25rem' }}>₹{metrics.aov}</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Per completed order</span>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pagination View</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#f59e0b', marginTop: '0.25rem' }}>
              Page {page} <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>/ {totalPages}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{limit} orders per view</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '24px', 
        border: '1px solid var(--surface-border)', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {/* Row 1: Search Input & Date Preset Pills */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 300px', minWidth: '260px', position: 'relative' }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search by Order #, Customer Name, Phone, or Stall..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 2.75rem',
                borderRadius: '14px',
                border: '1px solid var(--surface-border)',
                background: '#f8fafc',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                fontWeight: '600',
                outline: 'none',
                transition: 'all 0.15s ease'
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

          {/* Date Presets Segmented Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {datePresets.map(d => {
              const isActive = dateFilter === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    handleFilterChange(setDateFilter)(d.id);
                    setShowCustomDateBar(false);
                  }}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '100px',
                    border: isActive ? '1px solid var(--primary, #ef4123)' : '1px solid var(--surface-border)',
                    background: isActive ? '#0f172a' : '#ffffff',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 2px 8px rgba(15,23,42,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {d.label}
                </button>
              );
            })}

            {/* Custom Range Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowCustomDateBar(!showCustomDateBar);
                if (dateFilter !== 'custom') {
                  setDateFilter('custom');
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '100px',
                border: dateFilter === 'custom' ? '1.5px solid var(--primary, #ef4123)' : '1px solid var(--surface-border)',
                background: dateFilter === 'custom' ? 'rgba(239, 65, 35, 0.1)' : '#ffffff',
                color: dateFilter === 'custom' ? 'var(--primary, #ef4123)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: dateFilter === 'custom' ? '0 2px 8px rgba(239, 65, 35, 0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <CalendarDays size={14} /> Custom Range 📅
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Bar (Shown when Custom Range is active) */}
        {(showCustomDateBar || dateFilter === 'custom') && (
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, rgba(239, 65, 35, 0.03) 100%)',
            border: '1.5px solid rgba(239, 65, 35, 0.25)',
            borderRadius: '18px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary, #ef4123)', fontWeight: '800', fontSize: '0.85rem' }}>
              <Calendar size={18} />
              <span>Select Exact Date Window:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>From:</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--surface-border)',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>To:</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--surface-border)',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {startDate && endDate && (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    fetchOrders();
                  }}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--primary, #ef4123)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 8px rgba(239, 65, 35, 0.25)'
                  }}
                >
                  <Check size={14} /> Apply Range
                </button>
              )}

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDateFilter('all');
                    setShowCustomDateBar(false);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid var(--surface-border)',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Range
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 2: Premium Dropdown Selectors (Stalls, Markets, Payment) */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Store / Stall Filter */}
          <PremiumDropdown 
            icon={Store}
            label="All Stalls / Stores"
            value={selectedStoreId}
            options={storeOptions}
            onChange={handleFilterChange(setSelectedStoreId)}
            badge={internalStores.length}
            searchable={internalStores.length > 5}
            minWidth="240px"
          />

          {/* Market / Location Filter */}
          <PremiumDropdown 
            icon={MapPin}
            label="All Markets / Locations"
            value={selectedMarket}
            options={marketOptions}
            onChange={handleFilterChange(setSelectedMarket)}
            badge={distinctMarkets.length}
            searchable={distinctMarkets.length > 5}
            minWidth="220px"
          />

          {/* Payment Status Filter */}
          <PremiumDropdown 
            icon={CreditCard}
            label="All Payment Statuses"
            value={paymentStatus}
            options={paymentOptions}
            onChange={handleFilterChange(setPaymentStatus)}
            minWidth="200px"
          />

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              style={{
                padding: '0.7rem 1.1rem',
                borderRadius: '14px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontWeight: '800',
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={14} /> Clear All Filters
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
        ].map(tab => {
          const isSelected = status === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(setStatus)(tab.id)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '100px',
                border: isSelected ? '1px solid var(--primary, #ef4123)' : '1px solid var(--surface-border)',
                background: isSelected ? 'rgba(239, 65, 35, 0.1)' : '#ffffff',
                color: isSelected ? 'var(--primary, #ef4123)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(239, 65, 35, 0.15)' : 'none'
              }}
            >
              {tab.label}
              <span style={{
                background: isSelected ? 'var(--primary, #ef4123)' : 'rgba(0,0,0,0.06)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                padding: '0.15rem 0.5rem',
                borderRadius: '100px',
                fontSize: '0.75rem',
                fontWeight: '900'
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* BULK ACTION BAR */}
      {selectedOrderIds.length > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.85rem 1.25rem',
          background: '#fff1f2',
          border: '1.5px solid #fecdd3',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: '800', color: '#e11d48', fontSize: '0.9rem' }}>
              {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedOrderIds([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={handleBulkDeleteOrders}
            disabled={isDeleting}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '10px',
              border: 'none',
              background: '#e11d48',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
              opacity: isDeleting ? 0.7 : 1
            }}
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting...' : `Delete Selected (${selectedOrderIds.length})`}
          </button>
        </div>
      )}

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
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #f1f5f9', borderTopColor: 'var(--primary, #ef4123)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Loading platform transactions...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShoppingBag size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Orders Found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {dateFilter === 'custom' && startDate && endDate 
                ? `No transactions recorded between ${startDate} and ${endDate}.` 
                : 'Try relaxing your search terms or clearing your date/status filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                style={{ 
                  marginTop: '1.25rem', 
                  padding: '0.6rem 1.5rem', 
                  borderRadius: '12px',
                  background: 'var(--primary, #ef4123)',
                  color: 'white',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
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
                  <th style={{ width: '48px', padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={orders.length > 0 && orders.every(o => selectedOrderIds.includes(o._id || o.id))}
                      onChange={toggleSelectAllOrders}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                      title="Select All Orders on this page"
                    />
                  </th>
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
                      {/* Row Checkbox */}
                      <td style={{ width: '48px', padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedOrderIds.includes(o._id || o.id)}
                          onChange={() => toggleSelectOrder(o._id || o.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                        />
                      </td>

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

                          <button
                            onClick={() => handleDeleteSingleOrder(o._id || o.id, o.orderNumber)}
                            style={{
                              padding: '0.4rem 0.55rem',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete Order Permanently"
                          >
                            <Trash2 size={13} />
                          </button>
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
