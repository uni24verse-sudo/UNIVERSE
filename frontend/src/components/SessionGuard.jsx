import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Intelligent Session Guard
 * After 5 minutes of inactivity, returns the user to the location portal (start screen).
 * Cart state remains preserved in localStorage.
 */
const SessionGuard = () => {
  const lastActiveTime = useRef(Date.now());
  const location = useLocation();
  const navigate = useNavigate();
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const isAdminPathRef = useRef(false);
  isAdminPathRef.current = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/super-admin');

  useEffect(() => {
    // Fresh mount = active right now
    const now = Date.now();
    lastActiveTime.current = now;
    localStorage.setItem('universe_last_active', now.toString());

    let throttleTimer = null;
    const updateActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 2000); // Throttle writes to localStorage to at most once every 2 seconds

      const currentTime = Date.now();
      lastActiveTime.current = currentTime;
      localStorage.setItem('universe_last_active', currentTime.toString());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastActiveTime.current;
        
        if (timeAway > IDLE_TIMEOUT && !isAdminPathRef.current) {
          console.log('[SessionGuard] 5 minutes inactivity reached after returning to tab. Returning to start.');
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

    // User interaction events keep the session alive while actively browsing
    const interactionEvents = ['click', 'touchstart', 'scroll', 'keydown'];
    interactionEvents.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      interactionEvents.forEach(evt => window.removeEventListener(evt, updateActivity));
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
