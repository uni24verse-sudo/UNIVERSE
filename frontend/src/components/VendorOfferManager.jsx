import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Power, 
  Sparkles, 
  Percent, 
  Flame, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Zap,
  Info,
  DollarSign
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const OFFER_TYPES = [
  {
    id: 'PERCENTAGE_CART',
    name: 'Cart Percentage Off',
    tagline: 'e.g., 10% off entire order',
    icon: Percent,
    unit: '%',
    valueLabel: 'Discount Percentage (%)',
    requiresCategories: false
  },
  {
    id: 'PERCENTAGE_CATEGORY',
    name: 'Category Percentage Off',
    tagline: 'e.g., 15% off on all Drinks',
    icon: Tag,
    unit: '%',
    valueLabel: 'Discount Percentage (%)',
    requiresCategories: true
  },
  {
    id: 'FLAT_PRICE_CATEGORY',
    name: 'Flat Price Category Deal',
    tagline: 'e.g., All Drinks or Chaap at flat ₹50',
    icon: Flame,
    unit: '₹',
    valueLabel: 'Deal Flat Price (₹)',
    requiresCategories: true
  },
  {
    id: 'FLAT_DISCOUNT_CART',
    name: 'Flat Rupee Off Cart',
    tagline: 'e.g., Flat ₹30 off orders above ₹150',
    icon: DollarSign,
    unit: '₹',
    valueLabel: 'Flat Rupee Discount (₹)',
    requiresCategories: false
  }
];

const DEFAULT_CATEGORIES = ['Drinks', 'Beverages', 'Chaap', 'Snacks', 'Fast Food', 'Meals', 'Combos', 'Chinese', 'Desserts'];

