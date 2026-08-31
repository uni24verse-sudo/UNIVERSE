import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Clock, Users, Shield, TrendingUp, ArrowRight, X } from 'lucide-react';

const UpiSetupGuide = ({ onClose, currentUpiType }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/upi-recommendations`);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (currentUpiType === 'merchant') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: '800' }}>
              ✅ UPI Already Configured
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={24} color="#64748b" />
            </button>
          </div>
          
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #22c55e', 
            borderRadius: '12px', 
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle size={24} color="#16a34a" />
              <span style={{ color: '#15803d', fontSize: '1.1rem', fontWeight: '600' }}>
                Your Merchant UPI is Active!
              </span>
            </div>
            <p style={{ margin: 0, color: '#166534', lineHeight: '1.5' }}>
              Your business UPI ID is configured and ready to accept payments without any warnings or limits.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose}
              style={{
                flex: 1,
                padding: '1rem',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: '800' }}>
            🚀 Upgrade to Merchant UPI
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#64748b" />
          </button>
        </div>

        {/* Current Issues */}
        <div style={{ 
          background: '#fef3c7', 
          border: '1px solid #fbbf24', 
          borderRadius: '12px', 
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertTriangle size={24} color="#d97706" />
            <span style={{ color: '#92400e', fontSize: '1.1rem', fontWeight: '600' }}>
              Current Issues with Personal UPI
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#78350f' }}>
            <li>Payment warnings in UPI apps</li>
            <li>"Payment mode not allowed" errors</li>
            <li>Daily transaction limits</li>
            <li>Risk policy restrictions</li>
          </ul>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '700' }}>
            ✨ Benefits of Merchant UPI
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} color="#22c55e" />
              <span style={{ color: '#16a34a', fontSize: '0.9rem' }}>No payment warnings</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} color="#22c55e" />
              <span style={{ color: '#16a34a', fontSize: '0.9rem' }}>Higher limits</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="#22c55e" />
              <span style={{ color: '#16a34a', fontSize: '0.9rem' }}>Business branding</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#22c55e" />
              <span style={{ color: '#16a34a', fontSize: '0.9rem' }}>Instant settlements</span>
            </div>
          </div>
        </div>

        {/* Recommended Providers */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '700' }}>
            📱 Recommended Providers
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              Loading recommendations...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendations.map((provider, idx) => (
                <div key={idx} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  background: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: '600' }}>
                        {provider.name}
                      </h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        UPI Pattern: <code style={{ background: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                          {provider.upiPattern}
                        </code>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#059669', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        {provider.difficulty}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {provider.timeToSetup}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '0.9rem', fontWeight: '600' }}>
                      Benefits:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                      {provider.benefits.map((benefit, i) => (
                        <li key={i}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <a 
                    href={provider.setupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#0ea5e9',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    <ExternalLink size={14} />
                    Get Started
                    <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup Steps */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '700' }}>
            📋 Setup Process
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              'Choose a provider from above',
              'Download the business app',
              'Complete business KYC',
              'Get your merchant UPI ID',
              'Update in UniVerse dashboard'
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0ea5e9',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  {idx + 1}
                </div>
                <span style={{ color: '#374151', fontSize: '0.95rem' }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={onClose}
            style={{
              flex: 1,
              padding: '1rem',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Later
          </button>
          <button 
            onClick={() => {
              // Open first provider in new tab
              if (recommendations.length > 0) {
                window.open(recommendations[0].setupLink, '_blank');
              }
              onClose();
            }}
            style={{
              flex: 1,
              padding: '1rem',
              background: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpiSetupGuide;
