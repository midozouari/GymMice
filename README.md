# GymMice

**Train. Eat. Connect.**

GymMice is a mobile fitness app prototype that brings workouts, nutrition, scheduling, and social features into one place. Built with Expo and React Native, it supports mobile devices and a browser preview.

## Features

- **Home:** workout overview, upcoming events, and daily stats.
- **Onboarding:** five steps for fitness preferences, goals, and appearance.
- **Schedule:** week and month views with event forms.
- **Analytics:** separate Push, Pull, and Legs views.
- **Nutrition:** calorie, water, and meal overview.
- **Pump Match:** swipeable gym-partner profiles with expandable details.
- **Social:** feed, post composer, and comments.
- **Messages:** conversation list and chat screens.
- **Shop:** fitness product browsing.
- **Personalization:** light/dark mode and five color palettes.

> **Project status:** This is a frontend prototype using mock/local data. Sign-in screens, messaging, matching, and shopping are demo experiences—not production authentication, live messaging, or checkout. Some controls are placeholders.

## Screenshots

| Home | Pump Match |
| --- | --- |
| ![Home in light mode](artifacts/screenshots/09-home-light.png) | ![Expanded Pump Match profile](artifacts/screenshots/22-pumpmatch-expanded-light.png) |

- [Browse all screenshots](artifacts/screenshots/)
- [View the contact sheet](artifacts/screenshots/contact-sheet.png)
- [Download the visual documentation PDF](artifacts/screenshots/gymmice-visual-documentation.pdf)

## Tech Stack

- Expo SDK 54 and React Native
- React, TypeScript, and Expo Router
- React Native Reanimated and Gesture Handler
- AsyncStorage for saved appearance preferences
- pnpm workspaces

The repository also includes an Express API scaffold, shared packages, and a separate design preview sandbox.

## Run Locally

### Requirements

- Node.js 24
- pnpm 10
- Expo Go for a physical-device preview, or a web browser

### Setup

```bash
git clone https://github.com/midozouari/GymMice-Journey.git
cd GymMice-Journey
pnpm install
pnpm --filter @workspace/mobile exec expo start
```

Scan the QR code with Expo Go, or press **w** to open the web preview.

For web preview only:

```bash
pnpm --filter @workspace/mobile exec expo start --web
```

These commands run Expo directly. The package's `dev` script is configured for the Replit environment.

## Project Structure

```text
artifacts/
  mobile/          # Main Expo app
  api-server/      # Express API scaffold
  mockup-sandbox/  # Design previews
  screenshots/    # PNG captures, contact sheet, and PDF
lib/              # Shared API and database packages
scripts/          # Workspace utilities and screenshot export scripts
```

## Development

Check the mobile app's TypeScript:

```bash
pnpm --filter @workspace/mobile run typecheck
```

Check the whole workspace:

```bash
pnpm run typecheck
```

## Notes

- Screenshots document the current prototype, not every possible state.
- The screenshot scripts use a local Expo web server at port `18115` and require Playwright Chromium.
- Real accounts, live data, and payments need backend integration before production use.
