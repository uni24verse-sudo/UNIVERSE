import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top instantly on every route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Instant is better for UX to avoid seeing the 'jump'
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
