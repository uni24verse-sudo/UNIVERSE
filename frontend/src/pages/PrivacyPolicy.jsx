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
      background: 'var(--background)',
      color: 'var(--text-primary)',
      padding: '4rem 1.5rem'
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
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-secondary)',
              padding: '0.6rem 1.25rem',
              borderRadius: '100px',
              cursor: 'pointer',
              marginBottom: '2rem',
              margin: '0 auto 2rem auto',
              fontWeight: '600',
              fontSize: '0.875rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
            onMouseLeave={(e) => { e.target.style.background = '#ffffff'; e.target.style.borderColor = 'var(--surface-border)'; e.target.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          
          <div style={{
            width: '72px',
            height: '72px',
            background: 'rgba(239, 65, 35, 0.08)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            border: '1px solid rgba(239, 65, 35, 0.15)'
          }}>
            <Shield size={36} color="var(--primary)" />
          </div>
          
          <h1 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Last Updated: April 2026</p>
        </div>

        {/* Content Card */}
        <div style={{
          background: '#ffffff',
          padding: '3.5rem',
          borderRadius: '32px',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
          lineHeight: '1.8',
          fontSize: '1.05rem',
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
            <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Eye size={20} color="var(--primary)" /> Collection
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                 We collect your personal data when you use our Platform, such as name, address, telephone/mobile number, email ID, and proof of identity.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Lock size={20} color="var(--secondary)" /> Usage
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                We use personal data to provide the services you request, handle and fulfill orders, resolve disputes, and prevent fraud.
              </p>
            </div>
          </div>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>1. Sharing of Personal Data</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We may share your personal data with our group entities, affiliates, and third parties such as sellers, business partners, and third-party service providers (logistics partners, payment issuers). These disclosures are required for us to provide you access to our services, comply with legal obligations, and prevent illegal activities.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>2. Security Precautions</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            To protect your personal data from unauthorised access or disclosure, loss or misuse we adopt reasonable security practices and procedures. We adhere to our security guidelines to protect it against unauthorised access and offer the use of a secure server.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>3. Data Deletion and Retention</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You have an option to delete your account by visiting your profile and settings on our Platform. We retain your personal data information for a period no longer than is required for the purpose for which it was collected or as required under any applicable law.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>4. Your Rights</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You may access, rectify, and update your personal data directly through the functionalities provided on the Platform.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>5. Consent</h2>
          <p style={{ marginBottom: '2.5rem' }}>
            By visiting our Platform or by providing your information, you consent to the collection, use, storage, disclosure and otherwise processing of your information on the Platform in accordance with this Privacy Policy.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>6. Payment & Transaction Data</h2>
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              When you make a payment on the Platform, the following data is collected and processed:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Transaction ID and payment reference numbers from our payment gateway partner (Razorpay).</li>
              <li>Order details including items, quantities, total amount, order type (Dine In / Take Away), and store information.</li>
              <li>Customer name and phone number provided at checkout for order identification and communication.</li>
              <li>Payment status and confirmation data for order fulfillment and dispute resolution.</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              We do <strong style={{ color: 'white' }}>not</strong> store your card details, UPI PIN, or banking credentials. All payment processing is handled securely by Razorpay, our RBI-compliant payment gateway partner.
            </p>
          </div>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>7. Refund & Cancellation Data</h2>
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              In case of order cancellations and refund requests, we process the following additional data:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Cancellation reason and initiator (vendor or customer).</li>
              <li>Refund amount and processing status.</li>
              <li>Communication records between customer and support team for refund processing.</li>
              <li>Vendor penalty records for vendor-initiated cancellations (4% deduction on cancelled order value).</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              This data is retained for a minimum of 180 days for accounting and dispute resolution purposes.
            </p>
          </div>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>8. Vendor Financial Data</h2>
          <p style={{ marginBottom: '2.5rem' }}>
            For vendors operating on the Platform, we collect and process additional financial data including UPI IDs for settlement, monthly revenue figures, commission calculations, gateway fees, cancellation penalties, and settlement history. This data is shared with our payment partners solely for the purpose of processing vendor payouts and is not disclosed to any third party.
          </p>

          <div style={{ 
            background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.05) 0%, rgba(252, 175, 23, 0.05) 100%)', 
            padding: '2.5rem', 
            borderRadius: '24px',
            border: '1px solid rgba(239, 65, 35, 0.1)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>Grievance Officer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>Designation:</strong> Grievance Officer</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Company:</strong> Universe</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Address:</strong> Lovely Professional University, Phagwara, Punjab, India</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Email:</strong> <span style={{ color: 'var(--primary)', fontWeight: '700' }}>uni24verse@gmail.com</span></p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Phone:</strong> <span style={{ color: 'var(--primary)', fontWeight: '700' }}>7985397373</span> / <span style={{ color: 'var(--primary)', fontWeight: '700' }}>8295886832</span></p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Hours:</strong> Mon - Fri (9:00 - 18:00)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
