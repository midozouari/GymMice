---
name: GymMice architecture
description: Frontend-only Expo app structure, theme system, navigation pattern, and icon decisions.
---

## Architecture
- **Frontend-only** — no backend, all data in `constants/mockData.ts`, no API calls.
- **ThemeContext** (`context/ThemeContext.tsx`) — 5 palettes (default/pink/military/mono/midnight), persisted via AsyncStorage key `@gymmice_palette`.
- **Navigation**: Root Stack (headerShown: false) + (tabs) subtree. Tabs: social | index | profile. Sub-screens pushed above tabs: schedule, nutrition, pumpmatch, shop, dms, chat/[name].
- **react-native-svg** (v15.12.1) pre-installed — used for SVG session progress chart and calorie ring.

## Icon decisions
- Logo: `MaterialCommunityIcons "dumbbell"` + styled Text.
- Social login buttons: `FontAwesome` (not Feather) — only FontAwesome has `apple` and `google` icon names.
- Quick links in home: all Feather icons — `'leaf'` is NOT in Feather, replaced with `'sun'` for Nutrition.

**Why:** Feather icon set lacks `apple`, `google`, and `leaf` — using those names causes Metro runtime warnings and TypeScript errors.

## File map
- `constants/palettes.ts` — palette definitions + PaletteId type
- `constants/mockData.ts` — all mock stories, posts, conversations, pump match cards, badges
- `constants/scheduleData.ts` — ScheduleEvent model, date utils, category metadata, base mock week events, shared AsyncStorage key exports, cross-screen event-query helpers (`getNextUpcomingEvent`, `getTodaysGymEvent`, `formatCountdown`)
- `constants/workoutData.ts` / `constants/analyticsData.ts` — today's-workout model and per-exercise progress-history mock data (Push/Pull/Legs), same "future-proof optional fields" pattern as scheduleData
- `hooks/useScheduleEvents.ts` — read-only hook mirroring schedule.tsx's merge logic (base + custom − deleted) for other screens
- `context/ThemeContext.tsx` — ThemeProvider + useTheme() hook
- `components/Logo.tsx` — dumbbell icon + GYM/MICE text
- `components/TopBar.tsx` — shared header (back + title + right slot)
- `components/ProgressRing.tsx`, `components/ExerciseProgressChart.tsx`, `components/RestTimer.tsx` — reusable dashboard/analytics widgets, all built on the already-installed `react-native-svg` (no chart library added)
- `app/analytics.tsx` — Push/Pull/Legs analytics screen (stack screen, registered in root `app/_layout.tsx`)
- All screens under `app/` — see repo for full list

## Modal + keyboard pattern
Any `TextInput` inside a transparent `Modal` (comments sheet, add-event sheet) needs ONE top-level `KeyboardAvoidingView` (`flex:1`) wrapping the whole modal content (overlay + sheet) — not an inner-only KAV around just the input row.
**Why:** an inner-only KAV nested inside a transparent Modal doesn't reliably receive correct keyboard geometry on Android; the Modal has its own native window.
**How to apply:** also add a `ScrollView` ref + `onFocus` → `scrollToEnd({animated:true})` (with a ~100ms setTimeout) on any field that isn't already the last/only visible thing, since RN doesn't reliably auto-scroll a focused field into view cross-platform.

## Full-day timeline + tap-to-create
The week timeline grid spans the full 24h (`GRID_START_HOUR=0`/`GRID_END_HOUR=24` in `scheduleData.ts`); on mount/view-switch/Today it auto-scrolls near the current time via a `ScrollView` ref + `setTimeout(...,50)` (not `requestAnimationFrame` alone — needed the delay for layout to settle). Empty hour cells are per-hour `TouchableOpacity`s that read `nativeEvent.locationY` to round to the nearest half-hour and prefill the Add Event modal (date/start/+1h end); real event blocks render after them in JSX so they still intercept taps first.
**Why:** matches Google/Apple Calendar UX (full day, not a business-hours-only window) and lets users create events by tapping the grid, not just the "+" button.

## Alert.alert is a no-op on web
`Alert.alert(...)` (React Native) never shows anything under react-native-web — no dialog renders and no callback fires. Any confirm/destructive-action flow must branch: `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)`.
**Why:** discovered via e2e testing — a delete-confirmation flow silently did nothing on the web preview until this branch was added.
**How to apply:** whenever adding a confirm() or alert() style interaction to this Expo app, check `Platform.OS` and provide a web fallback, since the dev/testing preview always runs on web.

## Mock profile photos for swipe/dating-style features
Use gender-split `https://randomuser.me/api/portraits/{men|women}/{0-99}.jpg` for generated fake profile photos, not `i.pravatar.cc` (unlabeled random ages/genders — produced a profile tagged "22" with an elderly-looking face) or `picsum.photos` (random nature/object photos, not people).
**Why:** realism for a swipe/dating-style feature depends on faces looking like plausible adults of the stated gender; randomuser.me's curated portrait set satisfies that where fully-random face services don't.
**How to apply:** pick N unique indices per profile within one gender folder (`pickN` over `[0..99]`) so photos never repeat within the same profile; indices can repeat across different profiles.

## react-native-gesture-handler pan gestures in Playwright/web testing
Automated mouse-drag simulation (press-move-release) in the testing subagent's browser often does NOT trigger `Gesture.Pan()` swipe animations built with `react-native-gesture-handler` + `reanimated` on the web preview.
**Why:** the web/RNGH pointer-event translation doesn't reliably replay synthetic Playwright mouse drags as a native pan gesture.
**How to apply:** when validating swipe-to-dismiss/swipe-card features, treat drag-gesture screenshots as inconclusive on web and validate the underlying logic via an equivalent button/tap action that calls the same completion handler (e.g. an imperative `ref.triggerSwipe()` escape hatch) instead of re-attempting the raw drag.

## Dual horizontal-scroll sync (week calendar grid)
For a Google/Apple-Calendar-style week timeline (day headers row + scrollable hour grid below), keep the day-header row as a separate `ScrollView` (`scrollEnabled={false}`, horizontal) whose `ref.scrollTo({x, animated:false})` is driven by the grid body's `onScroll` handler.
**Why:** the header must stay pinned while the grid scrolls vertically, but the header and grid still need to move together horizontally when paging through days — nesting them in one scroll view breaks the pinned-header requirement.
**How to apply:** see `artifacts/mobile/app/schedule.tsx` (`headerScrollRef`/`bodyScrollRef`) for the working implementation, including the `Today` button's `scrollTo` call on both refs.
