# Prep Planner 📚

A calm study planner for government-exam aspirants (SSC CGL, CHSL, UPSC, Banking, RRB…).
Built with Expo (React Native) — runs on Android and iPhone.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iPhone: Camera app · Android: Expo Go app). Phone and laptop must be on the same Wi-Fi
(otherwise use `npx expo start --tunnel`).

The live lock-screen timer needs native code, so it only works in a **development or EAS build**
(`eas build --profile development` or `--profile preview`). In Expo Go the app still works and shows a plain
"ends at …" notification instead.

## Features

- **Today** – exam countdown, today's schedule, overdue / due / high-priority tasks, study minutes vs daily goal, streak, quote of the day, "Feeling stressed?" breathing break.
- **Tasks** – subjects as folders (color + icon), plus a **General** folder for anything else. Tasks (topics) have priority, optional deadline, notes and **subtasks** (each with its own priority/deadline). A task auto-completes when all subtasks are done. Long-press a task (or use "Move") to move it to another subject. Search across everything.
- **Plan** – month calendar; schedule study sessions (time, duration, subject, linked topic) with **notifications** before / at start. One-tap **spaced revision plan** (+1, +3, +7, +21 days) from any task.
- **Focus** – Pomodoro timer (default 45 min focus / 10 min break / 25 min long break, configurable), keeps the screen awake, notifies when done, break suggestions, 7-day study chart.
  - **Class or self study** – every focus round is logged as one of the two, each with its own colour. Each session keeps its start and end time.
  - **Timer styles** – Halo (glowing ring, ticks sweep every minute), Aurora (drifting northern lights), Heart (fills up and beats), Bloom (petals open as you study), Liquid (the glass fills, bubbles rise), Galaxy (planets orbit, stars twinkle), Flip clock, Hourglass (sand runs down), Sunrise (night turns into day). Pick one under the timer.
  - **Live timer** – while it runs, the countdown ticks in the notification shade and on the lock screen (Android ongoing notification, iPhone Live Activity / Dynamic Island). Turn off in Focus → ⚙︎ → *Show on lock screen*.
- **Resources** – save YouTube videos/playlists, websites, Telegram channels, books, or **attach PDFs/images from the phone**; filter by subject/type, star favourites.
- **Mock tests** – log scores, see average/best and trend.
- **Breathe** – guided 1-minute box-breathing exercise.
- **Themes** – Baby pink, Sakura, Cotton candy, Berry, Lavender, Peach, Butter, Mint, Sage, Sky and Midnight (always dark), each with a light and dark version (Settings → Theme). Dark mode follows the phone by default.
- **Stats** (Home → streak card, or the chart icon on Focus) – streak with the last 7 days, all-time numbers, a day view with a start-to-end timeline, the session list with breaks, class vs study split, week bars, a 4-month heatmap, and what you finished.
- **Rewards** – some clocks and themes unlock as you go (sessions, hours, streaks, tasks). A pop-up with a preview shows when one unlocks.
- **Share cards** – a daily or weekly summary picture (time, class / study split, timeline, finished tasks, streak) to share anywhere.
- **Home screen widgets** – Focus timer, Up next (tasks) and Today's plan (calendar). iOS shows a live countdown and opens the app on tap; Android widgets are display-only. Installed builds only.
- **App icons** – 8 icons to pick from in Settings → App icon (installed builds only, not Expo Go). Redraw them with `node scripts/make-icons.mjs` (needs `rsvg-convert` and ImageMagick).

## Gestures

- Swipe a row left for actions (subjects: Edit/Delete · tasks: Move/Delete · steps, sessions, resources, mocks: Delete).
- Deletes show an **Undo** toast instead of a confirmation dialog.
- Ticking a task plays a small check animation, then it slides into *Completed*.

## Storage

Everything is stored **locally on the device** — no account or server:

```
<app documents>/prep-planner/data.json       all planner data
<app documents>/prep-planner/data.bak.json   previous copy (auto-recovery)
<app documents>/prep-planner/files/          attached PDFs / images
```

**Backup & transfer:** Settings → *Backup & transfer*.
From there you can copy the data as JSON, share it as text, save it as a `.json` file, or import JSON from the clipboard / a pasted text / a `.json` file from another phone to replace the current data. Attached files are not included.

## Code map

- `app/` – screens (expo-router)
- `src/lib/store.ts` – app state + all actions
- `src/lib/storage.ts` – local file storage (expo-file-system)
- `src/components/TimerFaces.tsx` – list of timer styles; the faces live in `src/components/timer/`
- `src/lib/stats.ts`, `src/lib/rewards.ts` – stats maths and reward rules; `app/stats.tsx`, `src/components/StatsBits.tsx`, `src/components/ShareSheet.tsx` – the screens
- `src/widgets/` – home screen widgets (`*.ios.tsx` SwiftUI, `*.android.tsx` Compose) and `sync.ts`, which pushes data to them
- `src/lib/appIcon.ts` – app icon switching (`expo-alternate-app-icons`)
- `src/live/` – lock-screen timer (iOS Live Activity + bridge); `modules/focus-notification/` – Android native countdown notification
- `src/lib/notifications.ts` – reminders
- `src/components/` – UI building blocks
