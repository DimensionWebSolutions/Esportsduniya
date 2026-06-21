import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function sportColor(sport) {
  const map = {
    cricket: 'text-sport-cricket',
    football: 'text-sport-football',
    nba: 'text-sport-nba',
    tennis: 'text-sport-tennis',
    f1: 'text-sport-f1',
  };
  return map[sport] || 'text-accent';
}

export function sportBg(sport) {
  const map = {
    cricket: 'bg-sport-cricket/10 border-sport-cricket/30',
    football: 'bg-sport-football/10 border-sport-football/30',
    nba: 'bg-sport-nba/10 border-sport-nba/30',
    tennis: 'bg-sport-tennis/10 border-sport-tennis/30',
    f1: 'bg-sport-f1/10 border-sport-f1/30',
  };
  return map[sport] || 'bg-accent/10 border-accent/30';
}
