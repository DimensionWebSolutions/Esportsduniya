/* ============================================
   ESPORTSDUNIYA — Footer Component
   ============================================
   SEO-rich footer with internal links, structured
   text, and social/branding.
   ============================================ */

export function createFooter() {
    const footer = document.createElement('footer');
    footer.className = 'ed-footer';
    footer.setAttribute('role', 'contentinfo');

    footer.innerHTML = `
        <div class="ed-footer-inner">
            <div class="ed-footer-brand">
                <div class="ed-footer-logo">⚡ Esportsduniya</div>
                <p class="ed-footer-tagline">Your AI-powered sports universe. Real-time live scores, predictive analytics, and legendary sports moments — all in one place.</p>
            </div>

            <nav class="ed-footer-links" aria-label="Footer navigation">
                <div class="ed-footer-col">
                    <h3>Live Scores</h3>
                    <a href="#cricket">🏏 Cricket Live Score</a>
                    <a href="#football">⚽ Football Live Score</a>
                    <a href="#nba">🏀 NBA Live Score</a>
                    <a href="#tennis">🎾 Tennis Live Score</a>
                    <a href="#f1">🏎️ F1 Live Results</a>
                </div>
                <div class="ed-footer-col">
                    <h3>Features</h3>
                    <a href="#dashboard">📊 Live Dashboard</a>
                    <a href="#timemachine">⏳ Time Machine</a>
                    <a href="#crowdpulse">🌍 Crowd Pulse</a>
                </div>
                <div class="ed-footer-col">
                    <h3>Sports Coverage</h3>
                    <p class="ed-footer-text">IPL, Premier League, La Liga, Champions League, NBA Regular Season, ATP Tour, WTA, Grand Slams, Formula 1, ICC World Cup, and more.</p>
                </div>
            </nav>

            <div class="ed-footer-bottom">
                <p>&copy; ${new Date().getFullYear()} Esportsduniya. All rights reserved.</p>
                <p class="ed-footer-powered">Powered by AI — Scores updated every 60 seconds via internet search.</p>
            </div>
        </div>
    `;

    return footer;
}
