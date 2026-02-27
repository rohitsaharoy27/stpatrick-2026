# 🍀 Lucky Drop Invite Game

A lightweight mobile-friendly pixel-style game for your St. Patrick's Day party invite.

Players catch falling letters to reveal `518 W 27th St`. They must catch one of each unique letter/number in the address before time runs out.

## How it works

- Timer: 90 seconds
- Falling tiles are random letters/numbers
- Catching a needed character reveals all matching spots in the address
- Win condition: reveal the full address before time runs out
- Win screen includes a pot-of-gold celebration and tequila shots falling from the sky

## Customize for your party

Open `game.js` and update:

- `ADDRESS` with your real party address
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
