# The Northeast Mystery Getaway

A mobile-friendly, travel-poster-inspired trivia game. Start in New York City, answer regional trivia, and earn 12 of 14 correct answers to reveal a surprise weekend destination.

## Game flow

1. Landing screen with a stylized Northeast map and NYC departure point.
2. Optional six-question PM practice warm-up. It is encouraging, score-free, and never affects the trip.
3. Fourteen regional questions across seven states.
4. A passing score unlocks the reveal and a two-day itinerary; otherwise players can retry either the full route or only missed questions.

Regional progress is saved to browser local storage, so an accidental refresh keeps the current route.

## Screenshots

Add screenshots here after deployment:

- Landing map
- PM warm-up
- Trivia route
- Destination reveal
- Weekend itinerary

## Local setup

Requires Node.js 20.19+, 22.12+, or 24+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Useful commands:

```bash
npm test
npm run build
npm run preview
```

## Editing the game

- PM practice questions live in `src/data/pmQuestions.ts`.
- Regional trivia lives in `src/data/regionalQuestions.ts`.
- The passing threshold and retry helpers are in `src/utils/scoring.ts`.
- The hidden destination is configured in `src/config/destination.ts`.

The city and state use character-code reconstruction as light spoiler deterrence. This only prevents casual source spoilers; it is not real security because browser-delivered code can always be inspected.

## Accessibility

The game uses semantic buttons, keyboard-operable answers, visible focus styles, live feedback, readable contrast, touch-sized controls, map text alternatives, and a reduced-motion mode.

## GitHub Pages deployment

The included workflow at `.github/workflows/deploy-pages.yml` tests, builds, and deploys on pushes to `main`.

1. Push the repository to GitHub.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Push to `main` or run the workflow manually from the Actions tab.

The workflow supplies `VITE_BASE_PATH=/<repository-name>/`, so Vite assets load correctly from a GitHub Pages repository subpath. For a custom local deployment path, set `VITE_BASE_PATH` before `npm run build`.
