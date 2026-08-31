import React, { useEffect } from 'react';
import { Download, BellRing, Smartphone, QrCode, Zap, CheckCircle2 } from 'lucide-react';
import './VendorAppDownload.css';
import logo from '../assets/logo-full.png';

const VendorAppDownload = () => {
  useEffect(() => {
    document.title = "Download UNIVERSE Vendor OS";
  }, []);

  return (
    <div className="vendor-download-container">
      {/* Header Logo */}
      <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10 }}>
        <img src={logo} alt="UNIVERSE" style={{ height: '30px', filter: 'brightness(0) invert(1)' }} />
      </div>

      {/* Hero Section */}
      <section className="vd-hero">
        <div className="vd-badge">Internal Distribution Only</div>
        <h1 className="vd-title">UNIVERSE<br/>Vendor OS</h1>
        <p className="vd-subtitle">
          The ultimate control center for your stall. Manage live orders, verify handovers with QR scanning, and get loud native push notifications so you never miss an order—even when your phone is locked.
        </p>
        
        <a href="https://drive.google.com/uc?export=download&id=1foItaydd123G-mIwpJ0CDFZfQxF6DHgC" className="vd-download-btn" target="_blank" rel="noopener noreferrer">
          <Download size={24} />
          Download APK
        </a>
        <span className="vd-btn-sub">Version 1.0.0 • Android 8.0+ • Size: ~45MB</span>
        <div style={{ marginTop: '1rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600' }}>
          *You may need to allow "Install from Unknown Sources" in your Android settings.
        </div>
      </section>

      {/* Diagrammatic Mockup Section */}
      <section className="vd-mockup-container">
        <div className="vd-mockup-text">
          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem', color: '#fff' }}>How it Works</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '2rem' }}>
            Built specifically for high-speed college environments, the Vendor OS keeps you synchronized with the web platform in real-time.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <CheckCircle2 color="#10b981" style={{ marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>1. Receive Order</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Phone rings loudly, order pops up.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <CheckCircle2 color="#3b82f6" style={{ marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>2. Prepare & Update</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Mark as 'Cooking' then 'Ready'. Student is notified.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <CheckCircle2 color="#8b5cf6" style={{ marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>3. Scan QR</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Scan student's screen to safely hand over food.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* CSS Drawn Mobile Mockup */}
        <div className="vd-mockup-image">
          <div className="vd-mockup-header"></div>
          <div className="vd-mockup-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Animated Order Card */}
            <div className="vd-mockup-card vd-anim-card-1" style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div className="vd-mockup-line medium"></div>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#10b981' }}>NEW</div>
              </div>
              <div className="vd-mockup-line short"></div>
              <div className="vd-mockup-btn vd-anim-btn-1" style={{ width: '50%', background: '#f59e0b', transition: 'width 0.3s, background 0.3s' }}></div>
            </div>
            
            {/* Background static card */}
            <div className="vd-mockup-card" style={{ opacity: 0.3, marginTop: '1rem' }}>
              <div className="vd-mockup-line medium"></div>
              <div className="vd-mockup-line short"></div>
              <div className="vd-mockup-btn" style={{ width: '100%', background: '#3b82f6' }}></div>
            </div>

            {/* Animated QR Scanner Overlay */}
            <div className="vd-anim-scanner">
              <div style={{ color: 'white', marginBottom: '1rem', fontWeight: 'bold', fontSize: '0.8rem' }}>Scan Student QR</div>
              <div className="vd-scanner-box">
                <div className="vd-scanner-corners-bottom"></div>
                <div className="vd-scanner-line"></div>
              </div>
            </div>
          </div>
          {/* Fake Bottom Nav */}
          <div style={{ height: '50px', background: 'white', marginTop: 'auto', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
             <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444' }}></div>
             <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#cbd5e1' }}></div>
             <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#cbd5e1' }}></div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="vd-diagram-section">
        <h2 className="vd-section-title">Core Capabilities</h2>
        <div className="vd-grid">
          
          <div className="vd-card">
            <div className="vd-card-glow"></div>
            <div className="vd-card-step">01</div>
            <div className="vd-icon-wrapper">
              <BellRing color="#ef4444" size={28} />
            </div>
            <h3 className="vd-card-title">Native Push Alarms</h3>
            <p className="vd-card-text">
              Uses Android's native notification channels to bypass battery-savers and ring loudly so you never miss an order.
            </p>
          </div>

          <div className="vd-card">
            <div className="vd-card-glow" style={{ background: 'rgba(59, 130, 246, 0.2)' }}></div>
            <div className="vd-card-step">02</div>
            <div className="vd-icon-wrapper">
              <QrCode color="#3b82f6" size={28} />
            </div>
            <h3 className="vd-card-title">QR Verification</h3>
            <p className="vd-card-text">
              Securely hand over orders in crowded environments by scanning the student's unique checkout QR code.
            </p>
          </div>

          <div className="vd-card">
            <div className="vd-card-glow" style={{ background: 'rgba(16, 185, 129, 0.2)' }}></div>
            <div className="vd-card-step">03</div>
            <div className="vd-icon-wrapper">
              <Zap color="#10b981" size={28} />
            </div>
            <h3 className="vd-card-title">Menu Management</h3>
            <p className="vd-card-text">
              Toggle items in and out of stock instantly from the 'Menu' tab to prevent orders for unavailable food.
            </p>
          </div>

        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: '6rem', color: '#64748b', fontSize: '0.85rem' }}>
        &copy; {new Date().getFullYear()} UNIVERSE Internal Tools. All rights reserved.
      </div>
    </div>
  );
};

export default VendorAppDownload;
