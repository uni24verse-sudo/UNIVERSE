import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Activity,
  TrendingUp,
  RotateCw,
  ShoppingBag,
  Store,
  DollarSign,
  Layers,
  Sparkles,
  BarChart3,
  Globe,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowUpRight
} from 'lucide-react';

import ThreeDRevenuePillars from './ThreeDRevenuePillars';
import ThreeDCampusNetwork from './ThreeDCampusNetwork';
import ThreeDFinanceOrbit from './ThreeDFinanceOrbit';
import InvestorPitchDeckModal from './InvestorPitchDeckModal';

const SuperAdmin3DAnalytics = ({ token }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clean View Switcher
  const [activeTab, setActiveTab] = useState('pillars'); // 'pillars', 'campus', 'finance'
  const [activeMetric, setActiveMetric] = useState('revenue'); // 'revenue', 'orders', 'commission'
  const [autoRotate, setAutoRotate] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);

  const socketRef = useRef(null);

  const fetchRealtimeAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${url}/api/super-admin/realtime-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalyticsData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch realtime analytics:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeAnalytics();

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_superadmin_room', { token });
    });

    const refreshData = () => {
      fetchRealtimeAnalytics(true);
    };

    socket.on('superadmin:new_order', refreshData);
    socket.on('superadmin:order_update', refreshData);
    socket.on('superadmin:order_cancelled', refreshData);
    socket.on('order_status_update', refreshData);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
        <div className="pulse-container" style={{ margin: '0 auto 1.5rem auto' }}><div className="pulse-dot"></div></div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>Loading Business Analytics...</h2>
        <p style={{ fontSize: '0.9rem' }}>Fetching live transactions and store statistics from AWS...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', color: '#ef4444' }}>
        <p style={{ margin: 0, fontWeight: '700' }}>Could not load Analytics: {error || 'No data available'}</p>
        <button onClick={() => fetchRealtimeAnalytics()} style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
          Retry
        </button>
      </div>
    );
  }

  const { metrics, hourlyVelocity, zoneTraffic, storeStats, financeDistribution, liveFeed } = analyticsData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Header Bar with Clear Title & Pitch Mode Button */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '2rem',
        background: '#ffffff',
        border: '1px solid var(--surface-border)',
        borderRadius: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live System Active
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>• Auto-Updated via WebSockets</span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Real-Time Analytics & 3D Financial Stats
          </h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Interactive 3D representations of revenue flow, campus store distribution, and investor metrics.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Main Investor Pitch Deck Launch Button */}
          <button
            onClick={() => setShowPitchModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.8rem 1.4rem',
              background: 'linear-gradient(135deg, #ef4123 0%, #ea580c 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(239, 65, 35, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={18} /> 💼 Investor & Organization Pitch Deck
          </button>

          {/* Sync Button */}
          <button
            onClick={() => fetchRealtimeAnalytics()}
            style={{
              padding: '0.8rem 1.2rem',
              background: 'var(--background)',
              border: '1px solid var(--surface-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}
          >
            <RotateCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* 2. Clear, Professional Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem' }}>
        
        {/* Total GMV */}
        <div style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Platform GMV
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', margin: '0.5rem 0', color: 'var(--text-primary)' }}>
            ₹{metrics.totalRevenue.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={16} /> +₹{metrics.todayRevenue.toLocaleString()} today
          </span>
        </div>

        {/* Orders Processed */}
        <div style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Processed Orders
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', margin: '0.5rem 0', color: 'var(--text-primary)' }}>
            {metrics.totalOrders}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {metrics.todayOrders} orders placed today
          </span>
        </div>

        {/* Active Campus Stores */}
        <div style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Onboarded Campus Stores
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', margin: '0.5rem 0', color: 'var(--text-primary)' }}>
            {metrics.storeCount} Stores
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '700' }}>
            {metrics.openStoresCount} currently open & taking orders
          </span>
        </div>

        {/* Net Platform Take */}
        <div style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            UniVerse Net Take (3%)
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', margin: '0.5rem 0', color: '#ef4123' }}>
            ₹{metrics.totalProfit.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
            3% Commission + 4% Cancel Protection
          </span>
        </div>

      </div>

      {/* 3. High-Impact Institutional Unit Economics & Pitch Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Pitch & Presentation Mode
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0.3rem 0 0.4rem 0' }}>
            Showcase Financial Health & Scalability to Organizations
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', maxWidth: '750px' }}>
            Includes unit economics, zero customer acquisition cost, AWS cloud efficiency (₹0.07/order), and an interactive 3D scale simulator.
          </p>
        </div>

        <button
          onClick={() => setShowPitchModal(true)}
          style={{
            padding: '0.8rem 1.6rem',
            background: '#ffffff',
            color: '#0f172a',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
          }}
        >
          Open 3D Pitch Presentation <ArrowUpRight size={18} />
        </button>
      </div>

      {/* 4. Clean 3D Visualization Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[
            { id: 'pillars', label: '📊 3D Hourly Revenue Chart', desc: 'Real-time sales velocity' },
            { id: 'finance', label: '💰 3D Revenue & Payout Split', desc: '97% vendor vs 3% UniVerse' },
            { id: 'campus', label: '🗺️ 3D Campus Distribution', desc: 'Hostels & food court nodes' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.8rem 1.4rem',
                borderRadius: '12px',
                background: activeTab === t.id ? 'var(--primary)' : '#ffffff',
                color: activeTab === t.id ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Metric Selector for Pillars */}
        {activeTab === 'pillars' && (
          <div style={{ display: 'flex', background: 'var(--background)', borderRadius: '10px', padding: '4px', border: '1px solid var(--surface-border)' }}>
            {[
              { id: 'revenue', label: 'Revenue (₹)' },
              { id: 'orders', label: 'Order Volume' },
              { id: 'commission', label: 'Net Take (3%)' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeMetric === m.id ? 'var(--primary)' : 'transparent',
                  color: activeMetric === m.id ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. 3D Figure Render Container */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
        
        {activeTab === 'pillars' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                3D Hourly Revenue & Order Velocity
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing order distribution across campus peak hours. Drag mouse across the chart to rotate.
              </p>
            </div>
            <ThreeDRevenuePillars data={hourlyVelocity} metric={activeMetric} autoRotate={autoRotate} />
          </div>
        )}

        {activeTab === 'finance' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                3D Financial Split & Cash Flow Model
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Decomposing all Gross Merchandise Value into 97% Vendor Payouts and 3% Platform Commission.
              </p>
            </div>
            <ThreeDFinanceOrbit financeData={financeDistribution} autoRotate={autoRotate} />
          </div>
        )}

        {activeTab === 'campus' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                3D Campus Hubs & Store Distribution
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Spatial representation of stores across BH1 Hostel, Law Gate, Block 34, and Central Food Court.
              </p>
            </div>
            <ThreeDCampusNetwork zones={zoneTraffic} autoRotate={autoRotate} />
          </div>
        )}

      </div>

      {/* 6. Live Store Telemetry Table */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>Store Sales & Performance Leaderboard</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Breakdown by individual store revenue and orders</p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {metrics.openStoresCount} of {metrics.storeCount} Stores Open
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {storeStats.slice(0, 8).map((s, idx) => (
            <div
              key={s.storeId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                background: 'var(--background)',
                border: '1px solid var(--surface-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: idx === 0 ? '#ef4123' : idx === 1 ? '#f59e0b' : idx === 2 ? '#10b981' : '#e2e8f0',
                  color: idx < 3 ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '0.85rem'
                }}>
                  #{idx + 1}
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>{s.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📍 {s.market} • {s.productCount} Menu Items</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', textAlign: 'right' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Total Orders</span>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>{s.totalOrders}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Total Revenue</span>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>
                    ₹{s.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  background: s.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: s.isOpen ? '#10b981' : '#ef4444'
                }}>
                  {s.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Investor Pitch Deck Modal */}
      <InvestorPitchDeckModal
        isOpen={showPitchModal}
        onClose={() => setShowPitchModal(false)}
        analyticsData={analyticsData}
      />

    </div>
  );
};

export default SuperAdmin3DAnalytics;
