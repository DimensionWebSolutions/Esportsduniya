import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Share2, Target, MessageCircle, BarChart3, BookOpen, Trophy } from 'lucide-react';
import { fetchLiveMatches, apiUrl } from '@/services/apiService';
import { shareMatch, shareMatchWhatsApp } from '@/components/ShareCard.js';
import { trackViewAction } from '@/components/DailyChallenges.js';
import { trackEvent, EVENTS } from '@/services/analytics';
import { useHeadlines } from '@/hooks/useLiveScores';
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
import PreGameBrief from '@/components/PreGameBrief.jsx';
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
  const { data: headlines = [] } = useHeadlines(4);

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
    if (!match || match.status === 'upcoming') return;
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
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/">Back to home</Link></Button>
          <Button asChild variant="secondary"><Link to="/standings">Standings</Link></Button>
          <Button asChild variant="secondary"><Link to="/blog">Stories</Link></Button>
        </div>
      </div>
    );
  }

  const isUpcoming = match.status === 'upcoming';
  const crowdA = Math.max(12, Math.min(88, match.momentum || 50));
  const crowdB = 100 - crowdA;
  const toneMap = { casual: 'hype', fantasy: 'analytical', tactical: 'analytical' };
  const relatedHeadlines = headlines.filter((h) => {
    const hay = `${h.title || ''} ${h.category || ''}`.toLowerCase();
    const sport = (match.sport || '').toLowerCase();
    return hay.includes(sport) || hay.includes((match.teamA?.name || '').toLowerCase().split(' ')[0]);
  }).slice(0, 3);

  const share = async () => {
    await shareMatch(match);
    trackEvent(EVENTS.SHARE_MOMENT, { match_id: match.id, channel: 'native' });
  };

  const shareWhatsApp = () => {
    shareMatchWhatsApp(match);
    trackEvent(EVENTS.SHARE_MOMENT, { match_id: match.id, channel: 'whatsapp' });
  };

  const ogShareUrl = apiUrl(`/api/og/${match.id}`);
  const statusLabel = isUpcoming ? 'Preview' : match.status === 'finished' ? 'Result' : 'Live';

  const ScoreHeader = () => (
    <Card className="overflow-hidden border-border bg-surface-1">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SportPill sport={match.sport} />
          {match.status === 'live' && <LiveBadge />}
          {isUpcoming && <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs uppercase tracking-wide text-accent">Upcoming</span>}
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
          <p className="text-sm text-muted">
            {isUpcoming
              ? 'Timeline starts when the match goes live.'
              : 'Event timeline appears when API data is available.'}
          </p>
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

  const ContextLinks = () => (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h3 className="font-display text-sm font-semibold">Go deeper</h3>
        <div className="grid gap-2">
          <Button asChild variant="secondary" size="sm" className="justify-start">
            <Link to="/standings"><BarChart3 className="mr-2 h-4 w-4" />League standings</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="justify-start">
            <Link to="/arena"><Trophy className="mr-2 h-4 w-4" />Prediction Arena</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="justify-start">
            <Link to="/blog"><BookOpen className="mr-2 h-4 w-4" />Related stories</Link>
          </Button>
        </div>
        {relatedHeadlines.length > 0 && (
          <ul className="space-y-2 border-t border-border-subtle pt-3">
            {relatedHeadlines.map((h) => (
              <li key={h.slug || h.title}>
                <a
                  href={h.sourceUrl || '/blog'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-xs text-muted hover:text-accent"
                >
                  {h.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>{`${match.teamA?.name} vs ${match.teamB?.name} — ${statusLabel} | Esportsduniya`}</title>
        <meta name="description" content={`${statusLabel} score and AI analysis for ${match.teamA?.name} vs ${match.teamB?.name}. ${match.league || ''}`} />
        <meta property="og:title" content={`${match.teamA?.name} vs ${match.teamB?.name} — ${statusLabel} Score`} />
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
          <ContextLinks />
        </div>

        <div className={cn('space-y-6 lg:col-span-5', mobileTab === 'predict' && 'hidden lg:block')}>
          {isUpcoming ? (
            <div className={cn(mobileTab !== 'ai' && mobileTab !== 'overview' && 'hidden lg:block')}>
              <PreGameBrief match={match} />
            </div>
          ) : (
            <>
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
            </>
          )}
          <div className={cn(mobileTab === 'overview' && 'block', mobileTab !== 'overview' && 'hidden lg:block')}>
            {isUpcoming ? (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <h3 className="font-display font-semibold">Before kickoff</h3>
                  <p className="text-sm text-muted">
                    Lock your prediction early, check form on standings, and come back for live AI commentary once the match starts.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setMobileTab('predict')}>Make a prediction</Button>
                    <Button asChild size="sm" variant="secondary"><Link to="/standings">View standings</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <TimelinePanel />
            )}
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
