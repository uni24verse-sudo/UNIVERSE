import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  UploadCloud, 
  FileText, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Store,
  Layers,
  Info,
  Image,
  Trash2,
  Loader2
} from 'lucide-react';

const VendorPromotionManager = ({ store }) => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [assetType, setAssetType] = useState('image'); // 'image' | 'text'
  const [rawAssetUrl, setRawAssetUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [tag, setTag] = useState('Featured Stall');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Flyer / Poster Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [useManualLink, setUseManualLink] = useState(false);

  // Early Removal Modal State
  const [removalModal, setRemovalModal] = useState(null); // banner item
  const [removalReason, setRemovalReason] = useState('Out of stock / discontinued this menu offer');
  const [removing, setRemoving] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const storeId = store?._id || store?.id;

  const fetchPromotions = async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/banners/vendor/${storeId}`, authConfig);
      setPromotions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch promotions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [storeId]);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!termsAccepted) {
      setErrorMessage('You must agree to the strictly non-refundable terms to book a promotion slot.');
      return;
    }

    if (assetType === 'image' && !rawAssetUrl.trim()) {
      setErrorMessage('Please provide an image link or poster URL.');
      return;
    }

    if (assetType === 'text' && !rawText.trim()) {
      setErrorMessage('Please enter the offer details or promotional text.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/api/banners/book-slot`, {
        stallId: storeId,
        storeName: store.name,
        locationHub: store.market || 'Lovely Professional University',
        locationId: store.locationId || '',
        rawAssetUrl: assetType === 'image' ? rawAssetUrl : '',
        rawText: assetType === 'text' ? rawText : '',
        tag,
        termsAccepted: true
      }, authConfig);

      setSuccessMessage(res.data.message || 'Promotion slot booked successfully!');
      setRawAssetUrl('');
      setImagePreview(null);
      setSelectedFileName('');
      setRawText('');
      setTermsAccepted(false);
      fetchPromotions();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to book slot. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    setSelectedFileName(file.name);
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_URL}/api/banners/upload-asset`, formData, {
        headers: {
          ...authConfig.headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.url) {
        setRawAssetUrl(res.data.url);
        setImagePreview(res.data.url);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setErrorMessage('Failed to upload image: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveUploadedImage = () => {
    setImagePreview(null);
    setSelectedFileName('');
    setRawAssetUrl('');
  };

  const handleRequestRemoval = async () => {
    if (!removalModal) return;
    try {
      setRemoving(true);
      await axios.post(`${API_URL}/api/banners/vendor/remove-request`, {
        bannerId: removalModal.id,
        reason: removalReason
      }, authConfig);

      setRemovalModal(null);
      fetchPromotions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove banner');
    } finally {
      setRemoving(false);
    }
  };

  const activeCount = promotions.filter(p => p.status === 'active' || p.status === 'pending_design').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
        border: '1px solid var(--surface-border)',
        borderRadius: '24px',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 65, 35, 0.12)', color: 'var(--primary)', padding: '0.35rem 0.85rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.75rem' }}>
            <Sparkles size={14} /> HERO CAROUSEL PROMOTIONS
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
            Promote {store?.name || 'Your Stall'}
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px' }}>
            Get your stall featured directly on the campus homepage Hero Carousel. Every student sees your dishes first with 1-click ordering!
          </p>
        </div>

        <div style={{ background: 'var(--surface-bg, rgba(255,255,255,0.05))', padding: '1.25rem 1.75rem', borderRadius: '18px', border: '1px solid var(--surface-border)', textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fixed Monthly Rate</span>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--primary)' }}>₹1,000 <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>/ 30 Days</span></div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>Active Slots: {activeCount} / 2 Allowed</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
        
        {/* LEFT COLUMN: Booking Form */}
        <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '800' }}>Book a 30-Day Hero Slot</h3>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Zero design effort required. Provide your existing flyer or offer text—our creative team handles the master formatting for you!
          </p>

          {errorMessage && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}

          {activeCount >= 2 && (
            <div style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#f59e0b", padding: "0.85rem 1rem", borderRadius: "14px", fontSize: "0.85rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Info size={18} />
              <span><strong>Slot Quota Reached:</strong> You have reached your maximum of 2 active promotion slots. To book another slot, wait until one finishes or request an early takedown below.</span>
            </div>
          )}
          <form onSubmit={handleSubmitBooking}>
            {/* Asset Type Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                How would you like to provide your promotion?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setAssetType('image')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: `2px solid ${assetType === 'image' ? 'var(--primary)' : 'var(--surface-border)'}`,
                    background: assetType === 'image' ? 'rgba(239, 65, 35, 0.08)' : 'transparent',
                    color: assetType === 'image' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <UploadCloud size={16} /> Upload Flyer / Poster
                </button>
                <button
                  type="button"
                  onClick={() => setAssetType('text')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: `2px solid ${assetType === 'text' ? 'var(--primary)' : 'var(--surface-border)'}`,
                    background: assetType === 'text' ? 'rgba(239, 65, 35, 0.08)' : 'transparent',
                    color: assetType === 'text' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FileText size={16} /> Write Offer Text
                </button>
              </div>
            </div>

            {/* Dynamic Input */}
            {assetType === 'image' ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Flyer / Poster Image
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseManualLink(!useManualLink)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                  >
                    {useManualLink ? '← Upload Image from Device' : 'Or paste direct link →'}
                  </button>
                </div>

                {!useManualLink ? (
                  <div>
                    {imagePreview ? (
                      <div style={{
                        borderRadius: '16px',
                        border: '1.5px solid #10b981',
                        padding: '1rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <img 
                          src={imagePreview} 
                          alt="Flyer Preview" 
                          style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }} 
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selectedFileName || 'Uploaded Flyer Image'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <CheckCircle2 size={13} /> {uploadingImage ? 'Uploading...' : 'Ready for 30-Day Hero Slot'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveUploadedImage}
                          disabled={uploadingImage}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            color: '#ef4444',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input 
                          type="file"
                          id="flyer-file-input"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                        <label
                          htmlFor="flyer-file-input"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px dashed var(--surface-border)',
                            borderRadius: '16px',
                            padding: '2rem 1.5rem',
                            background: 'var(--surface-bg, rgba(255,255,255,0.02))',
                            cursor: uploadingImage ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                          }}
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 size={32} className="spin" color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Uploading Flyer to Cloudinary...
                              </span>
                            </>
                          ) : (
                            <>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                background: 'rgba(239, 65, 35, 0.1)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '0.75rem'
                              }}>
                                <UploadCloud size={24} />
                              </div>
                              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Click to Browse Flyer / Poster from Device
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                PNG, JPG, WEBP accepted. Any size or orientation — design team re-scales it.
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input 
                      type="url" 
                      value={rawAssetUrl}
                      onChange={(e) => {
                        setRawAssetUrl(e.target.value);
                        setImagePreview(e.target.value);
                      }}
                      placeholder="https://... image link or hosted flyer"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'var(--input-bg, rgba(255,255,255,0.05))', color: 'inherit', fontWeight: '600' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.3rem' }}>
                      Paste a direct image link from Imgur, Cloudinary, or any hosted flyer.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Promotional Offer Text
                </label>
                <textarea 
                  rows={3}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="e.g. Buy 2 Paneer Kathi Rolls & Get Free Cold Coffee this week only!"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'var(--input-bg, rgba(255,255,255,0.05))', color: 'inherit', fontWeight: '600' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.3rem' }}>
                  Our team will craft a stunning food banner graphic featuring your exact offer.
                </span>
              </div>
            )}

            {/* Campaign Tag */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Banner Tag Badge
              </label>
              <select 
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'var(--input-bg, rgba(255,255,255,0.05))', color: 'inherit', fontWeight: '700' }}
              >
                <option value="Featured Stall">Featured Stall</option>
                <option value="Combo Special">Combo Special</option>
                <option value="Flat 20% Off">Flat 20% Off</option>
                <option value="Late Night Deal">Late Night Deal</option>
                <option value="New Arrival">New Arrival</option>
              </select>
            </div>

            {/* Strict Non-Refundable Agreement Checkbox */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px',
              padding: '1.25rem',
              marginBottom: '1.75rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', lineHeight: '1.4' }}>
                <input 
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary)' }}
                />
                <span>
                  I understand and agree that this 30-days promotional slot reservation is strictly non-refundable and non-creditable.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || activeCount >= 2}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '14px',
                border: 'none',
                background: termsAccepted && activeCount < 2 ? 'linear-gradient(135deg, var(--primary), #ff6b4a)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '900',
                fontSize: '1rem',
                cursor: termsAccepted && activeCount < 2 ? 'pointer' : 'not-allowed',
                boxShadow: termsAccepted && activeCount < 2 ? '0 4px 15px rgba(239, 65, 35, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {submitting ? 'Booking Slot...' : activeCount >= 2 ? 'Max 2 Slots Booked' : 'Pay ₹1,000 & Submit Promotion'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: My Active & Historical Promotions */}
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="var(--primary)" /> My Campaigns ({promotions.length})
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading campaigns...</div>
          ) : promotions.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
              <Sparkles size={40} color="var(--text-secondary)" style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800' }}>No Promotions Yet</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Book your first hero carousel slot to reach thousands of hungry students on campus today!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {promotions.map(promo => {
                const isActive = promo.status === 'active' && new Date(promo.endDate) > new Date();
                const isPending = promo.status === 'pending_design';
                const isRemoved = promo.status === 'removed_by_vendor';
                const daysLeft = isActive ? Math.max(0, Math.ceil((new Date(promo.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

                return (
                  <div 
                    key={promo.id}
                    className="glass-card"
                    style={{ 
                      borderRadius: '20px', 
                      overflow: 'hidden', 
                      border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : isPending ? 'rgba(245, 158, 11, 0.3)' : 'var(--surface-border)'}` 
                    }}
                  >
                    {/* Live Banner Preview if Active */}
                    {promo.bannerUrl && (
                      <div style={{
                        height: '110px',
                        backgroundImage: `url(${promo.bannerUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                        <span style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '12px',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: 'rgba(0,0,0,0.6)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px'
                        }}>
                          Live Carousel Slot #{promo.slotIndex}
                        </span>
                      </div>
                    )}

                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '100px', 
                            fontSize: '0.65rem', 
                            fontWeight: '800',
                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)',
                            color: isActive ? '#10b981' : isPending ? '#f59e0b' : 'var(--text-secondary)'
                          }}>
                            {isActive ? 'ACTIVE ON HERO SECTION' : isPending ? 'DESIGN IN PROGRESS' : isRemoved ? 'REMOVED BY YOU' : 'EXPIRED'}
                          </span>
                          <h4 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1rem', fontWeight: '800' }}>
                            {promo.title || promo.rawText || `${store.name} Hero Promotion`}
                          </h4>
                        </div>
                        <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.9rem' }}>₹1,000 Paid</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>
                          {isActive ? (
                            <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={13} /> {daysLeft} Days Remaining
                            </strong>
                          ) : isPending ? (
                            'Super Admin team is formatting banner'
                          ) : (
                            `Ended on ${new Date(promo.endDate || promo.updatedAt).toLocaleDateString()}`
                          )}
                        </span>
                        <span>Location: {promo.locationHub}</span>
                      </div>

                      {/* Action for Active Banners: Early Removal Request */}
                      {isActive && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setRemovalModal(promo)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              padding: '0.4rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Request Early Removal (No Refund)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EARLY REMOVAL CONFIRMATION MODAL */}
      {removalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--surface-bg, #1e293b)',
            border: '1px solid var(--surface-border)',
            borderRadius: '24px',
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} /> Request Early Removal
              </h3>
              <button onClick={() => setRemovalModal(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Taking down this banner will immediately unlist it from the live campus Hero Carousel.
            </p>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#ef4444' }}>
              As per agreed promotional terms, all slot reservations are strictly non-refundable and non-creditable upon cancellation.
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Reason for Early Takedown
              </label>
              <select
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--surface-border)', background: 'var(--input-bg, rgba(255,255,255,0.05))', color: 'inherit', fontWeight: '600' }}
              >
                <option value="Out of stock / discontinued this menu offer">Out of stock / discontinued this menu offer</option>
                <option value="Stall closed for holidays / maintenance">Stall closed for holidays / maintenance</option>
                <option value="Switching to a different promotion">Switching to a different promotion</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => setRemovalModal(null)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'inherit', fontWeight: '700', cursor: 'pointer' }}
              >
                Keep Active
              </button>
              <button 
                onClick={handleRequestRemoval}
                disabled={removing}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#ef4444', border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer' }}
              >
                {removing ? 'Removing...' : 'Confirm Immediate Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPromotionManager;
