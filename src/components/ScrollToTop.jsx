import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop component
 * Intelligently handles scroll resets based on navigation type.
 * - PUSH/REPLACE (Forward): Resets to (0, 0)
 * - POP (Back/Forward Button): Preserves existing scroll position
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Only scroll to top if we are NOT using the back/forward button (POP)
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, search, navigationType]);

  return null;
}
