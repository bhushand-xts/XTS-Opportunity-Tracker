import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll on navigation (it's an SPA, not a full
// page load) — without this, going from a long page to a new one leaves the
// viewport wherever it was scrolled to on the previous page.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
