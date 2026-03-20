import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const { token, vendor, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/vendor/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const storeRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/my-store', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStore(storeRes.data);

        // Fetch orders
        const ordersRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/orders/vendor-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(ordersRes.data);
      } catch (err) {
        if (err.response?.status === 404) {
          // Store not found, which is fine, they just need to create one.
          setStore(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, navigate]);

  useEffect(() => {
    if (store) {
      const newSocket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
      setSocket(newSocket);

      newSocket.emit('join_store_room', store._id);

      newSocket.on('new_order', (order) => {
        setOrders(prev => [order, ...prev]);
        // Play notification sound or show toast in a full app
      });

      return () => newSocket.close();
    }
  }, [store]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  if (loading) return <div className="auth-wrapper">Loading Dashboard...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Vendor Dashboard</h1>
          <p>Welcome back, {vendor?.name}!</p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto' }}>Logout</button>
      </header>

      {!store ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2>You don't have a store yet.</h2>
          <p style={{ marginBottom: '2rem' }}>Create your store to start receiving QR orders and managing products.</p>
          <Link to="/vendor/store/create" className="btn btn-primary" style={{ width: 'auto' }}>
            Create My Store
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Store Info Sidebar */}
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <h3>{store.name}</h3>
            <p style={{ marginBottom: '1rem' }}>Products available: {store.products.length}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/vendor/store/manage" className="btn btn-secondary">Manage Menu & QR Code</Link>
              <a href={`/store/${store._id}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
                View Public Menu
              </a>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
              <h4>Revenue Overview</h4>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                <div>
                  <p style={{ color: 'var(--secondary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    ₹{orders.filter(o => o.status === 'Completed' && new Date(o.createdAt).setHours(0,0,0,0) === new Date().setHours(0,0,0,0)).reduce((acc, current) => acc + current.totalAmount, 0)}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Today's Sales</p>
                </div>
                
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    ₹{orders.filter(o => o.status === 'Completed').reduce((acc, current) => acc + current.totalAmount, 0)}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Revenue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Feed */}
          <div className="glass-card">
            <h3>Live Orders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {orders.length === 0 ? (
                <p>No orders yet. They will appear here in real-time.</p>
              ) : (
                orders.map(order => (
                  <div key={order._id} style={{ padding: '1rem', background: 'rgba(15,23,42,0.5)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>Order #{order.orderNumber}</strong>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '99px', 
                        fontSize: '0.75rem',
                        background: order.status === 'Pending' ? '#f59e0b' : order.status === 'Confirmed' ? '#3b82f6' : order.status === 'Completed' ? '#10b981' : '#ef4444'
                      }}>
                        {order.status}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Payment: <strong>{order.paymentMethod}</strong> - Total: <strong>₹{order.totalAmount}</strong>
                    </p>
                    
                    <ul style={{ fontSize: '0.875rem', marginLeft: '1.5rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                      {order.items.map((item, idx) => (
                        <li key={idx}>{item.quantity}x {item.name}</li>
                      ))}
                    </ul>

                    {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {order.status === 'Pending' && (
                          <button onClick={() => updateOrderStatus(order._id, 'Confirmed')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}>
                            Accept Order
                          </button>
                        )}
                        {order.status === 'Confirmed' && (
                          <button onClick={() => updateOrderStatus(order._id, 'Completed')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}>
                            Mark Completed
                          </button>
                        )}
                        <button onClick={() => updateOrderStatus(order._id, 'Cancelled')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto', background: 'transparent', color: 'var(--error)' }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
