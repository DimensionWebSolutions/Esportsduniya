import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Match countdown timer for upcoming matches
export default function MatchCountdown({ match }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(null);
  const [reminderSet, setReminderSet] = useState(false);

  const kickoffTime = match.kickoff
    ? parseKickoff(match.kickoff)
    : match.startTime
      ? new Date(match.startTime)
      : null;

  useEffect(() => {
    // Check if reminder already set
    const key = `esd_reminder_${match.id}`;
    if (localStorage.getItem(key)) setReminderSet(true);
  }, [match.id]);

  useEffect(() => {
    if (!kickoffTime) return;
    const update = () => {
      const diff = kickoffTime.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft({ h, m, s, diff });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [kickoffTime]);

  const setReminder = (e) => {
    e.stopPropagation();
    if (!kickoffTime) return;
    const key = `esd_reminder_${match.id}`;
    localStorage.setItem(key, JSON.stringify({
      matchId: match.id,
      label: `${match.teamA?.name} vs ${match.teamB?.name}`,
      kickoff: kickoffTime.toISOString(),
    }));
    setReminderSet(true);

    // Schedule browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const delay = kickoffTime.getTime() - Date.now() - 5 * 60_000; // 5 min before
      if (delay > 0) {
        setTimeout(() => {
          new Notification('⚽ Match Starting Soon!', {
            body: `${match.teamA?.name} vs ${match.teamB?.name} kicks off in 5 minutes`,
            icon: '/favicon.svg',
          });
        }, delay);
      }
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  if (!timeLeft || match.status === 'live') return null;

  const isImminent = timeLeft.diff < 3_600_000; // < 1 hour

  return (
    <div className={cn(
      'mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs',
      isImminent
        ? 'bg-amber-500/10 border border-amber-500/20'
        : 'bg-surface-2 border border-border-subtle'
    )}>
      <div className="flex items-center gap-2">
        <span className={cn('font-mono font-bold tabular-nums', isImminent ? 'text-amber-400' : 'text-muted')}>
          {timeLeft.h > 0 ? (
            <>{String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}</>
          ) : (
            <>{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}</>
          )}
        </span>
        <span className="text-muted">{isImminent ? 'until kickoff' : 'to go'}</span>
      </div>
      <button
        onClick={setReminder}
        className={cn(
          'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
          reminderSet
            ? 'bg-green-500/20 text-green-400 border border-green-500/20'
            : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20'
        )}
      >
        {reminderSet ? '✓ Reminder set' : '🔔 Remind me'}
      </button>
    </div>
  );
}

// Parse "21:00 CET" style kickoff strings into Date
function parseKickoff(str) {
  if (!str) return null;
  try {
    // If it's a full ISO string
    if (str.includes('T') || str.includes('-')) return new Date(str);
    // Attempt to parse "HH:MM TZ"
    const today = new Date();
    const [time] = str.split(' ');
    const [hh, mm] = time.split(':').map(Number);
    const d = new Date(today);
    d.setHours(hh, mm, 0, 0);
    // If already passed today, schedule for tomorrow
    if (d < today) d.setDate(d.getDate() + 1);
    return d;
  } catch {
    return null;
  }
}
