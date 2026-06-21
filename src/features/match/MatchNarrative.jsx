import { useEffect, useState } from 'react';
import { apiUrl } from '@/config/apiBase';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/section';

export function MatchNarrative({ match, tone = 'casual' }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!match) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/ai/narrative'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchContext: match, tone }),
      });
      const data = await res.json();
      setText(data.narrative || data.text || 'Analysis unavailable.');
    } catch {
      setText('Could not load AI narrative.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [match?.id, tone]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI match analyst</CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">{text}</p>
        )}
      </CardContent>
    </Card>
  );
}
