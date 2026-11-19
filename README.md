# Workout Log

A small web app for logging the Phase 2 workouts (A–D) on your iPhone and sending them to your coach.
It installs on the Home Screen like an app. All data stays on your phone.

## Put it online (one time, free) – GitHub Pages
1. Make a free account at github.com.
2. Create a new **public** repository, for example `workout-log`.
3. Choose **Add file → Upload files** and drag in every file from this folder
   (`index.html`, `app.js`, `program.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon-180.png`, `icon-512.png`). Commit.
4. Go to **Settings → Pages**, set Source to "Deploy from a branch", choose branch `main` and folder `/ (root)`, then Save.
5. After a minute your app is live at `https://<your-username>.github.io/workout-log/`.

Only the empty app is public. Your logged numbers never leave your phone unless you share them.

## Install on your iPhone
1. Open that link in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Always open the app from the Home Screen icon. That copy keeps its data and works offline in the gym.

## Using it
- **Train**: pick the week, then tap a workout. Enter weight and reps for each set. Grey numbers show what you did last time, and **Same as last** copies them. Everything saves while you type.
- **Share with coach**: sends a text summary through WhatsApp, iMessage, Mail and so on. Use **Share week** on the Train or History tab to send the whole week at once.
- **History → Sheet view A–D**: a table laid out like the coach's PDF. Use **Print / save as PDF** to send it as a PDF.
- **Settings**: your name and kg/lb, edit exercises, start a new phase, and **Export backup** (save it to iCloud Drive now and then).

## Updating the app later
Change the files, then open `sw.js` and bump `VERSION` (for example `"v2"`). Upload the changed files to GitHub again.
Your phone gets the new version the next time it opens the app online.
