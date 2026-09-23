import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const skeletons = Array(count).fill(0);

  const renderSkeleton = (index) => {
    switch (type) {
      case 'banner':
        return (
          <div key={index} className="skeleton skeleton-banner" style={{ height: '240px', width: '100%', borderRadius: '0' }} />
        );
      case 'card':
        return (
          <div key={index} className="skeleton-card-wrapper">
            <div className="skeleton skeleton-img" style={{ height: '120px', width: '120px', borderRadius: '16px' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton skeleton-text" style={{ width: '40%', height: '12px' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%', height: '20px' }} />
              <div className="skeleton skeleton-text" style={{ width: '30%', height: '16px' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px', marginTop: '8px' }} />
            </div>
          </div>
        );
      case 'text':
        return (
          <div key={index} className="skeleton skeleton-text" style={{ width: '100%', height: '16px', marginBottom: '8px' }} />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {skeletons.map((_, i) => renderSkeleton(i))}
    </div>
  );
};

export default SkeletonLoader;
