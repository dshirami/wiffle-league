# Westside Wiffle League

A professional sports-league-style wiffle ball tournament site for GitHub Pages. The initial league is empty: there are no sample teams, players, or games.

## Included features

- Professional navy, white, and red sports-league design
- Player-only signup form with one required field: name
- Registered-player list, team roster view, standings, scores, pool play, and playoff bracket
- Commissioner tools for creating teams, assigning pools, entering/deleting scores, and league settings
- Commissioner tab password gate (`poopy`)
- Staticrypt site-wide password encryption configured for GitHub Pages deployment using the repository secret `STATICRYPT_PASSWORD`

## Deploy with Staticrypt to GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to its root.
2. In **Settings → Secrets and variables → Actions**, create a repository secret named `STATICRYPT_PASSWORD` and set its value to `IhaveIBS`.
3. In **Settings → Pages**, set the source to **GitHub Actions**.
4. Push to the `main` branch. The workflow in `.github/workflows/deploy.yml` encrypts the page with Staticrypt and publishes the encrypted output.
5. Open the Pages URL. The site-wide Staticrypt password is `IhaveIBS`; after decrypting the site, the Commissioner tab also prompts for `poopy`.

The password is not stored in the repository workflow or source; it is supplied through the GitHub Actions secret. If the secret is absent, the workflow intentionally fails rather than publishing an unprotected page.

## Important security and data limitations

- Staticrypt is client-side page encryption, not a substitute for server-side authentication. It is suitable as a casual access barrier, not for sensitive information.
- The Commissioner password gate is implemented in client-side JavaScript and is also only a casual barrier. Anyone with access to the source can inspect it. For real administrative security, use server-side authentication and authorization.
- This is a static site and stores registrations, teams, and scores in the current browser's `localStorage`. Visitor data is not shared across devices or browsers. A shared public registration list requires a backend such as Supabase or Firebase.
- Player registration asks only for a name. Do not collect sensitive information.

## Local preview

Open `index.html` directly or run:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. The local preview is not encrypted by Staticrypt; encryption is performed in the GitHub Actions deployment workflow.

## Files

- `index.html` — pages and forms
- `styles.css` — responsive sports-league design
- `app.js` — registrations, standings, score entry, and commissioner gate
- `.github/workflows/deploy.yml` — Staticrypt encryption and GitHub Pages deployment
