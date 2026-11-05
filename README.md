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

## Features

- **Today** – exam countdown, today's schedule, overdue / due / high-priority tasks, study minutes vs daily goal, streak, quote of the day, "Feeling stressed?" breathing break.
- **Tasks** – subjects as folders (color + icon), plus a **General** folder for anything else. Tasks (topics) have priority, optional deadline, notes and **subtasks** (each with its own priority/deadline). A task auto-completes when all subtasks are done. Long-press a task (or use "Move") to move it to another subject. Search across everything.
- **Plan** – month calendar; schedule study sessions (time, duration, subject, linked topic) with **notifications** before / at start. One-tap **spaced revision plan** (+1, +3, +7, +21 days) from any task.
- **Focus** – Pomodoro timer (default 45 min focus / 10 min break / 25 min long break, configurable), keeps the screen awake, notifies when done, break suggestions, 7-day study chart.
- **Resources** – save YouTube videos/playlists, websites, Telegram channels, books, or **attach PDFs/images from the phone**; filter by subject/type, star favourites.
- **Mock tests** – log scores, see average/best and trend.
- **Breathe** – guided 1-minute box-breathing exercise.
- **Dark mode** – follows the phone by default; force Light or Dark in Settings → Appearance.

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
- `src/lib/notifications.ts` – reminders
- `src/components/` – UI building blocks
