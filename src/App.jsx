import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout.jsx';
import HomePage from '@/pages/HomePage.jsx';
import { trackPageView } from '@/services/analytics.js';
import { registerServiceWorker, startReminderChecker } from '@/components/NotificationHelper.js';
import { Skeleton } from '@/ui/section';

const MatchCommandCenter = lazy(() => import('@/pages/MatchCommandCenter.jsx'));
const PredictionArena = lazy(() => import('@/pages/PredictionArena.jsx'));
const ProfilePage = lazy(() => import('@/pages/Profile.jsx'));
const AdminPanel = lazy(() => import('@/pages/Admin.jsx'));
const AnalyticsPage = lazy(() => import('@/pages/Analytics.jsx'));
const BlogIndex = lazy(() => import('@/pages/BlogIndex.jsx'));
const PricingPage = lazy(() => import('@/pages/PricingPage.jsx'));
const StandingsPage = lazy(() => import('@/pages/StandingsPage.jsx'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage.jsx'));
const CrowdPulsePage = lazy(() => import('@/pages/CrowdPulsePage.jsx'));
const TimeMachinePage = lazy(() => import('@/pages/TimeMachinePage.jsx'));
const FifaPage = lazy(() => import('@/pages/FifaPage.jsx'));
const TopicalHubPage = lazy(() => import('@/pages/TopicalHubPage.jsx'));

const PrivacyPolicy = lazy(() => import('@/pages/LegalPages.jsx').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('@/pages/LegalPages.jsx').then(m => ({ default: m.TermsOfService })));
const AboutPage = lazy(() => import('@/pages/LegalPages.jsx').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/pages/LegalPages.jsx').then(m => ({ default: m.ContactPage })));

const ForgotPasswordPage = lazy(() => import('@/pages/AuthPages.jsx').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/AuthPages.jsx').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/pages/AuthPages.jsx').then(m => ({ default: m.VerifyEmailPage })));

function PageLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function AdminRoute() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  if (!storedUser?.isAdmin) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-12 text-center">
        <h2 className="font-display text-xl font-semibold text-foreground">Access denied</h2>
        <p className="mt-2 text-muted">Admin access only.</p>
      </div>
    );
  }
  return <AdminPanel />;
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  useEffect(() => {
    registerServiceWorker();
    startReminderChecker();
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="sport/:sport" element={<HomePage />} />
          <Route path="match/:id" element={<MatchCommandCenter />} />
          <Route path="arena" element={<PredictionArena />} />
          <Route path="standings" element={<StandingsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="timemachine" element={<TimeMachinePage />} />
          <Route path="crowdpulse" element={<CrowdPulsePage />} />
          <Route path="fifa" element={<FifaPage />} />
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
          <Route path="cricket/ipl-2026" element={<TopicalHubPage hubKey="ipl-2026" />} />
          <Route path="football/premier-league" element={<TopicalHubPage hubKey="premier-league" />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
