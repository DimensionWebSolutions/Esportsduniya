import { useCallback, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import LegacyPageWrapper from './components/LegacyPageWrapper.jsx';
import AuthGate from './components/AuthGate.jsx';
import { createStandingsPage } from './pages/Standings.js';
import { createLeaderboard } from './pages/Leaderboard.js';
import { createTimeMachine } from './pages/TimeMachine.js';
import { createCrowdPulse, initCrowdPulse } from './pages/CrowdPulse.js';
import { createFifaPage } from './pages/FIFA.js';
import { trackPageView } from './services/analytics.js';

const MatchCommandCenter = lazy(() => import('./pages/MatchCommandCenter.jsx'));
const PredictionArena = lazy(() => import('./pages/PredictionArena.jsx'));
const ProfilePage = lazy(() => import('./pages/Profile.jsx'));
const AdminPanel = lazy(() => import('./pages/Admin.jsx'));
const AnalyticsPage = lazy(() => import('./pages/Analytics.jsx'));
const BlogIndex = lazy(() => import('./pages/BlogIndex.jsx'));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx'));

const PrivacyPolicy = lazy(() => import('./pages/LegalPages.jsx').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/LegalPages.jsx').then(m => ({ default: m.TermsOfService })));
const AboutPage = lazy(() => import('./pages/LegalPages.jsx').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/LegalPages.jsx').then(m => ({ default: m.ContactPage })));

const ForgotPasswordPage = lazy(() => import('./pages/AuthPages.jsx').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/AuthPages.jsx').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/AuthPages.jsx').then(m => ({ default: m.VerifyEmailPage })));

function LazyFallback() {
  return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading...</div>;
}

function AdminRoute() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  if (!storedUser?.isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-cyber)' }}>
        <h2>Access Denied</h2>
        <p>Admin access only.</p>
      </div>
    );
  }
  return <AdminPanel />;
}

function LoginOverlay({ onClose }) {
  const handleSuccess = () => {
    onClose();
    document.getElementById('esd-top-bar')?.remove();
    document.dispatchEvent(new CustomEvent('esd:login-success'));
  };

  return (
    <div
      id="esd-login-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8,8,18,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target.id === 'esd-login-overlay') onClose(); }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
        <button
          type="button"
          aria-label="Close login"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -36,
            right: 0,
            background: 'none',
            border: 'none',
            color: '#aaa',
            fontSize: '1.3rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
        <AuthGate onLoginSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default function App({ loginOpen, setLoginOpen }) {
  const location = useLocation();
  const openLogin = useCallback(() => setLoginOpen(true), [setLoginOpen]);
  const closeLogin = useCallback(() => setLoginOpen(false), [setLoginOpen]);

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  useEffect(() => {
    const refreshBar = () => {
      document.getElementById('esd-top-bar')?.remove();
    };
    document.addEventListener('esd:login-success', refreshBar);
    return () => document.removeEventListener('esd:login-success', refreshBar);
  }, []);

  return (
    <>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route element={<AppShell onLogin={openLogin} />}>
            <Route index element={<HomePage />} />
            <Route path="sport/:sport" element={<HomePage />} />
            <Route path="match/:id" element={<MatchCommandCenter />} />
            <Route path="arena" element={<PredictionArena />} />
            <Route path="standings" element={<LegacyPageWrapper mount={createStandingsPage} deps={[]} />} />
            <Route path="leaderboard" element={<LegacyPageWrapper mount={createLeaderboard} deps={[]} />} />
            <Route path="timemachine" element={<LegacyPageWrapper mount={createTimeMachine} deps={[]} />} />
            <Route
              path="crowdpulse"
              element={<LegacyPageWrapper mount={createCrowdPulse} init={initCrowdPulse} deps={[]} />}
            />
            <Route path="fifa" element={<LegacyPageWrapper mount={createFifaPage} deps={[]} />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="blog" element={<BlogIndex />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="terms" element={<TermsOfService />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
      {loginOpen && <LoginOverlay onClose={closeLogin} />}
    </>
  );
}
