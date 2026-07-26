import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { buildMatchContext } from '@/services/apiService';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { cn } from '@/lib/utils';

const STARTER_QUESTIONS = [
  'Explain the current momentum',
  'Who is the standout player so far?',
  'Any tactical changes to watch for?',
];

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function MatchAskOracle({ match }) {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi, I'm The Oracle. Ask me anything about this match, the players, or the tactics." },
  ]);
  const [suggestions, setSuggestions] = useState(STARTER_QUESTIONS);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [gate, setGate] = useState(null); // 'auth' | 'premium' | null
  const historyRef = useRef([]);
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  const send = async (question) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setGate(null);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch(apiUrl('/api/ai/oracle'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          matchContext: buildMatchContext(match),
          question: text,
          history: historyRef.current,
        }),
      });

      if (res.status === 401) {
        setGate('auth');
        setMessages(prev => [...prev, { role: 'ai', text: 'Sign in to ask The Oracle.' }]);
        return;
      }
      if (res.status === 403) {
        setGate('premium');
        setMessages(prev => [...prev, { role: 'ai', text: 'The Oracle chat is a Pro feature. Upgrade to keep asking.' }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Even the Oracle hits blocks sometimes. Try again in a moment!" }]);
        return;
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.answer || 'No answer available.' }]);
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: text },
        { role: 'assistant', content: data.answer },
      ].slice(-6);
      setSuggestions(Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length ? data.suggestedQuestions : STARTER_QUESTIONS);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Even the Oracle hits blocks sometimes. Try again in a moment!" }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" />
          Ask The Oracle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={scrollRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'ml-auto bg-accent/15 text-foreground'
                  : 'bg-surface-2 text-muted'
              )}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="max-w-[90%] rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              Consulting the stars...
            </div>
          )}
        </div>

        {gate === 'premium' && (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link to="/pricing">Upgrade to Pro</Link>
          </Button>
        )}
        {gate === 'auth' && (
          <Button size="sm" variant="outline" className="w-full" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>
            Sign in
          </Button>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => send(q)}
                disabled={loading}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAuthenticated ? 'Ask The Oracle...' : 'Sign in to chat with The Oracle'}
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
