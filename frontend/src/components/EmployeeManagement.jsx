import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Users, Plus, Edit2, Trash2, Shield, X, Save, AlertCircle } from 'lucide-react';

const EmployeeManagement = ({ storeId }) => {
  const { token } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (storeId && token) {
      fetchEmployees();
    }
  }, [storeId, token]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/employees/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (emp = null) => {
    setError('');
    if (emp) {
      setFormData({
        id: emp._id,
        name: emp.name,
        email: emp.email,
        password: '', // Leave blank for editing unless they want to change it
        status: emp.status || 'ACTIVE'
      });
    } else {
      setFormData({
        id: null,
        name: '',
        email: '',
        password: '',
        status: 'ACTIVE'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (formData.id) {
        // Update
        const payload = { name: formData.name, email: formData.email };
        if (formData.password) payload.password = formData.password;
        
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/employees/${storeId}/${formData.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create
        if (!formData.password) {
          setError('Password is required for new employees.');
          return;
        }
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/employees/${storeId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee.');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/employees/${storeId}/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmployees();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const revokeAccess = async (id) => {
    if (!window.confirm('Are you sure you want to revoke access for this employee? This will prevent them from logging into the mobile app.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/employees/${storeId}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmployees();
    } catch (err) {
      alert('Failed to revoke access');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading staff...</div>;

  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} /> Staff Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage staff accounts for the Vendor Mobile App (Coming Soon)
          </p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add Staff Member
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Email / Phone</th>
              <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Role</th>
              <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No staff members added yet.
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>{emp.name}</td>
                  <td style={{ padding: '1rem' }}>{emp.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: 'rgba(139, 92, 246, 0.1)', 
                      color: '#8b5cf6', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Shield size={12} /> STAFF
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: emp.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: emp.status === 'ACTIVE' ? '#10b981' : '#ef4444', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '800' 
                    }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => toggleStatus(emp._id, emp.status)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: emp.status === 'ACTIVE' ? '#f59e0b' : '#10b981', fontWeight: '600', fontSize: '0.85rem' }}>
                        {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openModal(emp)} style={{ padding: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => revokeAccess(emp._id)} style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', borderRadius: '24px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{formData.id ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--surface-border)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Email / Phone</label>
                <input 
                  type="text" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--surface-border)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {formData.id ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--surface-border)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
