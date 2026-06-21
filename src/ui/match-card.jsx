import { Link } from 'react-router-dom';
import { Share2, Bell, MessageCircle } from 'lucide-react';
import { cn, sportBg } from '@/lib/utils';
import { Card, CardContent } from '@/ui/card';
import { Badge, LiveBadge, SportPill } from '@/ui/badge';
import { Button } from '@/ui/button';
import { shareMatch, shareMatchWhatsApp } from '@/components/ShareCard.js';

function StatusBadge({ status }) {
  if (status === 'live') return <LiveBadge />;
  if (status === 'upcoming') return <Badge variant="upcoming">Upcoming</Badge>;
  return <Badge variant="finished">Final</Badge>;
}

export function MatchCard({ match, onClick, className }) {
  if (!match) return null;

  const handleShare = (e) => {
    e.stopPropagation();
    shareMatch(match);
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    shareMatchWhatsApp(match);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer border-border bg-surface-1 transition-all hover:border-accent/40 hover:bg-surface-2',
        sportBg(match.sport),
        className
      )}
      onClick={() => onClick?.(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(match)}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <SportPill sport={match.sport} />
            <span className="truncate text-xs text-muted">{match.league}</span>
          </div>
          <StatusBadge status={match.status} />
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-medium text-foreground">{match.teamA?.name}</span>
            <span className="font-data text-lg font-semibold text-foreground">{match.teamA?.score ?? '–'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-medium text-foreground">{match.teamB?.name}</span>
            <span className="font-data text-lg font-semibold text-foreground">{match.teamB?.score ?? '–'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2.5">
          <span className="text-xs text-muted">
            {match.minute || match.venue || match.teamA?.detail || ''}
          </span>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleWhatsApp} aria-label="Share on WhatsApp">
              <MessageCircle className="h-4 w-4 text-win" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare} aria-label="Share match">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchRow({ match, onClick }) {
  if (!match) return null;
  return (
    <button
      type="button"
      onClick={() => onClick?.(match)}
      className="flex w-full items-center gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3 text-left transition-colors hover:bg-surface-2"
    >
      <SportPill sport={match.sport} className="hidden sm:inline-flex" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{match.teamA?.name} vs {match.teamB?.name}</p>
        <p className="truncate text-xs text-muted">{match.league}</p>
      </div>
      <div className="font-data text-sm font-semibold">
        {match.teamA?.score} – {match.teamB?.score}
      </div>
      <StatusBadge status={match.status} />
    </button>
  );
}

export function MatchCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex justify-between">
          <div className="h-5 w-20 rounded bg-surface-2 animate-pulse" />
          <div className="h-5 w-14 rounded bg-surface-2 animate-pulse" />
        </div>
        <div className="h-6 w-full rounded bg-surface-2 animate-pulse" />
        <div className="h-6 w-full rounded bg-surface-2 animate-pulse" />
      </CardContent>
    </Card>
  );
}
