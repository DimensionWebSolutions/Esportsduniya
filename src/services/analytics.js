export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export function trackPageView(path, title) {
  if (typeof window.gtag === 'function' && window.__GA4_ID__) {
    window.gtag('config', window.__GA4_ID__, {
      page_path: path,
      page_title: title,
    });
  }
}

export const EVENTS = {
  SIGNUP: 'sign_up',
  LOGIN: 'login',
  VIEW_MATCH: 'view_match',
  LOCK_PREDICTION: 'lock_prediction',
  CHEER: 'cheer',
  SHARE_MOMENT: 'share_moment',
  CHECKOUT_START: 'begin_checkout',
  CHECKOUT_COMPLETE: 'purchase',
  VERIFY_EMAIL: 'verify_email',
};
