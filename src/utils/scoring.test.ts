import { describe, expect, it } from 'vitest';
import { regionalQuestions } from '../data/regionalQuestions';
import { buildRetryQueue, hasPassed, missedQuestionIds, PASSING_SCORE, scoreAnswers } from './scoring';

describe('regional scoring', () => {
  const allCorrect = Object.fromEntries(regionalQuestions.map((question) => [question.id, true]));

  it('passes at 12 correct answers and fails at 11', () => {
    const twelveCorrect = { ...allCorrect, 'ct-1': false, 'ct-2': false };
    const elevenCorrect = { ...twelveCorrect, 'ri-2': false };

    expect(scoreAnswers(twelveCorrect)).toBe(PASSING_SCORE);
    expect(hasPassed(twelveCorrect)).toBe(true);
    expect(scoreAnswers(elevenCorrect)).toBe(11);
    expect(hasPassed(elevenCorrect)).toBe(false);
  });

  it('creates retry queues from missed regional questions only', () => {
    const answers = { ...allCorrect, 'nj-1': false, 'ma-2': false };
    const missed = missedQuestionIds(answers, regionalQuestions);
    const retryQueue = buildRetryQueue(answers, regionalQuestions);

    expect(missed).toEqual(['nj-1', 'ma-2']);
    expect(retryQueue).toHaveLength(2);
    expect(retryQueue).toEqual(expect.arrayContaining(missed));
  });
});
