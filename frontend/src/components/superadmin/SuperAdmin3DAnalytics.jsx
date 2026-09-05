import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Activity,
  TrendingUp,
  Zap,
  Globe,
  RotateCw,
  Eye,
  ShoppingBag,
  Store,
  DollarSign,
  Clock,
  Layers,
  Sparkles,
  Flame,
  Radio,
  BarChart3,
  ChevronRight,
  Filter
} from 'lucide-react';

import ThreeDRevenuePillars from './ThreeDRevenuePillars';
import ThreeDCampusNetwork from './ThreeDCampusNetwork';
import ThreeDFinanceOrbit from './ThreeDFinanceOrbit';
import InvestorPitchDeckModal from './InvestorPitchDeckModal';

const SuperAdmin3DAnalytics = ({ token }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 3D Visualizer Controls
  const [active3DView, setActive3DView] = useState('all'); // 'all', 'pillars', 'campus', 'orbit'
  const [activeMetric, setActiveMetric] = useState('revenue'); // 'revenue', 'orders', 'commission', 'active'
  const [autoRotate3D, setAutoRotate3D] = useState(true);
  const [selectedZone, setSelectedZone] = useState('all');
  const [lastSocketEvent, setLastSocketEvent] = useState(null);
  const [livePulse, setLivePulse] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);

  const socketRef = useRef(null);

  // Fetch initial real-time analytics data
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
      console.error('Failed to fetch 3D realtime analytics:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeAnalytics();

    // Setup Real-Time WebSockets
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[3D Analytics] Connected to Live Socket:', socket.id);
      socket.emit('join_superadmin_room', { token });
    });

    const triggerLivePulse = (eventType, data) => {
      setLastSocketEvent({ type: eventType, data, time: new Date().toLocaleTimeString() });
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1200);
      // Fetch fresh data silently
      fetchRealtimeAnalytics(true);
    };

    socket.on('superadmin:new_order', (order) => {
      triggerLivePulse('NEW ORDER', order);
    });

    socket.on('superadmin:order_update', (order) => {
      triggerLivePulse('STATUS CHANGE', order);
    });

    socket.on('superadmin:order_cancelled', (order) => {
      triggerLivePulse('CANCELLED', order);
    });

    socket.on('order_status_update', (order) => {
      triggerLivePulse('HANDOVER', order);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className="pulse-container" style={{ margin: '0 auto 1.5rem auto' }}><div className="pulse-dot"></div></div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>Initializing 3D Spatial Visualizer Engine...</h2>
        <p style={{ fontSize: '0.95rem' }}>Synchronizing real-time telemetry from AWS RDS PostgreSQL and live Socket stream...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '16px', color: '#f87171' }}>
        <p style={{ margin: 0, fontWeight: '700' }}>Failed to load 3D Real-time Analytics: {error || 'No data returned'}</p>
        <button onClick={() => fetchRealtimeAnalytics()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, hourlyVelocity, zoneTraffic, storeStats, financeDistribution, liveFeed } = analyticsData;

  // Filter zone traffic if selected
  const filteredHourly = hourlyVelocity;
  const filteredStores = selectedZone === 'all' 
    ? storeStats 
    : storeStats.filter(s => s.market?.toLowerCase().includes(selectedZone.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Header & Live Telemetry Status Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1.5rem 2rem',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.8rem',
              background: livePulse ? 'rgba(239, 65, 35, 0.3)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${livePulse ? '#ef4123' : '#10b981'}`,
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: livePulse ? '#ef4123' : '#10b981',
              letterSpacing: '0.05em',
              transition: 'all 0.3s ease'
            }}>
              <Radio size={14} className={livePulse ? 'pulse-icon' : ''} />
              {livePulse ? 'LIVE EVENT STREAMING...' : 'REAL-TIME 3D FEED ACTIVE'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>• Auto-Synched with AWS RDS</span>
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Spatial 3D Command Deck
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
            Interactive WebGL 3D volumetric graphs, live campus spatial node mesh, and kinetic cash flow orbits.
          </p>
        </div>

        {/* Global 3D Interactive Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Executive Pitch Deck Mode Button */}
          <button
            onClick={() => setShowPitchModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.7rem 1.3rem',
              background: 'linear-gradient(135deg, #ef4123 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '0.85rem',
              boxShadow: '0 4px 15px rgba(239, 65, 35, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={16} /> 💼 Investor Pitch Mode
          </button>

          {/* Auto Rotate Button */}
          <button
            onClick={() => setAutoRotate3D(!autoRotate3D)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.7rem 1.1rem',
              background: autoRotate3D ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${autoRotate3D ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '12px',
              color: autoRotate3D ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              transition: 'all 0.2s ease'
            }}
          >
            <RotateCw size={16} /> {autoRotate3D ? '3D Rotation: ON' : '3D Rotation: PAUSED'}
          </button>

          {/* Metric Selector */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {[
              { id: 'revenue', label: 'GMV (₹)' },
              { id: 'orders', label: 'Volume' },
              { id: 'commission', label: 'Profit (3%)' },
              { id: 'active', label: 'In Queue' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                style={{
                  padding: '0.55rem 0.9rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeMetric === m.id ? '#ef4123' : 'transparent',
                  color: activeMetric === m.id ? '#ffffff' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchRealtimeAnalytics()}
            style={{
              padding: '0.7rem 1rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}
          >
            <Sparkles size={16} color="#f59e0b" /> Sync
          </button>
        </div>
      </div>

      {/* 1.5. Institutional Unit Economics & Pitch Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '20px',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#38bdf8" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#ffffff' }}>
              Institutional Pitch & Unit Economics Summary
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              High-margin campus dining infrastructure: <strong>3% Take Rate</strong> + <strong>4% Cancel Margin</strong> | AWS Cloud: <strong>₹3,390/mo</strong> (₹0.07/order)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPitchModal(true)}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          Present 3D Deck to Investors <ChevronRight size={16} />
        </button>
      </div>

      {/* 2. Real-Time High-Velocity Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        
        {/* Metric 1: Today's Realtime GMV */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's Gross GMV
            </span>
            <span style={{ padding: '4px 8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: '800' }}>
              LIVE
            </span>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
            ₹{metrics.todayRevenue.toLocaleString()}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
            <TrendingUp size={16} /> All-Time: ₹{metrics.totalRevenue.toLocaleString()}
          </div>
        </div>

        {/* Metric 2: Active Kitchen Queue Load */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live In-Prep Orders
            </span>
            <Flame size={18} color="#ef4123" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, color: '#ef4123' }}>
            {metrics.activeOrders}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            <span>{metrics.readyOrders} Ready at Counter</span> • <span>{metrics.completedOrders} Handed Over</span>
          </div>
        </div>

        {/* Metric 3: Orders Velocity (Orders/Hr) */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Hourly Velocity
            </span>
            <Zap size={18} color="#38bdf8" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, color: '#0284c7' }}>
            {metrics.ordersVelocityPerHour} <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>ord/hr</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            <span>Avg Ticket: ₹{metrics.todayAvgOrderValue || metrics.avgOrderValue}</span>
          </div>
        </div>

        {/* Metric 4: UniVerse Net Platform Commission */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Net Platform Profit
            </span>
            <DollarSign size={18} color="#8b5cf6" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, color: '#6366f1' }}>
            ₹{metrics.totalProfit.toLocaleString()}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
            <span>3% Take Rate + 4% Cancel Protection</span>
          </div>
        </div>

      </div>

      {/* 3. 3D Viewport Selector Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
        {[
          { id: 'all', label: '🌐 All 3D Figures Multi-Deck', icon: Layers },
          { id: 'pillars', label: '📊 3D Hourly Revenue Pillars', icon: BarChart3 },
          { id: 'campus', label: '🗺️ 3D Campus Spatial Network', icon: Globe },
          { id: 'orbit', label: '🪐 3D Financial Flow Orbit', icon: Radio }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive3DView(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.8rem 1.4rem',
              borderRadius: '12px',
              background: active3DView === tab.id ? 'var(--primary)' : '#ffffff',
              color: active3DView === tab.id ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid var(--surface-border)',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: active3DView === tab.id ? '0 4px 14px rgba(239, 65, 35, 0.25)' : 'none'
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Primary 3D Visualizer Canvases */}
      <div style={{ display: 'grid', gridTemplateColumns: active3DView === 'all' ? 'repeat(auto-fit, minmax(540px, 1fr))' : '1fr', gap: '2rem' }}>
        
        {/* Figure 1: 3D Revenue Pillars */}
        {(active3DView === 'all' || active3DView === 'pillars') && (
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid var(--surface-border)',
            padding: '1.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                  3D Kinetic Hourly & Store Pillars
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Volumetric heights dynamically scale by {activeMetric.toUpperCase()}. Drag to tilt and rotate.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ef4123', background: 'rgba(239, 65, 35, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                WebGL 60FPS
              </span>
            </div>

            <ThreeDRevenuePillars
              data={filteredHourly.length > 0 ? filteredHourly : filteredStores}
              metric={activeMetric}
              autoRotate={autoRotate3D}
            />
          </div>
        )}

        {/* Figure 2: 3D Spatial Campus Node Network */}
        {(active3DView === 'all' || active3DView === 'campus') && (
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid var(--surface-border)',
            padding: '1.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                  3D Spatial Campus Network & Delivery Routing
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Isometric campus zones connected by live order particle conduits. Hover to inspect.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                SPATIAL MESH
              </span>
            </div>

            <ThreeDCampusNetwork
              zones={zoneTraffic}
              autoRotate={autoRotate3D}
              onSelectZone={(zone) => setSelectedZone(zone.name)}
            />
          </div>
        )}

        {/* Figure 3: 3D Gyroscopic Finance Orbit */}
        {(active3DView === 'all' || active3DView === 'orbit') && (
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid var(--surface-border)',
            padding: '1.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                  3D Gyroscopic Financial Orbit & Capital Breakdown
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Multi-ring torus model decomposing Gross Merchandise Value into vendor payouts and net commission.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                TORUS ESCROW
              </span>
            </div>

            <ThreeDFinanceOrbit
              financeData={financeDistribution}
              autoRotate={autoRotate3D}
            />
          </div>
        )}

      </div>

      {/* 5. Live Store Real-Time Performance Grid & Live Order Telemetry Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* Store Performance Rankings */}
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>Live Store Telemetry & Queue Depth</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Real-time ranking of stores active on UniVerse</p>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {metrics.openStoresCount} / {metrics.storeCount} Stores Open
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredStores.slice(0, 7).map((s, idx) => (
              <div
                key={s.storeId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  background: 'var(--background)',
                  border: '1px solid var(--surface-border)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: idx === 0 ? '#ef4123' : idx === 1 ? '#f59e0b' : idx === 2 ? '#10b981' : 'rgba(0,0,0,0.06)',
                    color: idx < 3 ? '#ffffff' : 'var(--text-secondary)',
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📍 {s.market} • {s.productCount} Items</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'right' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Active Queue</span>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: s.activeQueue > 0 ? '#ef4123' : 'var(--text-secondary)' }}>
                      {s.activeQueue} In Kitchen
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Today Rev</span>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>
                      ₹{s.todayRevenue.toLocaleString()}
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

        {/* Live Holographic Activity Stream */}
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>Live Transaction Ticker</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Zero-latency incoming orders feed</p>
            </div>
            {lastSocketEvent && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '800' }}>
                ⚡ {lastSocketEvent.time}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {liveFeed.map((order) => (
              <div
                key={order.id}
                style={{
                  padding: '1rem',
                  borderRadius: '16px',
                  background: 'var(--background)',
                  border: '1px solid var(--surface-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      #{order.orderNumber}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      background: order.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : order.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 65, 35, 0.15)',
                      color: order.status === 'Completed' ? '#10b981' : order.status === 'Cancelled' ? '#ef4444' : '#ef4123'
                    }}>
                      {order.status}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {order.storeName} • {order.itemsCount} items
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                    ₹{order.totalAmount}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {order.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
