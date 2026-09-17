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
  Coins
} from 'lucide-react';

const SuperAdminHeroPromotions = ({ token, socket }) => {
  const [locations, setLocations] = useState([]);
  const [selectedHub, setSelectedHub] = useState('All');
  const [banners, setBanners] = useState([]);
  const [slotStats, setSlotStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Dual-Screen Preview Simulator Modal State
  const [previewModal, setPreviewModal] = useState(null); // holds active banner item being edited/reviewed
  const [finalBannerUrl, setFinalBannerUrl] = useState('');
  const [finalTitle, setFinalTitle] = useState('');
  const [finalTag, setFinalTag] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [publishing, setPublishing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const [bannerRes, locRes] = await Promise.all([
        axios.get(`${API_URL}/api/banners/admin/all?hub=${encodeURIComponent(selectedHub)}`, authConfig),
        axios.get(`${API_URL}/api/super-admin/locations/public`)
      ]);
      setBanners(bannerRes.data.banners || []);
      setSlotStats(bannerRes.data.slotStats || []);
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
    return () => {
      socket.off('banner_campaign_requested', handleRefresh);
      socket.off('banner_published', handleRefresh);
      socket.off('banner_status_changed', handleRefresh);
    };
  }, [socket]);

  const handleOpenSimulator = (item) => {
    setPreviewModal(item);
    setFinalBannerUrl(item.bannerUrl || item.rawAssetUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1920&q=80');
    setFinalTitle(item.title || item.rawText || `${item.storeName} Specials`);
    setFinalTag(item.tag || 'Featured Stall');
    setSelectedSlot(item.slotIndex || 1);
  };

  const handlePublish = async () => {
    if (!previewModal || !finalBannerUrl) return;
    try {
      setPublishing(true);
      await axios.post(`${API_URL}/api/banners/admin/publish`, {
        bannerId: previewModal.id,
        bannerUrl: finalBannerUrl,
        title: finalTitle,
        tag: finalTag,
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
    if (!window.confirm('Are you sure you want to deactivate and unlist this banner?')) return;
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
  const historicalBanners = banners.filter(b => b.status !== 'pending_design' && (b.status !== 'active' || new Date(b.endDate) <= new Date()));

  const totalPaidRevenue = banners.reduce((acc, curr) => acc + (parseFloat(curr.amountPaid) || 1000), 0);

  return (
    <div style={{ color: 'white', fontFamily: 'inherit' }}>
      {/* Top Header Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '2rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 65, 35, 0.2)', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '800', color: '#ff6b4a', marginBottom: '0.75rem' }}>
              <Sparkles size={14} /> HERO PROMOTIONS ENGINE • ₹1,000/MO SLOTS
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Location Hero Promotions</h1>
            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
              Manage location-specific rotating banner slots, format vendor flyers, and simulate Desktop & Mobile previews before publishing.
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Total Ad Revenue</span>
              <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>₹{totalPaidRevenue.toLocaleString()}</h3>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Active Slides</span>
              <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#6366f1' }}>{activeBanners.length} / 5 Slots</h3>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Design Queue</span>
              <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '900', color: '#f59e0b' }}>{pendingQueue.length} Pending</h3>
            </div>
          </div>
        </div>

        {/* Location Hub Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginTop: '1.5rem', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setSelectedHub('All')}
            style={{ 
              padding: '0.5rem 1.25rem',
              borderRadius: '100px',
              border: 'none',
              background: selectedHub === 'All' ? 'white' : 'rgba(255,255,255,0.08)',
              color: selectedHub === 'All' ? '#0f172a' : '#94a3b8',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            All Locations
          </button>
          {locations.map(loc => (
            <button 
              key={loc._id || loc.id}
              onClick={() => setSelectedHub(loc.name)}
              style={{ 
                padding: '0.5rem 1.25rem',
                borderRadius: '100px',
                border: 'none',
                background: selectedHub === loc.name ? 'white' : 'rgba(255,255,255,0.08)',
                color: selectedHub === loc.name ? '#0f172a' : '#94a3b8',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <MapPin size={14} /> {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5-Slot Visual Status Indicator */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#6366f1" /> Active 5-Slot Capacity ({selectedHub})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map(slotNum => {
            const occupant = activeBanners.find(b => b.slotIndex === slotNum);
            const daysLeft = occupant ? Math.max(0, Math.ceil((new Date(occupant.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
            return (
              <div 
                key={slotNum}
                style={{ 
                  background: occupant ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${occupant ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '900', color: occupant ? '#10b981' : '#64748b', textTransform: 'uppercase' }}>
                    SLOT #{slotNum}
                  </span>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '100px', 
                    fontSize: '0.65rem', 
                    fontWeight: '800',
                    background: occupant ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                    color: occupant ? '#10b981' : '#94a3b8'
                  }}>
                    {occupant ? 'ACTIVE' : 'VACANT'}
                  </span>
                </div>
                {occupant ? (
                  <>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '800', color: 'white' }}>{occupant.storeName}</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {daysLeft} Days Remaining
                    </p>
                  </>
                ) : (
                  <>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '700', color: '#64748b' }}>Ready for Booking</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>₹1,000 / month</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: Pending Design & Approval Queue */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
              Pending Design & Review Queue ({pendingQueue.length})
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Vendors who paid ₹1,000. Download their flyer or format their text offer into the 1920×768 master canvas.
            </p>
          </div>
        </div>

        {pendingQueue.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>All vendor requests have been designed and published!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {pendingQueue.map(item => (
              <div 
                key={item.id}
                style={{ 
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase' }}>
                      {item.locationHub}
                    </span>
                    <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.15rem', fontWeight: '800' }}>{item.storeName}</h4>
                  </div>
                  <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800' }}>
                    PAID ₹1,000
                  </span>
                </div>

                {/* Submitted Content Preview */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {item.rawAssetUrl ? (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Vendor Flyer Uploaded</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <img 
                          src={item.rawAssetUrl} 
                          alt="Vendor Flyer" 
                          style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <a 
                          href={item.rawAssetUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn"
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                        >
                          <Download size={14} /> Download Asset
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Vendor Text Offer</span>
                      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'white', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '8px' }}>
                        "{item.rawText}"
                      </p>
                      <button 
                        onClick={() => copyToClipboard(item.rawText, item.id)}
                        style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
                      >
                        {copiedId === item.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        {copiedId === item.id ? 'Copied to Clipboard' : 'Copy Text'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Non-Refundable Agreement Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                  <ShieldAlert size={14} />
                  <span>Strictly Non-Refundable Terms Acknowledged</span>
                </div>

                {/* Simulator Action Button */}
                <button 
                  onClick={() => handleOpenSimulator(item)}
                  style={{ 
                    marginTop: 'auto',
                    background: 'linear-gradient(135deg, #ef4123, #f59e0b)',
                    color: 'white',
                    border: 'none',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(239, 65, 35, 0.3)'
                  }}
                >
                  <Eye size={16} /> Open Dual-Screen Preview Simulator
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Active Banners on Live Website */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem' }}>
          Live Banners in Hero Carousel ({activeBanners.length})
        </h3>

        {activeBanners.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No paid banners live for {selectedHub}. Showing default curated system slides.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {activeBanners.map(banner => {
              const daysLeft = Math.max(0, Math.ceil((new Date(banner.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
              return (
                <div 
                  key={banner.id}
                  style={{ 
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '20px',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ 
                    height: '140px', 
                    backgroundImage: `url(${banner.bannerUrl})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center', 
                    position: 'relative' 
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%)' }} />
                    <span style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      right: '12px', 
                      background: 'rgba(16, 185, 129, 0.9)', 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '100px', 
                      fontSize: '0.7rem', 
                      fontWeight: '800' 
                    }}>
                      SLOT #{banner.slotIndex} • LIVE
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '800' }}>{banner.storeName}</h4>
                    <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>{banner.title || 'Special Promotion'}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {daysLeft} Days Left</span>
                      <span style={{ color: '#10b981', fontWeight: '700' }}>Deep-linked to Stall</span>
                    </div>

                    <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => handleOpenSimulator(banner)}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Edit / Simulator
                      </button>
                      <button 
                        onClick={() => handleArchive(banner.id)}
                        style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Deactivate
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
          background: 'rgba(0, 0, 0, 0.85)',
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
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#ff6b4a', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <Sparkles size={14} /> Dual-Screen Preview Simulator
                </div>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '900' }}>
                  Review & Publish Banner: {previewModal.storeName}
                </h2>
              </div>
              <button 
                onClick={() => setPreviewModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Inputs Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Final 1920×768 Banner Image URL</label>
                <input 
                  type="text" 
                  value={finalBannerUrl}
                  onChange={(e) => setFinalBannerUrl(e.target.value)}
                  placeholder="https://... final master banner url"
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '600' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Offer Headline / Title</label>
                <input 
                  type="text" 
                  value={finalTitle}
                  onChange={(e) => setFinalTitle(e.target.value)}
                  placeholder="e.g. Flat 20% Off Combos"
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '600' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Slot Assignment (1 to 5)</label>
                <select 
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(parseInt(e.target.value, 10))}
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '600' }}
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
                  <Monitor size={18} /> DESKTOP VIEWPORT PREVIEW
                </div>
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900' }}>
                  ASPECT RATIO: 16:6.4 (1920 × 768 px Master Canvas)
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
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 0.5rem 0', lineHeight: 1.15 }}>
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
                  ASPECT RATIO: 16:10 (Central Mobile Safe Zone: 1200 × 768 px)
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
                    justifyContent: 'center'
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)' }} />

                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '100px', 
                        background: 'var(--primary, #ef4123)', 
                        fontSize: '0.6rem', 
                        fontWeight: '800', 
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem' 
                      }}>
                        {finalTag}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0 0 0.75rem 0', lineHeight: 1.2, color: 'white' }}>
                        {finalTitle}
                      </h3>
                      <button style={{
                        background: 'var(--primary, #ef4123)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '800',
                        fontSize: '0.75rem'
                      }}>
                        Explore Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Safe Zone Verification Checklist */}
                <div style={{ flex: 1, minWidth: '280px', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>Safe Zone Verification</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.8' }}>
                    <li>Headline and offer text are centered and 100% visible on mobile.</li>
                    <li>No vital food dish photography is cropped out.</li>
                    <li>Banner is deep-linked to <strong style={{ color: 'white' }}>/store/{previewModal.stallId}</strong>.</li>
                    <li>Publishing starts the <strong style={{ color: '#10b981' }}>30-Day countdown</strong> immediately.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => setPreviewModal(null)}
                style={{ padding: '0.85rem 1.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}
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
