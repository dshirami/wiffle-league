# Westside Wiffle League

A professional sports-league-style wiffle ball website for GitHub Pages, backed by Supabase for shared data across browsers and devices.

## Features

- Public name-only player registration and registration confirmation screen
- Shared player registration list, rosters, standings, scores, pool play, and playoff bracket
- Commissioner tools for teams, pools, results, and league settings
- Supabase email/password sign-in plus database Row Level Security (RLS) for commissioner-only writes
- Supabase Realtime subscriptions so connected visitors see new registrations and league updates
- Professional navy, white, and red sports-league design

## Required setup before deployment

1. Follow **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**. Create a Supabase project and run `supabase-setup.sql` in its SQL Editor.
2. Replace the placeholders in `supabase-config.js` with your Supabase project URL and public anon/publishable key. Never use a `service_role` key in frontend code.
3. Create a commissioner user in Supabase Authentication and insert that exact user's UUID into the private `private.commissioners` allowlist, as described in the setup guide. The old `poopy` client-side password is no longer used.
4. Upload all files to the root of your GitHub repository, including `supabase-config.js`, `supabase-setup.sql`, and `SUPABASE_SETUP.md`.
5. In GitHub **Settings → Pages**, choose **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` publishes the site publicly by default. Optionally add the repository secret `STATICRYPT_PASSWORD` if you want an extra shared site-wide password barrier; it is separate from commissioner authentication.
6. Push to `main` and confirm the workflow in **Actions** succeeds.

### Open registration note

The site is public by default, so anyone with the URL can reach the registration form. If you deliberately want an extra shared site-password barrier, add a repository secret named `STATICRYPT_PASSWORD`; the workflow will then encrypt the page. This barrier is optional and separate from commissioner authentication.

## Security model

- The Supabase browser key is public by design. RLS is the actual access-control boundary.
- Public users can read the league and registered-player list and insert a player name. They cannot edit league data or delete registrations.
- Only Auth accounts added to `private.commissioners` can update the league state or delete player registrations.
- Never put a Supabase service-role/secret key in browser files.
- Player names are public. The open, name-only form can be spammed; add CAPTCHA and server-side rate limiting if needed.

## Data migration and testing

The shared Supabase database starts empty; the previous browser-local data is not migrated automatically. After setup, register a test name, open the site in another browser/device, and verify it appears. Then sign in as commissioner, create a team or score, and verify those changes appear elsewhere.

## Files

- `index.html` — pages and forms
- `styles.css` — responsive sports-league design
- `app.js` — Supabase data access, live updates, rendering, and commissioner login
- `supabase-config.js` — public Supabase URL and anon/publishable key placeholders
- `supabase-setup.sql` — database schema, RLS policies, and realtime setup
- `SUPABASE_SETUP.md` — step-by-step setup and deployment instructions
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow


## November Tournament update

The home dashboard now highlights the November 1, 2026 tournament, with registered-player count, date, and location (TBD). The Players navigation tab displays the shared public registration list and updates when new names are submitted.
