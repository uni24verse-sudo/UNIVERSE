import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Eye, Lock, Share2, Database } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      color: 'white',
      padding: '4rem 1rem'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              borderRadius: '100px',
              cursor: 'pointer',
              marginBottom: '2rem',
              margin: '0 auto 2rem auto',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
          >
            <ArrowLeft size={18} /> Back
          </button>
          
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <Shield size={32} color="var(--secondary)" />
          </div>
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Last Updated: March 2026</p>
        </div>

        {/* Content Card */}
        <div className="glass-card" style={{
          padding: '3rem',
          borderRadius: '32px',
          border: '1px solid var(--surface-border)',
          lineHeight: '1.8',
          fontSize: '1rem',
          color: 'var(--text-secondary)'
        }}>
          <section style={{ marginBottom: '2.5rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              This Privacy Policy describes how **Universe** and its affiliates (collectively "Universe, we, our, us") collect, use, share, protect or otherwise process your information/ personal data through our website <span style={{ color: 'var(--primary)' }}>https://www.universeorder.co.in</span> (hereinafter referred to as Platform).
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              By visiting this Platform, providing your information or availing any product/service offered on the Platform, you expressly agree to be bound by the terms and conditions of this Privacy Policy and the Terms of Use. If you do not agree please do not use or access our Platform.
            </p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="var(--primary)" /> Collection
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                 We collect your personal data when you use our Platform, such as name, address, telephone/mobile number, email ID, and proof of identity.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} color="var(--secondary)" /> Usage
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                We use personal data to provide the services you request, handle and fulfill orders, resolve disputes, and prevent fraud.
              </p>
            </div>
          </div>

          <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '1.25rem' }}>1. Sharing of Personal Data</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We may share your personal data with our group entities, affiliates, and third parties such as sellers, business partners, and third-party service providers (logistics partners, payment issuers). These disclosures are required for us to provide you access to our services, comply with legal obligations, and prevent illegal activities.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '1.25rem' }}>2. Security Precautions</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            To protect your personal data from unauthorised access or disclosure, loss or misuse we adopt reasonable security practices and procedures. We adhere to our security guidelines to protect it against unauthorised access and offer the use of a secure server.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '1.25rem' }}>3. Data Deletion and Retention</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You have an option to delete your account by visiting your profile and settings on our Platform. We retain your personal data information for a period no longer than is required for the purpose for which it was collected or as required under any applicable law.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '1.25rem' }}>4. Your Rights</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You may access, rectify, and update your personal data directly through the functionalities provided on the Platform.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '1.25rem' }}>5. Consent</h2>
          <p style={{ marginBottom: '2.5rem' }}>
            By visiting our Platform or by providing your information, you consent to the collection, use, storage, disclosure and otherwise processing of your information on the Platform in accordance with this Privacy Policy.
          </p>

          <div style={{ 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)', 
            padding: '2rem', 
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '1rem' }}>Grievance Officer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              <p><strong style={{ color: 'white' }}>Designation:</strong> Grievance Officer</p>
              <p><strong style={{ color: 'white' }}>Company:</strong> Universe</p>
              <p><strong style={{ color: 'white' }}>Address:</strong> Lucknow, Uttar Pradesh</p>
              <p><strong style={{ color: 'white' }}>Email:</strong> support@universeorder.co.in</p>
              <p><strong style={{ color: 'white' }}>Phone:</strong> Mon - Fri (9:00 - 18:00)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
