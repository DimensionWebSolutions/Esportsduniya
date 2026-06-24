import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, X } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

const FREE = ['Live scores (all sports)', 'AI Match Analyst', 'Oracle predictions', 'Daily challenges', 'Fan Zone cheers', 'Crowd Pulse'];
const PRO_ONLY = ['AI Radio commentary', 'Advanced momentum engine', 'Priority AI responses', 'Ad-free experience', 'Pro badges', 'Extended prediction history'];

function Feature({ ok, children }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <Check className="h-4 w-4 text-win shrink-0" /> : <X className="h-4 w-4 text-muted shrink-0" />}
      <span className={ok ? 'text-foreground' : 'text-muted'}>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();

  const checkout = async () => {
    if (!user?.username || !token) {
      document.dispatchEvent(new CustomEvent('esd:open-login'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/premium/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Helmet>
        <title>Pricing — Esportsduniya Pro</title>
      </Helmet>
      <header className="mb-8 border-b border-border pb-6 text-center">
        <h1 className="font-display text-3xl font-bold">Choose your plan</h1>
        <p className="mt-2 text-muted">Free forever, or go Pro for the ultimate sports intelligence experience.</p>
      </header>
        <div className="not-prose grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <p className="text-3xl font-bold">₹0</p>
              <p className="text-sm text-muted">Forever</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FREE.map(f => <Feature key={f} ok>{f}</Feature>)}
                {PRO_ONLY.map(f => <Feature key={f} ok={false}>{f}</Feature>)}
              </ul>
              <Button variant="secondary" className="mt-6 w-full" asChild>
                <Link to="/">Get started</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className={cn('border-accent/50 bg-accent/5 relative')}>
            <span className="absolute -top-3 right-4 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-surface-0">POPULAR</span>
            <CardHeader>
              <CardTitle className="text-accent">Pro</CardTitle>
              <p className="text-3xl font-bold">₹299<span className="text-base font-normal text-muted">/mo</span></p>
              <p className="text-sm text-muted">Cancel anytime</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FREE.map(f => <Feature key={f} ok>{f}</Feature>)}
                {PRO_ONLY.map(f => <Feature key={f} ok>{f}</Feature>)}
              </ul>
              <Button className="mt-6 w-full" onClick={checkout} disabled={loading || user?.isPremium}>
                {user?.isPremium ? 'Already Pro' : loading ? 'Redirecting...' : 'Upgrade to Pro'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <p className="mt-8 text-center text-xs text-muted">
          Payments via Stripe. <Link to="/terms" className="text-accent">Terms</Link> apply. FanPoints have no monetary value.
        </p>
    </div>
  );
}
