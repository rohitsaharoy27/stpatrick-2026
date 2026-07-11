import type { SavedJourney } from '../types';

export const STORAGE_KEY = 'northeast-mystery-getaway-progress';

export function loadJourney(): SavedJourney | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedJourney;
    return saved.queue?.length ? saved : null;
  } catch {
    return null;
  }
}

export function saveJourney(journey: SavedJourney) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
}

export function clearJourney() {
  window.localStorage.removeItem(STORAGE_KEY);
}
