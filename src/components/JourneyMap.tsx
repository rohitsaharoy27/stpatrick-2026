import type { StateId } from '../types';

interface JourneyMapProps {
  currentState?: StateId;
  completedStates?: StateId[];
  reveal?: boolean;
  compact?: boolean;
}

const statePaths: Array<{ id: StateId; label: string; path: string; labelX: number; labelY: number }> = [
  { id: 'ny', label: 'New York', path: 'M43 106 143 100 165 128 151 171 61 176 35 145Z', labelX: 96, labelY: 142 },
  { id: 'nj', label: 'New Jersey', path: 'm160 174 28-6 12 42-13 39-15-12-13-42Z', labelX: 181, labelY: 202 },
  { id: 'pa', label: 'Pennsylvania', path: 'm48 177 114-1 11 47-120 4-17-25Z', labelX: 107, labelY: 204 },
  { id: 'vt', label: 'Vermont', path: 'm177 71 24 1 7 73-25 3-8-44Z', labelX: 191, labelY: 110 },
  { id: 'ma', label: 'Massachusetts', path: 'm207 129 70-13 12 22-76 18Z', labelX: 247, labelY: 138 },
  { id: 'ri', label: 'Rhode Island', path: 'm281 147 14-4 5 23-13 5Z', labelX: 292, labelY: 161 },
  { id: 'ct', label: 'Connecticut', path: 'm203 160 75-13 6 23-73 16Z', labelX: 240, labelY: 172 },
];

export default function JourneyMap({ currentState, completedStates = [], reveal = false, compact = false }: JourneyMapProps) {
  const completed = new Set(completedStates);
  const routeVisible = completed.size > 0 || reveal;
  const title = reveal ? 'Northeast route complete' : 'Stylized map of the Northeast travel route';

  return (
    <div className={`map-shell ${compact ? 'map-shell--compact' : ''}`}>
      <span className="map-kicker" aria-hidden="true">TRAVEL MAP · EASTERN LINE</span>
      <svg className="journey-map" viewBox="0 0 340 280" role="img" aria-labelledby="map-title map-description">
        <title id="map-title">{title}</title>
        <desc id="map-description">New York City is the beginning of a regional trivia route through seven northeastern states.</desc>
        <path className="coastline" d="M277 111c17 21 27 47 30 88l-13 43-22 18-6-29 14-60-6-36Z" />
        <path className="background-state" d="m202 70 37-5 13 50-43 8Z" />
        <text className="background-label" x="226" y="96">N.H.</text>
        <path className="background-state" d="m244 50 51-9 23 68-65 8Z" />
        <text className="background-label" x="281" y="80">ME</text>
        {routeVisible && <path className={`route-line ${reveal ? 'route-line--revealed' : ''}`} d="M122 168 C137 151 152 149 171 143 S206 151 228 160" />}
        {statePaths.map((state) => {
          const isCurrent = currentState === state.id;
          const isCompleted = completed.has(state.id);
          return (
            <g key={state.id} className={`map-state ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-completed' : ''}`}>
              <path d={state.path} />
              <text x={state.labelX} y={state.labelY}>{state.label}</text>
            </g>
          );
        })}
        <g className="nyc-marker" aria-label="New York City starting point">
          <circle cx="122" cy="168" r="8" />
          <circle cx="122" cy="168" r="3" />
          <text x="100" y="191">NYC</text>
        </g>
        {reveal && (
          <g className="arrival-pin" aria-label="Final destination pin">
            <path d="M228 148c-7 0-12 5-12 12 0 8 12 22 12 22s12-14 12-22c0-7-5-12-12-12Z" />
            <circle cx="228" cy="160" r="3" />
          </g>
        )}
      </svg>
      <span className="map-caption">{reveal ? 'Route complete' : 'Starting from New York City'}</span>
    </div>
  );
}
