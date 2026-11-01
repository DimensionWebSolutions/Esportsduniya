/**
 * Hand-written evergreen explainers, seeded into the blog on server start.
 * dbSaveArticle skips any slug that already exists, so seeding is idempotent.
 * Allowed HTML: h2, h3, p, ul, ol, li, strong, em, a (see sanitizeArticleHtml).
 */
import { EXTRA_ARTICLES_1 } from './seed-articles-extra-1.js';
import { EXTRA_ARTICLES_2 } from './seed-articles-extra-2.js';

const S = 'https://esportsduniya.in';

const RAW = [
  {
    slug: 'how-to-read-a-cricket-scorecard',
    title: 'How to Read a Cricket Scorecard: Runs, Wickets, Overs and Run Rate Explained',
    metaDescription: 'A beginner-friendly guide to reading a cricket scorecard and live score: what 145/3 means, how overs and run rate work, and what required run rate tells you.',
    category: 'cricket',
    keywords: ['cricket scorecard', 'how to read cricket score', 'run rate', 'cricket overs', 'live cricket score explained'],
    publishedAt: '2026-10-12T06:30:00Z',
    contentHtml: `
<p>If you have ever opened a live cricket score and wondered what "145/3 (16.2)" actually means, you are not alone. Cricket packs a lot of information into a few numbers, and once you know how to read them, every match becomes easier to follow. This guide walks through a scorecard line by line, using examples you will see on our <a href="${S}/sport/cricket">live cricket scores</a> page.</p>

<h2>The basic score: runs and wickets</h2>
<p>A team's score is written as <strong>runs/wickets</strong>. So <strong>145/3</strong> means the batting side has scored 145 runs and lost 3 wickets. A team is "all out" when 10 wickets have fallen (or when only one batter is left standing), and its innings ends. If a team is all out for 180, you will see it written as 180 all out, or 180/10.</p>
<p>Note that fans in different countries sometimes write it the other way round. In Australia, for example, 3/145 can mean three wickets for 145 runs. Most Indian and international scoreboards use runs first.</p>

<h2>Overs: how the innings is measured</h2>
<p>An <strong>over</strong> is six legal deliveries bowled by one bowler. Overs are written with a decimal that counts balls, not tenths. So <strong>16.2 overs</strong> means 16 complete overs and 2 balls of the 17th. The next ball after 16.5 is 17.0, not 16.6.</p>
<p>The length of an innings depends on the format:</p>
<ul>
<li><strong>T20:</strong> 20 overs per side, including the IPL.</li>
<li><strong>ODI (one-day international):</strong> 50 overs per side.</li>
<li><strong>Test match:</strong> no over limit per innings; each side bats up to twice over as many as five days.</li>
</ul>

<h2>Run rate and required run rate</h2>
<p>The <strong>run rate</strong> (often shown as RR or CRR for "current run rate") is the average number of runs scored per over. If a team is 90/2 after 10 overs, its run rate is 9.00. It tells you how fast the team is scoring.</p>
<p>When a team is chasing a target in the second innings, you will also see the <strong>required run rate (RRR)</strong>: the average runs per over the team still needs to win. Suppose the target is 180 and a team is 100/3 after 12 overs. It needs 80 more runs from 8 overs, so the required rate is 10.00. If the current run rate is lower than the required rate, the chasing side is falling behind; if it is higher, the chase is on track.</p>

<h2>Reading a batter's line</h2>
<p>Each batter has a line such as <em>Virat Kohli 64 (41) 5x4 2x6 SR 156.1</em>. This means 64 runs from 41 balls faced, including five fours and two sixes, at a <strong>strike rate</strong> of 156.1. Strike rate is runs per 100 balls, so it measures how quickly someone scores. In T20 cricket a strike rate above 140 is generally considered healthy; in Tests, much lower is normal.</p>

<h2>Reading a bowler's line</h2>
<p>A bowling line looks like <em>4-0-28-2</em>. In order, that is overs bowled, maidens, runs conceded and wickets taken. A <strong>maiden</strong> is an over with no runs scored off the bat. The <strong>economy rate</strong> is runs conceded per over; 28 runs from 4 overs is an economy of 7.00.</p>

<h2>Extras: wides, no-balls, byes and leg byes</h2>
<p>Extras are runs that do not come off the bat. A <strong>wide</strong> or a <strong>no-ball</strong> adds a run to the total and the ball must be bowled again, so it does not count toward the six legal deliveries in the over. A no-ball in white-ball cricket is followed by a <strong>free hit</strong>, on which the batter can only be dismissed by run-out. <strong>Byes</strong> and <strong>leg byes</strong> are runs scored when the ball misses the bat; they count toward the team total but not the batter's score.</p>

<h2>Powerplay, targets and DLS</h2>
<p>In limited-overs cricket, the first overs are the <strong>powerplay</strong>, where only a few fielders are allowed outside the inner circle. In T20 this covers the first six overs, so scoring tends to be fast. If rain shortens a match, the <strong>Duckworth-Lewis-Stern (DLS)</strong> method recalculates the target based on overs lost and wickets in hand. When you see a "revised target" on the scoreboard, DLS is the reason.</p>

<h2>Putting it together</h2>
<p>Here is a typical live line: <strong>IND 172/4 (17.3) CRR 9.83 | Target 190 | RRR 7.20</strong>. India has scored 172 for the loss of four wickets after 17.3 overs and is chasing 190. It needs 18 more runs from 15 balls, and at 7.20 per over the required rate is below the current rate, so the chase looks comfortable. Each time you open a <a href="${S}/blog">match page or story</a>, try decoding the numbers this way and you will soon be reading the game like a seasoned commentator.</p>`,
  },
  {
    slug: 'ipl-format-explained-playoffs-points-impact-player',
    title: 'IPL Format Explained: Points Table, Net Run Rate, Playoffs and the Impact Player Rule',
    metaDescription: 'How the Indian Premier League works: the league stage, how the points table and net run rate decide rankings, how the playoffs run and what the Impact Player rule means.',
    category: 'cricket',
    keywords: ['IPL format', 'IPL points table', 'net run rate', 'IPL playoffs explained', 'impact player rule'],
    publishedAt: '2026-10-16T06:30:00Z',
    contentHtml: `
<p>The Indian Premier League (IPL) is the most-watched T20 cricket tournament in the world, but its format can confuse new fans: how do teams qualify, why does net run rate matter, and what is an Impact Player? This explainer covers the essentials so that you can follow every race for the <a href="${S}/cricket/ipl-2026">IPL hub</a> with confidence.</p>

<h2>The league stage</h2>
<p>The modern IPL features ten franchise teams. In the league stage each team plays 14 matches, a mix of home and away fixtures. Every match is a 20-overs-per-side T20 game, so a result is almost always decided on the day. The teams are split into two groups for scheduling, which determines how often they meet, but all ten sit in a single points table.</p>

<h2>How the points table works</h2>
<ul>
<li><strong>Win:</strong> 2 points.</li>
<li><strong>Loss:</strong> 0 points.</li>
<li><strong>No result or tie that is not resolved:</strong> 1 point each.</li>
</ul>
<p>Ties in the league stage are broken with a <strong>Super Over</strong>, so a drawn result is rare. Teams are ranked by points first. When teams are level, the next tie-breaker is the number of wins, and after that comes <strong>net run rate</strong>.</p>

<h2>What is net run rate (NRR)?</h2>
<p>Net run rate measures how convincingly a team has been winning. It is calculated as the team's average runs scored per over across the whole season, minus the average runs conceded per over. A team that regularly wins big, or chases down targets with plenty of overs to spare, builds a strong positive NRR. A heavy defeat drags it down.</p>
<p>That is why a team that is 14 points on the table may be placed above or below another team with the same points. In a tight race, one huge win or one batting collapse late in the group stage can decide who makes the top four.</p>

<h2>The playoffs</h2>
<p>The top four teams after the league stage advance to the playoffs, which use a Page-playoff-style system that gives the two best teams a second chance:</p>
<ol>
<li><strong>Qualifier 1:</strong> 1st vs 2nd. The winner goes straight to the final.</li>
<li><strong>Eliminator:</strong> 3rd vs 4th. The loser is out.</li>
<li><strong>Qualifier 2:</strong> The loser of Qualifier 1 plays the winner of the Eliminator. The winner goes to the final.</li>
<li><strong>Final:</strong> The two qualifying teams play for the trophy.</li>
</ol>
<p>Finishing in the top two is a real advantage: it gives a team two chances to reach the final, while the third- and fourth-placed teams have no margin for error.</p>

<h2>The Impact Player rule</h2>
<p>Introduced in 2023, the Impact Player rule lets each team name a squad of substitutes at the toss. During the match, a team may bring one of those substitutes in to replace a player already in the XI, once per match, usually before the end of the 14th over of an innings. The replaced player takes no further part in the game.</p>
<p>Teams use this to add a specialist batter when chasing, bring in an extra bowler, or react to conditions. It has made squad depth more important and, in many matches, pushed team totals higher because deeper batting line-ups are possible.</p>

<h2>Strategic timeouts and other rules</h2>
<p>Each innings includes a strategic timeout, giving teams a short break to discuss plans. The league also uses the standard powerplay in the first six overs, where only two fielders are allowed outside the 30-yard circle. Teams must also stay within limits on overseas players: no more than four in a playing XI.</p>

<h2>What to watch for as the season progresses</h2>
<p>In the first few weeks, wins matter most. As the table tightens, watch the net run rate column and remaining fixtures: a team on 12 points with an easy run-in can be safer than a team on 14 with a tough schedule. Bookmark the <a href="${S}/standings">standings page</a> to follow the race, and use our fan zone to predict matches with free virtual points.</p>`,
  },
  {
    slug: 'premier-league-table-explained-points-goal-difference-european-spots',
    title: 'Premier League Table Explained: Points, Goal Difference, European Places and Relegation',
    metaDescription: 'Understand how the Premier League table works: how points are awarded, how goal difference and tie-breakers decide positions, and what the top and bottom places mean.',
    category: 'football',
    keywords: ['Premier League table', 'goal difference', 'Premier League relegation', 'Champions League qualification', 'football league table explained'],
    publishedAt: '2026-10-20T06:30:00Z',
    contentHtml: `
<p>The Premier League table looks simple, but each column tells a story about how a season is going. Whether you are new to English football or just want a refresher, this guide explains what every number means and what is at stake at both ends of the table. You can follow the live table on our <a href="${S}/football/premier-league">Premier League hub</a> and the <a href="${S}/standings">standings page</a>.</p>

<h2>How the league is structured</h2>
<p>The Premier League has 20 clubs. Every club plays every other club twice, once at home and once away, for a total of 38 matches each. The season normally runs from August to May. There are no playoffs or finals in the title race: the club that finishes top of the table after 38 games is the champion.</p>

<h2>Points: 3, 1 and 0</h2>
<ul>
<li><strong>Win:</strong> 3 points.</li>
<li><strong>Draw:</strong> 1 point.</li>
<li><strong>Loss:</strong> 0 points.</li>
</ul>
<p>The maximum a club can earn in a season is 114 points (38 wins). Champions typically finish with somewhere in the high 80s or 90s, while clubs surviving relegation often finish around 36 to 40 points.</p>

<h2>Reading each column</h2>
<p>A standard table has these columns:</p>
<ul>
<li><strong>P (or MP):</strong> matches played.</li>
<li><strong>W, D, L:</strong> wins, draws and losses.</li>
<li><strong>GF and GA:</strong> goals for (scored) and goals against (conceded).</li>
<li><strong>GD:</strong> goal difference, which is GF minus GA.</li>
<li><strong>Pts:</strong> total points.</li>
<li><strong>Form:</strong> usually the last five results, written as W, D or L.</li>
</ul>

<h2>How ties are broken</h2>
<p>When two clubs have the same number of points, the Premier League ranks them by <strong>goal difference</strong> first. If that is also equal, the club that has <strong>scored more goals</strong> is placed higher. If they are still level, head-to-head results come into play. A single heavy win or defeat can therefore matter far more than it first appears, especially near the end of the season when positions are decided by one or two goals.</p>
<p>In the rare case that clubs are level on every measure and the title or relegation is at stake, a play-off match can be arranged.</p>

<h2>What the positions mean</h2>
<p><strong>Top of the table:</strong> The champion is crowned and joins the UEFA Champions League the following season, as do the other clubs at the top. The exact number of Champions League places depends on the strength of English clubs in European competition that season, so it is usually the top four, and sometimes the top five.</p>
<p><strong>European places:</strong> Clubs just below the Champions League spots usually qualify for the UEFA Europa League or the Conference League. Winning a domestic cup, such as the FA Cup or the League Cup, can also provide a European place, which then shifts down the places available through the league.</p>
<p><strong>The bottom three:</strong> The clubs that finish 18th, 19th and 20th are relegated to the Championship, the second tier of English football, and are replaced by three promoted clubs. Because the relegation battle is decided only on the final day in many seasons, a survival run in the last ten games can be as dramatic as any title race.</p>

<h2>Why form and fixtures matter</h2>
<p>The table is a snapshot, not a prediction. Two clubs on the same points may have played different numbers of games, so always check the P column before comparing them. A team with a game in hand effectively has extra opportunity to gain three points. Fixture congestion from European and cup competition also affects squads, so look at what is coming up, not just the current positions.</p>

<h2>A quick way to read the table</h2>
<p>Start with points and games played, then look at goal difference to judge how dominant a club has been. Finally check the form column to see momentum. With those three checks you will understand most of what a table is saying, and our match pages will fill in the details behind each result.</p>`,
  },
  {
    slug: 'formula-1-race-weekend-explained-qualifying-sprint-points',
    title: 'Formula 1 Race Weekend Explained: Practice, Qualifying, Sprint, Points and DRS',
    metaDescription: 'A clear guide to a Formula 1 race weekend: practice sessions, three-part qualifying, sprint format, how championship points are scored, tyres, DRS and pit stops.',
    category: 'f1',
    keywords: ['F1 race weekend', 'F1 qualifying explained', 'F1 points system', 'DRS explained', 'Formula 1 for beginners'],
    publishedAt: '2026-10-24T06:30:00Z',
    contentHtml: `
<p>A Formula 1 Grand Prix is more than a single race on Sunday. Each weekend follows a structure of practice, qualifying and a race, with a shorter sprint added at selected events. If you are new to the sport, this guide explains how a weekend works, how points are awarded and the terms commentators use. For current race information, visit our <a href="${S}/sport/f1">F1 page</a>.</p>

<h2>The standard weekend</h2>
<p>Most Grand Prix weekends run over three days:</p>
<ol>
<li><strong>Friday:</strong> Free Practice 1 and 2 (FP1 and FP2), each about an hour long.</li>
<li><strong>Saturday:</strong> Free Practice 3 (FP3), then qualifying.</li>
<li><strong>Sunday:</strong> The Grand Prix itself.</li>
</ol>
<p>Practice sessions let teams tune the car, test tyre compounds and learn how the track changes. Lap times in practice do not count toward the result, so teams often run different fuel loads and engine modes. That means the order in practice is not always a reliable guide to race pace.</p>

<h2>How qualifying works</h2>
<p>Qualifying decides the starting grid, and starting position matters because overtaking can be difficult. It is split into three parts:</p>
<ul>
<li><strong>Q1 (18 minutes):</strong> All 20 drivers set laps. The slowest five are eliminated and start 16th to 20th.</li>
<li><strong>Q2 (15 minutes):</strong> The remaining 15 drivers run. The slowest five are eliminated and start 11th to 15th.</li>
<li><strong>Q3 (12 minutes):</strong> The final ten drivers fight for pole position and the top ten places on the grid.</li>
</ul>
<p>The driver with the fastest lap in Q3 takes <strong>pole position</strong>, the first place on the grid.</p>

<h2>The sprint weekend format</h2>
<p>At several races each season, the weekend is changed to include a <strong>sprint</strong>: a short race of roughly 100 kilometres that lasts around 30 minutes and has no mandatory pit stop. On sprint weekends there is a single practice session and a separate sprint qualifying session, while the main qualifying session sets the grid for Sunday's race. Points are awarded for the top finishers in the sprint, so a sprint weekend is worth more to the championship than a standard one.</p>

<h2>How points work</h2>
<p>In the Grand Prix, the top ten finishers score points: 25 for first, then 18, 15, 12, 10, 8, 6, 4, 2 and 1 for tenth. Points count toward two championships: the <strong>Drivers' Championship</strong>, which goes to an individual, and the <strong>Constructors' Championship</strong>, which is the sum of both drivers' points for each team. Sprint races award points to the top eight finishers on a smaller scale.</p>

<h2>Tyres and pit stops</h2>
<p>Pirelli supplies the tyres, which come in three dry-weather compounds: <strong>soft</strong> (fastest but wears quickly), <strong>medium</strong> and <strong>hard</strong> (slowest but most durable). There are also intermediate and full wet tyres for rain. In a dry race, a driver must normally use at least two different dry compounds, which forces at least one pit stop. Choosing when to pit, and which tyre to fit, is the heart of race strategy. An <strong>undercut</strong> means pitting earlier than a rival to gain time on fresh tyres, while an <strong>overcut</strong> means staying out longer.</p>

<h2>DRS and overtaking aids</h2>
<p>The <strong>Drag Reduction System (DRS)</strong> opens a flap on the rear wing to reduce drag on the straight. A driver can use it when they are within one second of the car ahead at a detection point, helping them to pass. DRS is only allowed in designated zones and not in the opening laps or under yellow flags.</p>

<h2>Flags and safety cars</h2>
<p>A <strong>yellow flag</strong> warns of danger on the track, a <strong>red flag</strong> stops the session, and a <strong>blue flag</strong> tells a slower car to let a faster one pass. When there is a serious incident, the <strong>Safety Car</strong> leads the field at reduced speed while the track is cleared. This bunches the cars together, which can change the race entirely because teams often pit under the safety car for a cheaper stop.</p>

<h2>What to watch for</h2>
<p>Next race weekend, watch qualifying for track position, the first stint for tyre wear and any safety car for strategy changes. With the basics above, a Grand Prix tells a much richer story than the finishing order alone.</p>`,
  },
  {
    slug: 'tennis-scoring-explained-games-sets-tiebreaks-grand-slams',
    title: 'Tennis Scoring Explained: Points, Games, Sets, Tiebreaks and the Grand Slams',
    metaDescription: 'Learn how tennis scoring works: 15, 30, 40 and deuce, games and sets, tiebreaks, best-of-three vs best-of-five matches and the four Grand Slam tournaments.',
    category: 'tennis',
    keywords: ['tennis scoring', 'tennis tiebreak', 'deuce advantage', 'Grand Slam tournaments', 'how tennis is scored'],
    publishedAt: '2026-10-28T06:30:00Z',
    contentHtml: `
<p>Tennis scoring can seem odd at first: why 15, 30 and 40, and what is a tiebreak? Once you learn the structure, the logic is straightforward. This guide covers points, games, sets and matches, plus the formats used at the biggest tournaments. You can follow current matches on our <a href="${S}/sport/tennis">tennis live scores</a> page.</p>

<h2>Points within a game</h2>
<p>A match is made up of sets, a set is made up of games and a game is made up of points. Within a game, points are called:</p>
<ul>
<li>0 points: <strong>love</strong></li>
<li>1 point: <strong>15</strong></li>
<li>2 points: <strong>30</strong></li>
<li>3 points: <strong>40</strong></li>
<li>4 points: <strong>game</strong>, provided the player is ahead by at least two points</li>
</ul>
<p>The server's score is always called first. So 30-15 means the server has two points and the receiver has one.</p>

<h2>Deuce and advantage</h2>
<p>A player must win a game by two clear points. If both players reach 40, the score is <strong>deuce</strong>. The next point gives one player the <strong>advantage</strong>. If that player wins the following point, they win the game. If they lose it, the score returns to deuce. A game can theoretically go on indefinitely, and some of the longest games feature many deuces.</p>

<h2>Games and sets</h2>
<p>A <strong>set</strong> is won by the first player to win six games with a margin of at least two games, for example 6-3 or 6-4. If the score reaches 5-5, play continues until one player leads by two games (7-5). If it reaches 6-6, the set is normally decided by a <strong>tiebreak</strong>.</p>

<h2>How a tiebreak works</h2>
<p>In a standard tiebreak, the first player to reach seven points, with a margin of at least two, wins the set 7-6. Points are counted normally (1, 2, 3 and so on) instead of 15, 30, 40. The player who is due to serve starts with one point, then serve alternates every two points, and players change ends after every six points. Tiebreaks are known for being tense because each point carries huge weight.</p>

<h2>Best of three or best of five?</h2>
<p>Most professional matches are <strong>best-of-three sets</strong>: the first player to win two sets wins the match. At the Grand Slams, men's singles matches are <strong>best-of-five sets</strong>, so a player must win three sets, which makes endurance and fitness crucial. Women's singles matches at all tournaments are best-of-three.</p>
<p>The final set is handled differently depending on the tournament. Some events use a regular tiebreak at 6-6, while the Grand Slams use their own rules, such as a longer tiebreak to ten points in the deciding set. The exact rules are published by each tournament, so check the event's website before a big match.</p>

<h2>The four Grand Slams</h2>
<p>The most prestigious events in tennis are the four Grand Slams, played on different surfaces:</p>
<ol>
<li><strong>Australian Open</strong> (January, Melbourne): hard court.</li>
<li><strong>French Open (Roland Garros)</strong> (May-June, Paris): clay.</li>
<li><strong>Wimbledon</strong> (June-July, London): grass.</li>
<li><strong>US Open</strong> (August-September, New York): hard court.</li>
</ol>
<p>Each surface rewards different styles. Clay slows the ball and favours patient baseline play, grass is fast and rewards serving and volleys, and hard courts sit in between. A player who wins all four in a calendar year achieves the rare "calendar Grand Slam".</p>

<h2>Rankings and the tours</h2>
<p>Professional men's tennis is organised by the ATP and women's by the WTA. Players earn ranking points based on how far they progress in each tournament, with Grand Slams awarding the most. The rankings, which are based on results from the previous 52 weeks, determine seeding, so that the top players do not meet until later rounds.</p>

<h2>How to follow a match</h2>
<p>When you check a live score such as <strong>6-4, 3-6, 2-1 (30-15)</strong>, read it as set scores first, then the current game and then the points within it. Here, the first player won the first set 6-4, lost the second 3-6 and leads 2-1 in the third set, currently up 30-15 in the game. With that you can read any scoreboard in the world.</p>`,
  },
];

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ');
}

export const SEED_ARTICLES = [...RAW, ...EXTRA_ARTICLES_1, ...EXTRA_ARTICLES_2].map((a) => {
  const contentHtml = a.contentHtml.trim();
  const wordCount = stripTags(contentHtml).split(/\s+/).filter(Boolean).length;
  return {
    ...a,
    contentHtml,
    publishedAt: new Date(a.publishedAt),
    wordCount,
    readTime: Math.max(1, Math.round(wordCount / 200)),
    isExternal: false,
  };
});
