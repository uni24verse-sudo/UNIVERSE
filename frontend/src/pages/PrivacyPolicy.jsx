import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Eye, Lock, Share2, Database, Smartphone, Bell, Camera, Volume2 } from 'lucide-react';

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
            onClick={() => (window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/'))}
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
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Last Updated: April 10, 2026</p>
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
              This Privacy Policy describes how <b>UNIVERSE</b> and its affiliates (collectively "Universe, we, our, us") collect, use, share, protect or otherwise process your information/ personal data through our website <span style={{ color: 'var(--primary)' }}>https://food.universeorder.co.in</span> (including universeorder.co.in and uat.food.universeorder.co.in, hereinafter referred to as Platform) and our mobile applications including the <b>UniVerse Vendor</b> app (available on Google Play Store) used by merchant partners and their authorized staff.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              By visiting this Platform, using our mobile applications, providing your information or availing any product/service offered on the Platform, you expressly agree to be bound by the terms and conditions of this Privacy Policy and the Terms of Use. If you do not agree please do not use or access our Platform or mobile applications.
            </p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Eye size={20} color="var(--primary)" /> Collection
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                 We collect your personal data when you use our Platform, such as name, telephone/mobile number, email ID, login credentials, and device identifiers (push notification tokens).
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Lock size={20} color="var(--secondary)" /> Usage
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                We use personal data to provide the services you request, handle and fulfill orders, send real-time notifications, resolve disputes, and prevent fraud.
              </p>
            </div>
          </div>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>1. Sharing of Personal Data</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We may share your personal data with our affiliates and third-party service providers such as payment gateway partners (Razorpay) and cloud infrastructure providers. These disclosures are required for us to provide you access to our services, process payments, comply with legal obligations, and prevent fraudulent activities.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>2. Security Precautions</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            To protect your personal data from unauthorised access or disclosure, loss or misuse we adopt reasonable security practices and procedures. We adhere to our security guidelines to protect it against unauthorised access and offer the use of a secure server. All data transmitted between our mobile applications and servers is encrypted using industry-standard HTTPS/TLS protocols.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>3. Data Deletion and Retention</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You have an option to delete your account by visiting your profile and settings on our Platform. We retain your personal data information for a period no longer than is required for the purpose for which it was collected or as required under any applicable law. Upon account deletion, your personal data and associated device tokens will be permanently removed from our servers within 30 days.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>4. Your Rights</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You may access, rectify, and update your personal data directly through the functionalities provided on the Platform. You may also request the deletion of your data by contacting our Grievance Officer listed below.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>5. Consent</h2>
          <p style={{ marginBottom: '2.5rem' }}>
            By visiting our Platform, using our mobile applications, or by providing your information, you consent to the collection, use, storage, disclosure and otherwise processing of your information on the Platform in accordance with this Privacy Policy.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>6. Payment & Transaction Data</h2>
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              When you make a payment on the Platform, the following data is collected and processed:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Order details including items, quantities, total amount, order type (Dine In / Take Away), and store information.</li>
              <li>Customer name and phone number provided at checkout for order identification and system-wide tracking.</li>
              <li><strong>Privacy Protocol:</strong> Customer personal details (Name and Phone) are isolated from vendors and are never shared with or displayed on vendor-facing dashboards or alerts.</li>
              <li>Payment status and confirmation data for order fulfillment and dispute resolution.</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> store your card details, UPI PIN, or banking credentials. All payment processing is handled securely by Razorpay, our RBI-compliant payment gateway partner.
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
              <li>Transaction reference and audit logs for payment reconciliation and dispute resolution.</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              This data is retained for a minimum of 180 days for accounting and dispute resolution purposes.
            </p>
          </div>

          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>8. Merchant Partner Records</h2>
          <p style={{ marginBottom: '2.5rem' }}>
            For verified merchant partners operating on the Platform, business details required for order fulfillment and verified bank payout processing are securely maintained in accordance with applicable tax and financial regulations.
          </p>
          
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>9. Merchant Data Isolation</h2>
          <p style={{ marginBottom: '2.5rem' }}>
            <b>UNIVERSE</b> enforces strict data isolation between customers and vendors. To protect your privacy, we ensure that vendors only receive essential order data (items, order number, and order type) required for kitchen preparation. Personal identifiers including customer names, phone numbers, and payment details are strictly withheld from vendor dashboards, alerts, and merchant communications.
          </p>

          {/* NEW: Mobile Application Data Section */}
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>10. Mobile Application Data</h2>
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ marginBottom: '1.25rem' }}>
              When you use the <b>UniVerse Vendor</b> mobile application, the following additional data practices apply:
            </p>
            
            <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={18} color="var(--primary)" /> Push Notifications
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  We collect device push notification tokens (Expo Push Tokens) to deliver real-time order alerts to vendor staff. These tokens are stored on our servers and associated with your staff account. You may disable notifications at any time through your device settings, which will stop all push notifications from the app.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={18} color="var(--primary)" /> Camera Access
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  The app requests camera access solely for scanning order pickup QR codes during the handover process. No photos, videos, or other camera data are captured, stored, or transmitted to our servers.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Volume2 size={18} color="var(--primary)" /> Audio & Sound Alerts
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  The app uses audio playback capabilities for real-time order alert sounds in kitchen operations. The audio permission is used exclusively for playing notification sounds; no audio is recorded, stored, or transmitted.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={18} color="var(--primary)" /> On-Device Storage
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  The app stores user preferences (such as audio alert settings and authentication tokens) locally on your device. This data remains on your device and is not transmitted to our servers unless required for authentication.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={18} color="var(--primary)" /> Authentication Data
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  The app collects login credentials (email/phone and password) for employee authentication. Authentication tokens are stored securely on the device and our servers to maintain your login session. Passwords are encrypted and never stored in plain text.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              The UniVerse Vendor app does <strong style={{ color: 'var(--text-primary)' }}>not</strong> collect location data, contact lists, browsing history, or any data beyond what is described above.
            </p>
          </div>

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
