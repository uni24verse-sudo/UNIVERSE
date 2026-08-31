import React from 'react';
import { ArrowLeft, Clock, Search, X } from 'lucide-react';

const StoreSubHeader = ({ 
  store, 
  navigate, 
  isExternal, 
  searchQuery, 
  setSearchQuery,
  dietaryFilter,
  setDietaryFilter,
  activeCategory,
  setActiveCategory
}) => {
  return (
    <>
      <div className="store-header-sticky" style={{ 
        top: `calc(var(--nav-actual-height, 72px) + ${(!isExternal && localStorage.getItem('universe_location_type') === 'College') ? 'var(--promo-height, 38px)' : '0px'})`,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        zIndex: 999,
        borderBottom: '1px solid var(--surface-border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{store.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: '600' }}>
              <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />20-30 mins</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{store.market || 'BH1 Market'}</span>
            </div>
          </div>
          <div style={{ width: '38px' }}></div> 
        </div>
      </div>

      <div style={{ padding: '2rem 1rem 0 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Menu</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>Fresh from {store.name}</p>
              </div>
              {store.isOpen === false && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  color: 'var(--error)', 
                  fontSize: '0.625rem', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '99px', 
                  fontWeight: '800',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  letterSpacing: '0.05em'
                }}>OFFLINE</div>
              )}
           </div>
        </div>

        <div style={{ marginBottom: '1.5rem', position: 'relative' }} className="animate-fade-in-up">
          <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.6 }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder={`Search menu...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ 
              borderRadius: '100px',
              paddingLeft: '3.25rem',
              height: '52px',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }} 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', top: '50%', right: '1.25rem', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Global Dietary Filter */}
        {isExternal && activeCategory === 'All' && !searchQuery && (
          <div className="dietary-filter-container animate-fade-in-up" style={{ 
            display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', 
            background: '#ffffff', 
            padding: '4px', borderRadius: '16px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            border: '1px solid var(--surface-border)',
            maxWidth: '400px',
            margin: '0 auto 2rem auto'
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
                  padding: '0.6rem 0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: dietaryFilter === filter.id ? 'var(--primary)' : 'transparent',
                  color: dietaryFilter === filter.id ? 'white' : 'var(--text-secondary)',
                  fontWeight: '800',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: dietaryFilter === filter.id ? '0 8px 20px rgba(239, 65, 35, 0.15)' : 'none'
                }}
              >
                {filter.id === 'veg' && <span style={{ width: '8px', height: '8px', background: dietaryFilter === 'veg' ? 'white' : '#10b981', borderRadius: '50%', border: '1px solid #10b981' }}></span>}
                {filter.id === 'non-veg' && <span style={{ width: '8px', height: '8px', background: dietaryFilter === 'non-veg' ? 'white' : '#ef4444', borderRadius: '50%', border: '1px solid #ef4444' }}></span>}
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
