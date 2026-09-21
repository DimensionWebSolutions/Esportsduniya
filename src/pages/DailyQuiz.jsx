import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Timer, Share2, RotateCcw, Trophy, Zap } from 'lucide-react';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';
import { trackEvent, EVENTS } from '@/services/analytics';

const QUIZ_BANK = [
  // Cricket
  { id: 'q1', sport: 'cricket', difficulty: 'easy', q: 'Who holds the record for the highest individual score in Test cricket?', options: ['Brian Lara', 'Don Bradman', 'Sachin Tendulkar', 'Garfield Sobers'], answer: 0, fact: 'Brian Lara scored 400* against England in Antigua, 2004.' },
  { id: 'q2', sport: 'cricket', difficulty: 'medium', q: 'In what year did India win its first Cricket World Cup?', options: ['1979', '1983', '1987', '1992'], answer: 1, fact: 'Kapil Dev\'s India beat West Indies in the 1983 World Cup Final at Lord\'s.' },
  { id: 'q3', sport: 'cricket', difficulty: 'hard', q: 'How many sixes did Sachin Tendulkar hit in his 200* ODI innings vs South Africa?', options: ['10', '25', '3', '6'], answer: 1, fact: 'Sachin smashed 25 fours and 3 sixes in that historic 200* innings in 2010.' },
  { id: 'q4', sport: 'cricket', difficulty: 'easy', q: 'What is the maximum number of overs per team in a T20 match?', options: ['20', '50', '15', '30'], answer: 0, fact: 'T20 cricket limits each team to exactly 20 overs — hence the name.' },
  // Football
  { id: 'q5', sport: 'football', difficulty: 'easy', q: 'Which country has won the most FIFA World Cups?', options: ['Germany', 'Argentina', 'Brazil', 'Italy'], answer: 2, fact: 'Brazil has won 5 World Cups — 1958, 1962, 1970, 1994, and 2002.' },
  { id: 'q6', sport: 'football', difficulty: 'medium', q: 'Who scored the "Goal of the Century" in the 1986 World Cup?', options: ['Pelé', 'Ronaldo', 'Diego Maradona', 'Zinedine Zidane'], answer: 2, fact: 'Maradona dribbled past 6 England players in 11 seconds — voted greatest goal ever.' },
  { id: 'q7', sport: 'football', difficulty: 'hard', q: 'What was the score when Germany beat Brazil in the 2014 World Cup semi-final?', options: ['5-1', '7-1', '6-0', '4-1'], answer: 1, fact: 'Germany scored 5 goals in 18 minutes during the "Mineirazo" to win 7-1.' },
  // NBA
  { id: 'q8', sport: 'nba', difficulty: 'easy', q: 'How many NBA championships did Michael Jordan win?', options: ['5', '4', '6', '7'], answer: 2, fact: 'Jordan won 6 rings with Chicago Bulls — all 6 Finals, he was Finals MVP.' },
  { id: 'q9', sport: 'nba', difficulty: 'medium', q: 'Who holds the NBA record for most points scored in a single game?', options: ['Kobe Bryant', 'Wilt Chamberlain', 'LeBron James', 'Michael Jordan'], answer: 1, fact: 'Wilt Chamberlain scored 100 points for Philadelphia Warriors vs Knicks in 1962.' },
  // F1
  { id: 'q10', sport: 'f1', difficulty: 'easy', q: 'Which constructor has won the most F1 Constructors Championships?', options: ['McLaren', 'Red Bull', 'Ferrari', 'Mercedes'], answer: 2, fact: 'Ferrari has won 16 Constructors titles — the most in F1 history.' },
  { id: 'q11', sport: 'f1', difficulty: 'medium', q: 'Who is the youngest F1 World Champion ever?', options: ['Lewis Hamilton', 'Max Verstappen', 'Sebastian Vettel', 'Ayrton Senna'], answer: 2, fact: 'Sebastian Vettel became champion at 23 years and 134 days old in 2010.' },
  // Tennis
  { id: 'q12', sport: 'tennis', difficulty: 'easy', q: 'How many Grand Slams has Novak Djokovic won (as of 2024)?', options: ['20', '22', '23', '24'], answer: 3, fact: 'Djokovic won his 24th Grand Slam at the 2023 US Open, the all-time record.' },
  { id: 'q13', sport: 'tennis', difficulty: 'medium', q: 'Which surface is the French Open played on?', options: ['Grass', 'Hard', 'Clay', 'Carpet'], answer: 2, fact: 'Roland Garros uses red clay — making it the most physically demanding Slam.' },
  // General
  { id: 'q14', sport: 'general', difficulty: 'easy', q: 'How many players are on a basketball team on the court at once?', options: ['4', '5', '6', '7'], answer: 1, fact: 'Five players per team — point guard, shooting guard, small forward, power forward, center.' },
  { id: 'q15', sport: 'general', difficulty: 'medium', q: 'Which city hosted the most Olympic Games (Summer + Winter)?', options: ['Paris', 'Tokyo', 'London', 'Los Angeles'], answer: 2, fact: 'London hosted in 1908, 1948, and 2012 — more than any other city.' },
];

