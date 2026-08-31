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
    <div className="skeleton-container">
      {skeletons.map((_, i) => renderSkeleton(i))}
      <style>{`
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
        }
        .skeleton-card-wrapper {
          display: flex;
          gap: 1.5rem;
          padding: 1.5rem;
          background: white;
          border-radius: 28px;
          border: 1px solid rgba(0,0,0,0.05);
        }
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default SkeletonLoader;
