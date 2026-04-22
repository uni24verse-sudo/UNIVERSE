import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage - A high-performance image component with:
 * - Native lazy loading
 * - Blur-up transition effect
 * - Cloudinary optimization auto-injection
 * - Error fallback handling
 */
const OptimizedImage = ({ src, alt, className, style, loading = 'lazy' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const getOptimizedUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';
    
    // Auto-inject Cloudinary optimizations if using Cloudinary
    if (url.includes('cloudinary.com')) {
      // Add auto-format and auto-quality if not present
      if (!url.includes('f_auto')) {
        const parts = url.split('/upload/');
        if (parts.length === 2) {
          return `${parts[0]}/upload/f_auto,q_auto,w_auto,c_scale/${parts[1]}`;
        }
      }
    }
    
    // Handle local uploads
    if (url.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
    }
    
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);

  return (
    <div 
      className={`image-loader-container ${className || ''}`} 
      style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        backgroundColor: '#f1f5f9',
        ...style 
      }}
    >
      {/* Placeholder Shimmer */}
      {!isLoaded && !error && (
        <div className="skeleton" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      )}
      
      <img
        src={optimizedSrc}
        alt={alt}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: error ? 'none' : 'block',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: isLoaded ? 'none' : 'blur(10px)',
          transform: isLoaded ? 'scale(1)' : 'scale(1.05)',
        }}
      />

      {error && (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '2rem',
          background: '#f8fafc' 
        }}>
          🍲
        </div>
      )}
    </div>
  );
};

export default React.memo(OptimizedImage);
