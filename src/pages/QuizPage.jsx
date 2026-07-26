import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { Brain, CheckCircle2, XCircle, Flame, Share2, ArrowRight, Lightbulb } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { StatTile, Skeleton } from '@/ui/section';
import { SportPill } from '@/ui/badge';
import { cn } from '@/lib/utils';

const SITE_URL = 'https://esportsduniya.in';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function scoreVerdict(score, total) {
  const pct = total ? score / total : 0;
  if (pct === 1) return 'Perfect round. You are a walking record book.';
  if (pct >= 0.8) return 'Strong round — you clearly watch more than the highlights.';
  if (pct >= 0.6) return 'Solid effort. A couple of these are worth remembering.';
  if (pct >= 0.4) return 'Middle of the table. Tomorrow is another fixture.';
  return 'Rough round — but you just learned five new facts.';
}

function pointsMessage(outcome, user) {
  if (outcome.alreadyPlayed) return 'No extra points — today’s round was already scored.';
  if (!user?.username) return 'Sign in before you play to turn correct answers into FanPoints.';
  if (outcome.pointsAwarded > 0) {
    return `+${outcome.pointsAwarded} FanPoints banked${outcome.perfect ? ', including the perfect-round bonus' : ''}.`;
  }
  return 'No points this round — one correct answer tomorrow is enough to bank some.';
}

export default function QuizPage() {
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['daily-quiz'],
    queryFn: () => fetch(apiUrl('/api/quiz/daily'), { headers: authHeaders() }).then(r => r.json()),
    staleTime: 300_000,
  });

  const questions = data?.questions || [];
  const stats = outcome?.stats ?? data?.stats;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const question = questions[current];

  const shareText = useMemo(() => {
    if (!outcome) return '';
    const dots = outcome.results.map(r => (r.correct ? '🟢' : '🔴')).join('');
    return `I scored ${outcome.score}/${outcome.total} on today's Esportsduniya sports quiz ${dots}\n\nBeat me 👇\n${SITE_URL}/quiz`;
  }, [outcome]);

  const pick = (questionId, optionIndex) => {
    if (outcome) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(apiUrl('/api/quiz/submit'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ date: data?.date, answers }),
      });
      const result = await res.json();
      if (!res.ok || !result?.results) throw new Error(result?.error || 'Could not score your round');
      setOutcome(result);
      if (result.perfect) {
        confetti({ particleCount: 140, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const shareResult = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  };

  return (
    <DashboardLayout
      title="Daily Sports Quiz"
      description="Five questions on cricket, football, basketball, F1 and more — a fresh set every day at midnight IST."
    >
      <Helmet>
        <title>Daily Sports Quiz — Test Your Sports Knowledge | Esportsduniya</title>
        <meta name="description" content="Play the free daily sports quiz: five questions on cricket, football, NBA, F1 and tennis with an explanation for every answer. New round every day, earn FanPoints and build a streak." />
        <meta property="og:title" content="Daily Sports Quiz — Esportsduniya" />
        <meta property="og:description" content="Five fresh sports trivia questions every day, with the story behind every answer." />
        <meta property="og:url" content={`${SITE_URL}/quiz`} />
        <meta property="og:locale" content="en_IN" />
        <link rel="canonical" href={`${SITE_URL}/quiz`} />
      </Helmet>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Today" value={data?.date || '—'} sub={`${questions.length || 5} questions`} />
        <StatTile label="Your streak" value={stats?.streak ?? 0} sub="days in a row" />
        <StatTile label="Best score" value={stats?.bestScore ?? 0} sub={`out of ${questions.length || 5}`} />
        <StatTile label="Rounds played" value={stats?.rounds ?? 0} sub={`${stats?.correctAllTime ?? 0} correct all time`} />
      </div>

      {!user?.username && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
          <strong className="text-foreground">Playing as a guest</strong>
          <p className="mt-1 text-muted">Your answers still get scored. Sign in to bank FanPoints and keep a daily streak.</p>
          <Button className="mt-3" size="sm" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>
            Sign in
          </Button>
        </div>
      )}

      {user?.username && stats?.played && !outcome && (
        <div className="mb-6 rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted">
          You already banked points for {data?.date} with {stats.lastScore}/{questions.length}. Play again for fun — the next scoring round unlocks at midnight IST.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !questions.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted">
            <p>Today’s quiz could not be loaded. Try refreshing in a moment.</p>
          </CardContent>
        </Card>
      ) : outcome ? (
        <div className="space-y-6">
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-data text-4xl font-bold text-accent">{outcome.score}/{outcome.total}</span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-foreground">{scoreVerdict(outcome.score, outcome.total)}</p>
                  <p className="mt-1 text-sm text-muted">{pointsMessage(outcome, user)}</p>
                  {outcome.stats?.streak > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <Flame className="h-4 w-4 text-live" />
                      {outcome.stats.streak} day quiz streak
                    </p>
                  )}
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={shareResult}>
                    <Share2 className="mr-1 h-4 w-4" />Share score
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/">Live scores<ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {outcome.results.map(result => (
            <Card key={result.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {result.correct
                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-win" />
                    : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-live" />}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{result.number}. {result.question}</p>
                    <p className="mt-2 text-sm text-muted">
                      Answer: <span className="text-foreground">{result.options[result.answerIndex]}</span>
                      {!result.correct && result.pickedIndex != null && (
                        <> · you picked <span className="text-foreground">{result.options[result.pickedIndex]}</span></>
                      )}
                      {!result.correct && result.pickedIndex == null && <> · you skipped this one</>}
                    </p>
                    <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {result.explanation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <p className="text-sm text-muted">A new set of five questions unlocks every midnight IST.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Brain className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-muted">Question {question.number} of {questions.length}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>
              <SportPill sport={question.sport} label={question.sport === 'multi' ? 'Multi-sport' : undefined} />
            </div>

            <h2 className="font-display text-xl font-semibold text-foreground text-balance">{question.question}</h2>

            <div className="mt-5 grid gap-2">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === index;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => pick(question.id, index)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      selected
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border bg-surface-1 text-muted hover:border-accent/40 hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <span className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-data text-xs',
                      selected ? 'border-accent text-accent' : 'border-border'
                    )}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {submitError && <p className="mt-4 text-sm text-live">{submitError}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                Back
              </Button>
              {current < questions.length - 1 ? (
                <Button size="sm" onClick={() => setCurrent(c => c + 1)} disabled={answers[question.id] == null}>
                  Next question<ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={submit} disabled={!allAnswered || submitting}>
                  {submitting ? 'Scoring…' : 'See my score'}
                </Button>
              )}
              <span className="ml-auto text-xs text-muted">{answeredCount}/{questions.length} answered</span>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