function getDailyQuestions() {
  // Seed based on today's date for consistent daily questions
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffled = [...QUIZ_BANK].sort((a, b) => {
    const ha = Math.sin(seed + a.id.charCodeAt(1)) * 10000;
    const hb = Math.sin(seed + b.id.charCodeAt(1)) * 10000;
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
  });
  return shuffled.slice(0, 5);
}

const SPORT_COLORS = {
  cricket: '#22c55e', football: '#3b82f6', nba: '#f97316',
  tennis: '#eab308', f1: '#ef4444', general: '#a855f7',
};
const SPORT_ICONS = {
  cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️', general: '🌐',
};
const DIFF_COLORS = { easy: '#34c759', medium: '#f59e0b', hard: '#ef4444' };

function QuizComplete({ score, total, streak, onRestart }) {
  const pct = Math.round((score / total) * 100);
  const msg = pct === 100 ? '🏆 Perfect Score!' : pct >= 80 ? '🔥 Outstanding!' : pct >= 60 ? '👍 Nice work!' : '📚 Keep practising!';

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-accent/30 bg-accent/10">
        <span className="font-mono text-4xl font-black text-accent">{score}/{total}</span>
        <span className="absolute -top-2 -right-2 text-3xl">
          {pct === 100 ? '🏆' : pct >= 80 ? '🔥' : pct >= 60 ? '⭐' : '📚'}
        </span>
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{msg}</h2>
        <p className="mt-1 text-muted">You got {score} out of {total} questions correct</p>
        {streak > 0 && (
          <p className="mt-2 text-sm font-medium text-amber-400">🔥 {streak}-day streak — keep it going!</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={onRestart} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />Try again
        </Button>
        <Button onClick={() => {
          const text = `I scored ${score}/${total} on today's Esportsduniya Sports Quiz! 🏆 Try it: esportsduniya.in/quiz`;
          if (navigator.share) navigator.share({ text });
          else navigator.clipboard?.writeText(text);
        }}>
          <Share2 className="mr-2 h-4 w-4" />Share result
        </Button>
      </div>
    </div>
  );
}

export default function DailyQuiz() {
  const [questions] = useState(getDailyQuestions);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [streak, setStreak] = useState(0);
  const [showFact, setShowFact] = useState(false);

  const q = questions[current];
  const color = SPORT_COLORS[q?.sport] || '#00c2ff';

  // Load streak
  useEffect(() => {
    const saved = parseInt(localStorage.getItem('esd_quiz_streak') || '0');
    setStreak(saved);
  }, []);

  // Timer
  useEffect(() => {
    if (confirmed || done) return;
    setTimeLeft(20);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          handleConfirm(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [current, confirmed]);

  const handleConfirm = useCallback((sel) => {
    if (confirmed) return;
    const choice = sel ?? selected;
    setSelected(choice);
    setConfirmed(true);
    setShowFact(true);
    if (choice === q.answer) setScore(s => s + 1);
  }, [confirmed, selected, q]);

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      // Save streak
      const today = new Date().toDateString();
      const lastPlay = localStorage.getItem('esd_quiz_lastplay');
      if (lastPlay !== today) {
        const newStreak = streak + 1;
        localStorage.setItem('esd_quiz_streak', newStreak);
        localStorage.setItem('esd_quiz_lastplay', today);
        setStreak(newStreak);
      }
      setDone(true);
      trackEvent(EVENTS.VIEW_MATCH, { feature: 'quiz_complete', score });
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
      setShowFact(false);
    }
  };

  const handleRestart = () => {
    setCurrent(0); setSelected(null); setConfirmed(false);
    setScore(0); setDone(false); setShowFact(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Helmet>
        <title>Daily Sports Quiz | Esportsduniya</title>
        <meta name="description" content="Test your sports knowledge with a daily 5-question quiz covering cricket, football, NBA, tennis, and F1." />
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Daily Quiz</span>
          {streak > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
              🔥 {streak}d streak
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">Sports Knowledge Test</h1>
        <p className="mt-2 text-muted">5 questions · Fresh every day · Earn FanPoints</p>
      </div>

      {done ? (
        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <QuizComplete score={score} total={questions.length} streak={streak} onRestart={handleRestart} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i < current ? 'bg-accent' : i === current ? 'bg-accent/50' : 'bg-white/10')} style={{ width: 32 }} />
              ))}
            </div>
            <span className="ml-auto text-xs text-muted font-mono">{current + 1}/{questions.length}</span>
          </div>

          {/* Question card */}
          <div
            className="relative overflow-hidden rounded-2xl border p-6"
            style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}08 0%, #12151a 100%)` }}
          >
            {/* Timer ring */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{SPORT_ICONS[q.sport]}</span>
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{q.sport}</span>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: `${DIFF_COLORS[q.difficulty]}20`, color: DIFF_COLORS[q.difficulty] }}>
                  {q.difficulty}
                </span>
              </div>
              <div className={cn('flex items-center gap-1.5 font-mono text-sm font-bold', timeLeft <= 5 ? 'text-red-400' : 'text-muted')}>
                <Timer className="h-3.5 w-3.5" />
                {timeLeft}s
              </div>
            </div>

            {/* Timer bar */}
            <div className="mb-5 h-0.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 20) * 100}%`, background: timeLeft <= 5 ? '#ef4444' : color }}
              />
            </div>

            <h2 className="mb-5 font-display text-lg font-semibold leading-snug text-foreground">{q.q}</h2>

            {/* Options */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.answer;
                const isSelected = i === selected;
                let bg = 'bg-surface-2 border-border hover:border-border hover:bg-surface-3';
                if (confirmed) {
                  if (isCorrect) bg = 'bg-green-500/15 border-green-500/40 text-green-300';
                  else if (isSelected && !isCorrect) bg = 'bg-red-500/15 border-red-500/40 text-red-300';
                  else bg = 'bg-surface-2 border-border opacity-40';
                } else if (isSelected) {
                  bg = 'border-accent/40 bg-accent/10 text-accent';
                }
                return (
                  <button
                    key={i}
                    onClick={() => !confirmed && (setSelected(i))}
                    onDoubleClick={() => !confirmed && handleConfirm(i)}
                    disabled={confirmed}
                    className={cn('flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all', bg)}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                    {confirmed && isCorrect && <span className="ml-auto text-green-400">✓</span>}
                    {confirmed && isSelected && !isCorrect && <span className="ml-auto text-red-400">✗</span>}
                  </button>
                );
              })}
            </div>

            {/* Fact reveal */}
            {showFact && (
              <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-3">
                <p className="text-xs font-medium text-accent">💡 Did you know?</p>
                <p className="mt-1 text-sm text-foreground/80">{q.fact}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!confirmed ? (
              <Button onClick={() => handleConfirm(selected)} disabled={selected === null} className="flex-1">
                <Zap className="mr-2 h-4 w-4" />Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="flex-1" style={{ background: color, color: 'white' }}>
                {current + 1 >= questions.length ? (
                  <><Trophy className="mr-2 h-4 w-4" />See Results</>
                ) : (
                  <>Next Question →</>
                )}
              </Button>
            )}
            <span className="text-xs text-muted">Score: <span className="font-mono font-bold text-accent">{score}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
