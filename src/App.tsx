import { useEffect, useMemo, useState } from 'react';
import JourneyMap from './components/JourneyMap';
import { getDestination } from './config/destination';
import { pmQuestions } from './data/pmQuestions';
import { regionalQuestions } from './data/regionalQuestions';
import type { RegionalQuestion, Screen, StateId } from './types';
import { buildRetryQueue, completedStateCount, hasPassed, missedQuestionIds, PASSING_SCORE, scoreAnswers } from './utils/scoring';
import { clearJourney, loadJourney, saveJourney } from './utils/storage';

const initialQueue = regionalQuestions.map((question) => question.id);
const pmPracticeMessages = ['A useful practice question—here’s the stronger approach.', 'Good warm-up. The key is to begin with the user problem.', 'That’s exactly what practice is for.', 'You’re getting your product brain moving.'];
const travelCorrectMessages = ['Your route is getting warmer.', 'Another piece of the map unlocked.', 'You’re getting closer.', 'The journey continues.', 'Another state completed.'];
const travelIncorrectMessages = ['A slight detour, but the journey continues.', 'Not quite—keep traveling.', 'Every good trip has a wrong turn.', 'The map is still unfolding.'];

const randomMessage = (messages: string[], seed: number) => messages[seed % messages.length];

function questionById(id: string) {
  return regionalQuestions.find((question) => question.id === id);
}

function answeredStates(answers: Record<string, boolean>): StateId[] {
  return Array.from(new Set(regionalQuestions.filter((question) => answers[question.id] !== undefined).map((question) => question.stateId)));
}

