import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, CheckCircle2, Share2 } from 'lucide-react';
import { shareContent } from '../../utils/shareHelper';

const StoreSubHeader = ({ 
  store, 
  navigate, 
  isExternal, 
  dietaryFilter,
  setDietaryFilter,
  showDietaryFilter = false
}) => {
  const isStoreOpen = store.isOpen !== false;
  const [isScrolled, setIsScrolled] = useState(false);

  const handleShareStall = () => {
    const rawId = store?.id || store?._id || '';
    const shortStoreId = rawId.length > 8 ? rawId.slice(0, 8) : rawId;
    const stallUrl = `${window.location.origin}/s/${shortStoreId}`;
    const productCount = Array.isArray(store?.products) ? store.products.length : 0;
    const locationTag = store?.market ? `${store.name} • ${store.market}` : (store?.name || 'Campus Dining');

    shareContent({
      title: `${store?.name || 'Stall'} on UNIVERSE`,
      text: `🏪 *${store?.name || 'Stall'}*\n📍 _${locationTag}_\n\nLooking for good food? *Check out their live menu.* 🍽️\n${productCount > 0 ? `${productCount} fresh dishes ready to order.` : 'Ready to order fresh food.'}\n\n🛒 *Explore menu on UNIVERSE:*\n${stallUrl}`,
      url: stallUrl
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 140);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Sticky Top Bar with Back Button & Mini Stall Identity (Slides down ONLY when scrolled) */}
      <div 
        className="store-header-sticky" 
        style={{ 
          position: 'fixed',
          top: `calc(var(--nav-actual-height, 72px) + ${(!isExternal && localStorage.getItem('universe_location_type') === 'College') ? 'var(--promo-height, 38px)' : '0px'})`,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 999,
          borderBottom: '1px solid var(--surface-border)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          transform: isScrolled ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isScrolled ? 1 : 0,
          pointerEvents: isScrolled ? 'auto' : 'none',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          visibility: isScrolled ? 'visible' : 'hidden'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              background: '#ffffff', 
              border: '1px solid var(--surface-border)', 
              color: 'var(--text-primary)', 
              padding: '0.45rem', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
              display: 'flex', 
              alignItems: 'center'
            }}
            aria-label="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ textAlign: 'center', flex: 1, padding: '0 0.5rem' }}>
            <h1 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              {store.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.15rem', fontWeight: '600' }}>
              <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />20-30 mins</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{store.market || 'BH1 Market'}</span>
            </div>
          </div>
          
          <button 
            onClick={handleShareStall}
            style={{ 
              background: 'rgba(239, 65, 35, 0.04)', 
              border: '1.2px solid rgba(239, 65, 35, 0.4)', 
              color: 'var(--primary)', 
              padding: '0.45rem', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              boxShadow: '0 2px 8px rgba(239, 65, 35, 0.1)', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Share Stall"
            title="Share Stall"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div style={{ padding: '1.25rem 1rem 0.5rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Compact, Premium Stall Hero Card with Elevated Depth */}
        <div 
          className="glass-card animate-fade-in-up" 
          style={{ 
            padding: '1.25rem 1.5rem', 
            marginBottom: '1rem', 
            borderRadius: '26px',
            background: 'rgba(255, 255, 255, 0.94)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 16px 38px -8px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            transform: 'translateY(-10px)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '900', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {store.name}
                </h2>
                <CheckCircle2 size={18} color="var(--primary)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} color="var(--primary)" /> {store.market || 'BH1 Market'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} color="var(--primary)" /> 20-30 mins
                </span>
              </div>
            </div>

            {/* Operating Status & Share Stall Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleShareStall}
                className="stall-hero-share-btn"
                title="Share this stall with friends"
                aria-label="Share this stall"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>

              {isStoreOpen ? (
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  background: 'rgba(16, 185, 129, 0.08)', 
                  color: '#059669', 
                  padding: '0.35rem 0.85rem', 
                  borderRadius: '100px', 
                  fontSize: '0.75rem', 
                  fontWeight: '800',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  letterSpacing: '0.04em'
                }}>
                  <span className="pulse-live-dot" /> LIVE & OPEN
                </div>
              ) : (
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  color: 'var(--error)', 
                  fontSize: '0.75rem', 
                  padding: '0.35rem 0.85rem', 
                  borderRadius: '100px', 
                  fontWeight: '800', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  letterSpacing: '0.04em' 
                }}>
                  <Clock size={12} /> CURRENTLY CLOSED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Dietary Filter - ONLY displayed if location/store has mixed offerings (e.g. Law Gate) */}
        {showDietaryFilter && (
          <div className="dietary-filter-container animate-fade-in-up" style={{ 
            display: 'flex', 
            gap: '0.4rem', 
            marginBottom: '1rem', 
            background: '#ffffff', 
            padding: '4px', 
            borderRadius: '16px', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            border: '1px solid var(--surface-border)',
            maxWidth: '380px',
            margin: '0 auto 1rem auto'
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'veg', label: 'Veg' },
              { id: 'non-veg', label: 'Non-Veg' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setDietaryFilter(filter.id)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: dietaryFilter === filter.id ? 'var(--primary)' : 'transparent',
                  color: dietaryFilter === filter.id ? 'white' : 'var(--text-secondary)',
                  fontWeight: '800',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: dietaryFilter === filter.id ? '0 6px 16px rgba(239, 65, 35, 0.2)' : 'none'
                }}
              >
                {filter.id === 'veg' && <span style={{ width: '8px', height: '8px', background: dietaryFilter === 'veg' ? 'white' : '#10b981', borderRadius: '50%' }}></span>}
                {filter.id === 'non-veg' && <span style={{ width: '8px', height: '8px', background: dietaryFilter === 'non-veg' ? 'white' : '#ef4444', borderRadius: '50%' }}></span>}
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(StoreSubHeader);


