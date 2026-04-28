import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Banknote, Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const VendorFinance = ({ storeId }) => {
    const { token } = useContext(AuthContext);
    const [financeData, setFinanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        if (!storeId) return;
        const fetchFinance = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/finance/my-settlements/${storeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFinanceData(res.data);
            } catch (err) {
                console.error("Failed to load finance data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFinance();
    }, [storeId, token]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Settlements...</div>;
    }

    if (!financeData) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No finance data available.</div>;
    }

    const { settlements, availableBalance, nextSettlement, previousSettlement, isTrialActive } = financeData;

    const filteredSettlements = settlements.filter(s => {
        if (filterStatus === 'All') return true;
        return s.status.toLowerCase() === filterStatus.toLowerCase();
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: '#10b98144' };
            case 'pending': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: '#f59e0b44' };
            case 'failed': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: '#ef444444' };
            default: return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: '#94a3b844' };
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header / Top Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                    Active settlement schedule: <strong style={{ color: 'var(--text-primary)' }}>{isTrialActive ? 'Monthly' : 'Next Day'}</strong>
                </span>
            </div>

            {/* Overview Cards (Razorpay Style) */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)', padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '3rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                
                {/* Previous Settlement */}
                <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem', borderRadius: '8px', color: '#10b981' }}><CheckCircle2 size={16} /></div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Previous settlement</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        {previousSettlement ? `Deposited on ${new Date(previousSettlement.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No previous settlements'}
                    </p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                        ₹{previousSettlement ? previousSettlement.netPayable.toFixed(2) : '0.00'}
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>Amount breakup</p>
                </div>

                <div style={{ width: '1px', background: 'var(--surface-border)' }}></div>

                {/* Next Settlement */}
                <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem', borderRadius: '8px', color: '#3b82f6' }}><Clock size={16} /></div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Next settlement</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        {nextSettlement ? `Pending for period ending ${new Date(nextSettlement.periodEnd).toLocaleDateString()}` : 'No upcoming settlements'}
                    </p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                        ₹{nextSettlement ? nextSettlement.netPayable.toFixed(2) : '0.00'}
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Final amount may vary</p>
                </div>

                <div style={{ width: '1px', background: 'var(--surface-border)' }}></div>

                {/* Available Balance */}
                <div style={{ flex: '1 1 200px' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '1.5rem', borderBottom: '1px dashed var(--text-secondary)', display: 'inline-block', paddingBottom: '2px' }}>
                        Available balance
                    </h3>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                        <span style={{ fontSize: '1.5rem', verticalAlign: 'top', color: 'var(--text-secondary)', marginRight: '4px' }}>₹</span>
                        {availableBalance.toFixed(2)}
                    </h2>
                </div>
            </div>

            {/* Settlements Ledger */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '2px solid var(--text-primary)', display: 'inline-block', paddingBottom: '0.5rem' }}>Settlements</h2>
            
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                
                {/* Filters */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', gap: '1rem' }}>
                    {['All', 'Completed', 'Pending'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterStatus(tab)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: filterStatus === tab ? '800' : '600',
                                color: filterStatus === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                                borderBottom: filterStatus === tab ? '2px solid var(--primary)' : '2px solid transparent',
                                cursor: 'pointer'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 2fr 1fr 1fr', gap: '1rem', padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--surface-border)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    <div>Created on</div>
                    <div>Settlement ID</div>
                    <div>UTR Number</div>
                    <div style={{ textAlign: 'right' }}>Net settlement</div>
                    <div style={{ textAlign: 'center' }}>Status</div>
                </div>

                {/* Table Body */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredSettlements.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No settlements found.</div>
                    ) : (
                        filteredSettlements.map((s, idx) => {
                            const statusStyle = getStatusColor(s.status);
                            return (
                                <div key={s._id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 2fr 1fr 1fr', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: idx !== filteredSettlements.length - 1 ? '1px solid var(--surface-border)' : 'none', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-primary)', transition: 'background 0.2s ease', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <div>{new Date(s.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                    <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>setl_{s._id.substring(0, 10)}</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: '600', color: s.utrNumber ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                        {s.utrNumber || '—'}
                                    </div>
                                    <div style={{ textAlign: 'right', fontWeight: '800' }}>
                                        ₹{s.netPayable.toFixed(2)}
                                        <Info size={14} style={{ marginLeft: '6px', color: 'var(--text-secondary)', verticalAlign: 'middle', cursor: 'help' }} title={`Gross: ₹${s.totalRevenue}\nPlatform Fee: ₹${s.feesBreakdown.platformProfit}\nGateway Fee: ₹${s.feesBreakdown.gatewayFee}`} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <span style={{
                                            background: statusStyle.bg,
                                            color: statusStyle.text,
                                            border: `1px solid ${statusStyle.border}`,
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '100px',
                                            fontSize: '0.7rem',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            {s.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            {s.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorFinance;