export default function App() {
  const [savedJourney] = useState(() => loadJourney());
  const [screen, setScreen] = useState<Screen>(savedJourney?.screen ?? 'landing');
  const [pmIndex, setPmIndex] = useState(0);
  const [pmSelected, setPmSelected] = useState<number | null>(null);
  const [pmSubmitted, setPmSubmitted] = useState(false);
  const [queue, setQueue] = useState<string[]>(savedJourney?.queue ?? initialQueue);
  const [activeIndex, setActiveIndex] = useState(savedJourney?.activeIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, boolean>>(savedJourney?.answers ?? {});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(savedJourney?.selectedAnswer ?? null);
  const [submitted, setSubmitted] = useState(savedJourney?.submitted ?? false);
  const [retrying, setRetrying] = useState(savedJourney?.retrying ?? false);
  const [restartOpen, setRestartOpen] = useState(false);

  const activeQuestion = useMemo(() => questionById(queue[activeIndex]), [activeIndex, queue]);
  const score = scoreAnswers(answers);
  const missedIds = missedQuestionIds(answers, regionalQuestions);
  const statesDone = completedStateCount(answers, regionalQuestions);
  const completedStates = answeredStates(answers);

  useEffect(() => {
    if (screen === 'journey' || screen === 'results') {
      saveJourney({ screen, queue, activeIndex, answers, selectedAnswer, submitted, retrying });
    }
  }, [activeIndex, answers, queue, retrying, screen, selectedAnswer, submitted]);

  const beginJourney = () => {
    clearJourney();
    setQueue(initialQueue);
    setActiveIndex(0);
    setAnswers({});
    setSelectedAnswer(null);
    setSubmitted(false);
    setRetrying(false);
    setScreen('journey');
  };

  const choosePmAnswer = (index: number) => {
    if (pmSubmitted) return;
    setPmSelected(index);
    setPmSubmitted(true);
  };

  const nextPmQuestion = () => {
    if (pmIndex === pmQuestions.length - 1) {
      setScreen('warmup-complete');
      return;
    }
    setPmIndex((current) => current + 1);
    setPmSelected(null);
    setPmSubmitted(false);
  };

  const chooseRegionalAnswer = (index: number) => {
    if (submitted || !activeQuestion) return;
    const isCorrect = index === activeQuestion.correctIndex;
    setSelectedAnswer(index);
    setSubmitted(true);
    setAnswers((current) => ({ ...current, [activeQuestion.id]: isCorrect }));
  };

  const nextRegionalQuestion = () => {
    if (activeIndex < queue.length - 1) {
      setActiveIndex((current) => current + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
      return;
    }
    const passed = hasPassed(answers);
    setSelectedAnswer(null);
    setSubmitted(false);
    if (passed) {
      clearJourney();
      setScreen('reveal');
    } else {
      setScreen('results');
    }
  };

  const retryMissed = () => {
    const retryQueue = buildRetryQueue(answers, regionalQuestions);
    if (!retryQueue.length) {
      clearJourney();
      setScreen('reveal');
      return;
    }
    setQueue(retryQueue);
    setActiveIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setRetrying(true);
    setScreen('journey');
  };

  const restartGame = () => {
    clearJourney();
    setQueue(initialQueue);
    setActiveIndex(0);
    setAnswers({});
    setSelectedAnswer(null);
    setSubmitted(false);
    setRetrying(false);
    setPmIndex(0);
    setPmSelected(null);
    setPmSubmitted(false);
    setRestartOpen(false);
    setScreen('landing');
  };

  return (
    <main className="site-shell">
      <div className="paper-grain" aria-hidden="true" />
      <nav className="site-nav" aria-label="Game controls">
        <button className="brand-lockup" onClick={() => setRestartOpen(true)} aria-label="Restart Audree’s Northeast Mystery Getaway">
          <span className="brand-mark">✦</span>
          <span>Audree’s Northeast<br />Mystery Getaway</span>
        </button>
        {screen !== 'landing' && <button className="quiet-button" onClick={() => setRestartOpen(true)}>Restart game</button>}
      </nav>

      {screen === 'landing' && <Landing onBegin={() => setScreen('warmup-intro')} />}
      {screen === 'warmup-intro' && <WarmupIntro onStart={() => setScreen('warmup')} onSkip={beginJourney} />}
      {screen === 'warmup' && (
        <PmWarmup
          index={pmIndex}
          selected={pmSelected}
          submitted={pmSubmitted}
          onChoose={choosePmAnswer}
          onNext={nextPmQuestion}
        />
      )}
      {screen === 'warmup-complete' && <WarmupComplete onBegin={beginJourney} />}
      {screen === 'journey' && activeQuestion && (
        <Journey
          question={activeQuestion}
          questionNumber={activeIndex + 1}
          totalQuestions={queue.length}
          selected={selectedAnswer}
          submitted={submitted}
          score={score}
          statesDone={statesDone}
          completedStates={completedStates}
          retrying={retrying}
          onChoose={chooseRegionalAnswer}
          onNext={nextRegionalQuestion}
        />
      )}
      {screen === 'results' && <Results score={score} missedCount={missedIds.length} onRetryFull={beginJourney} onRetryMissed={retryMissed} />}
      {screen === 'reveal' && <DestinationReveal onPlan={() => setScreen('itinerary')} />}
      {screen === 'itinerary' && <WeekendPlan onRestart={() => setRestartOpen(true)} />}

      {restartOpen && <RestartDialog onCancel={() => setRestartOpen(false)} onConfirm={restartGame} />}
    </main>
  );
}

function Landing({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="landing layout-grid">
      <div className="landing-copy rise-in">
        <p className="eyebrow">A weekend dispatch · departing NYC</p>
        <h1>Audree’s Northeast<br /><em>Mystery Getaway</em></h1>
        <p className="lede">We’re leaving from New York. Where are we going?</p>
        <p className="intro-copy">You’ll travel across the Northeast by answering trivia. Score at least 80% to unlock the mystery destination.</p>
        <button className="primary-button" onClick={onBegin}>Begin the Journey <span aria-hidden="true">→</span></button>
        <p className="microcopy">A slow train, a few good questions, one very good weekend.</p>
      </div>
      <div className="landing-map rise-in rise-in--late"><JourneyMap compact /></div>
    </section>
  );
}

function WarmupIntro({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <section className="single-card-section">
      <div className="notebook-card rise-in">
        <div className="notebook-icon" aria-hidden="true">⌁</div>
        <p className="eyebrow">Optional practice · no score</p>
        <h1>Quick PM<br /><em>Brain Warm-Up</em></h1>
        <p>Before the journey begins, here are a few low-pressure product questions to get you thinking like the thoughtful PM you already are.</p>
        <div className="button-row">
          <button className="primary-button" onClick={onStart}>Start the Warm-Up <span aria-hidden="true">→</span></button>
          <button className="text-button" onClick={onSkip}>Skip to the Journey</button>
        </div>
      </div>
    </section>
  );
}

function PmWarmup({ index, selected, submitted, onChoose, onNext }: { index: number; selected: number | null; submitted: boolean; onChoose: (index: number) => void; onNext: () => void }) {
  const question = pmQuestions[index];
  const isCorrect = selected === question.correctIndex;
  const feedback = isCorrect ? question.correctFeedback : randomMessage(pmPracticeMessages, index);
  return (
    <section className="single-card-section warmup-section">
      <div className="warmup-progress" aria-label={`PM Warm-Up: ${index + 1} of ${pmQuestions.length}`}>
        <span>PM Warm-Up: {index + 1} of {pmQuestions.length}</span>
        <div className="progress-track"><i style={{ width: `${((index + 1) / pmQuestions.length) * 100}%` }} /></div>
      </div>
      <QuestionCard
        kicker="Practice only · travel score unaffected"
        title={question.prompt}
        choices={question.choices}
        selected={selected}
        submitted={submitted}
        correctIndex={question.correctIndex}
        onChoose={onChoose}
        feedback={submitted ? feedback : undefined}
        explanation={submitted ? question.explanation : undefined}
        nextLabel={index === pmQuestions.length - 1 ? 'Finish Warm-Up' : 'Next Practice Question'}
        onNext={onNext}
        tone="warmup"
      />
    </section>
  );
}

function WarmupComplete({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="single-card-section">
      <div className="notebook-card completed-card rise-in">
        <div className="sparkle-row" aria-hidden="true">✦ ✦ ✦</div>
        <p className="eyebrow">Warm-up complete</p>
        <h1>You’re Going to Crush<br /><em>the PM Interview</em></h1>
        <p>Lead with your calm, thoughtful self—you’ve got this.</p>
        <button className="primary-button" onClick={onBegin}>Begin the Northeast Journey <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}

function Journey({ question, questionNumber, totalQuestions, selected, submitted, score, statesDone, completedStates, retrying, onChoose, onNext }: { question: RegionalQuestion; questionNumber: number; totalQuestions: number; selected: number | null; submitted: boolean; score: number; statesDone: number; completedStates: StateId[]; retrying: boolean; onChoose: (index: number) => void; onNext: () => void }) {
  const isCorrect = selected === question.correctIndex;
  const feedback = isCorrect ? randomMessage(travelCorrectMessages, questionNumber) : randomMessage(travelIncorrectMessages, questionNumber);
  const progress = Math.round(((questionNumber - (submitted ? 0 : 1)) / totalQuestions) * 100);
  return (
    <section className="journey-section">
      <header className="game-header" aria-label="Regional trivia progress">
        <div><span className="header-label">Regional score</span><strong>{score} / 14</strong></div>
        <div><span className="header-label">Journey progress</span><strong>{Math.max(progress, 0)}%</strong></div>
        <div><span className="header-label">States visited</span><strong>{statesDone} / 7</strong></div>
      </header>
      <div className="journey-layout">
        <aside className="map-panel">
          <JourneyMap currentState={question.stateId} completedStates={completedStates} />
          <div className="state-stamp"><span>NOW EXPLORING</span><strong>{question.stateName}</strong><small>{retrying ? 'A second pass through the route' : 'Two questions per state'}</small></div>
        </aside>
        <div className="question-panel">
          <div className="question-meta"><span>{retrying ? 'RETRY ROUTE' : `QUESTION ${questionNumber} OF 14`}</span><span>{question.stateName} · {question.stateQuestion} of 2</span></div>
          <QuestionCard
            kicker={retrying ? `Retry question ${questionNumber} of ${totalQuestions}` : `Regional trivia · ${questionNumber} of 14`}
            title={question.prompt}
            choices={question.choices}
            selected={selected}
            submitted={submitted}
            correctIndex={question.correctIndex}
            onChoose={onChoose}
            feedback={submitted ? feedback : undefined}
            explanation={submitted ? question.explanation : undefined}
            nextLabel={questionNumber === totalQuestions ? 'See My Route Result' : 'Next Question'}
            onNext={onNext}
            tone="travel"
          />
        </div>
      </div>
    </section>
  );
}

function QuestionCard({ kicker, title, choices, selected, submitted, correctIndex, onChoose, feedback, explanation, nextLabel, onNext, tone }: { kicker: string; title: string; choices: string[]; selected: number | null; submitted: boolean; correctIndex: number; onChoose: (index: number) => void; feedback?: string; explanation?: string; nextLabel: string; onNext: () => void; tone: 'warmup' | 'travel' }) {
  return (
    <article className={`question-card question-card--${tone}`}>
      <p className="card-kicker">{kicker}</p>
      <h2>{title}</h2>
      <div className="answer-list" aria-label="Answer choices">
        {choices.map((choice, index) => {
          const selectedThis = selected === index;
          const status = submitted ? (index === correctIndex ? 'is-correct' : selectedThis ? 'is-incorrect' : '') : selectedThis ? 'is-selected' : '';
          return <button key={choice} className={`answer-button ${status}`} onClick={() => onChoose(index)} disabled={submitted} aria-pressed={selectedThis}>{choice}<span className="answer-symbol" aria-hidden="true">{submitted && index === correctIndex ? '✓' : submitted && selectedThis ? '×' : String.fromCharCode(65 + index)}</span></button>;
        })}
      </div>
      {submitted && feedback && explanation && (
        <div className={`feedback-card ${selected === correctIndex ? 'feedback-card--correct' : 'feedback-card--detour'}`} role="status" aria-live="polite">
          <strong>{feedback}</strong>
          {selected !== correctIndex && <span>Correct answer: {choices[correctIndex]}</span>}
          <p>{explanation}</p>
          <button className="primary-button primary-button--small" onClick={onNext}>{nextLabel} <span aria-hidden="true">→</span></button>
        </div>
      )}
    </article>
  );
}

function Results({ score, missedCount, onRetryFull, onRetryMissed }: { score: number; missedCount: number; onRetryFull: () => void; onRetryMissed: () => void }) {
  const needed = PASSING_SCORE - score;
  return (
    <section className="single-card-section">
      <div className="result-card rise-in">
        <div className="result-illustration" aria-hidden="true">⌁</div>
        <p className="eyebrow">Route paused · {score} of 14 correct</p>
        <h1>The destination is<br /><em>still under wraps.</em></h1>
        <p>Take another trip around the Northeast and try again. You need {needed} more {needed === 1 ? 'correct answer' : 'correct answers'} to unlock the mystery.</p>
        <p className="missed-note">{missedCount} {missedCount === 1 ? 'question is' : 'questions are'} ready for a second look.</p>
        <div className="button-row"><button className="primary-button" onClick={onRetryFull}>Retry the Full Journey <span aria-hidden="true">↻</span></button><button className="secondary-button" onClick={onRetryMissed}>Retry Missed Questions</button></div>
      </div>
    </section>
  );
}

export function DestinationReveal({ onPlan }: { onPlan: () => void }) {
  const destination = getDestination();
  const highlights = ['Beinecke Rare Book & Manuscript Library', 'Yale University Art Gallery', 'Modern Apizza', 'Ozzy’s Apizza', 'Sally’s Apizza', 'Wooster Square', 'Gaia'];
  return (
    <section className="reveal-section rise-in">
      <div className="reveal-map"><JourneyMap reveal compact /></div>
      <div className="confetti-icons" aria-hidden="true"><span>✦</span><span>◒</span><span>▤</span><span>✦</span><span>◒</span></div>
      <p className="eyebrow">Mystery solved · all aboard</p>
      <h1>We’re Going to<br /><em>{destination.city}, {destination.state}!</em></h1>
      <p className="reveal-copy">Pack your appetite. We’re heading to {destination.city} for Yale, art, books, wine, and a very serious amount of apizza.</p>
      <div className="highlight-grid">
        {highlights.map((highlight, index) => <div className="highlight-card" key={highlight}><span aria-hidden="true">{['▤', '◐', '◒', '◒', '◒', '✦', '⌁'][index]}</span>{highlight}</div>)}
      </div>
      <button className="primary-button" onClick={onPlan}>See the Weekend Plan <span aria-hidden="true">→</span></button>
    </section>
  );
}

function WeekendPlan({ onRestart }: { onRestart: () => void }) {
  const destination = getDestination();
  const sunday = [`Arrive in ${destination.city}`, 'Beinecke Rare Book & Manuscript Library', 'Check in and refresh', 'Yale campus stroll', 'Yale University Art Gallery', 'Modern Apizza', 'Gaia'];
  const monday = ['You’re Going to Crush the PM Interview', 'Coffee and Yale wandering', 'Ozzy’s Apizza', 'Chapel Street browsing', 'Wooster Square stroll', 'Sally’s Apizza', 'Train back to NYC'];
  return (
    <section className="itinerary-section rise-in">
      <p className="eyebrow">The weekend plan · two days, one good appetite</p>
      <h1>{destination.city}, <em>by rail.</em></h1>
      <div className="itinerary-grid">
        <ItineraryDay day="Sunday" subtitle="Pizza, arts, and a little Yale magic." items={sunday} />
        <ItineraryDay day="Monday" subtitle="A perfect little pizza pilgrimage." items={monday} monday />
      </div>
      <button className="secondary-button" onClick={onRestart}>Plan another route</button>
    </section>
  );
}

function ItineraryDay({ day, subtitle, items, monday = false }: { day: string; subtitle: string; items: string[]; monday?: boolean }) {
  return <article className="day-card"><p className="day-label">Day {monday ? 'II' : 'I'}</p><h2>{day}</h2><ol>{items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item}</strong>{monday && index === 0 && <small>Lead with your calm, thoughtful self—you’ve got this.</small>}</div></li>)}</ol><p className="day-footer">{subtitle}</p></article>;
}

function RestartDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section className="restart-dialog" role="alertdialog" aria-modal="true" aria-labelledby="restart-title" aria-describedby="restart-copy"><p className="eyebrow">Fresh ticket?</p><h2 id="restart-title">Restart this journey?</h2><p id="restart-copy">Your saved regional progress will be cleared and you’ll return to the beginning.</p><div className="button-row"><button className="secondary-button" onClick={onCancel}>Keep traveling</button><button className="primary-button primary-button--small" onClick={onConfirm}>Restart game</button></div></section></div>;
}
