import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Intelligent Session Guard
 * After 5 minutes of inactivity, returns the user to the location portal (start screen).
 * Cart state remains preserved in localStorage.
 */
const SessionGuard = () => {
  const lastActiveTime = useRef(parseInt(localStorage.getItem('universe_last_active')) || Date.now());
  const location = useLocation();
  const navigate = useNavigate();
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const isAdminPathRef = useRef(false);
  isAdminPathRef.current = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/super-admin');

  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      lastActiveTime.current = now;
      localStorage.setItem('universe_last_active', now.toString());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastActiveTime.current;
        
        if (timeAway > IDLE_TIMEOUT && !isAdminPathRef.current) {
          console.log('[SessionGuard] 5 minutes inactivity reached. Returning to start.');
          localStorage.removeItem('universe_location_id');
          localStorage.removeItem('universe_location_name');
          localStorage.removeItem('universe_location_type');
          
          window.dispatchEvent(new Event('universe_clear_location'));
          navigate('/', { replace: true });
          updateActivity();
        } else {
          updateActivity();
        }
      } else {
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Initial check on mount in case they opened the tab after a long time
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [navigate]);

  // Update activity timestamp on route change
  useEffect(() => {
    const now = Date.now();
    lastActiveTime.current = now;
    localStorage.setItem('universe_last_active', now.toString());
  }, [location.pathname]);

  return null;
};

export default SessionGuard;
