import { Link } from 'react-router-dom';

const LIVE_LINKS = [
  { to: '/sport/cricket', label: 'Cricket Live Score' },
  { to: '/sport/football', label: 'Football Live Score' },
  { to: '/sport/nba', label: 'NBA Live Score' },
  { to: '/sport/tennis', label: 'Tennis Live Score' },
  { to: '/sport/f1', label: 'F1 Live Results' },
];

const FEATURE_LINKS = [
  { to: '/', label: 'Live Dashboard' },
  { to: '/timemachine', label: 'Time Machine' },
  { to: '/crowdpulse', label: 'Crowd Pulse' },
  { to: '/arena', label: 'Prediction Arena' },
  { to: '/cricket/ipl-2026', label: 'IPL 2026 Hub' },
  { to: '/football/premier-league', label: 'Premier League Hub' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/editorial-policy', label: 'Editorial Policy' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/blog', label: 'Sports News' },
  { to: '/pricing', label: 'Pro Plans' },
];

function Col({ title, links }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      <ul className="space-y-2">
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link to={to} className="inline-block py-1 text-sm text-muted transition-colors hover:text-accent">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-1 px-4 pb-24 pt-10 lg:px-8 lg:pb-10" role="contentinfo">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <p className="font-display text-lg font-bold text-foreground">⚡ Esportsduniya</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Live scores + AI match intelligence + fan predictions — not just a scoreboard.
          </p>
        </div>
        <Col title="Live Scores" links={LIVE_LINKS} />
        <Col title="Features" links={FEATURE_LINKS} />
        <Col title="Company" links={COMPANY_LINKS} />
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-center text-xs text-muted">
        © {new Date().getFullYear()} Esportsduniya. All rights reserved. Scores are for information only; predictions use virtual points and are not betting advice.
      </p>
    </footer>
  );
}
