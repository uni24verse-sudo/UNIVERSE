import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SessionGuard handles the 'Stale Tab' problem.
 * When a user returns to a tab after a long period of inactivity,
 * browsers often throttle the JS execution, leading to a 'hanging' state
 * where the UI is unresponsive or slow.
 * 
 * This component detects visibility changes and forces a clean refresh
 * if the user has been away for more than a threshold period (e.g., 20 mins).
 */
const SessionGuard = () => {
  const lastActiveTime = useRef(Date.now());
  const location = useLocation();
  const REFRESH_THRESHOLD = 20 * 60 * 1000; // 20 minutes in milliseconds

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastActiveTime.current;
        
        // If the user has been away for a long time, the JS state is likely stale
        // and browser throttling might have caused a large task queue to build up.
        // A hard reload is the smoothest way to recover a clean state.
        if (timeAway > REFRESH_THRESHOLD) {
          console.log(`[SessionGuard] Tab was inactive for ${Math.round(timeAway / 60000)} mins. Performing clean sync...`);
          
          // We use local storage to flag that we just did a smart refresh
          // so we can show a subtle indicator or splash if needed.
          localStorage.setItem('universe_last_sync', Date.now().toString());
          
          // Cleanly reload the page
          window.location.reload();
        } else {
          // Soft refresh: record activity
          lastActiveTime.current = Date.now();
        }
      } else {
        // Record the time when the user leaves the tab
        lastActiveTime.current = Date.now();
      }
    };

    const handleFocus = () => {
        // Also check on focus just in case visibilitychange didn't catch it
        if (Date.now() - lastActiveTime.current > REFRESH_THRESHOLD) {
            window.location.reload();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Update activity timestamp whenever the route changes
  useEffect(() => {
    lastActiveTime.current = Date.now();
  }, [location.pathname]);

  return null;
};

export default SessionGuard;
