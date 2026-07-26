// Live Crowd Pulse mock/real data
export const LIVE_CROWD_PULSE = [
    { name: 'Mumbai', x: 68, y: 42, fans: '2.3M', intensity: 95, emoji: '🇮🇳' },
    { name: 'London', x: 48, y: 22, fans: '1.8M', intensity: 78, emoji: '🇬🇧' },
    { name: 'Melbourne', x: 82, y: 72, fans: '1.1M', intensity: 65, emoji: '🇦🇺' },
    { name: 'New York', x: 25, y: 28, fans: '890K', intensity: 55, emoji: '🇺🇸' },
    { name: 'São Paulo', x: 30, y: 62, fans: '1.5M', intensity: 82, emoji: '🇧🇷' },
    { name: 'Tokyo', x: 82, y: 30, fans: '720K', intensity: 48, emoji: '🇯🇵' },
    { name: 'Dubai', x: 60, y: 38, fans: '550K', intensity: 60, emoji: '🇦🇪' },
    { name: 'Lagos', x: 50, y: 50, fans: '920K', intensity: 70, emoji: '🇳🇬' },
];
/* ============================================
   ESPORTSDUNIYA — Mock Data
   ============================================ */

export { SPORTS } from '../../lib/sports-registry.js';

export const LIVE_MATCHES = [
    {
        id: 1,
        sport: 'cricket',
        league: 'IPL 2026',
        status: 'live',
        teamA: { name: 'Mumbai Indians', flag: '🔵', score: '186/4', detail: '18.2 ov' },
        teamB: { name: 'Chennai Super Kings', flag: '🟡', score: '142/3', detail: '15.0 ov' },
        momentum: 72,
        venue: 'Wankhede Stadium, Mumbai',
    },
    {
        id: 2,
        sport: 'football',
        league: 'Premier League',
        status: 'live',
        teamA: { name: 'Arsenal', flag: '🔴', score: '2', detail: '' },
        teamB: { name: 'Manchester City', flag: '🩵', score: '1', detail: '' },
        momentum: 64,
        venue: 'Emirates Stadium, London',
        minute: "67'",
    },
    {
        id: 3,
        sport: 'nba',
        league: 'NBA Regular Season',
        status: 'live',
        teamA: { name: 'LA Lakers', flag: '💜', score: '98', detail: '' },
        teamB: { name: 'Golden State Warriors', flag: '💛', score: '102', detail: '' },
        momentum: 42,
        venue: 'Chase Center, San Francisco',
        minute: 'Q3 4:22',
    },
    {
        id: 4,
        sport: 'tennis',
        league: 'Australian Open',
        status: 'live',
        teamA: { name: 'C. Alcaraz', flag: '🇪🇸', score: '6-4, 3-5', detail: '' },
        teamB: { name: 'J. Sinner', flag: '🇮🇹', score: '4-6, 5-3', detail: '' },
        momentum: 55,
        venue: 'Rod Laver Arena, Melbourne',
    },
    {
        id: 5,
        sport: 'cricket',
        league: 'ICC Test Championship',
        status: 'live',
        teamA: { name: 'India', flag: '🇮🇳', score: '312/6', detail: '82.4 ov' },
        teamB: { name: 'Australia', flag: '🇦🇺', score: '287', detail: '' },
        momentum: 68,
        venue: 'MCG, Melbourne',
    },
    {
        id: 6,
        sport: 'football',
        league: 'UEFA Champions League',
        status: 'upcoming',
        teamA: { name: 'Real Madrid', flag: '⚪', score: '-', detail: '' },
        teamB: { name: 'Bayern Munich', flag: '🔴', score: '-', detail: '' },
        momentum: 50,
        venue: 'Santiago Bernabéu, Madrid',
        kickoff: '21:00 CET',
    },
    {
        id: 7,
        sport: 'f1',
        league: 'F1 2026',
        status: 'live',
        teamA: { name: 'Max Verstappen', flag: '🇳🇱', score: 'P1', detail: 'Lap 42/58' },
        teamB: { name: 'Lewis Hamilton', flag: '🇬🇧', score: 'P2', detail: '+3.2s' },
        momentum: 78,
        venue: 'Circuit de Monaco',
    },
    {
        id: 8,
        sport: 'nba',
        league: 'NBA Regular Season',
        status: 'finished',
        teamA: { name: 'Boston Celtics', flag: '🍀', score: '118', detail: '' },
        teamB: { name: 'Miami Heat', flag: '🔥', score: '105', detail: '' },
        momentum: 70,
        venue: 'TD Garden, Boston',
    },
    {
        id: 9,
        sport: 'football',
        league: 'La Liga',
        status: 'live',
        teamA: { name: 'FC Barcelona', flag: '🔵🔴', score: '3', detail: '' },
        teamB: { name: 'Atletico Madrid', flag: '🔴⬜', score: '1', detail: '' },
        momentum: 81,
        venue: 'Camp Nou, Barcelona',
        minute: "78'",
    },
];

