import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  ShieldCheck,
  Zap,
  DollarSign,
  Users,
  Award,
  Download,
  Building2,
  Server,
  CheckCircle2,
  Sliders,
  Sparkles,
  ChevronRight,
  PieChart
} from 'lucide-react';
import ThreeDScaleSimulator from './ThreeDScaleSimulator';
import ThreeDFinanceOrbit from './ThreeDFinanceOrbit';

const InvestorPitchDeckModal = ({ isOpen, onClose, analyticsData }) => {
  const [campusCount, setCampusCount] = useState(5);
  const [pitchSlide, setPitchSlide] = useState(1); // 1: Executive Summary, 2: Unit Economics, 3: Multi-Campus Projections, 4: Moat & Tech Advantage

  if (!isOpen) return null;

  const { metrics = {}, financeDistribution = {} } = analyticsData || {};

  const currentGMV = metrics.totalRevenue || 128500;
  const currentStores = metrics.storeCount || 18;
  const currentOrders = metrics.totalOrders || 840;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.96)',
      backdropFilter: 'blur(25px)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 3rem',
      color: '#ffffff',
      overflowY: 'auto'
    }}>
      
      {/* Top Bar / Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/helmet-guy.png" alt="UNIVERSE" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                UNIVERSE
              </h2>
              <span style={{ fontSize: '0.7rem', fontWeight: '900', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 65, 35, 0.2)', color: '#ef4123', border: '1px solid #ef4123' }}>
                EXECUTIVE PITCH DECK
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Autonomous University Campus Food Logistics & QR Commerce Engine
            </p>
          </div>
        </div>

        {/* Slide Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {[
            { id: 1, label: '1. Executive Pulse' },
            { id: 2, label: '2. Unit Economics' },
            { id: 3, label: '3. 3D Growth Scale' },
            { id: 4, label: '4. Tech Moat & Architecture' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setPitchSlide(s.id)}
              style={{
                padding: '0.6rem 1.2rem',
                border: 'none',
                borderRadius: '8px',
                background: pitchSlide === s.id ? '#ef4123' : 'transparent',
                color: pitchSlide === s.id ? '#ffffff' : '#94a3b8',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.9rem'
          }}
        >
          <X size={18} /> Exit Pitch Mode
        </button>
      </div>

      {/* SLIDE 1: Executive Pulse & Platform Traction */}
      {pitchSlide === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ef4123', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Traction Snapshot</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.25rem 0 0.5rem 0' }}>Hyper-Local Campus Dining Network</h1>
            <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '850px', lineHeight: '1.6' }}>
              UniVerse solves the peak lunch & dinner rush bottleneck across 35,000+ campus students through autonomous digital pre-ordering, instant table QR ordering, and zero-latency queue handovers.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Gross Merchandise Volume</span>
              <h2 style={{ fontSize: '2.8rem', fontWeight: '900', margin: '0.5rem 0', color: '#ffffff' }}>₹{currentGMV.toLocaleString()}</h2>
              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>✓ 100% Processed via Razorpay</span>
            </div>

            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Active Onboarded Stores</span>
              <h2 style={{ fontSize: '2.8rem', fontWeight: '900', margin: '0.5rem 0', color: '#ffffff' }}>{currentStores} Stores</h2>
              <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>852+ Live Menu Items</span>
            </div>

            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Completed Transactions</span>
              <h2 style={{ fontSize: '2.8rem', fontWeight: '900', margin: '0.5rem 0', color: '#ffffff' }}>{currentOrders} Orders</h2>
              <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: '700' }}>0 Customer Acquisition Cost</span>
            </div>

            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Average Turnaround Time</span>
              <h2 style={{ fontSize: '2.8rem', fontWeight: '900', margin: '0.5rem 0', color: '#10b981' }}>&lt; 6.4 Mins</h2>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '700' }}>vs 22 min manual queueing</span>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE 2: Unit Economics & Cash Flow Flowchart */}
      {pitchSlide === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monetization Model</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.25rem 0 0.5rem 0' }}>Defensible Dual-Stream Unit Economics</h1>
            <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '850px' }}>
              Unlike generic aggregators with heavy delivery fleet losses, UniVerse captures high-margin take rates on zero-logistics campus food pickups.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#ef4123' }}>1. Core Take Rate (3% Platform Commission)</h3>
                  <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#ffffff' }}>3.0%</span>
                </div>
                <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Charged on every successfully fulfilled order after the 30-day merchant trial expires. Directly withheld prior to weekly vendor disbursement.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#f59e0b' }}>2. Cancellation Protection Margin (4% Penalty)</h3>
                  <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#ffffff' }}>4.0%</span>
                </div>
                <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Protects platform against wasted kitchen prep. When a confirmed order is cancelled, UniVerse collects a 4% operational fee.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>3. AWS Infrastructure Efficiency</h3>
                  <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#10b981' }}>₹0.07 / order</span>
                </div>
                <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Entire platform cloud cost is ₹3,390/mo ($40.80/mo) on AWS RDS PostgreSQL + EC2 Graviton2, resulting in a 96.2% gross software profit margin.
                </p>
              </div>
            </div>

            {/* 3D Orbit Embedding */}
            <div>
              <ThreeDFinanceOrbit financeData={financeDistribution} autoRotate={true} />
            </div>
          </div>
        </div>
      )}

      {/* SLIDE 3: Multi-Campus 3D Growth Scale Simulator */}
      {pitchSlide === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scale Simulator</span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.25rem 0 0.5rem 0' }}>Multi-University ARR Expansion Simulator</h1>
              <p style={{ fontSize: '1.1rem', color: '#94a3b8', margin: 0 }}>
                Slide the campus count slider below to simulate real-time ARR, GMV, and net profit expansion across 50 Indian university campuses.
              </p>
            </div>

            {/* Interactive Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(15, 23, 42, 0.9)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              <Sliders size={20} color="#38bdf8" />
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>Active Campuses: <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{campusCount}</strong></span>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={campusCount}
                  onChange={(e) => setCampusCount(Number(e.target.value))}
                  style={{ width: '200px', display: 'block', marginTop: '6px', accentColor: '#ef4123' }}
                />
              </div>
            </div>
          </div>

          <ThreeDScaleSimulator campusCount={campusCount} autoRotate={true} />
        </div>
      )}

      {/* SLIDE 4: Tech Moat & Enterprise Architecture */}
      {pitchSlide === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Proprietary Tech Moat</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.25rem 0 0.5rem 0' }}>The UniVerse Defensibility Matrix</h1>
            <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '850px' }}>
              Why legacy delivery apps cannot easily capture the campus dining vertical:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <ShieldCheck size={32} color="#10b981" />
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '1rem 0 0.5rem 0' }}>Cryptographic QR Handovers</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Every meal pickup generates a single-use SHA256 handover token with atomic lockouts, eliminating theft and fake handover claims in crowded mess halls.
              </p>
            </div>

            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <Server size={32} color="#38bdf8" />
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '1rem 0 0.5rem 0' }}>AWS Enterprise Stack</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Deployed on AWS RDS PostgreSQL + EC2 Graviton2 with Nginx SSL reverse proxy, handling thousands of concurrent lunch rush WebSocket orders.
              </p>
            </div>

            <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px' }}>
              <Zap size={32} color="#ef4123" />
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '1rem 0 0.5rem 0' }}>Zero Hardware Barrier</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Vendors require no proprietary POS terminals. Any student shopkeeper can accept orders, print KOT chits, and manage inventory directly from an Android smartphone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          CONFIDENTIAL & PROPRIETARY • UNIVERSE TECHNOLOGIES
        </span>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {pitchSlide > 1 && (
            <button
              onClick={() => setPitchSlide(pitchSlide - 1)}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff', cursor: 'pointer', fontWeight: '700' }}
            >
              Previous Slide
            </button>
          )}

          {pitchSlide < 4 ? (
            <button
              onClick={() => setPitchSlide(pitchSlide + 1)}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', background: '#ef4123', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Next Slide <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', background: '#10b981', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: '800' }}
            >
              Finish Presentation ✓
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default InvestorPitchDeckModal;