const VendorOfferManager = ({ store, onStoreUpdate }) => {
  const storeId = store?._id || store?.id;
  const { socket } = useSocket();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');
  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const [offers, setOffers] = useState(Array.isArray(store?.offers) ? store.offers : []);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [savingOffer, setSavingOffer] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    badgeText: '',
    discountType: 'PERCENTAGE_CATEGORY',
    discountValue: 15,
    targetCategories: ['Drinks'],
    minOrderValue: 0,
    maxDiscountCap: 0,
    isActive: true
  });

  // Extract all existing categories from store products
  const availableCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    if (Array.isArray(store?.products)) {
      store.products.forEach(p => {
        if (p.category && p.category.trim()) {
          set.add(p.category.trim());
        }
      });
    }
    return Array.from(set);
  }, [store]);

  // Keep offers synced with prop changes
  useEffect(() => {
    if (Array.isArray(store?.offers)) {
      setOffers(store.offers);
    }
  }, [store]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !storeId) return;

    const handleOffersUpdate = (data) => {
      if (String(data.storeId) === String(storeId)) {
        if (Array.isArray(data.offers)) {
          setOffers(data.offers);
        }
      }
    };

    socket.on('store_offers_update', handleOffersUpdate);
    return () => {
      socket.off('store_offers_update', handleOffersUpdate);
    };
  }, [socket, storeId]);

  const showNotification = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage({ type: '', text: '' });
    }, 4000);
  };

  const handleToggleOffer = async (offerId) => {
    try {
      setTogglingId(offerId);
      const res = await axios.put(
        `${API_URL}/api/store/${storeId}/offers/${offerId}/toggle`,
        {},
        authConfig
      );
      if (res.data?.offers) {
        setOffers(res.data.offers);
        if (onStoreUpdate) onStoreUpdate(res.data.store);
      }
      showNotification('success', 'Offer status toggled live across campus!');
    } catch (err) {
      console.error('Failed to toggle offer:', err);
      showNotification('error', err.response?.data?.message || 'Failed to toggle offer');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      setDeletingId(offerId);
      const res = await axios.delete(
        `${API_URL}/api/store/${storeId}/offers/${offerId}`,
        authConfig
      );
      if (res.data?.offers) {
        setOffers(res.data.offers);
        if (onStoreUpdate) onStoreUpdate(res.data.store);
      }
      showNotification('success', 'Offer removed successfully.');
    } catch (err) {
      console.error('Failed to delete offer:', err);
      showNotification('error', err.response?.data?.message || 'Failed to delete offer');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingOfferId(null);
    setFormData({
      title: '15% Off on Drinks',
      description: 'Valid on all refreshing beverages',
      badgeText: '15% OFF',
      discountType: 'PERCENTAGE_CATEGORY',
      discountValue: 15,
      targetCategories: ['Drinks'],
      minOrderValue: 0,
      maxDiscountCap: 50,
      isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setEditingOfferId(offer.id);
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      badgeText: offer.badgeText || '',
      discountType: offer.discountType || 'PERCENTAGE_CART',
      discountValue: offer.discountValue || 0,
      targetCategories: Array.isArray(offer.targetCategories) ? offer.targetCategories : [],
      minOrderValue: offer.minOrderValue || 0,
      maxDiscountCap: offer.maxDiscountCap || 0,
      isActive: offer.isActive !== false
    });
    setShowModal(true);
  };

  const toggleCategorySelection = (cat) => {
    setFormData(prev => {
      const exists = prev.targetCategories.includes(cat);
      const updated = exists 
        ? prev.targetCategories.filter(c => c !== cat)
        : [...prev.targetCategories, cat];
      return { ...prev, targetCategories: updated };
    });
  };

  const handleAutoGenerateTitle = () => {
    const val = formData.discountValue || 0;
    const cats = formData.targetCategories.join(' & ');
    switch (formData.discountType) {
      case 'PERCENTAGE_CART':
        setFormData(prev => ({
          ...prev,
          title: `${val}% OFF on All Items`,
          badgeText: `${val}% OFF`,
          description: prev.minOrderValue > 0 ? `On orders above ₹${prev.minOrderValue}` : 'No minimum order required'
        }));
        break;
      case 'PERCENTAGE_CATEGORY':
        setFormData(prev => ({
          ...prev,
          title: `${val}% OFF on ${cats || 'Selected Items'}`,
          badgeText: `${val}% OFF`,
          description: `Enjoy ${val}% off on all ${cats || 'items'}`
        }));
        break;
      case 'FLAT_PRICE_CATEGORY':
        setFormData(prev => ({
          ...prev,
          title: `All ${cats || 'Items'} at Just ₹${val}`,
          badgeText: `AT ₹${val}`,
          description: `Flat ₹${val} special deal on all ${cats || 'items'}`
        }));
        break;
      case 'FLAT_DISCOUNT_CART':
        setFormData(prev => ({
          ...prev,
          title: `Flat ₹${val} OFF`,
          badgeText: `₹${val} OFF`,
          description: prev.minOrderValue > 0 ? `On orders above ₹${prev.minOrderValue}` : 'No minimum order required'
        }));
        break;
      default:
        break;
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please provide an offer title');
      return;
    }
    if (Number(formData.discountValue) <= 0) {
      alert('Please enter a valid discount or deal value greater than 0');
      return;
    }

    const currentTypeConfig = OFFER_TYPES.find(t => t.id === formData.discountType);
    if (currentTypeConfig?.requiresCategories && formData.targetCategories.length === 0) {
      alert('Please select at least one applicable category');
      return;
    }

    try {
      setSavingOffer(true);
      if (editingOfferId) {
        const res = await axios.put(
          `${API_URL}/api/store/${storeId}/offers/${editingOfferId}`,
          formData,
          authConfig
        );
        if (res.data?.offers) {
          setOffers(res.data.offers);
          if (onStoreUpdate) onStoreUpdate(res.data.store);
        }
        showNotification('success', 'Offer updated successfully!');
      } else {
        const res = await axios.post(
          `${API_URL}/api/store/${storeId}/offers`,
          formData,
          authConfig
        );
        if (res.data?.offers) {
          setOffers(res.data.offers);
          if (onStoreUpdate) onStoreUpdate(res.data.store);
        }
        showNotification('success', 'Offer launched live across campus!');
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error saving offer:', err);
      alert(err.response?.data?.message || 'Failed to save offer');
    } finally {
      setSavingOffer(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.75rem', 
          borderRadius: '24px', 
          background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.08) 0%, rgba(255, 107, 74, 0.04) 100%)',
          border: '1px solid rgba(239, 65, 35, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ 
              background: '#EF4123', 
              color: '#fff', 
              padding: '0.35rem 0.65rem', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <Zap size={13} fill="#fff" /> LIVE ENGINE
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
              Shop Offers & Real-Time Deals
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Run percentage discounts, category deals, or flat-price specials (e.g. all drinks or chaap at flat ₹50) with instant campus-wide sync.
          </p>
        </div>

        <button 
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ 
            padding: '0.75rem 1.4rem', 
            borderRadius: '100px', 
            fontWeight: '800',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 20px rgba(239, 65, 35, 0.3)'
          }}
        >
          <Plus size={18} /> Create New Offer
        </button>
      </div>

      {/* Action Notification */}
      {actionMessage.text && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '14px',
          background: actionMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${actionMessage.type === 'error' ? '#ef4444' : '#10b981'}`,
          color: actionMessage.type === 'error' ? '#ef4444' : '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem',
          fontWeight: '700'
        }}>
          {actionMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {actionMessage.text}
        </div>
      )}

      {/* Offers Grid */}
      {offers.length === 0 ? (
        <div 
          className="glass-card" 
          style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            borderRadius: '24px',
            border: '2px dashed rgba(0,0,0,0.08)'
          }}
        >
          <Sparkles size={48} color="#EF4123" style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No Active Offers Yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
            Boost your stall orders during peak hours or rush times! Launch a 10% cart discount or a flat ₹50 deal on drinks or chaap.
          </p>
          <button 
            onClick={openCreateModal}
            className="btn btn-outline"
            style={{ borderRadius: '100px', fontWeight: '700' }}
          >
            Launch First Deal
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.25rem' 
        }}>
          {offers.map(offer => {
            const isToggling = togglingId === offer.id;
            const isDeleting = deletingId === offer.id;
            const typeConfig = OFFER_TYPES.find(t => t.id === offer.discountType) || OFFER_TYPES[0];

            return (
              <div 
                key={offer.id} 
                className="glass-card" 
                style={{ 
                  borderRadius: '20px', 
                  padding: '1.4rem',
                  border: offer.isActive ? '1.5px solid rgba(239, 65, 35, 0.3)' : '1px solid rgba(0,0,0,0.08)',
                  background: offer.isActive ? '#FFFFFF' : 'rgba(248, 250, 252, 0.7)',
                  opacity: offer.isActive ? 1 : 0.75,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: offer.isActive ? '0 10px 25px -5px rgba(239, 65, 35, 0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  {/* Top status & badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span style={{ 
                      padding: '0.3rem 0.7rem', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '900', 
                      background: offer.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)', 
                      color: offer.isActive ? '#10b981' : '#64748b' 
                    }}>
                      {offer.isActive ? '● ACTIVE LIVE' : '○ PAUSED'}
                    </span>

                    <span style={{ 
                      background: 'rgba(239, 65, 35, 0.1)', 
                      color: '#EF4123', 
                      padding: '0.25rem 0.65rem', 
                      borderRadius: '100px', 
                      fontSize: '0.75rem', 
                      fontWeight: '800' 
                    }}>
                      {offer.badgeText || (offer.discountType.includes('PERCENTAGE') ? `${offer.discountValue}% OFF` : `AT ₹${offer.discountValue}`)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    {offer.title}
                  </h4>
                  {offer.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                      {offer.description}
                    </p>
                  )}

                  {/* Filter details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Tag size={13} color="#EF4123" />
                      <span><strong>Type:</strong> {typeConfig.name}</span>
                    </div>
                    {offer.targetCategories && offer.targetCategories.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <ShoppingBag size={13} color="#EF4123" style={{ marginTop: '2px' }} />
                        <span><strong>Categories:</strong> {offer.targetCategories.join(', ')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                      {offer.minOrderValue > 0 && (
                        <span><strong>Min Cart:</strong> ₹{offer.minOrderValue}</span>
                      )}
                      {offer.maxDiscountCap > 0 && (
                        <span><strong>Max Cap:</strong> ₹{offer.maxDiscountCap}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingTop: '0.85rem', 
                  borderTop: '1px solid rgba(0,0,0,0.06)' 
                }}>
                  {/* ON / OFF Switch */}
                  <button
                    onClick={() => handleToggleOffer(offer.id)}
                    disabled={isToggling}
                    style={{
                      background: offer.isActive ? '#10b981' : '#94a3b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '100px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isToggling ? <Loader2 size={13} className="spin" /> : <Power size={13} />}
                    {offer.isActive ? 'Turn OFF' : 'Turn ON'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => openEditModal(offer)}
                      style={{
                        background: 'rgba(0,0,0,0.04)',
                        border: 'none',
                        padding: '0.5rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                      title="Edit Offer"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer.id)}
                      disabled={isDeleting}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: 'none',
                        padding: '0.5rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
                      title="Delete Offer"
                    >
                      {isDeleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
                  {editingOfferId ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Define dynamic rules and watch them apply live on student carts.
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmitOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 1. Offer Type Selector */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>
                  Select Offer Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {OFFER_TYPES.map(type => {
                    const isSelected = formData.discountType === type.id;
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setFormData(prev => ({ ...prev, discountType: type.id }))}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid #EF4123' : '1px solid rgba(0,0,0,0.1)',
                          background: isSelected ? 'rgba(239, 65, 35, 0.05)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isSelected ? '#EF4123' : '#334155' }}>
                          <Icon size={16} />
                          <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>{type.name}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{type.tagline}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Category Multi-Select (if applicable) */}
              {(formData.discountType === 'PERCENTAGE_CATEGORY' || formData.discountType === 'FLAT_PRICE_CATEGORY') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Applicable Categories
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Click to select/unselect</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {availableCategories.map(cat => {
                      const isSelected = formData.targetCategories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => toggleCategorySelection(cat)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '100px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            border: isSelected ? '1.5px solid #EF4123' : '1px solid rgba(0,0,0,0.12)',
                            background: isSelected ? '#EF4123' : '#f8fafc',
                            color: isSelected ? '#fff' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? `✓ ${cat}` : cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Discount Value & Limits Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block' }}>
                    {formData.discountType === 'FLAT_PRICE_CATEGORY' ? 'Deal Price per Item (₹)' : 
                     formData.discountType === 'FLAT_DISCOUNT_CART' ? 'Flat Discount (₹)' : 'Discount (%)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    placeholder="e.g. 15 or 50"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block' }}>
                    Min. Cart Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                    placeholder="0 for no minimum"
                  />
                </div>
              </div>

              {formData.discountType.includes('PERCENTAGE') && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block' }}>
                    Max Discount Cap (₹) <span style={{ fontWeight: '400', color: '#64748b' }}>(Optional, 0 = no cap)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.maxDiscountCap}
                    onChange={(e) => setFormData({ ...formData, maxDiscountCap: Number(e.target.value) })}
                    placeholder="e.g. 50"
                  />
                </div>
              )}

              {/* 4. Title, Badge & Description */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Offer Headline
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateTitle}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4123',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Sparkles size={12} /> Auto-suggest Headline
                  </button>
                </div>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 15% OFF on all Drinks"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block' }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    placeholder="15% OFF"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block' }}>
                    Short Subtitle / Condition
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Valid on all cold beverages"
                  />
                </div>
              </div>

              {/* 5. Live Preview Card */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Student Menu Live Preview:
                </span>
                <div style={{ 
                  marginTop: '0.5rem', 
                  background: '#fff', 
                  borderRadius: '12px', 
                  padding: '0.85rem', 
                  border: '1px solid rgba(239, 65, 35, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ background: '#EF4123', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                        {formData.badgeText || 'SPECIAL DEAL'}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{formData.title || 'Special Promotion'}</strong>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      {formData.description || 'Applies automatically to qualifying items in cart.'}
                    </p>
                  </div>
                  <Zap size={20} color="#EF4123" />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  style={{ borderRadius: '100px', padding: '0.65rem 1.4rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="btn btn-primary"
                  style={{ borderRadius: '100px', padding: '0.65rem 1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {savingOffer ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  {editingOfferId ? 'Save Changes' : 'Launch Offer Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOfferManager;
