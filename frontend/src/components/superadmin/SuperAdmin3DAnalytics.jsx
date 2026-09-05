import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  RotateCw,
  ShoppingBag,
  Store,
  DollarSign,
  BarChart3,
  PieChart as PieIcon,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Sliders,
  X,
  CheckCircle2,
  Activity,
  Building2,
  Briefcase,
  Layers,
  ChevronRight,
  Server,
  Users,
  Target,
  FileText
} from 'lucide-react';

const COLORS = ['#10b981', '#ef4123', '#3b82f6', '#f59e0b', '#8b5cf6'];

const SuperAdmin3DAnalytics = ({ token }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('hourly'); // 'hourly', 'finance', 'zones'
  const [timeframe, setTimeframe] = useState('weekly'); // 'today', 'weekly', 'all'
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [pitchSlide, setPitchSlide] = useState(1); // 1: Executive Overview, 2: Unit Economics, 3: Scale Simulator, 4: Technology Moat

  // Scalability Simulator state
  const [simulatedCampuses, setSimulatedCampuses] = useState(5);

  const socketRef = useRef(null);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${url}/api/super-admin/realtime-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalyticsData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_superadmin_room', { token });
    });

    const refreshData = () => fetchAnalytics(true);

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
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>Loading Financial Analytics...</h2>
        <p style={{ fontSize: '0.9rem' }}>Aggregating platform metrics from AWS RDS PostgreSQL...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', color: '#ef4444' }}>
        <p style={{ margin: 0, fontWeight: '700' }}>Could not load Analytics: {error || 'No data available'}</p>
        <button onClick={() => fetchAnalytics()} style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, hourlyVelocity, zoneTraffic, storeStats, financeDistribution, liveFeed } = analyticsData;

  // 100% Real database time-series data
  const chartHourlyData = (hourlyVelocity || []).map(h => ({
    timeLabel: h.hour,
    revenue: h.revenue,
    orders: h.orders
  }));

  const chartWeeklyData = (analyticsData.dailyVelocity7Days || []).map(d => ({
    timeLabel: d.timeLabel,
    revenue: d.revenue,
    orders: d.orders
  }));

  const chartMonthlyData = (analyticsData.monthlyVelocity30Days || []).map(m => ({
    timeLabel: m.timeLabel,
    revenue: m.revenue,
    orders: m.orders
  }));

  const activeChartData = timeframe === 'today' 
    ? chartHourlyData 
    : (timeframe === 'monthly' ? chartMonthlyData : chartWeeklyData);

  const pieFinancialData = [
    { name: 'Vendor Payouts (97%)', value: financeDistribution.vendorShare || 0, color: '#10b981' },
    { name: 'UniVerse Take (3%)', value: financeDistribution.platformCommission || 0, color: '#ef4123' },
    { name: 'Payment Gateway (~2%)', value: financeDistribution.pgGatewayFee || 0, color: '#3b82f6' }
  ];

  // Multi-campus simulator calculations
  const simStudents = simulatedCampuses * 32000;
  const simStores = simulatedCampuses * 18;
  const simDailyOrders = simulatedCampuses * 550;
  const simMonthlyGMV = simDailyOrders * 30 * 220;
  const simAnnualGMV = simMonthlyGMV * 12;
  const simAnnualProfit = Math.round(simAnnualGMV * 0.03 + (simAnnualGMV * 0.04 * 0.05));
  const simAnnualCloudSpend = Math.round((3390 + (simulatedCampuses - 1) * 600) * 12);
  const simGrossMargin = ((1 - simAnnualCloudSpend / simAnnualProfit) * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '2rem',
        background: '#ffffff',
        border: '1px solid var(--surface-border)',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live System Active
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• Connected to AWS RDS PostgreSQL</span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Real-Time Analytics & Financial Metrics
          </h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Live platform sales velocity, store performance, and institutional unit economics.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Pitch Deck Button */}
          <button
            onClick={() => { setPitchSlide(1); setShowPitchModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.8rem 1.4rem',
              background: '#0f172a',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
              transition: 'all 0.2s ease'
            }}
          >
            <Briefcase size={17} color="#38bdf8" /> Investor Pitch Deck
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics()}
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
            <RotateCw size={16} /> Sync Data
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total GMV */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Platform GMV
            </span>
            <DollarSign size={18} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: '0.25rem 0', color: 'var(--text-primary)' }}>
            ₹{metrics.totalRevenue.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
            +₹{metrics.todayRevenue.toLocaleString()} today
          </span>
        </div>

        {/* Processed Orders */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Processed Orders
            </span>
            <ShoppingBag size={18} color="#3b82f6" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: '0.25rem 0', color: 'var(--text-primary)' }}>
            {metrics.totalOrders}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {metrics.todayOrders} orders today • {metrics.activeOrders} active
          </span>
        </div>

        {/* Active Stores */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Onboarded Stores
            </span>
            <Store size={18} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: '0.25rem 0', color: 'var(--text-primary)' }}>
            {metrics.storeCount}
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '700' }}>
            {metrics.openStoresCount} currently open & operational
          </span>
        </div>

        {/* UniVerse Net Take */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              UniVerse Net Take (3%)
            </span>
            <TrendingUp size={18} color="#ef4123" />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: '0.25rem 0', color: '#ef4123' }}>
            ₹{metrics.totalProfit.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
            3% Take Rate + 4% Protection
          </span>
        </div>

      </div>

      {/* 3. Executive Unit Economics Pitch Callout */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid var(--surface-border)',
        padding: '1.5rem 2rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 65, 35, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} color="#ef4123" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              Institutional Pitch & Unit Economics Suite
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Financial models, <strong>₹0 Customer Acquisition Cost</strong>, and <strong>96.2% gross software margin</strong> on AWS.
            </p>
          </div>
        </div>

        <button
          onClick={() => { setPitchSlide(1); setShowPitchModal(true); }}
          style={{
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Open Presentation Mode <ArrowUpRight size={16} />
        </button>
      </div>

      {/* 4. Chart Views & Deep Analytics */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', padding: '2rem' }}>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[
              { id: 'hourly', label: 'Sales Velocity & Revenue Curve', icon: BarChart3 },
              { id: 'finance', label: 'Capital Flow & Payout Breakdown', icon: PieIcon },
              { id: 'zones', label: 'Campus Zones & Store Density', icon: MapPin }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          {activeTab === 'hourly' && (
            <div style={{ display: 'flex', background: 'var(--background)', borderRadius: '8px', padding: '3px', border: '1px solid var(--surface-border)' }}>
              {[
                { id: 'today', label: 'Today (Hourly)' },
                { id: 'weekly', label: 'Last 7 Days' },
                { id: 'monthly', label: 'Last 30 Days' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  style={{
                    padding: '4px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    background: timeframe === t.id ? '#ffffff' : 'transparent',
                    color: timeframe === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: timeframe === t.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: Sales Velocity Area Graph */}
        {activeTab === 'hourly' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Platform Sales Volume & GMV Run-Rate</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {timeframe === 'today' ? 'Hourly distribution of order transactions across campus dining periods.' : 'Daily consolidated revenue curve over the past week.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4123' }}></span> Gross Revenue (₹)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6' }}></span> Order Volume
                </div>
              </div>
            </div>

            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4123" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#ef4123" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [name === 'revenue' ? `₹${value.toLocaleString()}` : `${value} orders`, name === 'revenue' ? 'Gross GMV' : 'Volume']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#ef4123" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="revenue" />
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" name="orders" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 2: Financial Split Breakdown */}
        {activeTab === 'finance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieFinancialData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieFinancialData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>Vendor Payout Share (97%)</span>
                <h4 style={{ margin: '0.2rem 0', fontSize: '1.3rem', fontWeight: '900' }}>₹{financeDistribution.vendorShare.toLocaleString()}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Disbursed automatically to onboarded vendors on regular payout cycles.</p>
              </div>

              <div style={{ padding: '1.25rem', background: 'rgba(239, 65, 35, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 65, 35, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#ef4123', fontWeight: '800', textTransform: 'uppercase' }}>UniVerse Platform Revenue (3%)</span>
                <h4 style={{ margin: '0.2rem 0', fontSize: '1.3rem', fontWeight: '900', color: '#ef4123' }}>₹{financeDistribution.platformCommission.toLocaleString()}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pure software take rate with near-zero marginal server cost (₹0.07/order).</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Campus Zones */}
        {activeTab === 'zones' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {zoneTraffic.map(zone => (
              <div key={zone.locationId} style={{ padding: '1.5rem', background: 'var(--background)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>{zone.name}</h4>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: '#ffffff', border: '1px solid var(--surface-border)', fontWeight: '700' }}>
                    {zone.type}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Stores</span>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{zone.storeCount || 0}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total GMV</span>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>₹{zone.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 5. Store Sales Leaderboard */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>Store Sales Leaderboard</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Live ranking of merchant sales volume</p>
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
                borderRadius: '12px',
                background: 'var(--background)',
                border: '1px solid var(--surface-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: idx === 0 ? '#ef4123' : idx === 1 ? '#f59e0b' : idx === 2 ? '#10b981' : '#e2e8f0',
                  color: idx < 3 ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '0.8rem'
                }}>
                  #{idx + 1}
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>{s.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.market} • {s.productCount} Items</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', textAlign: 'right' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Orders</span>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>{s.totalOrders}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Revenue</span>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>
                    ₹{s.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
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

      {/* 6. Executive Investor Pitch Deck Modal (Slide-Based Presentation) */}
      {showPitchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/helmet-guy.png" alt="UNIVERSE" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)' }}>UNIVERSE</h2>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#0f172a', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>EXECUTIVE PITCH DECK</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Autonomous Campus Dining & Quick-Commerce Infrastructure</p>
                </div>
              </div>

              <button onClick={() => setShowPitchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            {/* Slide Navigation Tabs */}
            <div style={{ display: 'flex', background: 'var(--background)', padding: '4px', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
              {[
                { id: 1, label: '1. Market & Traction' },
                { id: 2, label: '2. Unit Economics' },
                { id: 3, label: '3. Multi-Campus ARR Model' },
                { id: 4, label: '4. Tech Architecture' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPitchSlide(tab.id)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '8px',
                    background: pitchSlide === tab.id ? '#ffffff' : 'transparent',
                    color: pitchSlide === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: pitchSlide === tab.id ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* SLIDE 1: Market & Traction */}
            {pitchSlide === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>The Campus Dining Bottleneck</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    During peak 12 PM - 2 PM and 8 PM - 10 PM rushes, university students face 20-30 minute queue lines. Traditional delivery aggregators fail inside gated colleges due to high delivery fees. UniVerse solves this with 100% digital QR pre-ordering and express counter pickups.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Active Campus Target</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '900' }}>35,000+</h4>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Students per campus</span>
                  </div>

                  <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Average Ticket Size</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '900' }}>₹220</h4>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600' }}>High order frequency</span>
                  </div>

                  <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Order Pickup Velocity</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '900' }}>&lt; 6 Mins</h4>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>70% queue reduction</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: Unit Economics */}
            {pitchSlide === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>Defensible Dual-Stream Revenue Model</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Zero fleet logistics overhead allows UniVerse to capture direct software margins without operational losses.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1.25rem', background: 'rgba(239, 65, 35, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 65, 35, 0.2)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4123', textTransform: 'uppercase', fontWeight: '800' }}>Core Take Rate</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.6rem', fontWeight: '900', color: '#ef4123' }}>3.0%</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Direct platform fee on completed merchant orders.</p>
                  </div>

                  <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', fontWeight: '800' }}>Server Cost / Order</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.6rem', fontWeight: '900', color: '#10b981' }}>₹0.07</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AWS RDS PostgreSQL + EC2 Graviton2 efficiency.</p>
                  </div>

                  <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: '800' }}>Acquisition Cost</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.6rem', fontWeight: '900', color: '#3b82f6' }}>₹0 CAC</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Organic physical table QR standees in mess halls.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3: Scale Simulator */}
            {pitchSlide === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>Multi-University ARR Expansion Simulator</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Drag the slider to project Annual Recurring Revenue (ARR) across Indian campuses.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0f172a', padding: '6px 14px', borderRadius: '10px', color: '#ffffff' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Campuses: <strong style={{ color: '#38bdf8' }}>{simulatedCampuses}</strong></span>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={simulatedCampuses}
                      onChange={(e) => setSimulatedCampuses(Number(e.target.value))}
                      style={{ accentColor: '#ef4123', cursor: 'pointer', width: '120px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1.25rem', background: '#0f172a', color: '#ffffff', borderRadius: '14px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Annual GMV Run-Rate</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '900', color: '#ffffff' }}>₹{(simAnnualGMV / 10000000).toFixed(2)} Cr</h4>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{simDailyOrders.toLocaleString()} daily orders</span>
                  </div>

                  <div style={{ padding: '1.25rem', background: '#0f172a', color: '#ffffff', borderRadius: '14px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Annual Platform Profit</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>₹{(simAnnualProfit / 100000).toFixed(1)} Lakhs</h4>
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>{simGrossMargin}% Gross Margin</span>
                  </div>

                  <div style={{ padding: '1.25rem', background: '#0f172a', color: '#ffffff', borderRadius: '14px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>AWS Cloud Infrastructure</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '900', color: '#cbd5e1' }}>₹{(simAnnualCloudSpend / 1000).toFixed(0)}k / yr</h4>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>High cost efficiency</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 4: Tech Moat */}
            {pitchSlide === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>The UniVerse Defensibility Moat</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    High switching barrier once student body and campus vendors are integrated into our ecosystem.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <ShieldCheck size={24} color="#10b981" />
                    <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1rem', fontWeight: '800' }}>Cryptographic QR Tokens</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Single-use SHA256 handover tokens eliminate order theft and verify pickup in milliseconds.
                    </p>
                  </div>

                  <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <Server size={24} color="#3b82f6" />
                    <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1rem', fontWeight: '800' }}>AWS Enterprise Stack</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Deployed on AWS RDS PostgreSQL + EC2 Graviton2 with SSL reverse proxy for high reliability.
                    </p>
                  </div>

                  <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <Zap size={24} color="#ef4123" />
                    <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1rem', fontWeight: '800' }}>Zero Hardware POS Cost</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Vendors manage orders and KOT printing directly from any standard Android smartphone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                CONFIDENTIAL & PROPRIETARY • UNIVERSE TECHNOLOGIES
              </span>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {pitchSlide > 1 && (
                  <button
                    onClick={() => setPitchSlide(pitchSlide - 1)}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                )}

                {pitchSlide < 4 ? (
                  <button
                    onClick={() => setPitchSlide(pitchSlide + 1)}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--primary)', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Next Slide <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPitchModal(false)}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#10b981', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Close Deck
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdmin3DAnalytics;
