import React from 'react';
import OptimizedImage from '../OptimizedImage';
import QuantitySelector from '../QuantitySelector';

const ProductCard = ({ product, storeId, onVariantClick, storeClosed, index }) => {
  const isUnavailable = product.isAvailable === false;
  
  return (
    <div 
      className="product-card animate-fade-in-up"
      style={{ 
        animationDelay: `${index * 0.05}s`,
        opacity: isUnavailable ? 0.6 : 1,
        filter: isUnavailable ? 'grayscale(0.8)' : 'none',
        pointerEvents: isUnavailable ? 'none' : 'auto',
        willChange: 'transform, opacity'
      }}
    >
      {isUnavailable && (
         <div style={{
           position: 'absolute',
           top: '20px',
           right: '-35px',
           transform: 'rotate(45deg)',
           background: '#64748b',
           color: 'white',
           padding: '0.25rem 3rem',
           fontWeight: '900',
           fontSize: '0.625rem',
           zIndex: 20,
           letterSpacing: '0.1em'
         }}>SOLD OUT</div>
      )}

      <div className="product-img-container">
        <OptimizedImage 
          src={product.image} 
          alt={product.name} 
          className="product-img" 
        />

        {/* Floating Quantity Selector Overlay */}
        <div style={{ 
          position: 'absolute', 
          bottom: '12px', 
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100px',
          zIndex: 15
        }}>
          <QuantitySelector 
            product={product} 
            storeId={storeId} 
            onVariantClick={onVariantClick}
            storeClosed={storeClosed}
          />
        </div>
      </div>

      <div className="product-card-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {product.dietaryPreference === 'veg' && (
            <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem', fontWeight: '900', border: '1.5px solid #10b981', color: '#10b981', borderRadius: '6px', letterSpacing: '0.08em', background: 'rgba(16, 185, 129, 0.05)' }}>VEG</span>
          )}
          {product.dietaryPreference === 'non-veg' && (
            <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem', fontWeight: '900', border: '1.5px solid #ef4444', color: '#ef4444', borderRadius: '6px', letterSpacing: '0.08em', background: 'rgba(239, 68, 68, 0.05)' }}>NON-VEG</span>
          )}
          {product.dietaryPreference === 'egg' && (
            <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem', fontWeight: '900', border: '1.5px solid #f59e0b', color: '#f59e0b', borderRadius: '6px', letterSpacing: '0.08em', background: 'rgba(245, 158, 11, 0.05)' }}>EGG</span>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.category || 'Specialty'}</span>
        </div>

        <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: '1.2' }}>{product.name}</h3>
        {product.description && <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{product.description}</p>}
        
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)' }}>₹</span>
          {product.variants && product.variants.length > 0 ? (
            <span style={{ fontWeight: '900', fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{Math.min(...product.variants.map(v => v.price))}<span style={{ fontSize: '0.8rem', marginLeft: '1px' }}>+</span></span>
          ) : (
            <span style={{ fontWeight: '900', fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{product.price}</span>
          )}
        </div>
        
        {product.isCombo && product.comboItems && product.comboItems.length > 0 && (
          <div style={{ 
            marginTop: '1rem',
            background: 'rgba(99, 102, 241, 0.03)', 
            padding: '0.6rem 0.8rem', 
            borderRadius: '14px', 
            border: '1px solid rgba(99, 102, 241, 0.08)' 
          }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {product.comboItems.map((ci, k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.6 }}></div>
                   <span style={{ fontWeight: '500' }}><span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{ci.quantity}</span> {ci.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
