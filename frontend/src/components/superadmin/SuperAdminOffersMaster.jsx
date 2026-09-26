import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Tag, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  Store, 
  Globe, 
  Percent, 
  DollarSign, 
  Layers, 
  RotateCw,
  Zap,
  Flame,
  Check,
  X
} from 'lucide-react';

const SuperAdminOffersMaster = ({ token, socket }) => {
  const [loading, setLoading] = useState(true);
  const [globalOffers, setGlobalOffers] = useState([]);
  const [storeOffers, setStoreOffers] = useState([]);
  const [stores, setStores] = useState([]);
  const [summary, setSummary] = useState({
    totalGlobalOffers: 0,
    activeGlobalOffers: 0,
    totalStoreOffers: 0,
    activeStoreOffers: 0,
    totalPromotions: 0
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'global' | 'stores'
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [selectedOfferKeys, setSelectedOfferKeys] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [topBarTarget, setTopBarTarget] = useState(null);

  useEffect(() => {
    setTopBarTarget(document.getElementById('superadmin-topbar-actions'));
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [targetType, setTargetType] = useState('global'); // 'global' | 'store'
  const [targetStoreId, setTargetStoreId] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'PERCENTAGE_CART',
    discountValue: 10,
    minOrderValue: 0,
    maxDiscountCap: 0,
    badgeText: '',
    bannerText: '',
    applicableStores: []
  });

  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/super-admin/offers`, { headers });
      if (res.data.success) {
        setGlobalOffers(res.data.globalOffers || []);
        setStoreOffers(res.data.storeOffers || []);
        setStores(res.data.stores || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('[OffersMaster] Error loading offers:', err);
      setFeedback({ type: 'error', message: 'Failed to load offers: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [token]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleOffersUpdate = () => {
      fetchOffers();
    };
    socket.on('store_offers_update', handleOffersUpdate);
    return () => {
      socket.off('store_offers_update', handleOffersUpdate);
    };
  }, [socket]);

  // Open Create Modal
  const handleOpenCreate = (type = 'global') => {
    setIsEditing(false);
    setEditingOfferId(null);
    setTargetType(type);
    setTargetStoreId(stores[0]?.id || '');
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'PERCENTAGE_CART',
      discountValue: 10,
      minOrderValue: 0,
      maxDiscountCap: 0,
      badgeText: '',
      bannerText: '',
      applicableStores: []
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (offer, isGlobal = true) => {
    setIsEditing(true);
    setEditingOfferId(offer.id || offer._id);
    setTargetType(isGlobal ? 'global' : 'store');
    setTargetStoreId(offer.storeId || '');
    setFormData({
      code: offer.code || '',
      title: offer.title || '',
      description: offer.description || '',
      discountType: offer.discountType || 'PERCENTAGE_CART',
      discountValue: offer.discountValue || 10,
      minOrderValue: offer.minOrderValue || 0,
      maxDiscountCap: offer.maxDiscountCap || 0,
      badgeText: offer.badgeText || '',
      bannerText: offer.bannerText || '',
      applicableStores: Array.isArray(offer.applicableStores) ? offer.applicableStores : []
    });
    setIsModalOpen(true);
  };

  // Save Offer (Create / Update)
  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.title || formData.discountValue === undefined) {
      alert('Please fill out coupon code, title, and discount value.');
      return;
    }

    try {
      if (targetType === 'global') {
        if (isEditing) {
          await axios.put(`${apiUrl}/api/super-admin/offers/global/${editingOfferId}`, formData, { headers });
          setFeedback({ type: 'success', message: `Global Offer "${formData.code}" updated successfully!` });
        } else {
          await axios.post(`${apiUrl}/api/super-admin/offers/global`, formData, { headers });
          setFeedback({ type: 'success', message: `Global Offer "${formData.code}" created and active across campus!` });
        }
      } else {
        if (!targetStoreId) {
          alert('Please select a target stall.');
          return;
        }
        if (isEditing) {
          await axios.put(`${apiUrl}/api/super-admin/offers/store/${targetStoreId}/${editingOfferId}`, formData, { headers });
          setFeedback({ type: 'success', message: `Store Offer "${formData.code}" updated successfully!` });
        } else {
          await axios.post(`${apiUrl}/api/super-admin/offers/store/${targetStoreId}`, formData, { headers });
          setFeedback({ type: 'success', message: `Store Offer "${formData.code}" created successfully!` });
        }
      }

      setIsModalOpen(false);
      fetchOffers();
    } catch (err) {
      alert('Failed to save offer: ' + (err.response?.data?.message || err.message));
    }
  };

  // Toggle Active/Inactive
  const handleToggleOffer = async (offer, isGlobal = true) => {
    const id = offer.id || offer._id;
    const newStatus = offer.isActive === false;
    try {
      if (isGlobal) {
        await axios.put(`${apiUrl}/api/super-admin/offers/global/${id}`, { isActive: newStatus }, { headers });
      } else {
        await axios.put(`${apiUrl}/api/super-admin/offers/store/${offer.storeId}/${id}`, { isActive: newStatus }, { headers });
      }
      fetchOffers();
    } catch (err) {
      alert('Failed to toggle offer: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete Offer
  const handleDeleteOffer = async (offer, isGlobal = true) => {
    const id = offer.id || offer._id;
    const name = offer.code || offer.title;
    if (!window.confirm(`Are you sure you want to permanently delete offer "${name}"?`)) return;

    try {
      if (isGlobal) {
        await axios.delete(`${apiUrl}/api/super-admin/offers/global/${id}`, { headers });
      } else {
        await axios.delete(`${apiUrl}/api/super-admin/offers/store/${offer.storeId}/${id}`, { headers });
      }
      setFeedback({ type: 'success', message: `Offer "${name}" removed.` });
      setSelectedOfferKeys(prev => prev.filter(k => k !== `${isGlobal ? 'g' : 's'}-${id}`));
      fetchOffers();
    } catch (err) {
      alert('Failed to delete offer: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleSelectOffer = (offer) => {
    const key = `${offer.isGlobal !== false ? 'g' : 's'}-${offer.id || offer._id}`;
    setSelectedOfferKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAllOffers = () => {
    const currentKeys = filteredOffers.map(o => `${o.isGlobal !== false ? 'g' : 's'}-${o.id || o._id}`);
    const allSelected = currentKeys.length > 0 && currentKeys.every(k => selectedOfferKeys.includes(k));
    if (allSelected) {
      setSelectedOfferKeys(prev => prev.filter(k => !currentKeys.includes(k)));
    } else {
      setSelectedOfferKeys(prev => [...new Set([...prev, ...currentKeys])]);
    }
  };

  const handleBulkDeleteOffers = async () => {
    if (selectedOfferKeys.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedOfferKeys.length} selected offers? This cannot be undone.`)) return;

    const itemsToDelete = filteredOffers
      .filter(o => selectedOfferKeys.includes(`${o.isGlobal !== false ? 'g' : 's'}-${o.id || o._id}`))
      .map(o => ({
        id: o.id || o._id,
        storeId: o.storeId,
        isGlobal: o.isGlobal !== false
      }));

    try {
      setIsDeleting(true);
      await axios.post(`${apiUrl}/api/super-admin/offers/bulk-delete`, 
        { items: itemsToDelete }, 
        { headers }
      );
      setSelectedOfferKeys([]);
      fetchOffers();
      setFeedback({ type: 'success', message: `${itemsToDelete.length} offers deleted successfully.` });
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered List
  const filteredOffers = useMemo(() => {
    let combined = [];

    if (activeTab === 'all' || activeTab === 'global') {
      combined = [...combined, ...globalOffers.map(o => ({ ...o, isGlobal: true }))];
    }
    if (activeTab === 'all' || activeTab === 'stores') {
      combined = [...combined, ...storeOffers.map(o => ({ ...o, isGlobal: false }))];
    }

    if (storeFilter !== 'all') {
      combined = combined.filter(o => !o.isGlobal && String(o.storeId) === String(storeFilter));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      combined = combined.filter(o => 
        (o.code || '').toLowerCase().includes(q) ||
        (o.title || '').toLowerCase().includes(q) ||
        (o.storeName || '').toLowerCase().includes(q) ||
        (o.badgeText || '').toLowerCase().includes(q)
      );
    }

    return combined;
  }, [globalOffers, storeOffers, activeTab, storeFilter, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Topbar Action Portal */}
      {topBarTarget && createPortal(
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleOpenCreate('global')}
            style={{
              background: 'linear-gradient(135deg, #ef4123 0%, #ea580c 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(239, 65, 35, 0.25)'
            }}
          >
            <Sparkles size={14} /> + Global Deal
          </button>
          <button
            onClick={() => handleOpenCreate('store')}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Store size={14} /> + Stall Deal
          </button>
        </div>,
        topBarTarget
      )}

      {/* Sticky KPI Stats & Filter Strip */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#f8fafc',
        paddingTop: '0.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* KPI Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{
          background: '#ffffff', borderRadius: '18px', padding: '1.5rem',
          border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Campus Deals
            </span>
            <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
            {summary.totalPromotions}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '800' }}>
            {summary.activeGlobalOffers + summary.activeStoreOffers} Active & Redeemable
          </span>
        </div>

        <div style={{
          background: '#ffffff', borderRadius: '18px', padding: '1.5rem',
          border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Global Platform Deals
            </span>
            <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
              <Globe size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
            {summary.totalGlobalOffers}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: '800' }}>
            Valid across all stalls campus-wide
          </span>
        </div>

        <div style={{
          background: '#ffffff', borderRadius: '18px', padding: '1.5rem',
          border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Stall-Specific Deals
            </span>
            <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Store size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
            {summary.totalStoreOffers}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
            Configured on individual vendor menus
          </span>
        </div>

        <div style={{
          background: '#ffffff', borderRadius: '18px', padding: '1.5rem',
          border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Rule Enforcement
            </span>
            <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#10b981', marginTop: '0.35rem' }}>
            1 Coupon / Order
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
            Strict single-coupon pricing engine
          </span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: feedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
          color: feedback.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: '700',
          fontSize: '0.9rem'
        }}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.25rem',
        border: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
          {[
            { id: 'all', label: `All Deals (${summary.totalPromotions})` },
            { id: 'global', label: `Global Platform (${summary.totalGlobalOffers})` },
            { id: 'stores', label: `Stall Offers (${summary.totalStoreOffers})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? '800' : '600',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                boxShadow: activeTab === tab.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Stall Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {activeTab !== 'global' && (
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '700',
                outline: 'none'
              }}
            >
              <option value="all">All Stalls</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search code, title, stall..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.25rem',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={fetchOffers}
            style={{
              background: '#f8fafc',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px',
              padding: '0.65rem 0.9rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}
          >
            <RotateCw size={14} /> Refresh
          </button>
        </div>
      </div>
    </div>

      {/* BULK ACTION BAR */}
      {selectedOfferKeys.length > 0 && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: '#fff1f2',
          border: '1.5px solid #fecdd3',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: '800', color: '#e11d48', fontSize: '0.9rem' }}>
              {selectedOfferKeys.length} deal / offer{selectedOfferKeys.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedOfferKeys([])}
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
            onClick={handleBulkDeleteOffers}
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
            {isDeleting ? 'Deleting...' : `Delete Selected (${selectedOfferKeys.length})`}
          </button>
        </div>
      )}

      {/* Offers Table / Directory */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid var(--surface-border)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading offers and promotions directory...
          </div>
        ) : filteredOffers.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Tag size={40} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '800', color: 'var(--text-primary)' }}>
              No Offers Found
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No offers match your current filter criteria. Create a new global platform coupon above!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ width: '48px', padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={filteredOffers.length > 0 && filteredOffers.every(o => selectedOfferKeys.includes(`${o.isGlobal !== false ? 'g' : 's'}-${o.id || o._id}`))}
                      onChange={toggleSelectAllOffers}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                      title="Select All Offers"
                    />
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Coupon Code</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Scope & Type</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Discount Value</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Min Order & Cap</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((offer) => {
                  const isGlobal = offer.isGlobal !== false;
                  const isActive = offer.isActive !== false;

                  return (
                    <tr 
                      key={`${isGlobal ? 'g' : 's'}-${offer.id || offer._id}`}
                      style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background 0.15s ease' }}
                    >
                      {/* Checkbox */}
                      <td style={{ width: '48px', padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedOfferKeys.includes(`${isGlobal ? 'g' : 's'}-${offer.id || offer._id}`)}
                          onChange={() => toggleSelectOffer(offer)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                        />
                      </td>

                      {/* Coupon Code & Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{
                            background: '#f1f5f9',
                            border: '1.5px dashed #ea580c',
                            color: '#c2410c',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '8px',
                            letterSpacing: '0.04em'
                          }}>
                            {offer.code || 'NO-CODE'}
                          </span>
                          <div>
                            <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {offer.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {offer.badgeText || (offer.discountType?.includes('PERCENTAGE') ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Scope & Type */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {isGlobal ? (
                          <span style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <Globe size={12} /> Campus-Wide Global Deal
                          </span>
                        ) : (
                          <span style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <Store size={12} /> {offer.storeName || 'Specific Stall'}
                          </span>
                        )}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {offer.discountType === 'PERCENTAGE_CART' ? 'Cart Percentage' :
                           offer.discountType === 'FLAT_DISCOUNT_CART' ? 'Flat Cart Rupee' :
                           offer.discountType === 'PERCENTAGE_CATEGORY' ? 'Category Percentage' :
                           offer.discountType === 'FLAT_PRICE_CATEGORY' ? 'Flat Price Override' : offer.discountType}
                        </div>
                      </td>

                      {/* Value */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--primary)' }}>
                          {offer.discountType?.includes('PERCENTAGE') ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                        </span>
                      </td>

                      {/* Min Order & Cap */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {offer.minOrderValue > 0 ? `Min. ₹${offer.minOrderValue}` : 'None'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {offer.maxDiscountCap > 0 ? `Max Cap ₹${offer.maxDiscountCap}` : 'No Cap'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <button
                          onClick={() => handleToggleOffer(offer, isGlobal)}
                          style={{
                            background: isActive ? '#ecfdf5' : '#fef2f2',
                            color: isActive ? '#059669' : '#dc2626',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                            borderRadius: '20px',
                            padding: '0.3rem 0.75rem',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {isActive ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(offer, isGlobal)}
                            title="Edit Offer"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid var(--surface-border)',
                              borderRadius: '8px',
                              padding: '0.45rem',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer, isGlobal)}
                            title="Delete Offer"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              padding: '0.45rem',
                              cursor: 'pointer',
                              color: '#dc2626'
                            }}
                          >
                            <Trash2 size={15} />
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
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {isEditing ? 'Edit Promotion Deal' : targetType === 'global' ? 'Create Global Campus Deal' : 'Create Stall Deal'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {targetType === 'global' ? 'Valid across all stalls and entire campus food court' : 'Valid exclusively for selected stall'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Stall Selector if target is store */}
              {targetType === 'store' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Target Food Stall
                  </label>
                  <select
                    value={targetStoreId}
                    onChange={(e) => setTargetStoreId(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Coupon Code */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  Coupon Code (e.g. CAMPUS20, WELCOME50)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAMPUS20"
                  value={formData.code}
                  onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                    fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  Headline / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Campus Special: 20% Flat Savings"
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  Description / Eligibility Details
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Applicable on all orders above ₹99 across campus"
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              {/* Discount Type & Value Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData(p => ({ ...p, discountType: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none'
                    }}
                  >
                    <option value="PERCENTAGE_CART">% Off Entire Cart</option>
                    <option value="FLAT_DISCOUNT_CART">Flat ₹ Off Entire Cart</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Discount Value ({formData.discountType.includes('PERCENTAGE') ? '%' : '₹'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData(p => ({ ...p, discountValue: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', fontWeight: '800'
                    }}
                  />
                </div>
              </div>

              {/* Min Order & Max Cap Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Min. Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for none"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData(p => ({ ...p, minOrderValue: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for no cap"
                    value={formData.maxDiscountCap}
                    onChange={(e) => setFormData(p => ({ ...p, maxDiscountCap: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Badge Text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  Badge Tag (e.g. ⚡ 20% OFF, 🏷️ FLAT ₹50 OFF)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left empty"
                  value={formData.badgeText}
                  onChange={(e) => setFormData(p => ({ ...p, badgeText: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: '12px',
                    border: '1px solid #e2e8f0', background: '#ffffff',
                    fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2, padding: '0.85rem', borderRadius: '12px',
                    border: 'none', background: 'var(--primary)', color: '#ffffff',
                    fontWeight: '800', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 65, 35, 0.3)'
                  }}
                >
                  {isEditing ? 'Save Changes' : 'Publish & Broadcast Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminOffersMaster;
