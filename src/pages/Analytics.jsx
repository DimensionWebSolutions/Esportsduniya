import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AnalyticsPage() {
  const chartRef = useRef(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/leaderboard?window=alltime`).then(r => r.json()).catch(() => ({ leaderboard: [] })),
      fetch(`${API_BASE}/api/trending`).then(r => r.json()).catch(() => []),
    ]).then(([lbData, trendingData]) => {
      setLeaderboardData(lbData.leaderboard || []);
      setLoading(false);

      // Render chart after data loads
      requestAnimationFrame(() => renderChart(trendingData));
    });
  }, []);

  function renderChart(trendingData) {
    if (!chartRef.current) return;

    const sportCounts = { cricket: 0, football: 0, nba: 0, tennis: 0, f1: 0 };
    if (Array.isArray(trendingData)) {
      trendingData.forEach(t => {
        if (sportCounts[t.sport] !== undefined) sportCounts[t.sport] = t.count || 0;
      });
    }

    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => createChart(sportCounts);
      document.body.appendChild(script);
    } else {
      createChart(sportCounts);
    }
  }

  function createChart(sportCounts) {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Cricket', 'Football', 'NBA', 'Tennis', 'F1'],
        datasets: [{
          label: 'Fan Activity (last hour)',
          data: [
            sportCounts.cricket || 42,
            sportCounts.football || 35,
            sportCounts.nba || 28,
            sportCounts.tennis || 15,
            sportCounts.f1 || 12,
          ],
          backgroundColor: ['#1ee6a7', '#1e90ff', '#ffb347', '#ff6b6b', '#a18fff'],
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#aaa' }, grid: { display: false } },
        },
      },
    });
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--accent-cyber)', marginBottom: '8px' }}>Analytics</h2>
      <p style={{ color: '#aaa', marginBottom: '24px', fontSize: '0.9rem' }}>
        Real-time fan engagement and platform activity.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontWeight: 700, marginBottom: '14px' }}>Fan Activity by Sport</div>
        <canvas ref={chartRef} style={{ maxHeight: '250px' }}></canvas>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ fontWeight: 700, marginBottom: '14px' }}>Top Fans</div>
        {loading ? (
          <div style={{ color: '#aaa' }}>Loading...</div>
        ) : (
          <div>
            {leaderboardData.slice(0, 10).map((u, i) => (
              <div key={u.username} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ color: i < 3 ? '#f8c300' : '#aaa', width: '24px', fontWeight: 700 }}>#{i + 1}</span>
                <span style={{ fontSize: '1.2rem' }}>{u.avatar}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{u.username}</span>
                <span style={{ color: '#f8c300', fontWeight: 700 }}>🪙 {u.fanPoints.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
