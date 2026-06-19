import { Link } from 'react-router-dom';

const STYLES = {
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: 'calc(var(--island-height, 60px) + 32px) 20px 80px',
    color: 'var(--text-primary, #e0e0e0)',
    lineHeight: 1.7,
    fontSize: '0.95rem',
  },
  h1: { fontSize: '1.8rem', marginBottom: 8 },
  h2: { fontSize: '1.2rem', marginTop: 32, marginBottom: 8, color: 'var(--accent-neon, #39ff14)' },
  updated: { fontSize: '0.8rem', color: 'var(--text-muted, #888)', marginBottom: 32 },
  backLink: { display: 'inline-block', marginBottom: 24, color: 'var(--accent-cyber, #1ee6a7)', textDecoration: 'none' },
};

export function PrivacyPolicy() {
  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>Privacy Policy</h1>
      <p style={STYLES.updated}>Last updated: June 2026</p>

      <h2 style={STYLES.h2}>What we collect</h2>
      <p>Username, hashed password, optional email, avatar, sport preferences, predictions, FanPoints, and activity log. We store no real names, phone numbers, or payment card details (Stripe handles payments).</p>

      <h2 style={STYLES.h2}>How we use it</h2>
      <p>To authenticate you, personalise your feed, power the Prediction Arena leaderboard, award FanPoints/badges, and send optional push notifications. We never sell your data.</p>

      <h2 style={STYLES.h2}>Third-party services</h2>
      <p>CricAPI and API-Football for live scores, Google Gemini for AI narratives (match context sent, no personal data), Stripe for payments, Cloudflare for CDN, Render for hosting, MongoDB Atlas for storage.</p>

      <h2 style={STYLES.h2}>Cookies & local storage</h2>
      <p>We use localStorage for your JWT session token and UI preferences (theme, onboarding). No third-party tracking cookies are set.</p>

      <h2 style={STYLES.h2}>Data retention</h2>
      <p>Account data kept while your account exists. Moment cards auto-expire after 24 hours. You may request deletion by contacting us.</p>

      <h2 style={STYLES.h2}>Your rights</h2>
      <p>You can request access to, correction of, or deletion of your data at any time by emailing <strong>privacy@esportsduniya.in</strong>.</p>

      <h2 style={STYLES.h2}>Contact</h2>
      <p>Email: <strong>privacy@esportsduniya.in</strong></p>
    </div>
  );
}

export function TermsOfService() {
  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>Terms of Service</h1>
      <p style={STYLES.updated}>Last updated: June 2026</p>

      <h2 style={STYLES.h2}>Acceptance</h2>
      <p>By using Esportsduniya you agree to these terms. If you disagree, please do not use the service.</p>

      <h2 style={STYLES.h2}>Service description</h2>
      <p>Esportsduniya provides live sports scores, AI-powered analysis, prediction games (using virtual FanPoints, not real money), and community features. Scores are sourced from third-party APIs and may be delayed or unavailable.</p>

      <h2 style={STYLES.h2}>Accounts</h2>
      <p>You are responsible for keeping your credentials secure. One account per person. Automated/bot accounts are prohibited.</p>

      <h2 style={STYLES.h2}>Fair play</h2>
      <p>Manipulating FanPoints, predictions, leaderboards, or exploiting bugs for unfair advantage will result in account suspension.</p>

      <h2 style={STYLES.h2}>Premium subscriptions</h2>
      <p>Premium is billed monthly via Stripe. You may cancel any time; access continues until the current billing period ends. Refunds are handled per Stripe's policies.</p>

      <h2 style={STYLES.h2}>Disclaimer</h2>
      <p>Scores, AI analysis, and predictions are provided "as is" with no guarantee of accuracy. Esportsduniya is not a gambling service — FanPoints have no monetary value.</p>

      <h2 style={STYLES.h2}>Liability</h2>
      <p>To the extent permitted by law, Esportsduniya's total liability is limited to the amount you've paid us in the past 12 months.</p>

      <h2 style={STYLES.h2}>Changes</h2>
      <p>We may update these terms. Continued use after changes constitutes acceptance.</p>

      <h2 style={STYLES.h2}>Contact</h2>
      <p>Email: <strong>legal@esportsduniya.in</strong></p>
    </div>
  );
}

export function AboutPage() {
  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>About Esportsduniya</h1>

      <p>Esportsduniya is the live sports cockpit — scores, AI analyst, crowd energy, and your predictions in one place.</p>

      <h2 style={STYLES.h2}>What makes us different</h2>
      <p>We merge real multi-sport APIs (CricAPI, API-Football) with an AI analyst layer (Google Gemini), community predictions with calibration scoring, and India-native sharing — all in a single Match Command Center view that no competitor offers.</p>

      <h2 style={STYLES.h2}>Sports covered</h2>
      <p>Cricket (IPL, ICC, bilateral), Football (Premier League, La Liga, Champions League), NBA, Tennis (Grand Slams), and Formula 1 — with AI-estimated scores for sports without dedicated APIs.</p>

      <h2 style={STYLES.h2}>Built for fans</h2>
      <p>Free-to-play skill competition (not pay-to-play fantasy). Oracle predictions, FanPoints, daily challenges, rivalry leaderboards, and a fan identity you're proud to share.</p>

      <h2 style={STYLES.h2}>Contact</h2>
      <p>Email: <strong>hello@esportsduniya.in</strong></p>
    </div>
  );
}

export function ContactPage() {
  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>Contact Us</h1>

      <h2 style={STYLES.h2}>General inquiries</h2>
      <p><strong>hello@esportsduniya.in</strong></p>

      <h2 style={STYLES.h2}>Privacy & data requests</h2>
      <p><strong>privacy@esportsduniya.in</strong></p>

      <h2 style={STYLES.h2}>Legal</h2>
      <p><strong>legal@esportsduniya.in</strong></p>

      <h2 style={STYLES.h2}>Bug reports & feedback</h2>
      <p><strong>feedback@esportsduniya.in</strong></p>

      <p style={{ marginTop: 32 }}>We typically respond within 48 hours.</p>
    </div>
  );
}
