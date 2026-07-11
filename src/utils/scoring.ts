import type { RegionalQuestion } from '../types';

export const PASSING_SCORE = 12;

export function scoreAnswers(answers: Record<string, boolean>) {
  return Object.values(answers).filter(Boolean).length;
}

export function hasPassed(answers: Record<string, boolean>) {
  return scoreAnswers(answers) >= PASSING_SCORE;
}

export function missedQuestionIds(answers: Record<string, boolean>, questions: RegionalQuestion[]) {
  return questions.filter((question) => answers[question.id] === false).map((question) => question.id);
}

export function buildRetryQueue(answers: Record<string, boolean>, questions: RegionalQuestion[]) {
  return missedQuestionIds(answers, questions).sort(() => Math.random() - 0.5);
}

export function completedStateCount(answers: Record<string, boolean>, questions: RegionalQuestion[]) {
  return new Set(
    questions.filter((question) => answers[question.id] !== undefined).map((question) => question.stateId),
  ).size;
}
