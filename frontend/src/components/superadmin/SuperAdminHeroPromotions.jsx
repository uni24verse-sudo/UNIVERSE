import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  MapPin, 
  Monitor, 
  Smartphone, 
  UploadCloud, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
  Coins,
  Radio,
  Sliders,
  CheckCheck,
  Image as ImageIcon
} from 'lucide-react';

const SuperAdminHeroPromotions = ({ token, socket }) => {
  const [locations, setLocations] = useState([]);
  const [selectedHub, setSelectedHub] = useState('All');
  const [banners, setBanners] = useState([]);
  const [slotStats, setSlotStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Dual-Screen Preview Simulator Modal State
  const [previewModal, setPreviewModal] = useState(null);
  const [finalBannerUrl, setFinalBannerUrl] = useState('');
  const [showOverlayText, setShowOverlayText] = useState(true);
  const [finalTitle, setFinalTitle] = useState('');
  const [finalTag, setFinalTag] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [selectedBannerIds, setSelectedBannerIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const [bannerRes, locRes] = await Promise.all([
        axios.get(`${API_URL}/api/banners/admin/all?hub=${encodeURIComponent(selectedHub)}`, authConfig).catch(() => ({ data: { banners: [], slotStats: [] } })),
        axios.get(`${API_URL}/api/super-admin/locations/public`).catch(() => ({ data: [] }))
      ]);
      setBanners(bannerRes.data?.banners || []);
      setSlotStats(bannerRes.data?.slotStats || []);
      setLocations(locRes.data || []);
    } catch (err) {
      console.error('Failed to load promotions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [selectedHub]);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchPromotions();
    socket.on('banner_campaign_requested', handleRefresh);
    socket.on('banner_published', handleRefresh);
    socket.on('banner_status_changed', handleRefresh);
    socket.on('banner_deleted', handleRefresh);
    return () => {
      socket.off('banner_campaign_requested', handleRefresh);
      socket.off('banner_published', handleRefresh);
      socket.off('banner_status_changed', handleRefresh);
      socket.off('banner_deleted', handleRefresh);
    };
  }, [socket]);

  const toggleSelectBanner = (id) => {
    setSelectedBannerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllBanners = () => {
    const allIds = banners.map(b => b.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedBannerIds.includes(id));
    if (allSelected) {
      setSelectedBannerIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedBannerIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleDeleteSingleBanner = async (bannerId, storeName) => {
    if (!window.confirm(`Are you sure you want to permanently delete this banner for "${storeName || bannerId}"? This will completely remove it from the system.`)) return;

    try {
      await axios.delete(`${API_URL}/api/banners/admin/${bannerId}`, authConfig);
      setSelectedBannerIds(prev => prev.filter(id => id !== bannerId));
      fetchPromotions();
      alert('Banner deleted successfully.');
    } catch (err) {
      alert('Failed to delete banner: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDeleteBanners = async () => {
    if (selectedBannerIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedBannerIds.length} selected banners? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${API_URL}/api/banners/admin/bulk-delete`, 
        { ids: selectedBannerIds }, 
        authConfig
      );
      setSelectedBannerIds([]);
      fetchPromotions();
      alert('Selected banners deleted successfully.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenSimulator = (item) => {
    setPreviewModal(item);
    setFinalBannerUrl(item.bannerUrl || item.rawAssetUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1920&q=80');
    const isClean = item.title === '' || item.title === '__NO_TEXT__';
    setShowOverlayText(!isClean);
    setFinalTitle(isClean ? '' : (item.title || item.rawText || `${item.storeName} Specials`));
    setFinalTag(isClean ? '' : (item.tag || 'Featured Stall'));
    setSelectedSlot(item.slotIndex || 1);
  };

  const handlePublish = async () => {
    if (!previewModal || !finalBannerUrl) return;
    try {
      setPublishing(true);
      await axios.post(`${API_URL}/api/banners/admin/publish`, {
        bannerId: previewModal.id,
        bannerUrl: finalBannerUrl,
        title: showOverlayText ? (finalTitle.trim() || `${previewModal.storeName} Specials`) : '',
        tag: showOverlayText ? (finalTag.trim() || 'Featured Stall') : '',
        slotIndex: selectedSlot,
        targetUrl: `/store/${previewModal.stallId}`
      }, authConfig);

      setPreviewModal(null);
      fetchPromotions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish banner');
    } finally {
      setPublishing(false);
    }
  };

  const handleArchive = async (bannerId) => {
    if (!window.confirm('Are you sure you want to deactivate and unlist this banner from the hero carousel?')) return;
    try {
      await axios.post(`${API_URL}/api/banners/admin/archive`, { bannerId }, authConfig);
      fetchPromotions();
    } catch (err) {
      alert('Failed to archive banner');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pendingQueue = banners.filter(b => b.status === 'pending_design');
  const activeBanners = banners.filter(b => b.status === 'active' && new Date(b.endDate) > new Date());
  const totalPaidRevenue = banners.reduce((acc, curr) => acc + (parseFloat(curr.amountPaid) || 799), 0);

  return (
    <div style={{ color: '#0f172a', fontFamily: 'inherit' }}>
      {/* Pinned Metrics & Location Filter Strip (Sticky) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#f8fafc',
        paddingTop: '0.25rem',
        paddingBottom: '0.75rem',
        marginBottom: '1.25rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Quick Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
          {/* Total Ad Revenue */}
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(16, 185, 129, 0.05) 100%)', 
            padding: '1rem 1.25rem', 
            borderRadius: '16px', 
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ad Revenue</span>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Coins size={14} />
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '900', color: '#0f172a' }}>
              ₹{totalPaidRevenue.toLocaleString()}
            </h3>
            <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '700', marginTop: '0.15rem', display: 'inline-block' }}>
              100% Platform Direct
            </span>
          </div>

          {/* Active Slides */}
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(99, 102, 241, 0.05) 100%)', 
            padding: '1rem 1.25rem', 
            borderRadius: '16px', 
            border: '1px solid rgba(99, 102, 241, 0.25)',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Slides</span>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <Layers size={14} />
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '900', color: '#0f172a' }}>
              {activeBanners.length} / 5
            </h3>
            <div style={{ display: 'flex', gap: '4px', marginTop: '0.35rem' }}>
              {[1, 2, 3, 4, 5].map(idx => (
                <div 
                  key={idx} 
                  style={{ 
                    width: '16px', 
                    height: '4px', 
                    borderRadius: '2px', 
                    background: idx <= activeBanners.length ? '#6366f1' : '#e2e8f0' 
                  }} 
                />
              ))}
            </div>
          </div>

          {/* Design Queue */}
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(245, 158, 11, 0.05) 100%)', 
            padding: '1rem 1.25rem', 
            borderRadius: '16px', 
            border: '1px solid rgba(245, 158, 11, 0.25)',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Design Queue</span>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <Clock size={14} />
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '900', color: '#0f172a' }}>
              {pendingQueue.length}
            </h3>
            <span style={{ fontSize: '0.68rem', color: pendingQueue.length > 0 ? '#d97706' : '#10b981', fontWeight: '700', marginTop: '0.15rem', display: 'inline-block' }}>
              {pendingQueue.length > 0 ? 'Requires Action' : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Location Hub Filter Pills */}
        <div style={{ 
          display: 'flex', 
          gap: '0.4rem', 
          overflowX: 'auto', 
          alignItems: 'center',
          scrollbarWidth: 'thin'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginRight: '0.35rem' }}>
            Location Hub:
          </span>
          <button 
            onClick={() => setSelectedHub('All')}
            style={{ 
              padding: '0.35rem 0.9rem',
              borderRadius: '100px',
              border: selectedHub === 'All' ? 'none' : '1px solid var(--surface-border, #e2e8f0)',
              background: selectedHub === 'All' ? '#0f172a' : '#ffffff',
              color: selectedHub === 'All' ? '#ffffff' : '#64748b',
              fontWeight: '800',
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedHub === 'All' ? '0 2px 6px rgba(15,23,42,0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            All Locations
          </button>
          {locations.map(loc => (
            <button 
              key={loc._id || loc.id}
              onClick={() => setSelectedHub(loc.name)}
              style={{ 
                padding: '0.35rem 0.9rem',
                borderRadius: '100px',
                border: selectedHub === loc.name ? 'none' : '1px solid var(--surface-border, #e2e8f0)',
                background: selectedHub === loc.name ? '#0f172a' : '#ffffff',
                color: selectedHub === loc.name ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: selectedHub === loc.name ? '0 2px 6px rgba(15,23,42,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <MapPin size={12} /> {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5-Slot Visual Board */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0f172a' }}>
              <Layers size={20} color="#6366f1" /> Active 5-Slot Carousel Board ({selectedHub})
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              The hero carousel rotates through exactly 5 slots every 6 seconds on desktop & mobile screens.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.85rem', borderRadius: '100px' }}>
            ₹799 / Slot / 30 Days
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5].map(slotNum => {
            const occupant = activeBanners.find(b => b.slotIndex === slotNum);
            const daysLeft = occupant ? Math.max(0, Math.ceil((new Date(occupant.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
            return (
              <div 
                key={slotNum}
                style={{ 
                  background: occupant ? 'linear-gradient(135deg, #ffffff 0%, rgba(16, 185, 129, 0.04) 100%)' : '#ffffff',
                  border: occupant ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px dashed #cbd5e1',
                  borderRadius: '20px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: occupant ? '0 8px 20px -4px rgba(16, 185, 129, 0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '900', 
                    color: occupant ? '#059669' : '#64748b', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em' 
                  }}>
                    SLOT #{slotNum}
                  </span>
                  <span style={{ 
                    padding: '0.25rem 0.65rem', 
                    borderRadius: '100px', 
                    fontSize: '0.65rem', 
                    fontWeight: '800',
                    background: occupant ? 'rgba(16, 185, 129, 0.12)' : '#f1f5f9',
                    color: occupant ? '#059669' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {occupant ? <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> LIVE</> : 'AVAILABLE'}
                  </span>
                </div>

                {occupant ? (
                  <>
                    <div style={{ height: '64px', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                      <img 
                        src={occupant.bannerUrl} 
                        alt={occupant.storeName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 80%)' }} />
                      <span style={{ position: 'absolute', bottom: '4px', left: '8px', color: '#fff', fontSize: '0.7rem', fontWeight: '800' }}>
                        {occupant.storeName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontWeight: '700' }}>
                        <Clock size={12} /> {daysLeft}d left
                      </span>
                      <button 
                        onClick={() => handleOpenSimulator(occupant)}
                        style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                      >
                        Preview
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem 0', marginTop: 'auto' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#94a3b8' }}>
                      <Sparkles size={16} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#475569' }}>Ready for Booking</h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Auto-activates on payment</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedBannerIds.length > 0 && (
        <div style={{
          marginBottom: '1.5rem',
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
              {selectedBannerIds.length} promotion banner{selectedBannerIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedBannerIds([])}
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
            onClick={handleBulkDeleteBanners}
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
            {isDeleting ? 'Deleting...' : `Delete Selected (${selectedBannerIds.length})`}
          </button>
        </div>
      )}

      {/* SECTION 1: Pending Design & Approval Queue */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              Pending Design & Review Queue 
              <span style={{ 
                fontSize: '0.8rem', 
                background: pendingQueue.length > 0 ? '#f59e0b' : '#10b981', 
                color: 'white', 
                padding: '0.2rem 0.65rem', 
                borderRadius: '100px', 
                fontWeight: '900' 
              }}>
                {pendingQueue.length}
              </span>
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Vendors who paid ₹799 for their hero campaign. Download their raw assets, align with standard 1920×768 master template, and publish.
            </p>
          </div>
        </div>

        {pendingQueue.length === 0 ? (
          <div style={{ 
            background: '#ffffff', 
            border: '1px dashed var(--surface-border, #e2e8f0)', 
            borderRadius: '24px', 
            padding: '3.5rem 2rem', 
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>All Vendor Requests Published!</h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#64748b', maxWidth: '480px', marginInline: 'auto' }}>
              There are no pending hero promotion requests. When a vendor pays for a homepage hero slot, their campaign submission will queue here instantly.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {pendingQueue.map(item => (
              <div 
                key={item.id}
                style={{ 
                  background: '#ffffff',
                  border: selectedBannerIds.includes(item.id) ? '1.5px solid var(--primary, #ef4123)' : '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '24px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  boxShadow: selectedBannerIds.includes(item.id) ? '0 8px 24px rgba(239, 65, 35, 0.15)' : '0 8px 24px -4px rgba(245, 158, 11, 0.08)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input 
                      type="checkbox"
                      checked={selectedBannerIds.includes(item.id)}
                      onChange={() => toggleSelectBanner(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {item.locationHub || 'All Hubs'}
                      </span>
                      <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: '900', color: '#0f172a' }}>
                        {item.storeName}
                      </h4>
                    </div>
                  </div>
                  <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '0.35rem 0.85rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Check size={12} /> PAID ₹{item.amountPaid || 799}
                  </span>
                </div>

                {/* Submitted Content Preview */}
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                  {item.rawAssetUrl ? (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Uploaded Vendor Flyer
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                        <img 
                          src={item.rawAssetUrl} 
                          alt="Vendor Flyer" 
                          style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                        <div style={{ flex: 1 }}>
                          <a 
                            href={item.rawAssetUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              background: '#0f172a', 
                              color: 'white', 
                              padding: '0.55rem 1rem', 
                              borderRadius: '10px', 
                              fontSize: '0.8rem', 
                              fontWeight: '700', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.4rem', 
                              textDecoration: 'none' 
                            }}
                          >
                            <Download size={14} /> Download Asset
                          </a>
                          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                            Open high-resolution raw image
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Vendor Custom Offer Text
                      </span>
                      <div style={{ 
                        margin: '0.6rem 0', 
                        fontSize: '0.9rem', 
                        color: '#0f172a', 
                        fontStyle: 'italic', 
                        background: '#ffffff', 
                        padding: '0.85rem', 
                        borderRadius: '10px', 
                        border: '1px solid #e2e8f0',
                        lineHeight: '1.4'
                      }}>
                        "{item.rawText}"
                      </div>
                      <button 
                        onClick={() => copyToClipboard(item.rawText, item.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#6366f1', 
                          fontSize: '0.8rem', 
                          fontWeight: '800', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: 0 
                        }}
                      >
                        {copiedId === item.id ? <CheckCheck size={14} color="#10b981" /> : <Copy size={14} />}
                        {copiedId === item.id ? 'Copied to Clipboard!' : 'Copy Text Offer'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Non-Refundable Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
                  <ShieldAlert size={14} />
                  <span>Strictly Non-Refundable Terms Verified</span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button 
                    onClick={() => handleOpenSimulator(item)}
                    style={{ 
                      flex: 1,
                      background: 'linear-gradient(135deg, #ef4123 0%, #f59e0b 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '0.9rem',
                      borderRadius: '14px',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(239, 65, 35, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Eye size={16} /> Open Simulator
                  </button>
                  <button
                    onClick={() => handleDeleteSingleBanner(item.id, item.storeName)}
                    style={{
                      padding: '0.9rem',
                      borderRadius: '14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete Promotion Permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Active Banners on Live Website */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>
              Live Banners in Hero Carousel ({activeBanners.length})
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Promotional banners currently appearing in rotation to customers on the homepage.
            </p>
          </div>
        </div>

        {activeBanners.length === 0 ? (
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid var(--surface-border, #e2e8f0)', 
            borderRadius: '24px', 
            padding: '2.5rem 2rem', 
            textAlign: 'center', 
            color: '#64748b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
          }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              No paid banners currently active for <strong>{selectedHub}</strong>. UniVerse is currently broadcasting the default curated system slides.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {activeBanners.map(banner => {
              const daysLeft = Math.max(0, Math.ceil((new Date(banner.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
              return (
                <div 
                  key={banner.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: selectedBannerIds.includes(banner.id) ? '1.5px solid var(--primary, #ef4123)' : '1px solid var(--surface-border, #e2e8f0)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: selectedBannerIds.includes(banner.id) ? '0 4px 24px rgba(239, 65, 35, 0.15)' : '0 4px 20px -2px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div style={{ height: '180px', position: 'relative' }}>
                    <img 
                      src={banner.bannerUrl} 
                      alt={banner.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 60%)' }} />
                    <span style={{ 
                      position: 'absolute', 
                      top: '1rem', 
                      left: '1rem', 
                      background: '#0f172a', 
                      color: 'white', 
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '100px', 
                      fontSize: '0.7rem', 
                      fontWeight: '800' 
                    }}>
                      SLOT #{banner.slotIndex}
                    </span>
                    <span style={{ 
                      position: 'absolute', 
                      top: '1rem', 
                      right: '1rem', 
                      background: 'rgba(16, 185, 129, 0.9)', 
                      backdropFilter: 'blur(4px)',
                      color: 'white', 
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '100px', 
                      fontSize: '0.7rem', 
                      fontWeight: '800' 
                    }}>
                      {daysLeft} Days Remaining
                    </span>
                    <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
                      <span style={{ color: '#ff6b4a', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        {banner.tag}
                      </span>
                      <h4 style={{ margin: '0.2rem 0 0 0', color: 'white', fontSize: '1.2rem', fontWeight: '900' }}>
                        {banner.title}
                      </h4>
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input 
                        type="checkbox"
                        checked={selectedBannerIds.includes(banner.id)}
                        onChange={() => toggleSelectBanner(banner.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Target Stall:</span>
                        <h5 style={{ margin: '0.1rem 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{banner.storeName}</h5>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleOpenSimulator(banner)}
                        style={{ padding: '0.55rem 0.95rem', borderRadius: '10px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Simulator
                      </button>
                      <button 
                        onClick={() => handleArchive(banner.id)}
                        style={{ padding: '0.55rem 0.95rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Deactivate
                      </button>
                      <button 
                        onClick={() => handleDeleteSingleBanner(banner.id, banner.storeName)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Delete Promotion Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DUAL-SCREEN LIVE PREVIEW SIMULATOR MODAL */}
      {previewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '28px',
            maxWidth: '1100px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            color: 'white'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#ff6b4a', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <Sparkles size={14} /> Dual-Screen Preview Simulator
                </div>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>
                  Review & Publish Banner: {previewModal.storeName}
                </h2>
              </div>
              <button 
                onClick={() => setPreviewModal(null)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Banner Style Toggle Selector */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '1.25rem', 
              padding: '0.85rem 1.25rem', 
              background: 'rgba(255,255,255,0.04)', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.08)',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Banner Style:
              </span>
              <button 
                type="button"
                onClick={() => setShowOverlayText(false)}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '100px',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  border: !showOverlayText ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                  background: !showOverlayText ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: !showOverlayText ? '#10b981' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <ImageIcon size={15} /> Pure Graphic Poster (No Text / No Button Overlay)
              </button>
              <button 
                type="button"
                onClick={() => setShowOverlayText(true)}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '100px',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  border: showOverlayText ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.15)',
                  background: showOverlayText ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: showOverlayText ? '#818cf8' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Sparkles size={15} /> Standard Template (Title, Tag & Button Overlay)
              </button>
            </div>

            {/* Inputs Row */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '1rem', 
              marginBottom: '2rem', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '1.25rem', 
              borderRadius: '18px', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Final 1920×768 Banner Image URL
                </label>
                <input 
                  type="text" 
                  value={finalBannerUrl}
                  onChange={(e) => setFinalBannerUrl(e.target.value)}
                  placeholder="https://... final master banner url"
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: '600' }}
                />
              </div>

              {showOverlayText ? (
                <>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Offer Headline / Title
                    </label>
                    <input 
                      type="text" 
                      value={finalTitle}
                      onChange={(e) => setFinalTitle(e.target.value)}
                      placeholder="e.g. Flat 20% Off Combos"
                      style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: '600' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Tag Badge (Optional)
                    </label>
                    <input 
                      type="text" 
                      value={finalTag}
                      onChange={(e) => setFinalTag(e.target.value)}
                      placeholder="e.g. Featured Stall"
                      style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: '600' }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ gridColumn: 'span 2', padding: '0.85rem 1.25rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CheckCircle2 size={18} />
                  <span><strong>Pure Graphic Mode:</strong> Image displays at 100% full clarity with no dark scrim, text, or button blocking the design. Clicking anywhere on the banner will open <strong>/store/{previewModal.stallId}</strong>.</span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Slot Assignment (1 to 5)
                </label>
                <select 
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(parseInt(e.target.value, 10))}
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: '600' }}
                >
                  <option value={1}>Slot #1 (First Slide)</option>
                  <option value={2}>Slot #2</option>
                  <option value={3}>Slot #3</option>
                  <option value={4}>Slot #4</option>
                  <option value={5}>Slot #5</option>
                </select>
              </div>
            </div>

            {/* SIMULATOR SCREEN 1: Desktop Viewport */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem' }}>
                  <Monitor size={18} /> DESKTOP VIEWPORT PREVIEW (1920 × 768 px Canvas)
                </div>
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900' }}>
                  {!showOverlayText ? 'PURE GRAPHIC MODE' : '16:6.4 RATIO'}
                </span>
              </div>

              {/* Desktop Mock Frame */}
              <div style={{
                borderRadius: '24px',
                border: '2px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                background: '#020617'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', display: 'flex', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                </div>

                {/* Hero Carousel Simulation */}
                <div style={{
                  height: '280px',
                  position: 'relative',
                  backgroundImage: `url(${finalBannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3rem'
                }}>
                  {showOverlayText ? (
                    <>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 50%, transparent 100%)'
                      }} />

                      <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '0.3rem 0.85rem', 
                          borderRadius: '100px', 
                          background: 'var(--primary, #ef4123)', 
                          fontSize: '0.7rem', 
                          fontWeight: '800', 
                          textTransform: 'uppercase',
                          marginBottom: '0.75rem' 
                        }}>
                          {finalTag}
                        </span>
                        <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 0.5rem 0', lineHeight: 1.15, color: 'white' }}>
                          {finalTitle}
                        </h1>
                        <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: '0 0 1.25rem 0', color: '#cbd5e1' }}>
                          Order fresh from {previewModal.storeName}. Pick up hot & skip the line!
                        </p>
                        <button style={{
                          background: 'var(--primary, #ef4123)',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          Explore Now <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1.5rem', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', padding: '0.4rem 0.85rem', borderRadius: '100px', fontSize: '0.75rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <CheckCircle2 size={14} /> 100% Unobstructed Graphic (Click opens stall)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SIMULATOR SCREEN 2: Mobile Viewport */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: '800', fontSize: '0.85rem' }}>
                  <Smartphone size={18} /> MOBILE PHONE PREVIEW (iPhone / Android)
                </div>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900' }}>
                  {!showOverlayText ? '100% FULL IMAGE' : 'MOBILE SAFE ZONE'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Smartphone Device Mock */}
                <div style={{
                  width: '320px',
                  borderRadius: '36px',
                  border: '8px solid #334155',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                  background: '#0f172a'
                }}>
                  {/* Top Phone Speaker Notch */}
                  <div style={{ height: '22px', background: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '50px', height: '4px', borderRadius: '2px', background: '#1e293b' }} />
                  </div>

                  {/* Simulated Mobile Carousel Container */}
                  <div style={{
                    height: '200px',
                    position: 'relative',
                    backgroundImage: `url(${finalBannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end'
                  }}>
                    {showOverlayText ? (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.6) 50%, transparent 100%)' }} />

                        <div style={{ position: 'relative', zIndex: 2 }}>
                          <span style={{ 
                            display: 'inline-block', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '100px', 
                            background: 'var(--primary, #ef4123)', 
                            fontSize: '0.6rem', 
                            fontWeight: '800', 
                            textTransform: 'uppercase',
                            marginBottom: '0.4rem' 
                          }}>
                            {finalTag}
                          </span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', margin: '0 0 0.6rem 0', lineHeight: 1.2, color: 'white' }}>
                            {finalTitle}
                          </h3>
                          <button style={{
                            background: 'var(--primary, #ef4123)',
                            color: 'white',
                            border: 'none',
                            padding: '0.45rem 1.1rem',
                            borderRadius: '100px',
                            fontWeight: '800',
                            fontSize: '0.75rem'
                          }}>
                            Explore Now
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                        <span style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.65rem', color: '#10b981', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          100% Poster Visibility
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Safe Zone Verification Checklist */}
                <div style={{ flex: 1, minWidth: '280px', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>Safe Zone Verification Checklist</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.8' }}>
                    <li>
                      {!showOverlayText 
                        ? <strong style={{ color: '#10b981' }}>Pure Graphic Mode: Artwork and text inside your flyer are 100% visible.</strong>
                        : 'Headline and offer text are positioned cleanly within the mobile safe zone.'}
                    </li>
                    <li>Clicking anywhere on this banner in the live app will forward students to <strong style={{ color: 'white' }}>/store/{previewModal.stallId}</strong>.</li>
                    <li>No vital food dish photography is distorted or clipped.</li>
                    <li>Publishing starts the <strong style={{ color: '#10b981' }}>30-Day countdown</strong> immediately.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => setPreviewModal(null)}
                style={{ padding: '0.85rem 1.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}
              >
                Discard Changes
              </button>
              <button 
                onClick={handlePublish}
                disabled={publishing}
                style={{ 
                  padding: '0.85rem 2.5rem', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  color: 'white', 
                  border: 'none', 
                  fontWeight: '900', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
                }}
              >
                {publishing ? 'Publishing...' : <><Sparkles size={16} /> PUBLISH BANNER NOW (30 DAYS)</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminHeroPromotions;
