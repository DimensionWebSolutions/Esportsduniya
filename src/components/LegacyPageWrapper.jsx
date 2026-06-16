import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Mount a legacy vanilla-JS page factory into a React route.
 */
export default function LegacyPageWrapper({ mount, init, deps = [] }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !mount) return;

    host.innerHTML = '';
    const page = mount(gsap);
    if (page) host.appendChild(page);

    if (init) {
      requestAnimationFrame(() => init(gsap));
    }

    return () => {
      if (window.__pageIntervals?.length) {
        window.__pageIntervals.forEach(clearInterval);
        window.__pageIntervals = [];
      }
      if (window.__dashboardIntervals?.length) {
        window.__dashboardIntervals.forEach(clearInterval);
        window.__dashboardIntervals = [];
      }
      host.innerHTML = '';
    };
  }, deps);

  return <div ref={hostRef} className="legacy-page-root page-enter" />;
}
