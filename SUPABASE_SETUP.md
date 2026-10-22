# Connect Westside Wiffle League to Supabase

This setup gives the GitHub Pages site one shared database. Player registration is public; team, score, pool, bracket, and league-setting edits are restricted by database Row Level Security (RLS) to an allowlisted commissioner account.

## 1. Create a Supabase project

1. Create a project at <https://supabase.com/dashboard>.
2. Wait for the database to finish provisioning.
3. Open **SQL Editor**, create a new query, paste all of `supabase-setup.sql`, and run it.
4. Open **Project Settings → API** (or **Connect**, depending on the dashboard version). Copy the Project URL and the public anon/publishable key. Never use or expose a `service_role` or secret key in browser code.

## 2. Configure the website

Edit `supabase-config.js` and replace the two placeholders:

```js
window.WESTSIDE_SUPABASE_CONFIG = {
  url: "https://YOUR_REAL_PROJECT_REF.supabase.co",
  anonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
};
```

The anon/publishable key is designed to be visible in browser code. The RLS policies in `supabase-setup.sql` are the security boundary; the key alone does not grant commissioner privileges.

## 3. Create and authorize the commissioner

1. In Supabase, open **Authentication → Users → Add user** and create the commissioner's email/password account. Use a strong, unique password. Confirm the user is enabled.
2. Copy the user's UUID from the Users table.
3. In **SQL Editor**, run this query after replacing the UUID with that exact Auth user ID:

```sql
insert into private.commissioners (user_id)
values ('PASTE-COMMISSIONER-AUTH-USER-UUID-HERE');
```

Only accounts explicitly added to `private.commissioners` can update `league_state` or delete player registrations. Creating another Supabase Auth user does not automatically grant commissioner access. Do not add public users to the allowlist.

## 4. Deploy on GitHub Pages

1. Commit and push the whole folder to the root of your repository, including `supabase-config.js`, `supabase-setup.sql`, and this guide.
2. In repository **Settings → Pages**, set the source to **GitHub Actions**.
3. The workflow publishes the site publicly by default so anyone with the URL can register. If you want an extra shared site-wide password barrier, optionally add repository secret `STATICRYPT_PASSWORD`; the workflow will then encrypt the page. This barrier is separate from commissioner security, which remains protected by Supabase Auth + RLS.
4. Push to `main` and check the **Actions** tab for a successful Pages deployment.
5. Visit the Pages URL. Test signup in one browser, then verify that the player appears in a second browser/device. Sign into Commissioner with the Supabase Auth email/password, add a team or score, and verify the update appears elsewhere.

## 5. Security and operating notes

- Never put a Supabase `service_role`/secret key in `supabase-config.js`, HTML, JavaScript, or GitHub Pages.
- Keep RLS enabled. The policies intentionally allow public reads and name-only inserts to `players`, but do not allow public updates/deletes. Only the allowlisted commissioner can update the shared league-state row.
- Public registration can be spammed because it is open and name-only. If abuse becomes a problem, add CAPTCHA/Turnstile and server-side rate limiting (for example, an Edge Function) before relying on it for a large public event.
- Names are public on the website. Avoid collecting phone numbers, addresses, or other sensitive data in this form.
- Supabase Realtime broadcasts changes to connected browsers. Browsers also load shared data when opened or refreshed.
- The old browser-local data is not automatically migrated into Supabase. The new database starts empty; use the commissioner UI to recreate teams/results, or import data deliberately after reviewing it.
