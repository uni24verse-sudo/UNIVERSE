import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [vendor, setVendor] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // In a real app we'd verify the token or fetch user profile
      // But we have the vendor details stored in local storage usually
      const storedVendor = localStorage.getItem('vendor');
      if (storedVendor) {
        setVendor(JSON.parse(storedVendor));
      }
    }
    setLoading(false);
  }, [token]);

  const login = (jwtToken, vendorData) => {
    setToken(jwtToken);
    setVendor(vendorData);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('vendor', JSON.stringify(vendorData));
  };

  const updateVendor = (vendorData) => {
    setVendor(vendorData);
    localStorage.setItem('vendor', JSON.stringify(vendorData));
  };

  const logout = () => {
    setToken(null);
    setVendor(null);
    localStorage.removeItem('token');
    localStorage.removeItem('vendor');
  };

  return (
    <AuthContext.Provider value={{ vendor, token, login, logout, loading, updateVendor }}>
      {children}
    </AuthContext.Provider>
  );
};
