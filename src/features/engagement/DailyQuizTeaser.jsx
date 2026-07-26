import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Brain, Flame, ArrowRight } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/section';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function DailyQuizTeaser() {
  const { data, isLoading } = useQuery({
    queryKey: ['daily-quiz'],
    queryFn: () => fetch(apiUrl('/api/quiz/daily'), { headers: authHeaders() }).then(r => r.json()),
    staleTime: 300_000,
  });

  const questions = data?.questions || [];
  const stats = data?.stats;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Brain className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display font-semibold text-foreground">Daily sports quiz</h3>
            <p className="text-xs text-muted">
              {questions.length || 5} questions · new set every midnight IST
            </p>
          </div>
          {stats?.streak > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted">
              <Flame className="h-3.5 w-3.5 text-live" />{stats.streak}d
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="mt-4 h-10 w-full" />
        ) : questions.length ? (
          <p className="mt-4 line-clamp-2 text-sm text-muted">
            Today opens with: <span className="text-foreground">{questions[0].question}</span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Trivia across cricket, football, basketball, F1 and tennis — with the story behind every answer.
          </p>
        )}

        <div className="mt-auto pt-4">
          <Button size="sm" asChild>
            <Link to="/quiz">
              {stats?.played ? 'See today’s answers' : 'Play today’s quiz'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
