# 🍀 Lucky Drop Invite Game

A lightweight mobile-friendly pixel-style game for your St. Patrick's Day party invite.

Players catch falling gold coins to reveal one character at a time of the party address. The full address can be unlocked in under 2 minutes.

## How it works

- Timer: 90 seconds
- Every 5 coins reveals 1 new character
- Win condition: reveal all address characters before time runs out

## Customize for your party

Open `game.js` and update:

- `ADDRESS` with your real party address
- `REVEAL_COST` if you want it easier/harder
- `TIME_LIMIT` for game length

## Run locally

Because browsers block some local script behavior on `file://`, run a tiny static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish for free via GitHub Pages

1. Push this repo to your GitHub account.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main** (or your default), folder: **/** (root)
4. Save.
5. GitHub will provide a URL like:
   `https://<your-username>.github.io/<repo-name>/`

Put that URL into your Partiful text blast.
