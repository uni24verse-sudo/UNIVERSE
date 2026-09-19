import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import VendorSessionExpiredModal from '../components/VendorSessionExpiredModal';

export const AuthContext = createContext();

const isTokenExpired = (jwtToken) => {
  if (!jwtToken) return false;
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Add 10-second buffer
    return Date.now() >= (payload.exp * 1000 - 10000);
  } catch (e) {
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [vendor, setVendor] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setVendor(null);
    localStorage.removeItem('token');
    localStorage.removeItem('vendor');
  }, []);

  const triggerSessionExpired = useCallback(() => {
    setIsSessionExpired(true);
  }, []);

  const handleLoginAgain = useCallback(() => {
    logout();
    setIsSessionExpired(false);
    window.location.href = '/vendor/login';
  }, [logout]);

  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        setIsSessionExpired(true);
      } else {
        const storedVendor = localStorage.getItem('vendor');
        if (storedVendor) {
          try {
            setVendor(JSON.parse(storedVendor));
          } catch (_) {}
        }
      }
    }
    setLoading(false);
  }, [token]);

  // Check expiration periodically and on window focus/wake
  useEffect(() => {
    const checkExpiry = () => {
      const currentToken = localStorage.getItem('token');
      if (currentToken && isTokenExpired(currentToken)) {
        setIsSessionExpired(true);
      }
    };

    const interval = setInterval(checkExpiry, 30000);
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    window.addEventListener('universe_session_expired', triggerSessionExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
      window.removeEventListener('universe_session_expired', triggerSessionExpired);
    };
  }, [triggerSessionExpired]);

  // Axios Response Interceptor for 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const msg = error?.response?.data?.message || '';
        const code = error?.response?.data?.code || '';
        const hasVendorToken = !!localStorage.getItem('token');

        if (hasVendorToken && (
          status === 401 || 
          code === 'TOKEN_EXPIRED' ||
          code === 'INVALID_TOKEN' ||
          (status === 400 && msg.toLowerCase().includes('token'))
        )) {
          console.warn('[AuthContext] Vendor session expired or unauthorized request detected.');
          setIsSessionExpired(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = (jwtToken, vendorData) => {
    setToken(jwtToken);
    setVendor(vendorData);
    setIsSessionExpired(false);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('vendor', JSON.stringify(vendorData));
  };

  const updateVendor = (vendorData) => {
    setVendor(vendorData);
    localStorage.setItem('vendor', JSON.stringify(vendorData));
  };

  return (
    <AuthContext.Provider value={{ 
      vendor, 
      token, 
      login, 
      logout, 
      loading, 
      updateVendor,
      isSessionExpired,
      triggerSessionExpired
    }}>
      {children}
      <VendorSessionExpiredModal 
        isOpen={isSessionExpired} 
        onLoginAgain={handleLoginAgain} 
      />
    </AuthContext.Provider>
  );
};