export const AI_NARRATIVES = {
    hype: `🔥 ABSOLUTE SCENES at the Wankhede! Rohit Sharma just LAUNCHED a 108-meter six into the stands — the longest of the tournament! Mumbai Indians are on FIRE with 186/4 and the crowd is going absolutely BALLISTIC! Chennai's bowlers look shattered. The skipper has single-handedly shifted this game, and the momentum meter is screaming Mumbai at 72%. This isn't just cricket — this is a MASTERCLASS! The super over feels light years away now. MI fans, START THE CELEBRATION! 🎉`,

    analytical: `Mumbai Indians' current position of 186/4 in 18.2 overs represents a strong batting performance, with a run rate of 10.14. Historical data from IPL matches at Wankhede suggests that scores above 180 have a 73.2% win rate when batting first. The momentum shift occurred at the 14th over when Rohit Sharma accelerated from 42(31) to his current 89(48), coinciding with a strategic bowling change by CSK that proved ineffective. Key metric: The powerplay middle-overs transition yielded 58 runs in 4 overs — 2.3x above tournament average. Projected final score: 198-206.`,

    sarcastic: `Oh, Chennai thought they had a plan? That's adorable. 😏 Mumbai's sitting at 186/4 like it's a casual Sunday stroll, while CSK's bowling attack is having what therapists would call "an existential crisis." Rohit Sharma is out there playing a different sport entirely — 89 off 48 balls with the kind of authority that makes you wonder if the bowlers forgot to show up. The momentum meter says 72% Mumbai, but honestly, it's being generous to Chennai. Someone check if CSK's coach needs a hug. The only suspense left is whether Mumbai hits 200 or just stops out of politeness. 🫠`,
};

export const MOMENTUM_DATA = {
    matchId: 1,
    teamA: 'Mumbai Indians',
    teamB: 'Chennai Super Kings',
    probA: 72,
    probB: 28,
    points: [
        { over: 1, value: 50 }, { over: 2, value: 48 }, { over: 3, value: 52 },
        { over: 4, value: 55 }, { over: 5, value: 53 }, { over: 6, value: 58 },
        { over: 7, value: 45 }, { over: 8, value: 42 }, { over: 9, value: 47 },
        { over: 10, value: 50 }, { over: 11, value: 55 }, { over: 12, value: 60 },
        { over: 13, value: 58 }, { over: 14, value: 65 }, { over: 15, value: 72 },
        { over: 16, value: 68 }, { over: 17, value: 75 }, { over: 18, value: 72 },
    ],
    keyMoments: [
        { over: 4, text: 'Powerplay ends — MI 48/0', type: 'neutral' },
        { over: 7, text: 'Wicket! Gill caught at slip', type: 'negative' },
        { over: 10, text: 'Drinks break — MI 95/2', type: 'neutral' },
        { over: 14, text: "Rohit's 3rd SIX — momentum shifts!", type: 'positive' },
        { over: 17, text: '150 up! MI cruising at 156/3', type: 'positive' },
    ],
};

export const NAV_ITEMS = [
    { id: 'dashboard', icon: '⌁', label: 'Live Cockpit' },
    { id: 'arena', icon: '◈', label: 'Prediction Arena' },
    { id: 'divider1', type: 'divider' },
    { id: 'cricket', icon: '🏏', label: 'Cricket' },
    { id: 'football', icon: '⚽', label: 'Football' },
    { id: 'fifa', icon: '🌍', label: 'FIFA 2026' },
    { id: 'nba', icon: '🏀', label: 'NBA' },
    { id: 'tennis', icon: '🎾', label: 'Tennis' },
    { id: 'f1', icon: '🏎️', label: 'F1' },
    { id: 'standings', icon: '📋', label: 'Standings' },
    { id: 'leaderboard', icon: '▲', label: 'Fan Rankings' },
    { id: 'divider2', type: 'divider' },
    { id: 'timemachine', icon: '⏳', label: 'Time Machine' },
    { id: 'crowdpulse', icon: '◌', label: 'Crowd Pulse' },
    { id: 'blog', icon: '▤', label: 'Stories' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'admin', icon: '🛠️', label: 'Admin' },
    { id: 'profile', icon: '◎', label: 'Fan Passport' },
];
