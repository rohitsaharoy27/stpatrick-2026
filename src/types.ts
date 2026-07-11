export type StateId = 'ny' | 'nj' | 'pa' | 'vt' | 'ma' | 'ri' | 'ct';

export interface ChoiceQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface PmQuestion extends ChoiceQuestion {
  correctFeedback: string;
}

export interface RegionalQuestion extends ChoiceQuestion {
  stateId: StateId;
  stateName: string;
  stateQuestion: number;
}

export type Screen =
  | 'landing'
  | 'warmup-intro'
  | 'warmup'
  | 'warmup-complete'
  | 'journey'
  | 'results'
  | 'reveal'
  | 'itinerary';

export interface SavedJourney {
  screen: 'journey' | 'results';
  queue: string[];
  activeIndex: number;
  answers: Record<string, boolean>;
  selectedAnswer: number | null;
  submitted: boolean;
  retrying: boolean;
}
