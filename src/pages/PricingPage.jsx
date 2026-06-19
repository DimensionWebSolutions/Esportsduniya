import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  const handleCheckout = async () => {
    if (!user?.username || !token) {
      document.dispatchEvent(new CustomEvent('esd:open-login'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/premium/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const S = {
    page: { maxWidth: 900, margin: '0 auto', padding: 'calc(var(--island-height, 60px) + 40px) 20px 80px', color: '#e0e0e0' },
    h1: { fontSize: '2rem', textAlign: 'center', marginBottom: 8 },
    sub: { textAlign: 'center', color: '#aaa', marginBottom: 40, fontSize: '1.05rem' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 },
    card: (pro) => ({
      background: pro ? 'linear-gradient(135deg, rgba(30,230,167,0.12), rgba(248,195,0,0.08))' : 'rgba(255,255,255,0.04)',
      border: pro ? '2px solid var(--accent-cyber, #1ee6a7)' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: 28, position: 'relative',
    }),
    badge: { position: 'absolute', top: -12, right: 20, background: 'var(--accent-cyber, #1ee6a7)', color: '#000', padding: '4px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 },
    price: { fontSize: '2.2rem', fontWeight: 700, marginBottom: 4 },
    period: { color: '#aaa', fontSize: '0.85rem', marginBottom: 20 },
    feature: { padding: '6px 0', fontSize: '0.9rem', display: 'flex', gap: 8 },
    btn: (pro) => ({
      width: '100%', padding: '14px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 20,
      background: pro ? 'var(--accent-cyber, #1ee6a7)' : 'rgba(255,255,255,0.1)',
      color: pro ? '#000' : '#ccc',
    }),
  };

  const freeFeatures = [
    '✅ Live scores (all sports)',
    '✅ AI Match Analyst',
    '✅ Oracle predictions (50 pts/match)',
    '✅ Daily challenges',
    '✅ Fan Zone cheers',
    '✅ Crowd Pulse map',
    '❌ AI Radio commentary',
    '❌ Advanced momentum engine',
    '❌ Priority AI responses',
    '❌ Ad-free experience',
  ];

  const proFeatures = [
    '✅ Everything in Free',
    '✅ AI Radio live commentary',
    '✅ Advanced momentum engine',
    '✅ Priority AI responses (no queue)',
    '✅ Ad-free experience',
    '✅ Exclusive Pro badges',
    '✅ Extended prediction history',
    '✅ Early access to new features',
  ];

  return (
    <div style={S.page}>
      <Helmet>
        <title>Pricing — Esportsduniya Pro</title>
        <meta name="description" content="Compare Free vs Pro plans on Esportsduniya. Get AI Radio, advanced momentum analysis, and an ad-free experience." />
      </Helmet>

      <h1 style={S.h1}>Choose Your Plan</h1>
      <p style={S.sub}>Free forever, or go Pro for the ultimate sports cockpit experience.</p>

      <div style={S.grid}>
        <div style={S.card(false)}>
          <div style={S.price}>Free</div>
          <div style={S.period}>Forever</div>
          {freeFeatures.map(f => <div key={f} style={S.feature}>{f}</div>)}
          <Link to="/" style={{ ...S.btn(false), display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Get Started
          </Link>
        </div>

        <div style={S.card(true)}>
          <div style={S.badge}>POPULAR</div>
          <div style={{ ...S.price, color: 'var(--accent-cyber, #1ee6a7)' }}>₹299<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mo</span></div>
          <div style={S.period}>Cancel anytime</div>
          {proFeatures.map(f => <div key={f} style={S.feature}>{f}</div>)}
          <button
            onClick={handleCheckout}
            disabled={loading || user?.isPremium}
            style={{ ...S.btn(true), opacity: loading ? 0.6 : 1 }}
          >
            {user?.isPremium ? 'Already Pro ✨' : loading ? 'Redirecting...' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
        <p>Payments processed securely via Stripe. <Link to="/terms" style={{ color: '#1ee6a7' }}>Terms</Link> apply.</p>
        <p>FanPoints are virtual and have no monetary value.</p>
      </div>
    </div>
  );
}
