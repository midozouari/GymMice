---
name: GymMice theme token system (light/dark + palettes)
description: How semantic color tokens, palette+mode merging, and startup-flash avoidance work for GymMice's theming.
---

**Token shape:** `constants/palettes.ts` defines a `ThemeColors` type (background, surface, card, border, inputBackground, overlay, primaryText/secondaryText/mutedText, icon/iconMuted, primary/accent/navy, success/warning/danger/dangerBg, and chart-specific tokens: chartTrack/chartGrid/chartPush/chartPull/chartLegs/chartWater/chartPositive/chartNegative/chartPositiveBg/chartNegativeBg/chartPR). Each of the 5 palettes has a `light` and a `dark` ThemeColors object — dark variants are hand-tuned (not auto-inverted) so each palette keeps its own identity/hue instead of collapsing to generic black.
**Why:** ticket explicitly required "preserve identity and accent colors of the selected palette" rather than one universal dark scheme, and required charts to stay distinct/readable in both modes without simple inversion.

**Context contract:** `context/ThemeContext.tsx` merges `paletteId` + `mode` into one flat object via `useTheme()`, persists both independently in AsyncStorage (separate keys), and exposes `isThemeReady` — callers must gate first render on this (see `AppReadyGate` in `app/_layout.tsx`, keeps native splash up via `SplashScreen.preventAutoHideAsync`) to avoid a flash of the wrong theme on launch. `bg` is kept as a back-compat alias of `background`.
**How to apply:** when adding new screens, pull colors from `useTheme()` tokens only — never hex literals — except colors that are intentionally brand/context-fixed (white text on a colored button, Google/Apple brand buttons, a full-screen dark photo overlay like Pump Match's card, or a fixed-meaning indicator like a live "now" clock line) — those stay literal by design, not oversight.

**Sweep pattern that worked well:** for a large hardcoded-color migration across ~20 files, defining the semantic token set once and then dispatching parallel file-group subagents with the same mapping-guide spec (screen bg → background, card bg → surface/card, borders → border, text tiers → primaryText/secondaryText/mutedText, etc.) was fast and consistent — each subagent ran its own `tsc --noEmit` before reporting back.
