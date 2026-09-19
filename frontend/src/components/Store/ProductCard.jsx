import React from 'react';
import { Share2 } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';
import QuantitySelector from '../QuantitySelector';
import { shareContent } from '../../utils/shareHelper';

const ProductCard = ({ 
  product, 
  storeId, 
  onVariantClick, 
  storeClosed, 
  index, 
  showDietaryBadge = true,
  viewMode = 'list'
}) => {
  const isUnavailable = product.isAvailable === false;
  const dietaryPref = product.dietaryPreference || 'veg';
  const isComboItem = product.isCombo || (product.category || '').toLowerCase().includes('combo');
  const hasVariants = product.variants && product.variants.length > 0;
  const minPrice = hasVariants ? Math.min(...product.variants.map(v => v.price)) : product.price;

  const handleShareDish = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const dishUrl = `${window.location.origin}/store/${storeId}?dish=${encodeURIComponent(product.name)}`;
    shareContent({
      title: `${product.name} on UniVerse`,
      text: `Craving this? Check out ${product.name} (₹${minPrice}) on UniVerse!`,
      url: dishUrl
    });
  };

  // ----------------------------------------------------
  // 1. LIST VIEW (Industry Gold Standard - Swiggy/Zomato)
  // ----------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div 
        className="product-list-card animate-fade-in-up"
        style={{
          animationDelay: `${index * 0.03}s`,
          opacity: isUnavailable ? 0.6 : 1,
          filter: isUnavailable ? 'grayscale(0.7)' : 'none',
          pointerEvents: isUnavailable ? 'none' : 'auto'
        }}
      >
        {/* Left: Dish Information */}
        <div className="product-list-info">
          {/* Tag row with Share Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', gap: '0.45rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
              {showDietaryBadge && (
                <div className={`dietary-symbol ${dietaryPref}`} style={{ flexShrink: 0 }}>
                  <div className="dietary-dot" />
                </div>
              )}
              {isComboItem ? (
                <span className="stall-combo-badge" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>
                  COMBO
                </span>
              ) : (
                <span className="stall-category-badge" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>
                  {product.category || 'Specialty'}
                </span>
              )}
            </div>

            <button 
              className="dish-share-btn"
              onClick={handleShareDish}
              title={`Share ${product.name}`}
              aria-label={`Share ${product.name}`}
            >
              <Share2 size={12} />
              <span className="dish-share-text">Share</span>
            </button>
          </div>

          {/* Dish Name */}
          <h3 className="product-list-title">
            {product.name}
          </h3>

          {/* Price */}
          <div className="product-list-price">
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)' }}>₹</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {minPrice}
            </span>
            {hasVariants && <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>+</span>}
          </div>

          {/* Description */}
          {product.description && (
            <p className="product-list-desc">
              {product.description}
            </p>
          )}

          {/* Combo item chips */}
          {isComboItem && product.comboItems && product.comboItems.length > 0 && (
            <div className="combo-chips-wrap">
              {product.comboItems.map((ci, k) => (
                <span key={k} className="combo-chip">
                  <strong>{ci.quantity}x</strong> {ci.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Dish Photo & Add Button */}
        <div className="product-list-media-col">
          <div className="product-list-img-frame">
            <OptimizedImage 
              src={product.image} 
              alt={product.name} 
              className="product-img" 
            />

            {/* Corner Status Badge */}
            {isUnavailable ? (
              <div className="media-status-badge sold">SOLD OUT</div>
            ) : storeClosed && (
              <div className="media-status-badge closed">CLOSED</div>
            )}
          </div>

          {/* Action Button positioned underneath or overlapping bottom */}
          {!storeClosed && !isUnavailable && (
            <div className="product-list-qty-wrap">
              <QuantitySelector 
                product={product} 
                storeId={storeId} 
                onVariantClick={onVariantClick}
                storeClosed={storeClosed}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. GRID VIEW (Modern 2-Column Compact Card)
  // ----------------------------------------------------
  return (
    <div 
      className="product-card animate-fade-in-up"
      style={{ 
        animationDelay: `${index * 0.03}s`,
        opacity: isUnavailable ? 0.65 : 1,
        filter: isUnavailable ? 'grayscale(0.7)' : 'none',
        pointerEvents: isUnavailable ? 'none' : 'auto',
        willChange: 'transform, opacity'
      }}
    >
      <div className="product-img-container">
        <OptimizedImage 
          src={product.image} 
          alt={product.name} 
          className="product-img" 
        />

        {showDietaryBadge && (
          <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 12 }}>
            <div className={`dietary-symbol ${dietaryPref}`}>
              <div className="dietary-dot" />
            </div>
          </div>
        )}

        {isUnavailable ? (
          <div className="media-status-badge sold">SOLD OUT</div>
        ) : storeClosed && (
          <div className="media-status-badge closed">CLOSED</div>
        )}

        {!storeClosed && !isUnavailable && (
          <div style={{ 
            position: 'absolute', 
            bottom: '10px', 
            left: '50%',
            transform: 'translateX(-50%)',
            width: '104px',
            zIndex: 15
          }}>
            <QuantitySelector 
              product={product} 
              storeId={storeId} 
              onVariantClick={onVariantClick}
              storeClosed={storeClosed}
            />
          </div>
        )}
      </div>

      <div className="product-card-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {isComboItem ? (
              <span className="stall-combo-badge" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>
                COMBO
              </span>
            ) : (
              <span className="stall-category-badge" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>
                {product.category || 'Specialty'}
              </span>
            )}
          </div>

          <button 
            className="dish-share-btn dish-share-btn-compact"
            onClick={handleShareDish}
            title={`Share ${product.name}`}
            aria-label={`Share ${product.name}`}
          >
            <Share2 size={12} />
            <span className="dish-share-text">Share</span>
          </button>
        </div>

        <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.975rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.015em', lineHeight: '1.25' }}>
          {product.name}
        </h3>

        {product.description && (
          <p style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '0.78rem', 
            color: 'var(--text-secondary)', 
            lineHeight: '1.35',
            fontWeight: '500',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {product.description}
          </p>
        )}
        
        {isComboItem && product.comboItems && product.comboItems.length > 0 && (
          <div className="combo-chips-wrap">
            {product.comboItems.map((ci, k) => (
              <span key={k} className="combo-chip">
                <strong>{ci.quantity}x</strong> {ci.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: 'var(--primary)' }}>₹</span>
          <span style={{ fontWeight: '900', fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {minPrice}
            {hasVariants && <span style={{ fontSize: '0.75rem', marginLeft: '2px', color: 'var(--text-secondary)' }}>+</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
