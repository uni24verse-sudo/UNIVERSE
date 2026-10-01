import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Navigation,
  Phone,
  CheckCircle2,
  MapPin,
  BatteryCharging,
  AlertCircle,
  PackageCheck,
  Clock,
  ArrowRight,
  Lock,
  ChevronDown,
  ChevronUp,
  QrCode,
  Camera,
  X
} from 'lucide-react';
import './RiderCockpit.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RiderCockpit = () => {
  const { id: tokenOrId } = useParams();

  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const wakeLockRef = useRef(null);
  const qrScannerRef = useRef(null);

  // 1. Screen Wake-Lock Management (Keeps phone screen on during navigation)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setIsWakeLocked(true);
          wakeLockRef.current.addEventListener('release', () => {
            setIsWakeLocked(false);
          });
        }
      } catch (err) {
        console.warn('Wake Lock request ignored or unsupported:', err.message);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Clean up QR scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        try {
          if (qrScannerRef.current.isScanning) {
            qrScannerRef.current.stop().catch(() => {});
          }
          qrScannerRef.current.clear().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  // 2. Fetch Trip Data + Local Offline Cache Fallback
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const cacheKey = `rider_trip_${tokenOrId}`;
        const cached = localStorage.getItem(cacheKey);

        const res = await axios.get(`${API_BASE}/api/delivery/cockpit/${tokenOrId}`);
        setTripData(res.data);
        localStorage.setItem(cacheKey, JSON.stringify(res.data));

        // Set active index to first incomplete stop
        if (res.data?.stops?.length > 0) {
          const firstIncomplete = res.data.stops.findIndex(s => s.status !== 'Completed');
          setActiveStopIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
        }
        setLoading(false);
      } catch (err) {
        // Fallback to offline cache if network failure
        const cached = localStorage.getItem(`rider_trip_${tokenOrId}`);
        if (cached) {
          try {
            setTripData(JSON.parse(cached));
            setLoading(false);
            return;
          } catch (e) {}
        }

        if (err.response?.status === 410) {
          setError('This delivery trip has ended and expired.');
        } else {
          setError(err.response?.data?.message || 'Could not load delivery trip.');
        }
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tokenOrId]);

  // Handle PIN input typing
  const handlePinChange = (index, value) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);
    setVerifyError('');

    if (char && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  // Submit Verification to backend
  const submitVerification = async (orderId, pin) => {
    if (!orderId || !pin) return;
    setVerifying(true);
    setVerifyError('');

    try {
      const res = await axios.post(`${API_BASE}/api/delivery/verify-stop`, {
        orderId,
        pin
      });

      if (res.data.success) {
        // Update local state
        const updatedStops = (tripData?.stops || []).map((s) =>
          String(s.id) === String(orderId)
            ? { ...s, status: 'Completed', deliveredAt: new Date().toISOString() }
            : s
        );

        const allDone = updatedStops.every(s => s.status === 'Completed');
        const nextIncomplete = updatedStops.findIndex(s => s.status !== 'Completed');

        setTripData(prev => ({
          ...prev,
          allCompleted: allDone,
          stops: updatedStops
        }));

        setPinDigits(['', '', '', '']);

        // Auto-advance to next stop or celebrate
        if (nextIncomplete !== -1) {
          setActiveStopIndex(nextIncomplete);
        }
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid PIN or QR. Please ask the customer again.');
    } finally {
      setVerifying(false);
    }
  };

  // Submit 4-digit manual PIN verification
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    const pin = pinDigits.join('');
    if (pin.length !== 4) {
      setVerifyError('Please enter the full 4-digit PIN given by the customer.');
      return;
    }

    const currentStop = tripData?.stops?.[activeStopIndex];
    if (!currentStop) return;

    await submitVerification(currentStop.id, pin);
  };

  // Camera QR Scanner start/stop
  const startScanner = async () => {
    setShowScanner(true);
    setScannerError('');
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('rider-qr-reader');
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            console.log('[Rider Scanner] Scanned text:', decodedText);
            handleScannedData(decodedText);
          },
          () => {
            // frame ignored
          }
        );
      } catch (err) {
        console.error('[Rider Scanner] Camera start error:', err);
        setScannerError('Could not open camera. Please ensure camera permissions are granted or use manual PIN.');
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      qrScannerRef.current = null;
    }
    setShowScanner(false);
    setScannerError('');
  };

  // Process scanned QR payload
  const handleScannedData = async (rawText) => {
    let targetOrderId = tripData?.stops?.[activeStopIndex]?.id;
    let targetPin = '';

    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object') {
        if (parsed.pin) targetPin = String(parsed.pin);
        if (parsed.orderId) {
          const stopMatch = tripData?.stops?.findIndex(
            s => String(s.id) === String(parsed.orderId) || String(s.orderNumber) === String(parsed.orderNumber)
          );
          if (stopMatch !== -1) {
            targetOrderId = tripData.stops[stopMatch].id;
            setActiveStopIndex(stopMatch);
          }
        }
      }
    } catch (e) {
      const cleanDigits = String(rawText || '').replace(/\D/g, '');
      if (cleanDigits.length === 4) {
        targetPin = cleanDigits;
      }
    }

    if (!targetPin || targetPin.length !== 4) {
      setScannerError('Scanned QR code does not contain a valid 4-digit PIN. Please scan the customer’s Delivery QR.');
      return;
    }

    // Stop camera and verify
    await stopScanner();
    await submitVerification(targetOrderId, targetPin);
  };

  if (loading) {
    return (
      <div className="rider-cockpit-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1.5s infinite linear' }}>🛵</div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Delivery Trip...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rider-cockpit-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <Lock size={42} color="#f97316" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Trip Inaccessible</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</p>
        </div>
      </div>
    );
  }

  const { store, stops = [], allCompleted } = tripData;
  const currentStop = stops[activeStopIndex] || stops[0];
  const isMultiStop = stops.length > 1;

  if (allCompleted) {
    return (
      <div className="rider-cockpit-container">
        <header className="rider-header">
          <div className="rider-brand">
            <div className="rider-brand-icon">🛵</div>
            <div>
              <h1 className="rider-brand-title">Trip Completed</h1>
              <p className="rider-brand-sub">{store?.name}</p>
            </div>
          </div>
        </header>

        <div className="rider-completed-card">
          <div className="rider-success-icon">🎉</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
            All Deliveries Completed!
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Great job! All {stops.length} order{stops.length > 1 ? 's' : ''} have been delivered successfully.
          </p>

          <div style={{ background: '#0f172a', borderRadius: '14px', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
            {stops.map((s, idx) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: idx < stops.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>#{s.orderNumber} • {s.customerName}</span>
                <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 700 }}>✅ Delivered</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Screen wake-lock has been released. This trip link will expire shortly for customer privacy.
          </p>
        </div>
      </div>
    );
  }

  // Construct Google Maps Turn-By-Turn Navigation Link
  const rawAddress = currentStop?.deliveryAddress || 'Campus';
  const coords = currentStop?.deliveryCoordinates || {};
  const lat = coords.lat || coords.latitude || currentStop?.deliveryLat;
  const lng = coords.lng || coords.longitude || currentStop?.deliveryLng;

  let mapsSearchUrl = '';
  if (lat && lng && Number(lat) !== 0 && Number(lng) !== 0) {
    mapsSearchUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else {
    const gpsMatch = rawAddress.match(/\[GPS:([-\d.]+),\s*([-\d.]+)\]/i);
    if (gpsMatch) {
      mapsSearchUrl = `https://www.google.com/maps/dir/?api=1&destination=${gpsMatch[1]},${gpsMatch[2]}`;
    } else {
      const cleanAddr = rawAddress.replace(/\s*\[GPS:[^\]]+\]/gi, '').replace(/\s*\|\|\s*GPS:[^$]+/gi, '').trim();
      mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddr || rawAddress)}`;
    }
  }

  const cleanAddress = rawAddress.replace(/\s*\[GPS:[^\]]+\]/gi, '').replace(/\s*\|\|\s*GPS:[^$]+/gi, '').trim();

  return (
    <div className="rider-cockpit-container">
      {/* Header */}
      <header className="rider-header">
        <div className="rider-brand">
          <div className="rider-brand-icon">🛵</div>
          <div>
            <h1 className="rider-brand-title">UniVerse Delivery</h1>
            <p className="rider-brand-sub">{store?.name || 'Stall'}</p>
          </div>
        </div>

        {isWakeLocked && (
          <div className="rider-wake-badge">
            <BatteryCharging size={13} />
            <span>Screen Awake</span>
          </div>
        )}
      </header>

      {/* Multi-Stop Carousel (If batch) */}
      {isMultiStop && (
        <div className="stops-progress-container">
          <div className="stops-progress-header">
            <span className="stops-progress-label">Stops in this Trip ({stops.length})</span>
            <span style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 600 }}>Tap stop to deliver</span>
          </div>

          <div className="stops-carousel">
            {stops.map((s, idx) => {
              const isCurrent = idx === activeStopIndex;
              const isDone = s.status === 'Completed';

              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStopIndex(idx)}
                  className={`stop-pill ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                >
                  <span>{isDone ? '✅' : `Stop ${idx + 1}:`}</span>
                  <span>{s.customerName?.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>#{s.orderNumber}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Delivery Stop Card */}
      <div className="rider-card">
        <div className="rider-card-header">
          <div className="rider-order-badge">
            <PackageCheck size={15} />
            <span>Order #{currentStop.orderNumber}</span>
          </div>
          <span className="rider-stall-name">
            {currentStop.status === 'Completed' ? '✅ Completed' : `Stop ${activeStopIndex + 1} of ${stops.length}`}
          </span>
        </div>

        {/* Drop Address Box (Structured Display) */}
        <div className="rider-address-section">
          <div className="rider-address-label">
            <MapPin size={13} />
            <span>Delivery Destination</span>
          </div>
          {currentStop.deliveryHouseNo ? (
            <div style={{ marginTop: '0.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                🏠 {currentStop.deliveryHouseNo}
              </div>
              <div style={{ fontSize: '0.92rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                📍 {currentStop.deliveryArea || cleanAddress}
              </div>
              {currentStop.deliveryLandmark && (
                <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700, marginTop: '0.25rem' }}>
                  🚩 Near {currentStop.deliveryLandmark}
                </div>
              )}
            </div>
          ) : (
            <h2 className="rider-address-text">
              {cleanAddress || 'Address not specified'}
            </h2>
          )}
          {currentStop.cookingInstructions && (
            <p style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.45rem', marginBottom: 0 }}>
              📝 Note: "{currentStop.cookingInstructions}"
            </p>
          )}
        </div>

        {/* Customer Details */}
        <div className="rider-customer-row">
          <div>
            <h3 className="rider-customer-name">{currentStop.customerName}</h3>
            <p className="rider-customer-phone">{currentStop.customerPhone}</p>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>
            ₹{currentStop.totalAmount}
          </span>
        </div>

        {/* Navigation & Call Buttons */}
        <div className="rider-action-grid">
          <a
            href={mapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rider-btn-nav"
          >
            <Navigation size={18} />
            <span>Google Maps</span>
          </a>

          <a
            href={`tel:${currentStop.customerPhone}`}
            className="rider-btn-call"
          >
            <Phone size={18} />
            <span>Call Customer</span>
          </a>
        </div>

        {/* Order Items Dropdown */}
        <div className="rider-items-card">
          <button
            onClick={() => setShowItems(!showItems)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            <span>Items to Deliver ({Array.isArray(currentStop.items) ? currentStop.items.reduce((s, i) => s + (i.quantity || 1), 0) : 0})</span>
            {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showItems && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {Array.isArray(currentStop.items) && currentStop.items.map((item, idx) => (
                <div key={idx} className="rider-item-row">
                  <span>{item.quantity || 1}x {item.name}</span>
                  <span>₹{(Number(item.price) || 0) * (item.quantity || 1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIN Verification / QR Handover */}
        {currentStop.status !== 'Completed' ? (
          <div className="rider-pin-box">
            <h4 className="rider-pin-title">Verify Handover</h4>
            <p className="rider-pin-sub">Scan customer QR or enter the 4-digit Delivery PIN</p>

            {/* Instant Camera QR Scanner Button */}
            <button
              type="button"
              onClick={startScanner}
              className="rider-btn-scan-qr"
            >
              <QrCode size={20} />
              <span>📷 Scan Customer QR Code</span>
            </button>

            <div className="rider-or-divider">
              <span>OR ENTER 4-DIGIT PIN</span>
            </div>

            <form onSubmit={handleVerifyPin}>
              <div className="pin-inputs-row">
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type="tel"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="pin-digit-input"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {verifyError && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
                  <AlertCircle size={14} />
                  <span>{verifyError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || pinDigits.some(d => !d)}
                className="rider-btn-verify"
              >
                {verifying ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Verify & Complete Stop</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '14px', padding: '1rem', textAlign: 'center', color: '#4ade80' }}>
            <CheckCircle2 size={24} style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>This Stop is Delivered!</div>
            <div style={{ fontSize: '0.78rem', color: '#86efac', marginTop: '0.2rem' }}>
              Delivered at {new Date(currentStop.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>

      {/* QR Camera Scanner Modal */}
      {showScanner && (
        <div className="rider-scanner-modal-backdrop">
          <div className="rider-scanner-modal">
            <div className="rider-scanner-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={20} color="#f97316" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  Scan Handover QR
                </h3>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="rider-scanner-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rider-scanner-viewport-wrapper">
              <div id="rider-qr-reader" style={{ width: '100%' }}></div>
              <div className="rider-scanner-target-box">
                <div className="scanner-target-corner top-left"></div>
                <div className="scanner-target-corner top-right"></div>
                <div className="scanner-target-corner bottom-left"></div>
                <div className="scanner-target-corner bottom-right"></div>
                <div className="scanner-laser-line"></div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '0.85rem 0 0 0' }}>
              Aim camera at customer's phone showing the Delivery Handover QR
            </p>

            {scannerError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.82rem', marginTop: '0.75rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                <AlertCircle size={14} />
                <span>{scannerError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderCockpit;
