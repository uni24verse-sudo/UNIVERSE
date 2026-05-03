import React, { useState, useEffect } from 'react';
import logoFull from '../assets/logo-full.png';
import './LocationPortal.css'; // Reusing styles

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="location-portal-overlay" style={{ zIndex: 9999 }}>
      <div className="portal-bg-layer">
        <div className="portal-bg-blob blob-1"></div>
        <div className="portal-bg-blob blob-2"></div>
      </div>
      <div className="portal-splash-screen">
        <div className="logo-container">
          <img src={logoFull} alt="UNIVERSE" className="splash-logo" />
        </div>
        <div className="splash-text-container">
          <div className="splash-text">One Unified Ordering Hub</div>
        </div>
        <div className="splash-loader">
          <div className="loader-bar">
            <div className="loader-progress"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
