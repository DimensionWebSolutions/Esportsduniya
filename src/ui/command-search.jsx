import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, Trophy, Radio, BarChart3, Clock, Users, BookOpen, Settings } from 'lucide-react';
import { Dialog, DialogContent } from '@/ui/dialog';
import { cn } from '@/lib/utils';

const PAGES = [
  { label: 'Live Scores', path: '/', icon: Radio },
  { label: 'Prediction Arena', path: '/arena', icon: Trophy },
  { label: 'Standings', path: '/standings', icon: BarChart3 },
  { label: 'Leaderboard', path: '/leaderboard', icon: Users },
  { label: 'Time Machine', path: '/timemachine', icon: Clock },
  { label: 'Crowd Pulse', path: '/crowdpulse', icon: Users },
  { label: 'Stories', path: '/blog', icon: BookOpen },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Profile', path: '/profile', icon: Settings },
];

export function CommandSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange]);

  const go = (path) => {
    navigate(path);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <Command className="bg-surface-1" shouldFilter>
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages..."
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted">No results.</Command.Empty>
            <Command.Group heading="Navigate" className="text-xs text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {PAGES.map(({ label, path, icon: Icon }) => (
                <Command.Item
                  key={path}
                  value={label}
                  onSelect={() => go(path)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm aria-selected:bg-surface-2'
                  )}
                >
                  <Icon className="h-4 w-4 text-muted" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
