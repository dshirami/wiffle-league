# Backyard Wiffle League

A responsive, retro backyard-baseball tournament website built with plain HTML, CSS, and JavaScript. It is designed to deploy directly to **GitHub Pages** without a build step.

## Features

- Home page with league stats and latest games
- Player signup form; create a team or join an existing roster
- Team roster cards, jersey numbers, captain labels, and team search
- Pool standings (wins, losses, runs for/against, run differential)
- Pool-play score entry and playoff score entry
- Playoff bracket view grouped by round
- Commissioner area for creating/deleting teams, assigning pools, recording/deleting games, changing league name, and exporting JSON
- Responsive mobile navigation and retro field-inspired styling
- Browser `localStorage` persistence

## Run locally

You need a modern browser. The easiest option is to open `index.html` directly. For a local HTTP server, run:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy on GitHub Pages

1. Create a new GitHub repository, for example `backyard-wiffle-league`.
2. Upload `index.html`, `styles.css`, `app.js`, and this `README.md` to the repository root. Keep the file names unchanged.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/(root)`, then click **Save**.
6. Wait for GitHub Pages to publish the site. Your URL will look like `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

You can also upload the included ZIP to GitHub by extracting it first and committing the files.

## Important limitations of GitHub Pages

This version is a **static demo**. It saves teams, signups, settings, and scores in the current browser's local storage. That means:
- Each visitor has their own separate data.
- A registration submitted on one device does not appear on another device.
- The Commissioner page is not protected by a real login; it is not secure.
- Local browser data can be cleared by the browser.
- Do not collect sensitive/private information in this demo.

GitHub Pages cannot run a database or server-side authentication. For a real tournament shared across all players and devices, connect this front end to a backend such as **Supabase** (database, secure admin authentication, and shared registration/results). Keep any service-role secrets on a server, never in browser JavaScript. The included JSON export is a simple way to back up demo data.

## Pool play and playoffs

The commissioner can assign teams to pools A–F and record pool-play games. Pool standings update from final pool games. Add playoff games with a round name such as `Quarterfinal 1`, `Semifinal 1`, or `Championship` to display them in the bracket. This version does not automatically generate a round-robin schedule or seed teams into the playoff bracket; the commissioner sets matchups and rounds manually.

## Project files

- `index.html` — pages and forms
- `styles.css` — layout, colors, and responsive styling
- `app.js` — local data model, registration, standings, score entry, and commissioner actions
