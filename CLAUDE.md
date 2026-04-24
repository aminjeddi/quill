# Quill — Daily Writing Prompts App

## What This App Is
A minimalist daily writing prompt iOS app called **Quill**. One prompt per day, based on the user's chosen writing style(s). Built with Expo + React Native, published via EAS Build (no Mac needed).

## Owner
- GitHub: aminjeddi
- Email: aminjeddica@gmail.com
- Repo: https://github.com/aminjeddi/quill

## Tech Stack
| Concern | Tool |
|---|---|
| Framework | Expo SDK 54 + React Native |
| Language | TypeScript |
| Navigation | React Navigation (Bottom Tabs + Native Stack) |
| Storage (native) | expo-sqlite |
| Storage (web) | AsyncStorage (fallback) |
| Notifications | expo-notifications |
| Haptics | expo-haptics |
| Sharing | expo-sharing + react-native-view-shot |
| Build & publish | EAS Build (cloud, no Mac needed) |

## Design System
- Background: `#fafaf8`
- Primary: `#1a1a1a`
- Borders: `#e5e5e5`
- Secondary text: `#999`, `#bbb`
- Card selected state: `#f5f5f3` background, `#1a1a1a` border
- Border radius: 12–14px on cards, 10–12px on buttons
- Padding: 24px screen-level, 16px internal

## Project Structure
```
quill/
├── App.tsx                          # Entry — loading → onboarding → main app
├── app.json                         # Expo config, bundle ID: com.quill.app
├── eas.json                         # EAS build profiles (to be created at submission)
├── docs/
│   └── privacy-policy.html          # Hosted on GitHub Pages
├── src/
│   ├── data/
│   │   ├── prompts.ts               # 100 general prompts (fallback)
│   │   └── categoryPrompts.ts       # 6 categories × ~20 prompts each + getPromptForCategories()
│   ├── db/
│   │   └── database.ts              # SQLite (native) / AsyncStorage (web) — CRUD for entries
│   ├── components/
│   │   └── ShareCard.tsx            # Dark card captured as image + share button
│   ├── navigation/
│   │   └── TabNavigator.tsx         # 3 tabs: Today, Archive, Settings (each with stack)
│   ├── notifications/
│   │   └── reminders.ts             # Schedule/cancel daily notifications, AsyncStorage persistence
│   ├── utils/
│   │   └── streak.ts                # calculateStreak() + formatStreak() from entry list
│   └── screens/
│       ├── OnboardingScreen.tsx     # First launch — multi-select writing categories
│       ├── TodayScreen.tsx          # Daily prompt + write/save/edit + streak badge + share
│       ├── ArchiveScreen.tsx        # All past entries, newest first
│       ├── EntryDetailScreen.tsx    # Full entry view + share card
│       ├── SettingsScreen.tsx       # iOS-style list: Writing Focus row + Daily Reminder row
│       ├── WritingFocusScreen.tsx   # Multi-select category picker sub-page
│       └── DailyReminderScreen.tsx  # Reminder toggle + inline time picker sub-page
```

## App Flow
1. **First launch** → `OnboardingScreen` (no tabs) — pick 1+ writing categories
2. **Main app** → 3 tabs: Today · Archive · Settings
3. **Today tab** — shows daily prompt (from selected category pool), text editor, save/edit, streak badge, share card after saving
4. **Archive tab** — all entries newest first, tap to read full entry + share
5. **Settings tab** — iOS-style list navigating to Writing Focus and Daily Reminder sub-pages

## Data Model (Entry)
```ts
{
  id: string;      // UUID
  date: string;    // YYYY-MM-DD
  prompt: string;
  body: string;
}
```

## Key AsyncStorage Keys
- `quill_categories` — JSON array of selected Category keys
- `quill_category` — legacy single-category key (migrated on load)
- `quill_reminder_time` — JSON { hour, minute }
- `quill_notification_id` — scheduled notification ID

## Writing Categories
`self-improvement` · `storytelling` · `persuasive` · `gratitude` · `mindfulness` · `creative`

## Features Built
- [x] Daily prompt (day-of-year % pool, per selected categories)
- [x] Write, save, edit entries
- [x] Word count while writing
- [x] Haptic feedback on save
- [x] Keyboard dismiss on scroll
- [x] Archive of all past entries
- [x] Onboarding with multi-select writing focus
- [x] Settings tab with sub-pages (iOS style)
- [x] Writing focus change in settings
- [x] Daily reminder notification (fixed, with proper permission handling)
- [x] Streak counter (calculateStreak from consecutive entry dates)
- [x] Share entry as image (dark card via react-native-view-shot + expo-sharing)
- [x] Web fallback (AsyncStorage instead of SQLite)
- [x] Privacy policy (docs/privacy-policy.html → GitHub Pages)

## Still To Do (App Store)
- [ ] Enable GitHub Pages for privacy policy URL
- [ ] App icon (1024×1024)
- [ ] Splash screen
- [ ] App Store screenshots (1320×2868 for iPhone 6.9")
- [ ] App Store copy + keywords
- [ ] EAS build + submit

## Running Locally
```bash
cd quill
npm install
npx expo start          # scan QR with Expo Go on iPhone
npx expo start --tunnel # if QR won't connect
```

## Web Preview
```bash
# launch.json already configured at .claude/launch.json
# Use preview_start "Expo Web" — served at port 19006
```

## Publishing (When Ready)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```
Requires Apple Developer account ($99/yr) and App Store Connect app set up.

## Notes
- Windows dev machine — use Git Bash paths (`/c/Users/soggy/quill`)
- No Mac needed — EAS Build compiles iOS in the cloud
- Hot reload works in Expo Go for all code changes
- Navigation or native package changes require manual reload (shake phone → Reload)
