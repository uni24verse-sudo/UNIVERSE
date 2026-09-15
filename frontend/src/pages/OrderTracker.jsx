import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  PackageCheck, 
  ArrowLeft, 
  Home, 
  Receipt, 
  X, 
  Phone, 
  MessageCircle,
  Zap,
  Check,
  RotateCcw,
  Sparkles,
  Copy,
  AlertCircle,
  Send,
  Edit3
} from 'lucide-react';

const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(deadline).getTime() - Date.now());
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline && timeLeft <= 0) return null;
  if (deadline && timeLeft <= 0) return <span style={{ color: 'var(--error)' }}>Timer Expired...</span>;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: minutes === 0 && seconds < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
      color: minutes === 0 && seconds < 60 ? 'var(--error)' : 'var(--primary)',
      padding: '0.5rem 1rem',
      borderRadius: '12px',
      fontWeight: '800',
      fontSize: '1.25rem',
      marginTop: '1rem',
      border: `1px solid ${minutes === 0 && seconds < 60 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
    }}>
      <Clock size={20} /> 
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
};

const OrderTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefundCard, setShowRefundCard] = useState(true);

  // Direct UPI Refund Interaction States
  const [customUpi, setCustomUpi] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [copiedUtr, setCopiedUtr] = useState(false);

  useEffect(() => {
    const fetchOrder = async (retryCount = 0) => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${id}`);
        setOrder(res.data);
        setLoading(false);
      } catch (err) {
        if (err.response?.status === 404 && retryCount < 8) {
          console.log(`[OrderTracker] Order not found, retrying... (${retryCount + 1}/8)`);
          setTimeout(() => fetchOrder(retryCount + 1), 1000);
        } else {
          console.error(err);
          setLoading(false);
        }
      }
    };

    fetchOrder();

    const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
    socket.emit('join_order_room', id);

    socket.on('order_status_update', (updatedOrder) => {
      setOrder(prev => {
        if (prev && prev.status !== updatedOrder.status) {
          if (updatedOrder.status === 'Confirmed') {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
          } else if (updatedOrder.status === 'Completed') {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
          }
        }
        if (updatedOrder.refundStatus === 'Refunded' && prev?.refundStatus !== 'Refunded') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3').play().catch(() => {});
        }
        return updatedOrder;
      });
    });

    return () => socket.close();
  }, [id]);

  // Robust Wakeup Mechanism: Refetch data when returning from inactivity/sleep
  useEffect(() => {
    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        console.log('[OrderTracker] Device woke up, syncing fresh order data...');
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${id}`)
          .then(res => setOrder(res.data))
          .catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
    };
  }, [id]);

  // Handle Direct UPI Refund Request Submission
  const handleRequestRefund = async (upiToUse) => {
    const targetUpi = (upiToUse || customUpi || '').trim();
    if (!targetUpi) {
      setRefundError('Please enter a valid UPI ID (e.g. name@oksbi)');
      return;
    }
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(targetUpi)) {
      setRefundError('Invalid UPI format. Must contain @ (e.g. 9876543210@paytm)');
      return;
    }

    setIsSubmittingRefund(true);
    setRefundError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${id}/request-upi-refund`, {
        upiId: targetUpi
      });
      if (res.data?.success) {
        setOrder(prev => ({
          ...prev,
          customerUpiId: targetUpi,
          refundStatus: 'Requested'
        }));
        setShowCustomInput(false);
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || 'Failed to submit refund request. Please try again.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const copyUtrToClipboard = (utr) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const statusSteps = [
    { label: 'Pending', icon: Clock, color: '#f59e0b', desc: 'Vendor is reviewing your order' },
    { label: 'Confirmed', icon: ChefHat, color: '#3b82f6', desc: 'Great! Your order is being prepared' },
    { label: 'Ready', icon: PackageCheck, color: '#8b5cf6', desc: 'Order is ready for collection!' },
    { label: 'Completed', icon: CheckCircle2, color: '#10b981', desc: 'Order handed over successfully' }
  ];

  const currentStepIndex = order ? statusSteps.findIndex(s => s.label === order.status) : -1;

  if (loading) {
    return (
      <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '1.5rem' }}>
        <div className="pulse-circle" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--glass-bg)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={32} color="var(--primary)" className="spin" />
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Securing your order... Please wait</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Order Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>We couldn't find the order you're looking for.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }}>Back to Home</button>
      </div>
    );
  }

  // Derive target UPI and clean customer phone for auto-suggestions
  const rawPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);
  const originalPayerUpi = order.payerUpiId || null;
  const activeRefundUpi = order.customerUpiId || originalPayerUpi || '';
  const isRefunded = order.refundStatus === 'Refunded' || order.refundStatus === 'Processed';
  const isRequested = order.refundStatus === 'Requested';

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '600px', margin: '0 auto' }}>

      {/* ⚡ INTERACTIVE DIRECT UPI REFUND MODULE (For Cancelled Orders) */}
      {order.status === 'Cancelled' && showRefundCard && (
        <div style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '560px',
          zIndex: 9999,
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            background: '#ffffff',
            color: '#0f172a',
            border: isRefunded ? '1.5px solid #10b981' : isRequested ? '1.5px solid #f59e0b' : '1.5px solid #ef4444',
            borderRadius: '24px',
            padding: '1.4rem',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(0,0,0,0.06)',
            position: 'relative'
          }}>
            {/* Dismiss Button */}
            <button 
              onClick={() => setShowRefundCard(false)}
              style={{ 
                position: 'absolute', top: '0.85rem', right: '0.85rem', 
                background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', 
                width: '28px', height: '28px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
              }}
            >
              <X size={14} />
            </button>

            {/* STATE 1: REFUND SETTLED / COMPLETED */}
            {isRefunded ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>Refund Credited Successfully! 🎉</h3>
                    <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Transferred directly into your bank account via UPI</p>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', marginBottom: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Amount Credited:</span>
                    <span style={{ fontWeight: '900', fontSize: '1.25rem', color: '#059669' }}>₹{order.totalAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: order.refundUtr ? '0.5rem' : '0' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Transferred to UPI:</span>
                    <span style={{ fontWeight: '800', color: '#0f172a', wordBreak: 'break-all' }}>{activeRefundUpi || 'Your UPI Account'}</span>
                  </div>
                  {order.refundUtr && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Bank Ref / UTR:</span>
                      <button 
                        onClick={() => copyUtrToClipboard(order.refundUtr)}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                      >
                        {copiedUtr ? <Check size={12} color="#059669" /> : <Copy size={12} color="#64748b" />}
                        {order.refundUtr}
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '0.78rem', textAlign: 'center', color: '#475569', lineHeight: '1.4' }}>
                  Please check your UPI app (GPay / PhonePe / Paytm). The funds have been deposited directly into your bank account. ❤️
                </p>
              </div>
            ) : isRequested ? (
              /* STATE 2: REFUND REQUEST IN PROGRESS (QUEUED) */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                    <Zap size={22} className="spin" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>Refund in Progress ⚡</h3>
                    <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Admin team is transferring your money directly via UPI</p>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', marginBottom: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Refund Amount:</span>
                    <span style={{ fontWeight: '900', color: '#d97706', fontSize: '1.2rem' }}>₹{order.totalAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Destination UPI:</span>
                    <span style={{ fontWeight: '800', color: '#0f172a', wordBreak: 'break-all' }}>{activeRefundUpi}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>⏱️ Usually credited in 2–5 minutes</span>
                  <button 
                    onClick={() => setShowCustomInput(true)}
                    style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Edit3 size={12} /> Change UPI ID
                  </button>
                </div>
              </div>
            ) : (
              /* STATE 3: NEED UPI ID - CHOOSE OPTION 1 OR OPTION 2 */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>Instant Direct Refund</h3>
                    <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Order cancelled • ₹{order.totalAmount} will be refunded directly</p>
                  </div>
                </div>

                {/* OPTION 1: 1-TAP REFUND TO ORIGINAL PAYER UPI (If captured) */}
                {originalPayerUpi && !showCustomInput && (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>⚡ Refund Destination Account:</span>
                      <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>Verified Payment UPI</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{originalPayerUpi}</span>
                      <button 
                        onClick={() => {
                          setCustomUpi(originalPayerUpi);
                          setShowCustomInput(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Edit3 size={12} /> Change
                      </button>
                    </div>

                    <button 
                      onClick={() => handleRequestRefund(originalPayerUpi)}
                      disabled={isSubmittingRefund}
                      style={{
                        width: '100%', height: '46px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white', border: 'none', fontWeight: '800', fontSize: '0.92rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {isSubmittingRefund ? 'Submitting...' : `Get ₹${order.totalAmount} Refund on this UPI →`}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
                        ⚡ Direct credit to your bank account within 2–5 minutes
                      </span>
                    </div>
                  </div>
                )}

                {/* OPTION 2: ENTER CUSTOM UPI ID */}
                {(!originalPayerUpi || showCustomInput) && (
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#475569' }}>
                      Enter your UPI ID to receive ₹<strong style={{ color: '#059669' }}>{order.totalAmount}</strong> directly:
                    </p>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <input 
                        type="text"
                        placeholder="e.g. 9876543210@paytm or name@oksbi"
                        value={customUpi}
                        onChange={(e) => setCustomUpi(e.target.value)}
                        style={{
                          width: '100%', height: '44px', padding: '0 0.85rem', borderRadius: '12px',
                          background: '#ffffff', border: '1.5px solid #cbd5e1',
                          color: '#0f172a', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Quick Autofill Chips from student phone */}
                    {rawPhone.length === 10 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>Quick Auto-fill:</span>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {['paytm', 'ybl', 'oksbi', 'ibl'].map(bank => (
                            <button
                              key={bank}
                              type="button"
                              onClick={() => setCustomUpi(`${rawPhone}@${bank}`)}
                              style={{
                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                color: '#2563eb', borderRadius: '6px', padding: '0.2rem 0.5rem',
                                fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer'
                              }}
                            >
                              +{bank}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => handleRequestRefund()}
                      disabled={isSubmittingRefund || !customUpi.trim()}
                      style={{
                        width: '100%', height: '46px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white', border: 'none', fontWeight: '800', fontSize: '0.92rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                        opacity: (isSubmittingRefund || !customUpi.trim()) ? 0.6 : 1
                      }}
                    >
                      {isSubmittingRefund ? 'Sending...' : `Get ₹${order.totalAmount} Refund on this UPI →`}
                    </button>

                    {originalPayerUpi && (
                      <div style={{ textAlign: 'center', marginTop: '0.65rem' }}>
                        <button 
                          onClick={() => setShowCustomInput(false)}
                          style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          ← Back to original UPI ({originalPayerUpi})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {refundError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '10px', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} /> {refundError}
                  </div>
                )}
              </div>
            )}

            {/* Direct Phone Assistance Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
              <span style={{ color: '#64748b' }}>Need urgent help?</span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a href="tel:7985397373" style={{ color: '#059669', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={12} /> 7985397373
                </a>
                <a href="tel:8295886832" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={12} /> 8295886832
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        <button onClick={() => navigate('/')} style={{ background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
           <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Track Order</h1>
      </header>

      <div className="glass-card" style={{ padding: '2rem', borderRadius: '28px', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', borderRadius: '12px', fontWeight: '900', fontSize: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          Order #{order.orderNumber}
        </div>
        
        {/* Live Status Animation */}
        <div style={{ margin: '2rem 0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div className="pulse-circle" style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: 'rgba(99, 102, 241, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--primary)',
              border: '2px dashed var(--primary)'
            }}>
              {order.status === 'Completed' ? (
                 <CheckCircle2 size={48} color="#10b981" />
              ) : order.status === 'Cancelled' ? (
                 <X size={48} color="#ef4444" />
              ) : order.status === 'Payment Pending' ? (
                 <Clock size={48} color="#f59e0b" />
              ) : (
                 React.createElement(statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0].icon, { size: 48 })
              )}
            </div>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          {order.status === 'Payment Pending' ? 'Processing Payment...' : order.status}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: order.status === 'Pending' ? '1rem' : '3rem' }}>
          {order.status === 'Payment Pending' ? 'Your payment is being processed' :
           order.status === 'Cancelled' ? 'This order has been cancelled by the vendor' :
           statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0].desc}
        </p>

        {order.status === 'Pending' && order.acceptDeadline && (
          <div style={{ marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Auto-cancels if not accepted soon</p>
            <CountdownTimer deadline={order.acceptDeadline} />
          </div>
        )}

        {/* Handover QR Code Section */}
        {(order.status === 'Ready' || order.status === 'Completed') && order.handoverToken && (
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '24px', 
            marginBottom: '2rem',
            border: `2px solid ${order.status === 'Completed' ? 'var(--secondary)' : 'var(--primary)'}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: order.status === 'Completed' ? 'var(--secondary)' : 'var(--primary)',
              opacity: 0.8
            }}></div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {order.status === 'Completed' ? 'Handover Successful!' : 'Show this to Vendor'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {order.status === 'Completed' 
                ? 'Your order has been verified and handed over.' 
                : 'The vendor will scan this QR to verify your handover.'}
            </p>

            <div style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '16px', 
              display: 'inline-block',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              filter: order.status === 'Completed' ? 'grayscale(1) opacity(0.5)' : 'none'
            }}>
              <QRCodeSVG 
                value={JSON.stringify({ orderId: order._id, handoverToken: order.handoverToken })} 
                size={180} 
                level="H"
                includeMargin={true}
              />
            </div>
            
            {order.status === 'Completed' && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%) rotate(-15deg)',
                border: '4px solid var(--secondary)',
                color: 'var(--secondary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '1.5rem',
                fontWeight: '950',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                pointerEvents: 'none'
              }}>
                Verified
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        {order.status !== 'Payment Pending' && order.status !== 'Cancelled' && (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', padding: '0 1rem' }}>
             <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '2px', background: 'var(--surface-border)', zIndex: 0 }}></div>
             <div style={{ position: 'absolute', top: '24px', left: '10%', width: currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '40%' : '80%', height: '2px', background: 'var(--primary)', zIndex: 1, transition: 'width 1s ease' }}></div>
             
             {statusSteps.map((step, idx) => {
               const Icon = step.icon;
               const isCompleted = idx < currentStepIndex;
               const isActive = idx === currentStepIndex;
               
               return (
                 <div key={idx} style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '50%', 
                      background: isCompleted || isActive ? 'var(--primary)' : '#ffffff',
                      border: '2px solid',
                      borderColor: isCompleted || isActive ? 'var(--primary)' : 'var(--surface-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted || isActive ? 'white' : 'var(--text-secondary)',
                      boxShadow: isActive ? '0 0 20px rgba(239, 65, 35, 0.4)' : '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                      {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={20} />}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step.label}</span>
                 </div>
               );
             })}
          </div>
        )}

        {/* Payment Status */}
        <div style={{ 
          padding: '1rem', 
          borderRadius: '16px', 
          marginBottom: '2rem',
          background: order.paymentStatus === 'Confirmed' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
          border: `1px solid ${order.paymentStatus === 'Confirmed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
        }}>
          <p style={{ 
            fontWeight: '700', 
            margin: 0,
            color: order.paymentStatus === 'Confirmed' ? '#10b981' : '#f59e0b'
          }}>
            {order.paymentStatus === 'Confirmed' ? '✅ Payment Confirmed' : '⏳ Payment Processing'}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            {order.paymentStatus === 'Confirmed' 
              ? `₹${order.totalAmount} paid via Razorpay` 
              : 'Your payment is being verified...'}
          </p>
        </div>

        {/* Order Summary */}
        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--surface-border)', marginBottom: '2rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Receipt size={18} color="var(--primary)" />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Order Summary</h4>
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Store</span>
             <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{order.store?.name || 'Store'}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Order Type</span>
             <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{order.orderType}</span>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {order.items.map((item, idx) => (
               <div key={idx} style={{ borderBottom: idx === order.items.length - 1 ? 'none' : '1px solid var(--surface-border)', paddingBottom: idx === order.items.length - 1 ? 0 : '0.75rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                   <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>
                     {item.quantity}x {item.name} {item.variant && <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>({item.variant})</span>}
                     {item.isCombo && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: '800', marginLeft: '0.5rem', verticalAlign: 'middle' }}>COMBO</span>}
                   </span>
                   <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>₹{item.price * item.quantity}</span>
                 </div>
                 
                 {item.isCombo && (
                   <div style={{ marginTop: '0.4rem', paddingLeft: '1.25rem', borderLeft: '2px solid var(--surface-border)' }}>
                     {item.comboItems && item.comboItems.length > 0 && (
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                         {item.comboItems.map((ci, cidx) => (
                           <div key={cidx}>• {ci.quantity} {ci.name}</div>
                         ))}
                       </div>
                     )}
                     {item.freeItems && item.freeItems.length > 0 && (
                       <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem', fontWeight: '600' }}>
                         {item.freeItems.map((fi, fidx) => (
                           <div key={fidx}>+ Free {fi.quantity} {fi.name}</div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--surface-border)', fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
             <span>Total Paid</span>
             <span style={{ color: 'var(--secondary)' }}>₹{order.totalAmount}</span>
           </div>
        </div>

        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ height: '60px', borderRadius: '16px', width: '100%' }}>
           <Home size={20} /> Return to Home
        </button>
      </div>
    </div>
  );
};

export default OrderTracker;
