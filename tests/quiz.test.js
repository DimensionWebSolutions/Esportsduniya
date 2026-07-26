import { describe, it, expect } from 'vitest';
import {
  QUIZ_QUESTIONS,
  QUIZ_LENGTH,
  POINTS_PER_CORRECT,
  PERFECT_ROUND_BONUS,
  getDailyQuiz,
  gradeQuiz,
  quizDateKey,
  isValidDateKey,
  toPublicQuestion,
} from '../lib/quiz-bank.js';

describe('quiz bank', () => {
  it('has unique question ids and valid answers', () => {
    const ids = QUIZ_QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const question of QUIZ_QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(20);
      expect(new Set(question.options).size).toBe(question.options.length);
    }
  });

  it('holds enough questions to keep daily rounds varied', () => {
    expect(QUIZ_QUESTIONS.length).toBeGreaterThanOrEqual(QUIZ_LENGTH * 5);
  });
});

describe('daily selection', () => {
  it('is deterministic for a given date', () => {
    const first = getDailyQuiz('2026-07-26');
    const second = getDailyQuiz('2026-07-26');
    expect(first.questions.map(q => q.id)).toEqual(second.questions.map(q => q.id));
  });

  it('returns a full round of distinct questions', () => {
    const { questions } = getDailyQuiz('2026-01-01');
    expect(questions).toHaveLength(QUIZ_LENGTH);
    expect(new Set(questions.map(q => q.id)).size).toBe(QUIZ_LENGTH);
  });

  it('caps a round at two questions per sport', () => {
    for (const date of ['2026-03-14', '2026-06-30', '2026-11-05']) {
      const counts = {};
      for (const question of getDailyQuiz(date).questions) {
        counts[question.sport] = (counts[question.sport] || 0) + 1;
      }
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
    }
  });

  it('varies the round between days', () => {
    const monday = getDailyQuiz('2026-07-27').questions.map(q => q.id);
    const tuesday = getDailyQuiz('2026-07-28').questions.map(q => q.id);
    expect(monday).not.toEqual(tuesday);
  });
});

describe('public question shape', () => {
  it('never leaks the answer or explanation to the browser', () => {
    const [question] = getDailyQuiz('2026-07-26').questions;
    const published = toPublicQuestion(question, 0);
    expect(published).not.toHaveProperty('answer');
    expect(published).not.toHaveProperty('explanation');
    expect(published.number).toBe(1);
    expect(published.options).toEqual(question.options);
  });
});

describe('grading', () => {
  const date = '2026-07-26';

  it('scores a perfect round with the bonus', () => {
    const { questions } = getDailyQuiz(date);
    const answers = Object.fromEntries(questions.map(q => [q.id, q.answer]));
    const graded = gradeQuiz(date, answers);

    expect(graded.score).toBe(QUIZ_LENGTH);
    expect(graded.perfect).toBe(true);
    expect(graded.points).toBe(QUIZ_LENGTH * POINTS_PER_CORRECT + PERFECT_ROUND_BONUS);
    expect(graded.results.every(r => r.correct)).toBe(true);
  });

  it('treats missing and malformed answers as wrong without throwing', () => {
    const graded = gradeQuiz(date, { nope: 'x' });
    expect(graded.score).toBe(0);
    expect(graded.points).toBe(0);
    expect(graded.perfect).toBe(false);
    expect(graded.results).toHaveLength(QUIZ_LENGTH);
    expect(graded.results.every(r => r.pickedIndex === null)).toBe(true);
  });

  it('returns an explanation for every question so players learn something', () => {
    const graded = gradeQuiz(date, {});
    expect(graded.results.every(r => r.explanation && r.options.length)).toBe(true);
  });

  it('scores partial rounds and awards no perfect bonus', () => {
    const { questions } = getDailyQuiz(date);
    const answers = Object.fromEntries(questions.map((q, i) => [q.id, i < 3 ? q.answer : (q.answer + 1) % q.options.length]));
    const graded = gradeQuiz(date, answers);

    expect(graded.score).toBe(3);
    expect(graded.perfect).toBe(false);
    expect(graded.points).toBe(3 * POINTS_PER_CORRECT);
  });
});

describe('quiz date key', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(isValidDateKey(quizDateKey(new Date('2026-07-26T12:00:00Z')))).toBe(true);
  });

  it('rolls over at midnight IST, not UTC', () => {
    // 19:00 UTC on 26 July is already 00:30 IST on 27 July.
    expect(quizDateKey(new Date('2026-07-26T19:00:00Z'))).toBe('2026-07-27');
    expect(quizDateKey(new Date('2026-07-26T17:00:00Z'))).toBe('2026-07-26');
  });

  it('rejects junk date keys', () => {
    expect(isValidDateKey('yesterday')).toBe(false);
    expect(isValidDateKey('2026-7-2')).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
  });
});
