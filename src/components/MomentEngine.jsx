import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config/apiBase.js';

const MAX_VISIBLE = 3;
const DISMISS_MS = 12000;

function buildShareText(moment) {
  return `${moment.title}\n${moment.aiLine || 'Live on Esportsduniya'}\n${window.location.origin}/match/${moment.matchId}`;
}

export default function MomentEngine() {
  const [moments, setMoments] = useState([]);
  const prevScoresRef = useRef({});
  const fetchingRef = useRef(new Set());

  const dismiss = useCallback((id) => {
    setMoments(prev => prev.filter(m => m.id !== id));
  }, []);

  const pushMoment = useCallback(async (payload) => {
    const id = `${payload.matchId}-${Date.now()}`;
    const base = {
      id,
      matchId: payload.matchId,
      sport: payload.sport,
      title: payload.title,
      aiLine: '',
      eventType: payload.eventType || 'score_change',
    };

    setMoments(prev => [base, ...prev].slice(0, MAX_VISIBLE));

    if (fetchingRef.current.has(id)) return;
    fetchingRef.current.add(id);

    try {
      const res = await fetch(apiUrl('/api/moments/line'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: payload.matchId,
          title: payload.title,
          sport: payload.sport,
          eventType: payload.eventType,
          match: payload.match,
        }),
      });
      const data = await res.json();
      const aiLine = data.line || data.aiLine || '';
      setMoments(prev => prev.map(m => (m.id === id ? { ...m, aiLine } : m)));

      fetch(apiUrl('/api/moments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, aiLine }),
      }).catch(() => {});
    } catch {
      setMoments(prev => prev.map(m => (m.id === id ? { ...m, aiLine: 'What a moment — the crowd is buzzing!' } : m)));
    } finally {
      fetchingRef.current.delete(id);
    }

    setTimeout(() => dismiss(id), DISMISS_MS);
  }, [dismiss]);

  useEffect(() => {
    const onScore = (e) => {
      const { match } = e.detail || {};
      if (!match?.id || match.status !== 'live') return;

      const key = String(match.id);
      const prev = prevScoresRef.current[key];
      prevScoresRef.current[key] = {
        a: match.teamA?.score,
        b: match.teamB?.score,
      };

      if (!prev) return;
      if (prev.a === match.teamA?.score && prev.b === match.teamB?.score) return;

      pushMoment({
        matchId: match.id,
        sport: match.sport,
        title: `${match.teamA?.name} ${match.teamA?.score} – ${match.teamB?.score} ${match.teamB?.name}`,
        eventType: 'score_change',
        match,
      });
    };

    const onMoment = (e) => {
      const d = e.detail || {};
      if (d.type === 'moment_event' || d.matchId) {
        pushMoment({
          matchId: d.matchId,
          sport: d.sport,
          title: d.title || 'Live moment',
          eventType: d.eventType,
          match: d.match,
        });
      }
    };

    document.addEventListener('lsm:score_update', onScore);
    document.addEventListener('lsm:moment_event', onMoment);
    return () => {
      document.removeEventListener('lsm:score_update', onScore);
      document.removeEventListener('lsm:moment_event', onMoment);
    };
  }, [pushMoment]);

  if (moments.length === 0) return null;

  return (
    <div className="moment-toast-stack" aria-live="polite">
      {moments.map(m => (
        <div key={m.id} className="moment-card">
          <div className="moment-card-header">
            <span>⚡ Live Moment</span>
            <span>{m.sport}</span>
          </div>
          <div className="moment-card-title">{m.title}</div>
          {m.aiLine && <div className="moment-card-ai">{m.aiLine}</div>}
          <div className="moment-card-actions">
            <button
              type="button"
              className="moment-btn moment-btn-share"
              onClick={() => {
                const text = buildShareText(m);
                if (navigator.share) {
                  navigator.share({ title: 'Esportsduniya Moment', text, url: `${window.location.origin}/match/${m.matchId}` });
                } else {
                  navigator.clipboard?.writeText(text);
                }
              }}
            >
              Share
            </button>
            <button type="button" className="moment-btn moment-btn-dismiss" onClick={() => dismiss(m.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
