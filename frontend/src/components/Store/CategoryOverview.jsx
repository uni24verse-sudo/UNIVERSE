import React from 'react';
import OptimizedImage from '../OptimizedImage';

const CategoryOverview = ({ categories, store, onCategorySelect, activeCategory }) => {
  if (!categories || categories.length <= 1) return null;

  return (
    <div className="store-category-grid animate-fade-in-up" style={{ gridColumn: '1 / -1' }}>
      {categories.filter(c => c !== 'All').map((cat) => {
        
        const getCategoryImage = (name) => {
          const explicitCatImage = store.categoryImages?.find(c => c.categoryName === name)?.image;
          if (explicitCatImage) return explicitCatImage;

          const productWithImage = store.products.find(p => (p.category || 'Uncategorized') === name && p.image);
          return productWithImage ? productWithImage.image : null;
        };
        
        const catImage = getCategoryImage(cat);
        
        return (
          <div 
            key={cat} 
            className={`store-category-tile ${activeCategory === cat ? 'active' : ''}`} 
            onClick={() => onCategorySelect(cat)}
            style={{
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              willChange: 'transform'
            }}
          >
            {catImage ? (
              <OptimizedImage 
                src={catImage} 
                alt={cat} 
                className="store-category-image" 
              />
            ) : (
              <div className="store-category-fallback-image">
                {cat.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="store-category-name">{cat}</div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(CategoryOverview);
