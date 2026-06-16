import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { fetchLiveMatches, fetchMomentumAnalysis, apiUrl } from '../services/apiService.js';
import { createMomentumEngine, updateMomentumEngine, showMomentumLoading } from '../components/MomentumEngine.js';
import { createAINarrative, initAINarrative } from '../components/AINarrative.js';
import { createAIRadio, initAIRadio, queueCommentary } from '../components/AIRadio.js';
import { createFanZone, initFanZone } from '../components/FanZone.js';
import { createOracle, initOracle } from '../components/Oracle.js';
import { createPreGamePreview } from '../components/PreGamePreview.js';
import FantasyPicks from '../components/FantasyPicks.jsx';
import '../styles/tactics.css';

const ZONES = [
  { id: 'score', label: 'Score' },
  { id: 'ai', label: 'AI' },
  { id: 'fan', label: 'Fan' },
  { id: 'predict', label: 'Predict' },
];

export default function MatchCommandCenter() {
  const { id: matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineError, setTimelineError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileZone, setMobileZone] = useState('score');
  const [showFantasy, setShowFantasy] = useState(false);

  const analystRef = useRef(null);
  const fanRef = useRef(null);
  const oracleRef = useRef(null);
  const radioRef = useRef(null);
  const momentumRef = useRef(null);
  const narrativeRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all = await fetchLiveMatches('all');
      const found = all.find(m => String(m.id) === String(matchId));
      if (cancelled) return;
      setMatch(found || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  useEffect(() => {
    if (!match) return;

    const loadTimeline = async () => {
      setTimelineError('');
      try {
        if (match.sport === 'cricket') {
          const res = await fetch(apiUrl(`/api/sports/cricket/match/${match.id}`));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Cricket timeline unavailable');
          setTimeline(data.scorecard || data.events || []);
        } else if (match.sport === 'football' && (match.fixtureId || match.id)) {
          const fid = match.fixtureId || match.id;
          const res = await fetch(apiUrl(`/api/sports/football/events/${fid}`));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Football events unavailable');
          setTimeline(data.response || []);
        }
      } catch (e) {
        setTimeline([]);
        setTimelineError(e.message);
      }
    };
    loadTimeline();
  }, [match]);

  useEffect(() => {
    if (!match) return;

    const analyst = analystRef.current;
    const fan = fanRef.current;
    const oracle = oracleRef.current;
    const radio = radioRef.current;
    const momentum = momentumRef.current;
    const narrative = narrativeRef.current;

    if (radio) {
      radio.innerHTML = '';
      radio.appendChild(createAIRadio());
      initAIRadio();
    }

    if (momentum) {
      momentum.innerHTML = '';
      if (match.status === 'upcoming') {
        momentum.appendChild(createPreGamePreview(match, gsap));
      } else {
        momentum.appendChild(createMomentumEngine());
        showMomentumLoading();
        fetchMomentumAnalysis(match).then(updateMomentumEngine);
      }
    }

    if (narrative) {
      narrative.innerHTML = '';
      narrative.appendChild(createAINarrative());
      initAINarrative();
    }

    if (fan) {
      fan.innerHTML = '';
      fan.appendChild(createFanZone(match.teamA, match.teamB, match.id));
      initFanZone();
    }

    if (oracle) {
      oracle.innerHTML = '';
      oracle.appendChild(createOracle(match.id, match.teamA, match.teamB));
      initOracle();
    }

    let narrativePoll = setInterval(() => {
      const text = narrative?.querySelector('#ai-narrative-text')?.textContent;
      if (text) queueCommentary(text);
    }, 8000);

    return () => clearInterval(narrativePoll);
  }, [match]);

  if (loading) {
    return (
      <div className="command-center">
        <div className="home-skeleton-card" style={{ height: 200, marginBottom: 24 }} />
        <div className="home-skeleton-grid"><div className="home-skeleton-card" /><div className="home-skeleton-card" /></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="command-center">
        <div className="home-empty-state">
          <h3>Match not found</h3>
          <p>This match may have ended or the ID is invalid.</p>
          <Link to="/" className="home-retry-btn">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const sportAccent = `var(--sport-${match.sport}, var(--accent-neon))`;
  const isLive = match.status === 'live';

  return (
    <div className="command-center" data-sport={match.sport}>
      <header className="command-header">
        <div className={`command-scoreboard ${isLive ? 'live' : ''}`} style={{ borderColor: isLive ? sportAccent : undefined }}>
          <div className="command-teams">
            <div>
              <div className="command-team-name">{match.teamA?.name}</div>
              <div className="command-team-score">{match.teamA?.score ?? '-'}</div>
            </div>
            <div className="command-vs">vs</div>
            <div>
              <div className="command-team-name">{match.teamB?.name}</div>
              <div className="command-team-score">{match.teamB?.score ?? '-'}</div>
            </div>
          </div>
          <div className="command-meta">
            <span>{match.league}</span>
            <span>{match.venue}</span>
            {isLive && <span className="live-dot" style={{ display: 'inline-block' }} />}{match.minute || match.status}
            {match.source && <span>· {match.source}</span>}
          </div>
        </div>
        <div className="command-actions">
          <Link to="/" className="command-back">← Home</Link>
          <button type="button" className="command-action-btn" onClick={() => setShowFantasy(v => !v)}>
            🎯 Fantasy Pick
          </button>
          <button
            type="button"
            className="command-action-btn"
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) navigator.share({ title: `${match.teamA.name} vs ${match.teamB.name}`, url });
              else navigator.clipboard?.writeText(url);
            }}
          >
            📤 Share
          </button>
        </div>
      </header>

      {showFantasy && <FantasyPicks match={match} onClose={() => setShowFantasy(false)} />}

      <div className="command-mobile-tabs">
        {ZONES.map(z => (
          <button
            key={z.id}
            type="button"
            className={`command-mobile-tab ${mobileZone === z.id ? 'active' : ''}`}
            onClick={() => setMobileZone(z.id)}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div className="command-zones">
        <aside className={`command-zone command-zone-left ${mobileZone === 'ai' ? 'mobile-active' : ''}`}>
          <h3 className="command-zone-title">AI Analyst</h3>
          <div ref={momentumRef} />
          <div ref={narrativeRef} />
        </aside>

        <section className={`command-zones-center command-zone ${mobileZone === 'score' ? 'mobile-active' : ''}`}>
          <h3 className="command-zone-title">Live Timeline</h3>
          <div ref={radioRef} className="command-radio-slot" />
          {timelineError && (
            <p className="command-timeline-empty">{timelineError}</p>
          )}
          {!timelineError && timeline.length === 0 && (
            <p className="command-timeline-empty">Ball-by-ball / event timeline will appear when API data is available.</p>
          )}
          <ul className="command-timeline">
            {timeline.slice(0, 30).map((ev, i) => (
              <li key={i} className="command-timeline-item">
                {ev.over != null ? (
                  <span>{ev.over}.{ev.ball} — {ev.batsman?.name || ev.runs} {ev.wicket ? 'WICKET' : ''}</span>
                ) : (
                  <span>{ev.time?.elapsed ?? ''}&apos; {ev.type} — {ev.player?.name || ev.detail || ''}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className={`command-zone command-zone-right ${mobileZone === 'fan' || mobileZone === 'predict' ? 'mobile-active' : ''}`}>
          <h3 className="command-zone-title">Fan Arena</h3>
          <div ref={fanRef} className={mobileZone === 'fan' ? '' : 'command-zone-collapsed-mobile'} />
          <h3 className="command-zone-title">Oracle Lock-in</h3>
          <div ref={oracleRef} className={mobileZone === 'predict' ? '' : 'command-zone-collapsed-mobile'} />
        </aside>
      </div>
    </div>
  );
}
