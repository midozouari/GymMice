---
name: GymMice Pump Match card interaction pattern
description: How the swipeable profile card's in-place expand/collapse and stock-photo sourcing were built, and known gesture-testing limitation.
---

**In-place info expansion, not a route.** The Info sheet is an absolutely-positioned overlay pinned to the bottom of the *same* swipe card, whose height animates between a collapsed ratio (~34% of card, gradient over photo) and an expanded ratio (~87%, opaque scrollable panel). The photo underneath never resizes — the sheet just grows to cover more of it. Avoids remounting/navigating to a separate screen, which is what made the previous route-based Info screen feel disconnected.
**Why:** A route-based "Info" page was explicitly rejected by the user as not matching a bottom-sheet/expanding-card feel, and it duplicated a Send Message affordance outside the match popup.
**How to apply:** If asked to rebuild this again, keep expand/collapse state lifted to the parent screen (not inside the card) so the same boolean also resets deterministically when the deck advances to the next profile.

**Stack cards are keyed by slot position, not by profile id.** `visible.map` uses `key={slot-${stackOffset}}` so the same component instance persists as different profiles cycle through a deck position — this is what allows the "next card scales 96%→100%" transition to animate smoothly via a shared value instead of popping in on remount. Internal transient state (photo index, drag offset) is reset via a `useEffect` keyed on `profile.id` changing.

**Swipe gesture works alongside a nested scrollable detail panel** using `Gesture.Pan().activeOffsetX([-8,8]).failOffsetY([-30,30])` composed with `Gesture.Race(panGesture, tapGesture)`, and the expanded content uses `ScrollView` from `react-native-gesture-handler` (not RN's own) so vertical scroll and horizontal swipe don't fight.
**Known limitation:** Playwright/testing-subagent mouse-drag simulation on the web preview does not reliably trigger this Pan gesture (button-based triggers work fine; verified via the app's own trigger-swipe buttons). Treat "drag swipe doesn't advance the card" as inconclusive on web-preview automated tests unless it also fails via a real device/touch — don't spend more tuning cycles chasing this without evidence it's a real bug.

**Photo sourcing:** for profiles needing real (non-AI, age/gender-correct) people, `randomuser.me` and `i.pravatar.cc` both produced bad results (mismatched ages/faces). Use the `imageSearch` sandbox callback filtered to `pexels.com`/`unsplash.com` domains, and verify each URL with a `fetch` HEAD/ranged-GET before writing it into data files — broken links are common when hand-curating from search results.
