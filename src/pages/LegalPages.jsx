import { Link } from 'react-router-dom';
import { MarketingLayout } from '@/layouts/PageLayouts';

function LegalSection({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-accent">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <MarketingLayout title="Privacy Policy" description="Last updated: June 2026">
      <LegalSection title="What we collect">
        <p>Username, hashed password, optional email, avatar, sport preferences, predictions, FanPoints, and activity log. We store no real names, phone numbers, or payment card details (Stripe handles payments).</p>
      </LegalSection>
      <LegalSection title="How we use it">
        <p>To authenticate you, personalise your feed, power the Prediction Arena leaderboard, award FanPoints/badges, and send optional push notifications. We never sell your data.</p>
      </LegalSection>
      <LegalSection title="Third-party services">
        <p>CricAPI and API-Football for live scores, Google Gemini for AI narratives, Stripe for payments, Cloudflare for CDN, Render for hosting, MongoDB Atlas for storage.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Email: <strong className="text-foreground">privacy@esportsduniya.in</strong></p>
      </LegalSection>
    </MarketingLayout>
  );
}

export function TermsOfService() {
  return (
    <MarketingLayout title="Terms of Service" description="Last updated: June 2026">
      <LegalSection title="Acceptance">
        <p>By using Esportsduniya you agree to these terms.</p>
      </LegalSection>
      <LegalSection title="Service description">
        <p>Live sports scores, AI analysis, prediction games using virtual FanPoints (not real money), and community features.</p>
      </LegalSection>
      <LegalSection title="Disclaimer">
        <p>Scores, AI analysis, and predictions are provided as-is. Esportsduniya is not a gambling service — FanPoints have no monetary value.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Email: <strong className="text-foreground">legal@esportsduniya.in</strong></p>
      </LegalSection>
    </MarketingLayout>
  );
}

export function AboutPage() {
  return (
    <MarketingLayout title="About Esportsduniya" description="Live sports intelligence for fans worldwide.">
      <p>Esportsduniya delivers real-time scores, AI-powered match analysis, and skill-rated predictions across cricket, football, NBA, tennis, and F1.</p>
      <LegalSection title="Sports covered">
        <p>Cricket, Football, NBA, Tennis, and Formula 1 — with AI-estimated scores where dedicated APIs are unavailable.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Email: <strong className="text-foreground">hello@esportsduniya.in</strong></p>
      </LegalSection>
    </MarketingLayout>
  );
}

export function ContactPage() {
  return (
    <MarketingLayout title="Contact Us">
      <LegalSection title="General inquiries">
        <p><strong className="text-foreground">hello@esportsduniya.in</strong></p>
      </LegalSection>
      <LegalSection title="Privacy">
        <p><strong className="text-foreground">privacy@esportsduniya.in</strong></p>
      </LegalSection>
      <p className="mt-8"><Link to="/" className="text-accent hover:underline">← Back to home</Link></p>
    </MarketingLayout>
  );
}
