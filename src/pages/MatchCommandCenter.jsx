import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Share2, Target, MessageCircle } from 'lucide-react';
import { fetchLiveMatches, apiUrl } from '@/services/apiService';
import { shareMatch, shareMatchWhatsApp } from '@/components/ShareCard.js';
import { trackViewAction } from '@/components/DailyChallenges.js';
import { trackEvent, EVENTS } from '@/services/analytics';
import { LiveBadge, SportPill } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Skeleton } from '@/ui/section';
import { MatchMomentum } from '@/features/match/MatchMomentum';
import { MatchNarrative } from '@/features/match/MatchNarrative';
import { MatchFanZone } from '@/features/match/MatchFanZone';
import { MatchOracle } from '@/features/match/MatchOracle';
import FantasyPicks from '@/components/FantasyPicks.jsx';
import { cn } from '@/lib/utils';

export default function MatchCommandCenter() {
  const { id: matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineError, setTimelineError] = useState('');
  const [loading, setLoading] = useState(true);
  const [directorMode, setDirectorMode] = useState('casual');
  const [showFantasy, setShowFantasy] = useState(false);
  const [mobileTab, setMobileTab] = useState('overview');

  useEffect(() => {
    trackEvent(EVENTS.VIEW_MATCH, { match_id: matchId });
    trackViewAction();
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all = await fetchLiveMatches('all');
      const found = all.find(m => String(m.id) === String(matchId));
      if (!cancelled) {
        setMatch(found || null);
        setLoading(false);
      }
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
          if (!res.ok) throw new Error(data.error || 'Timeline unavailable');
          setTimeline(data.scorecard || data.events || []);
        } else if (match.sport === 'football') {
          const fid = match.fixtureId || match.id;
          const res = await fetch(apiUrl(`/api/sports/football/events/${fid}`));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Events unavailable');
          setTimeline(data.response || []);
        } else setTimeline([]);
      } catch (e) {
        setTimeline([]);
        setTimelineError(e.message);
      }
    };
    loadTimeline();
  }, [match]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface-1 p-12 text-center">
        <h2 className="font-display text-xl font-semibold">Match not found</h2>
        <p className="mt-2 text-muted">This match may have ended or the ID is invalid.</p>
        <Button asChild className="mt-6"><Link to="/">Back to home</Link></Button>
      </div>
    );
  }

  const crowdA = Math.max(12, Math.min(88, match.momentum || 50));
  const crowdB = 100 - crowdA;
  const toneMap = { casual: 'hype', fantasy: 'analytical', tactical: 'analytical' };

  const share = async () => {
    await shareMatch(match);
    trackEvent(EVENTS.SHARE_MOMENT, { match_id: match.id, channel: 'native' });
  };

  const shareWhatsApp = () => {
    shareMatchWhatsApp(match);
    trackEvent(EVENTS.SHARE_MOMENT, { match_id: match.id, channel: 'whatsapp' });
  };

  const ogShareUrl = apiUrl(`/api/og/${match.id}`);

  const ScoreHeader = () => (
    <Card className="overflow-hidden border-border bg-surface-1">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SportPill sport={match.sport} />
          {match.status === 'live' && <LiveBadge />}
          <span className="text-sm text-muted">{match.league}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-sm text-muted">{match.teamA?.name}</p>
            <p className="font-data text-4xl font-bold tracking-tight">{match.teamA?.score ?? '–'}</p>
          </div>
          <span className="font-data text-muted">vs</span>
          <div className="text-right">
            <p className="text-sm text-muted">{match.teamB?.name}</p>
            <p className="font-data text-4xl font-bold tracking-tight">{match.teamB?.score ?? '–'}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          {match.venue && <span>{match.venue}</span>}
          {match.minute && <span className="font-data text-live">{match.minute}</span>}
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{match.teamA?.name} {crowdA}%</span>
            <span>{match.teamB?.name} {crowdB}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full">
            <div className="bg-accent" style={{ width: `${crowdA}%` }} />
            <div className="bg-surface-3" style={{ width: `${crowdB}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TimelinePanel = () => (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-display font-semibold">Live timeline</h3>
        {timelineError && <p className="text-sm text-muted">{timelineError}</p>}
        {!timelineError && timeline.length === 0 && (
          <p className="text-sm text-muted">Event timeline appears when API data is available.</p>
        )}
        <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
          {timeline.slice(0, 30).map((ev, i) => (
            <li key={i} className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 font-data text-xs">
              {ev.over != null
                ? `${ev.over}.${ev.ball} — ${ev.batsman?.name || ev.runs}${ev.wicket ? ' WICKET' : ''}`
                : `${ev.time?.elapsed ?? ''}' ${ev.type} — ${ev.player?.name || ev.detail || ''}`}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>{`${match.teamA?.name} vs ${match.teamB?.name} — Live | Esportsduniya`}</title>
        <meta name="description" content={`Live score and AI analysis for ${match.teamA?.name} vs ${match.teamB?.name}. ${match.league || ''}`} />
        <meta property="og:title" content={`${match.teamA?.name} vs ${match.teamB?.name} — Live Score`} />
        <meta property="og:description" content={`${match.teamA?.score ?? ''} - ${match.teamB?.score ?? ''} · ${match.league || match.sport}`} />
        <meta property="og:url" content={`https://esportsduniya.in/match/${match.id}`} />
        <meta property="og:image" content={ogShareUrl} />
        <meta property="og:locale" content="en_IN" />
        <link rel="canonical" href={`https://esportsduniya.in/match/${match.id}`} />
      </Helmet>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Home</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowFantasy(v => !v)}>
          <Target className="mr-1 h-4 w-4" />Fantasy pick
        </Button>
        <Button variant="outline" size="sm" onClick={share}>
          <Share2 className="mr-1 h-4 w-4" />Share
        </Button>
        <Button variant="outline" size="sm" onClick={shareWhatsApp}>
          <MessageCircle className="mr-1 h-4 w-4" />WhatsApp
        </Button>
      </div>

      {showFantasy && <div className="mb-6"><FantasyPicks match={match} onClose={() => setShowFantasy(false)} /></div>}

      <div className="mb-6 lg:hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">AI</TabsTrigger>
            <TabsTrigger value="predict" className="flex-1">Predict</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className={cn('space-y-6 lg:col-span-3', mobileTab !== 'overview' && 'hidden lg:block')}>
          <ScoreHeader />
          <MatchMomentum match={match} />
        </div>

        <div className={cn('space-y-6 lg:col-span-5', mobileTab === 'predict' && 'hidden lg:block')}>
          <Tabs value={directorMode} onValueChange={setDirectorMode}>
            <TabsList>
              <TabsTrigger value="casual">Casual</TabsTrigger>
              <TabsTrigger value="fantasy">Fantasy</TabsTrigger>
              <TabsTrigger value="tactical">Tactical</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className={cn(mobileTab !== 'ai' && 'hidden lg:block')}>
            <MatchNarrative match={match} tone={toneMap[directorMode]} />
          </div>
          <div className={cn(mobileTab === 'overview' && 'block', mobileTab !== 'overview' && 'hidden lg:block')}>
            <TimelinePanel />
          </div>
        </div>

        <div className={cn('space-y-6 lg:col-span-4', mobileTab !== 'predict' && mobileTab !== 'overview' && 'hidden lg:block')}>
          <div className={cn(mobileTab === 'predict' || mobileTab === 'overview' ? 'block' : 'hidden lg:block')}>
            <MatchFanZone matchId={match.id} teamA={match.teamA} teamB={match.teamB} />
          </div>
          <div className={cn(mobileTab === 'predict' ? 'block' : 'hidden lg:block')}>
            <MatchOracle match={match} sport={match.sport} />
          </div>
        </div>
      </div>
    </div>
  );
}
