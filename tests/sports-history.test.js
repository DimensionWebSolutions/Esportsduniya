import { describe, it, expect } from 'vitest';
import {
  HISTORICAL_EVENTS,
  HISTORY_SPORTS,
  anniversariesFor,
  eventYear,
  isAnniversary,
  parseEventDate,
} from '../src/data/sports-history.js';

const ERAS = ['vintage', 'retro', 'digital', 'modern'];

describe('history archive', () => {
  it('has unique ids and a parseable date for every moment', () => {
    const ids = HISTORICAL_EVENTS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const event of HISTORICAL_EVENTS) {
      expect(parseEventDate(event.date), `unparseable date on ${event.id}`).not.toBeNull();
      expect(ERAS).toContain(event.era);
      expect(event.stats.length).toBeGreaterThanOrEqual(1);
      expect(event.description.length).toBeGreaterThan(80);
    }
  });

  it('covers every era and more than one sport', () => {
    for (const era of ERAS) {
      expect(HISTORICAL_EVENTS.some(e => e.era === era)).toBe(true);
    }
    expect(HISTORY_SPORTS.length).toBeGreaterThan(4);
  });

  it('orders eras chronologically so the timeline reads top to bottom', () => {
    const years = HISTORICAL_EVENTS.map(eventYear);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe('date helpers', () => {
  it('parses the archive date format', () => {
    expect(parseEventDate('June 25, 1983')).toEqual({ month: 6, day: 25, year: 1983 });
    expect(parseEventDate('May 26, 1928')).toEqual({ month: 5, day: 26, year: 1928 });
  });

  it('returns null for anything it cannot read', () => {
    expect(parseEventDate('25/06/1983')).toBeNull();
    expect(parseEventDate('Someday in 1983')).toBeNull();
    expect(parseEventDate(undefined)).toBeNull();
  });

  it('matches anniversaries on day and month only', () => {
    const event = { date: 'June 25, 1983' };
    expect(isAnniversary(event, new Date(2026, 5, 25))).toBe(true);
    expect(isAnniversary(event, new Date(2030, 5, 25))).toBe(true);
    expect(isAnniversary(event, new Date(2026, 5, 26))).toBe(false);
    expect(isAnniversary(event, new Date(2026, 6, 25))).toBe(false);
  });

  it('finds the moments that share today’s date', () => {
    const found = anniversariesFor(new Date(2026, 5, 25));
    expect(found.map(e => e.id)).toContain('h5');
  });

  it('reads the year off an event', () => {
    expect(eventYear({ date: 'December 18, 2022' })).toBe(2022);
    expect(eventYear({ date: 'nonsense' })).toBeNull();
  });
});
