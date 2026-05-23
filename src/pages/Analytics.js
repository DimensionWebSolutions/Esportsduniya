import { useEffect, useRef } from 'react';

// Simple chart using Chart.js (add via CDN)
export default function AnalyticsPage() {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = renderChart;
      document.body.appendChild(script);
    } else {
      renderChart();
    }
    function renderChart() {
      const ctx = chartRef.current.getContext('2d');
      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cricket', 'Football', 'NBA', 'Tennis', 'F1'],
          datasets: [{
            label: 'Live Viewers (k)',
            data: [320, 210, 180, 90, 60],
            backgroundColor: [
              '#1ee6a7', '#1e90ff', '#ffb347', '#ff6b6b', '#a18fff'
            ]
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }, []);

  return (
    <div className="analytics-container">
      <h2>Advanced Analytics</h2>
      <canvas ref={chartRef} width="340" height="220" style={{background:'#23233a',borderRadius:'12px',margin:'0 auto',display:'block'}}></canvas>
      <div className="analytics-desc">
        <b>AI Insights:</b> Cricket is currently the most watched sport, with over 320k live viewers. Football and NBA follow closely. Tennis and F1 have niche but dedicated audiences.
      </div>
    </div>
  );
}
