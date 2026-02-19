# Skiii — Comprehensive UX Audit

**Date:** 2026-02-19
**Scope:** 100 simulated usability tests + deep code-level analysis
**App:** Backcountry ski tour planner for Lake Tahoe (Next.js 16 + Mapbox GL + Open-Meteo + SAC avalanche data)

---

## Executive Summary

Skiii is a technically impressive backcountry ski planning tool with strong data integration (real-time weather, avalanche forecasts, terrain analysis) and thoughtful safety features. The scoring engine, snow classification, and map overlays are genuinely valuable.

**Critical gaps** fall into five themes:

1. **"Should I go?" isn't answered fast enough** — Users must decode numeric scores with no explanation, scan tiny timeline bars, and dig through collapsible sections to reach a decision
2. **Interactive feedback is broken** — Selecting a forecast hour then clicking a tour resets the hour; map pins don't reliably update after ranking; timeline clicks give no confirmation
3. **Mobile experience is half-built** — No swipe gestures on bottom sheet, 4px-wide timeline bars are untappable, layer tooltips don't work on touch, no landscape layout
4. **Accessibility is minimal** — No ARIA labels, no focus indicators, no keyboard navigation, color-only indicators, modal lacks focus trap, user zoom disabled
5. **No engagement loop** — No favorites, no sharing, no history, no offline mode, no notifications

The app has the data and the algorithms. What's missing is the UX layer that makes the data actionable, accessible, and retainable.

---

## Part 1: 100 Simulated Usability Tests

### Core Flows (Tests 1–20)

| # | Scenario | Result | Finding |
|---|----------|--------|---------|
| 1 | Open app, understand what I'm looking at within 5 seconds | ⚠️ PARTIAL | 7 tour cards with numeric scores (e.g., "13 — Serious Concern") but no context banner explaining current conditions. User must infer what's happening. |
| 2 | Identify the best tour for right now | ⚠️ PARTIAL | Cards sorted by score but no "#1 Best Right Now" callout. No rank numbers. Map pins show gold/silver/bronze but sidebar doesn't correlate. |
| 3 | Click the 72-hour timeline to pick tomorrow morning | ⚠️ PARTIAL | 72 bars in ~350px = ~4.8px per bar. On mobile (~300px) it's ~4.2px. Impossible to accurately select a specific hour. No hour labels on bars. |
| 4 | See which tours are best for my selected time | ⚠️ PARTIAL | Cards re-sort but no visual transition. No "Rankings updated for tomorrow 10 AM" confirmation. Map pins should update but sometimes don't (race condition in `applyMarkerStyles`). |
| 5 | Click the #1 ranked tour to see its details | ❌ FAIL | `selectTour()` in `stores/map.ts:111` sets `selectedForecastHour: null`. User picks "Tomorrow 10 AM", sees ranking, clicks the #1 tour — hour resets. Sidebar shows current conditions, not the chosen hour. |
| 6 | Understand why a tour scored 13/100 | ⚠️ PARTIAL | Reasons list exists but requires scrolling. No explanation of the 0-100 scale. "Considerable avalanche danger (3)" uses jargon. No tooltip on the score number. |
| 7 | Check avalanche conditions for a tour | ⚠️ PARTIAL | AvyDangerBanner in sidebar is inside a `<details>` element defaulting to closed. Detail page shows "Live avalanche data coming in Sprint 2" placeholder despite data being available via `useAvyForecast()`. |
| 8 | Check wind conditions along a route | ✅ PASS | Wind overlay shows directional arrows with color-coded speed (calm/moderate/strong). Legend present. |
| 9 | Check precipitation forecast on the map | ✅ PASS | Precip overlay shows bilinearly-interpolated snow/rain fill with clear legend. Snow level labels appear. |
| 10 | View the full conditions dashboard for a tour | ⚠️ PARTIAL | "View Full Conditions Dashboard" button buried at bottom of expanded TourCard or SidebarConditions. Easy to miss. |
| 11 | Compare Castle Peak vs Chickadee Ridge | ❌ FAIL | No comparison view. Must click back and forth, memorizing scores and conditions. |
| 12 | Check what gear I need | ⚠️ PARTIAL | Gear recommendations only on detail page (`/tour/[slug]`). Removed from sidebar. Users in map view can't see gear advice. |
| 13 | Understand the route on the map | ✅ PASS | Route shows skin-up (green dashed) + ski-down (orange solid) with directional arrows. Clear visual distinction. |
| 14 | Check terrain traps for a route | ✅ PASS | Hazard overlay shows influence zones with click popups. Terrain traps listed in sidebar and detail page. |
| 15 | Switch between route variants | ✅ PASS | VariantSelector updates map route and sidebar info. Shows variant name, aspects, max slope. |
| 16 | See elevation profile of a tour | ✅ PASS | Detail page shows skin/ski profile chart with elevation axis and distance. Color-coded segments. |
| 17 | Check detailed weather for a tour | ✅ PASS | WeatherSummary shows temp, wind, freezing level, visibility. Alerts for rain-on-snow and extreme wind. |
| 18 | Navigate back from detail to main screen | ✅ PASS | Back arrow in header works. Browser back button works. |
| 19 | Understand the safety disclaimer | ✅ PASS | SafetyOverlay is well-worded, links to AIARE training, requires acknowledgment. |
| 20 | See favorable touring windows | ✅ PASS | FavorableWindowsBox shows 3-4 recommended time windows with day/hour labels. |

### Mobile-Specific (Tests 21–35)

| # | Scenario | Result | Finding |
|---|----------|--------|---------|
| 21 | Open app on iPhone (375px width) | ⚠️ PARTIAL | Map loads, bottom sheet shows. Drag handle is cosmetic only — no touch gesture handling. Users expect swipe up/down. |
| 22 | Scroll through tour list on mobile | ✅ PASS | Bottom sheet scrolls within `max-h-[45dvh]` constraint. |
| 23 | Select a tour on mobile | ✅ PASS | Tap card → sidebar content shows in bottom sheet. |
| 24 | Use 72-hour timeline on mobile | ❌ FAIL | Bars ~4px wide on 375px screen. Impossible to select a specific hour by tapping. No alternative input (slider, picker). |
| 25 | See forecast chart on mobile map view | ❌ FAIL | `TimelineOverlay` hidden on mobile (`hidden md:block`). No mobile-accessible alternative for the forecast visualization. |
| 26 | Toggle map layers on mobile | ⚠️ PARTIAL | Layer buttons work but `title` tooltips don't appear on touch. Emoji icons (⛰ ∠ ⚠ 🧭) aren't self-explanatory. Layer stack can overlap bottom sheet on small screens. |
| 27 | Read route weather dots on mobile | ⚠️ PARTIAL | Labels at `text-xs` are too small. Multiple data points (elevation, snowfall, temp, wind) clutter the map at any zoom. |
| 28 | Use app in landscape orientation on phone | ⚠️ PARTIAL | No landscape-specific layout. Bottom sheet at `max-h-[45dvh]` takes 45% of short screen height, leaving ~55% of an already-short viewport for the map. Unusable. |
| 29 | View tour detail page on mobile | ✅ PASS | Stacks to single column via responsive grid. Content readable. |
| 30 | Use browser back button on mobile | ✅ PASS | Standard browser navigation works. Header back arrow present on detail page. |
| 31 | Pinch-to-zoom on mobile map | ✅ PASS | Standard Mapbox touch controls work. However, `layout.tsx` sets `maximumScale: 1, userScalable: false` which prevents system-level zoom (accessibility issue). |
| 32 | Tap a hazard point on mobile | ⚠️ PARTIAL | Popup appears but may be clipped by screen edge. No automatic repositioning. |
| 33 | View conditions timeline chart on mobile detail | ✅ PASS | Charts render at compact height. Recharts responsive. |
| 34 | View gear silhouette on mobile detail | ✅ PASS | SVG silhouette + list renders proportionally. |
| 35 | Deep link to /tour/castle-peak on mobile | ✅ PASS | Detail page loads directly. No dependency on map state. |

### Edge Cases & Error Handling (Tests 36–60)

| # | Scenario | Result | Finding |
|---|----------|--------|---------|
| 36 | Weather API is down | ⚠️ PARTIAL | Shows "Unable to load" after React Query retries. No retry button. Scores fall back to 55 (neutral) with no indication data is missing. |
| 37 | Avalanche API is down | ✅ PASS | Graceful degradation: avy score excluded, weights redistributed (70% weather + 30% terrain). |
| 38 | Both APIs are down simultaneously | ⚠️ PARTIAL | Weather defaults to 55, avy excluded. Terrain-only scoring. Cards still render but scores are meaningless. No "data unavailable" banner. |
| 39 | Slow network (3G ~300kbps) | ⚠️ PARTIAL | 7 parallel weather fetches + 1 avy fetch on mount. 2-5 second load. Spinner shows but no skeleton screens. Weather loading in sidebar is just a spinner + text ("Loading conditions..."), no layout preview. |
| 40 | Select hour 0 (midnight tonight) | ✅ PASS | Night penalty (-5 raw visibility) applies. All tours score very low. Expected behavior. |
| 41 | Select hour 71 (3 days from now) | ⚠️ PARTIAL | Works but avalanche forecast typically only covers ~2 days. Day 3+ shows "Unavailable beyond forecast window" — good messaging but could be surfaced earlier. |
| 42 | Rapid-click multiple timeline bars | ⚠️ PARTIAL | Each click triggers re-scoring of all tours. No debounce. Can cause janky card re-sorts and map pin flickering. |
| 43 | Toggle all 9 overlays on simultaneously | ⚠️ PARTIAL | Map becomes unreadable. No mutual exclusion or warning about layer conflicts. No "You have 9 layers active" indicator. |
| 44 | Zoom out to maximum extent on map | ✅ PASS | `maxBounds` prevents going outside Tahoe region. Precip overlay loads correctly. |
| 45 | Zoom in to maximum on a route | ✅ PASS | Route weather dots become detailed. Hazard influence zones visible. Route line remains clear. |
| 46 | Select a tour then deselect it | ✅ PASS | Click "← All tours" → sidebar returns to list, route removes from map. Clean transition. |
| 47 | Toggle 3D terrain while a tour is selected | ✅ PASS | 3D persists after tour deselection. Route removes cleanly. Pitch transition is abrupt though (no easing). |
| 48 | Resize browser from desktop to mobile width | ⚠️ PARTIAL | Layout shifts between sidebar and bottom sheet. No smooth transition. Content can briefly disappear during resize. |
| 49 | Refresh page with a tour selected | ⚠️ PARTIAL | Tour selection lost — Zustand state is in-memory only, not persisted to URL params. User starts from scratch. |
| 50 | Open app in multiple tabs | ✅ PASS | Each tab independent. No tab sync issues or localStorage conflicts (only SafetyOverlay uses localStorage). |
| 51 | Select forecast hour → select tour → press back → check hour | ❌ FAIL | Forecast hour cleared by `selectTour()`. Not restored when pressing back. The entire time-selection workflow is lost. |
| 52 | All tours have the same composite score | ⚠️ PARTIAL | Stable sort preserves original data order. No tie indication ("These tours have similar conditions"). |
| 53 | Tour with no ski_route defined (uphill only) | ✅ PASS | `TourRoute` gracefully handles missing `variant.ski_route`. Only skin-up line renders. |
| 54 | Click map marker while ranking badges are active | ⚠️ PARTIAL | `selectTour()` clears `topTourSlugs` indirectly. Gold/silver/bronze pins disappear, which is disorienting. |
| 55 | Clear localStorage and revisit | ✅ PASS | Safety overlay re-shows on next visit. Expected behavior. |
| 56 | Navigate with screen reader (VoiceOver/NVDA) | ❌ FAIL | No ARIA labels on buttons (only `title`). SVG charts have no `<title>` or `<desc>`. Map is completely inaccessible. Avalanche rose diagrams convey no info to screen readers. No `aria-live` regions for dynamic content updates. |
| 57 | Navigate with keyboard only | ❌ FAIL | Tab order exists (native HTML) but no visible `:focus-visible` indicators. Map layers not keyboard-controllable. Timeline bars are buttons but invisible focus ring. Cannot keyboard-navigate the map. |
| 58 | View in Windows High Contrast mode | ⚠️ PARTIAL | `text-gray-400` on white backgrounds fails WCAG AA (3.0:1 contrast, needs 4.5:1). Score band colors (orange, yellow) on white are borderline. |
| 59 | Avalanche danger level 5 (Extreme) | ✅ PASS | Tour scores approach 0. "Serious Concern" label appropriate. Black banner color matches NAPADS standard. |
| 60 | Perfect weather day, all green timeline | ✅ PASS | Tours still differentiated by terrain factors + avy data. Not all score 100. Scoring model handles this correctly. |

### Information Architecture & Comprehension (Tests 61–80)

| # | Scenario | Result | Finding |
|---|----------|--------|---------|
| 61 | Understand what "Composite: 42" means | ❌ FAIL | No explanation anywhere of the 0-100 scale. No tooltip. No info icon. No "What does this score mean?" help text. |
| 62 | Know what factors drive a specific score | ⚠️ PARTIAL | Reasons list exists (e.g., "Moderate avalanche danger (2)") but uses technical jargon. No breakdown showing "50% avy + 35% weather + 15% terrain = 42". |
| 63 | Find parking information for a tour | ✅ PASS | Parking info in expanded TourCard and detail page. Includes lot name, capacity, fill-by time, permit requirements. |
| 64 | Find cell coverage information | ✅ PASS | Detail page stats bar shows coverage (e.g., "Partial", "None"). Useful for planning. |
| 65 | Find SAR jurisdiction | ✅ PASS | Detail page shows search-and-rescue jurisdiction (county/agency). |
| 66 | Find nearest SNOTEL station data | ✅ PASS | Detail page lists SNOTEL stations with names, elevations, and link to data. |
| 67 | Find escape route options during a tour | ✅ PASS | Detail page collapsible section lists escape routes with descriptions. |
| 68 | Understand what "ATES: Challenging" means | ❌ FAIL | Badge shows ATES rating with no tooltip, no explanation, no link. New users won't know Avalanche Terrain Exposure Scale. |
| 69 | Understand snow type and what to do about it | ⚠️ PARTIAL | "🧊 Wind crust · Hard wind-packed layer" displayed but not actionable. No "Bring ski crampons" or "Expect variable edge hold" guidance. |
| 70 | Find avalanche education resources | ✅ PASS | Safety overlay links to AIARE course finder. Detail page includes "AIARE Training" link. |
| 71 | See cumulative recent snowfall | ⚠️ PARTIAL | Route weather dots show 48h snowfall but only when zoomed in on a selected route with the precip overlay active. Not prominently surfaced. |
| 72 | Understand what wind arrow colors mean | ⚠️ PARTIAL | Legend shows calm/moderate/strong with color swatches, but text is very small (`text-[9px]`). Only visible when wind overlay is active. |
| 73 | Find sunrise and sunset times | ❌ FAIL | Data is fetched (`forecast.sunrise`, `forecast.sunset`) but never displayed anywhere in the UI. Wasted API data. |
| 74 | See recent weather history (past 24h) | ❌ FAIL | Only forward-looking 72h forecast. No "past 24h" snowfall or temperature trend. Important for assessing recent loading of snowpack. |
| 75 | Know when weather data was last updated | ❌ FAIL | No "Updated 3 min ago" timestamp anywhere. `DataFreshness` component exists but isn't rendered in current UI. |
| 76 | Understand variant differences beyond name/slope | ⚠️ PARTIAL | VariantSelector shows name, aspects, max slope. No "Safer", "More scenic", "Steeper" descriptors. No explanation of why you'd choose one over the other. |
| 77 | Find the detail page from the map view | ⚠️ PARTIAL | Must expand a tour card or open sidebar, scroll to bottom, find "View Full Conditions Dashboard" link. Buried CTA. |
| 78 | Understand the elevation profile segments | ⚠️ PARTIAL | Color-coded segments (skin=green, ski=orange, transition=gray) but no labeled waypoints (summit, saddle, treeline). No mouse-hover elevation readout. |
| 79 | Know if a tour is appropriate for my skill level | ⚠️ PARTIAL | Difficulty badge (beginner/intermediate/advanced/expert) and ATES rating shown, but no interpretive guidance like "Requires avalanche training and crevasse rescue skills". |
| 80 | Find trailhead directions | ✅ PASS | Trailhead coordinates in detail page. Parking section has lot name. Could link to Google Maps but doesn't. |

### Performance & Technical (Tests 81–90)

| # | Scenario | Result | Finding |
|---|----------|--------|---------|
| 81 | Initial page load time on fast network | ⚠️ PARTIAL | 7 parallel weather API calls + 1 avy fetch fire on mount. Mapbox GL JS bundle is ~700KB. Total time likely 2-3s on fast connection. No code splitting for overlays. |
| 82 | Map render with all overlays active | ⚠️ PARTIAL | PrecipOverlay creates up to 14,400 GeoJSON features (900 grid points × 16 sub-cells). SlopeOverlay adds tile layer. Multiple GeoJSON sources simultaneously. Could lag on low-end mobile. |
| 83 | Memory after 30 minutes of use | ⚠️ PARTIAL | React Query `gcTime` is 1 hour. Grid weather data (900+ points) cached per viewport. Multiple viewports cached. No memory pressure monitoring. |
| 84 | Rapid tour selection (click 7 tours in 5 seconds) | ⚠️ PARTIAL | Each selection triggers: route GeoJSON update, hazard overlay rebuild, weather dot recalculation, fitBounds animation. No debounce. Potential jank. |
| 85 | Route editor performance (dev mode) | ⚠️ PARTIAL | `onMouseMove` during drag updates sources at 60fps with no throttle. Deep-copies coordinate arrays on every move. Noticeable lag with 50+ point routes. |
| 86 | Slope tile computation for large viewport | ✅ PASS | Server-side Horn's method computes slope from DEM tiles. Results cached 24h. Tiles load progressively via XYZ layer. |
| 87 | Static generation of tour detail pages | ✅ PASS | `generateStaticParams` pre-renders all 7 tour pages. Fast initial load for direct links. |
| 88 | API error recovery | ⚠️ PARTIAL | React Query retries 3 times with exponential backoff. Good. But no user-facing retry button. No circuit breaker for repeated failures. |
| 89 | Bundle size analysis | ⚠️ PARTIAL | Heavy dependencies: mapbox-gl (~700KB), recharts (~300KB), dompurify (~60KB). No dynamic imports for map overlays that most users won't toggle. |
| 90 | PWA installability | ⚠️ PARTIAL | `manifest.json` exists but no service worker, no offline cache, no install prompt. Technically installable but functionally useless offline. |

### Value Delivery & Delight (Tests 91–100)

| # | Scenario | Result | Finding |
|---|----------|--------|---------|
| 91 | "Should I go skiing today?" answered in <10s | ❌ FAIL | Must decode numeric scores, understand they're bad, scan reasons list. No single Go/Caution/No-Go signal. No top-level summary. Takes 30+ seconds to reach a conclusion. |
| 92 | Plan a trip for Saturday | ⚠️ PARTIAL | Can select Saturday hours in timeline but no "weekend view", no "best of Saturday" summary, no "Saturday morning is best" callout. |
| 93 | Decide between two tours quickly | ❌ FAIL | No comparison feature. Must click back and forth, memorizing scores and conditions from each. |
| 94 | Share conditions with skiing partner | ❌ FAIL | No share link, no screenshot export, no "send to friend" mechanism. URL doesn't encode any state. |
| 95 | Know if conditions changed since last check | ❌ FAIL | No push notifications. No "conditions changed" indicator. No differential view. |
| 96 | Remember and quickly access my favorite tours | ❌ FAIL | No favorites or bookmarks. All 7 tours shown equally every time. |
| 97 | Track which tours I've completed this season | ❌ FAIL | No trip logging, history, or personal tracking. |
| 98 | See photos of what the route looks like | ❌ FAIL | Zero photos anywhere. Pure data. No visual preview of what the tour looks like. |
| 99 | Use the app at the trailhead with poor signal | ❌ FAIL | App requires network for everything. No service worker. No offline cache. Map tiles won't load. Data won't load. Completely non-functional. |
| 100 | Feel confident and excited about my tour choice | ⚠️ PARTIAL | Strong data and safety info, but presentation is clinical. No hero images, no "why this tour is special" content, no interpretive guidance like "experienced backcountry skiers only today". |

---

## Part 2: Detailed Issues & Fixes

### Category A: Critical Interaction Bugs

#### A1. Forecast hour resets when selecting a tour
- **File:** `src/stores/map.ts:111`
- **Bug:** `selectTour()` sets `selectedForecastHour: null`, destroying the user's time selection
- **Impact:** Breaks the primary workflow (pick time → see rankings → explore tour)
- **Fix:** Remove `selectedForecastHour: null` from `selectTour()`. Conditions assessment already handles null vs number — when non-null, it scores for that hour.
- **Complexity:** Trivial (1 line deletion)

#### A2. Map pin rankings don't update reliably
- **File:** `src/components/map/TourMap.tsx:282-289`
- **Bug:** `applyMarkerStyles` fires on `styledata` event which triggers from any style change (overlay toggle, basemap load). The effect at line 287 depends on `mapReady` but `styledata` can fire before `mapReady` is true.
- **Impact:** Users see stale gold/silver/bronze pins that don't match sidebar ranking
- **Fix:** Guard `applyMarkerStyles` with `mapReady` check, and call it explicitly when `topTourSlugs` changes (not just on `styledata`).
- **Complexity:** Small

#### A3. Timeline click gives no confirmation feedback
- **File:** `src/components/tour/OverviewTimeline.tsx:115-138`
- **Bug:** Bar gets a subtle blue `outline` on selection. No animation, no score-updating indicator, no timestamp label.
- **Impact:** Users click and wonder if anything happened
- **Fix:** Add (1) a visible selected-hour label above the timeline ("Selected: Fri 10 AM"), (2) a brief pulse animation on the selected bar, (3) "Updating scores..." toast or inline indicator.
- **Complexity:** Small-Medium

#### A4. Safety modal has no focus trap
- **File:** `src/components/ui/SafetyOverlay.tsx:24-75`
- **Bug:** Modal renders with `z-50` overlay but no focus management. Tab key navigates behind the modal. No `aria-modal="true"`. No focus restoration on dismiss.
- **Impact:** Keyboard and screen reader users can interact with hidden content behind the modal
- **Fix:** Add focus trap (trap focus within modal on mount, restore on dismiss). Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- **Complexity:** Small

#### A5. User zoom disabled on mobile
- **File:** `src/app/layout.tsx:14-15`
- **Bug:** `maximumScale: 1` and `userScalable: false` in viewport meta prevents pinch-to-zoom on the entire page
- **Impact:** WCAG 1.4.4 violation. Users with low vision cannot zoom the UI. Only the Mapbox map has its own pinch-to-zoom.
- **Fix:** Remove `maximumScale: 1` and `userScalable: false`. If map zoom conflicts exist, handle them via `touch-action` CSS on the map container specifically.
- **Complexity:** Trivial

---

### Category B: Mobile UX Gaps

#### B1. Bottom sheet has no swipe gesture
- **File:** `src/components/tour/TourPanel.tsx:183-234`
- **Issue:** Drag handle div at line 187 is purely visual. No touch event handling for swipe up (expand) / down (collapse).
- **Fix:** Implement touch drag handler on the handle div. Track `touchstart` → `touchmove` → `touchend` to adjust sheet height. Three snap points: collapsed (handle only), half (45dvh), full (85dvh).
- **Complexity:** Medium

#### B2. Timeline bars untappable on mobile
- **File:** `src/components/tour/OverviewTimeline.tsx:108-139`
- **Issue:** 72 bars at `gap-px` in ~300px = ~4px per bar. Below 44px minimum touch target.
- **Fix:** Replace with a horizontal time slider or segmented day view (Today/Tomorrow/Day3) with 24 wider bars per segment. Or a time picker dropdown as a mobile alternative.
- **Complexity:** Medium-Large

#### B3. Layer button tooltips don't work on touch
- **File:** `src/components/map/MapControls.tsx:96-112`
- **Issue:** `title` attributes are hover-only. Touch devices get no label for ⛰ ∠ ⚠ 🧭 etc.
- **Fix:** Add long-press tooltip (500ms hold shows label) or a persistent label row below the icon on mobile.
- **Complexity:** Small

#### B4. No landscape orientation support
- **File:** `src/components/tour/TourPanel.tsx:183-234`
- **Issue:** Bottom sheet at `max-h-[45dvh]` takes 45% of a landscape phone's ~375px height = 170px for sheet, 205px for map. Unusable.
- **Fix:** In landscape, switch to a side panel layout (left 40%, map right 60%) similar to desktop. Or collapse sheet to handle-only by default in landscape.
- **Complexity:** Medium

#### B5. Touch targets below 44px minimum
- **Files:** Multiple
  - `OverviewTimeline.tsx:119` — bar height 24px
  - `MapControls.tsx:98` — buttons with `text-xs px-3 py-2` (~36px height)
  - `VariantSelector.tsx:23-37` — buttons with `py-1.5` (~32px height)
- **Fix:** Increase all interactive elements to minimum 44×44px touch targets. Use `min-h-[44px]` on buttons.
- **Complexity:** Small

---

### Category C: Accessibility Failures

#### C1. No ARIA labels on interactive elements
- **Files:** Throughout
  - `MapControls.tsx` — layer toggle buttons have `title` only, no `aria-label` or `aria-pressed`
  - `OverviewTimeline.tsx` — timeline bar buttons have `title` only
  - `TourPanel.tsx:187` — drag handle has no semantic role
  - `ConditionsGauge.tsx` — SVG progress bar has no `role`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- **Fix:** Add `aria-label` to all buttons. Add `aria-pressed` to toggles. Add `role="progressbar"` to gauge SVG. Add `role="slider"` to drag handle.
- **Complexity:** Medium (many files but straightforward changes)

#### C2. SVG charts completely inaccessible
- **Files:**
  - `ElevationProfile.tsx` — no `<title>`, `<desc>`, or screen reader text
  - `AvyDangerBanner.tsx` — rose diagram SVGs have no alt text
  - `ConditionsTimeline.tsx` — Recharts charts have no ARIA descriptions
  - `ConditionsGauge.tsx` — score ring has no text alternative
- **Fix:** Add `<title>` and `<desc>` to all SVGs. Add `role="img"` and `aria-label` with text description of chart content. For dynamic charts, include a visually-hidden text summary.
- **Complexity:** Medium

#### C3. Color-only information conveyance
- **Files:**
  - `DangerBadge.tsx` — danger level conveyed only through background color
  - `AvyDangerBanner.tsx` — elevation danger bars are color-only
  - `SlopeOverlay.tsx` / `SunExposureOverlay.tsx` / `TreeCoverOverlay.tsx` — legends rely on color swatches
  - `OverviewTimeline.tsx` — favorability conveyed only through bar color
- **Fix:** Add pattern fills (hatching, dots) alongside colors. Add text labels to all color indicators. Use icons + text redundancy.
- **Complexity:** Medium

#### C4. No visible focus indicators
- **Files:** Global CSS (`globals.css`) has no `:focus-visible` styles
- **Issue:** Keyboard users cannot see which element is focused. All interactive elements rely on browser default (often invisible or very subtle).
- **Fix:** Add global `:focus-visible` styles with a visible ring/outline. Example: `*:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }`.
- **Complexity:** Small

#### C5. Contrast failures
- **Locations:**
  - `text-gray-400` on white backgrounds: ~3.0:1 contrast (needs 4.5:1 for AA)
  - `text-gray-500` on white: ~4.6:1 (borderline AA, fails AAA)
  - Score band colors (orange/yellow) used as text color on white: fails AA
  - `AvyDangerBanner.tsx:214` — `opacity-80` on danger labels reduces contrast further
- **Fix:** Minimum `text-gray-600` for body text on white. Use NAPADS text colors designed for contrast. Remove opacity reductions on critical text.
- **Complexity:** Small

#### C6. No skip-to-content or landmark roles
- **File:** `src/app/layout.tsx`, `src/app/page.tsx`
- **Issue:** No `<main>`, `<nav>`, `<aside>` landmarks. No skip-to-content link for keyboard users.
- **Fix:** Add `<main>` around primary content. Add `<nav>` for tour list. Add `<aside>` for sidebar. Add skip link.
- **Complexity:** Small

---

### Category D: Information Architecture & Comprehension

#### D1. No current conditions banner
- **Where:** Top of TourPanel / bottom sheet
- **Issue:** Users see scores but no context. No "Today: High avy danger · 22°F · 15mph winds · Snow level 6,200'" summary.
- **Fix:** Add a `ConditionsBanner` component at top of TourPanel that aggregates current avy danger level + temp + wind + recent snowfall from the first loaded weather query.
- **Impact:** Orients every user within 2 seconds of opening the app
- **Complexity:** Small

#### D2. No score explanation
- **Where:** `TourCard.tsx`, `ConditionsGauge.tsx`, `SidebarConditions.tsx`
- **Issue:** "13 — Serious Concern" with no info icon, tooltip, or help text explaining the 0-100 scale or what factors contribute.
- **Fix:** Add an (i) icon next to the score that opens a tooltip/popover: "Score combines avalanche danger (50%), weather conditions (35%), and terrain factors (15%). Higher = more favorable. Bands: 80+ Excellent, 60-79 Good, 40-59 Fair, 20-39 Caution, 0-19 Serious Concern."
- **Complexity:** Small

#### D3. No rank numbers on tour cards
- **Where:** `TourCard.tsx`
- **Issue:** Cards sorted by score but no "#1", "#2" visual indicator. Users can't correlate sidebar cards with map pin badges (gold/silver/bronze).
- **Fix:** Pass rank index to TourCard. Show badge: "#1 🥇", "#2 🥈", "#3 🥉" on top 3 cards.
- **Complexity:** Small

#### D4. ATES rating unexplained
- **Where:** `TourCard.tsx`, `TourDetail.tsx`
- **Issue:** "ATES: Challenging" badge with no explanation of Avalanche Terrain Exposure Scale
- **Fix:** Add tooltip: "ATES (Avalanche Terrain Exposure Scale): Simple = minimal avalanche terrain. Challenging = exposure to well-defined avalanche paths. Complex = exposure to multiple, overlapping avalanche paths." Link to ATES reference.
- **Complexity:** Small

#### D5. "Sprint 2" placeholder visible to users
- **File:** `src/components/tour/TourDetail.tsx:157-170`
- **Issue:** Detail page shows "Live avalanche data coming in Sprint 2" in the avalanche section. Internal development language visible to end users.
- **Fix:** Replace with actual `AvyDangerBanner` component (data already available via `useAvyForecast()`). The sidebar already renders it successfully.
- **Complexity:** Small-Medium

#### D6. Sunrise/sunset data fetched but never displayed
- **File:** `src/components/tour/WeatherSummary.tsx`
- **Issue:** `forecast.sunrise` and `forecast.sunset` arrays are returned by the API but never rendered anywhere in the UI.
- **Fix:** Add to WeatherSummary: "☀ Sunrise 6:42 AM · Sunset 5:38 PM · 11h daylight". Critical for tour planning.
- **Complexity:** Small

#### D7. No "best time to go" summary
- **Where:** Below or above timeline
- **Issue:** Users must visually scan 72 colored bars to find the best window. No text summary.
- **Fix:** Add a one-liner: "Best window: Tomorrow 9 AM – 1 PM (Score: 67)" derived from existing `analyzeTiming()` logic in `timing.ts`.
- **Complexity:** Small-Medium

#### D8. Data freshness not shown
- **Where:** `WeatherSummary.tsx`, `SidebarConditions.tsx`
- **Issue:** No "Updated 3 min ago" timestamp. Users don't know if data is fresh. `DataFreshness` component exists but isn't used.
- **Fix:** Render `DataFreshness` component in WeatherSummary using React Query's `dataUpdatedAt` property.
- **Complexity:** Small

#### D9. Gear recommendations removed from sidebar
- **File:** `src/components/tour/SidebarConditions.tsx`
- **Issue:** Gear moved to detail page only. Users in the map view can't see gear advice without navigating away.
- **Fix:** Add a compact `GearListCompact` back to the sidebar (condition-specific items only, not full silhouette).
- **Complexity:** Small

#### D10. Elevation profile lacks waypoints
- **File:** `src/components/tour/ElevationProfile.tsx`
- **Issue:** Shows skin/ski line but no labeled points (summit, saddle, treeline, transition points).
- **Fix:** Plot notable elevation points as labeled markers on the chart. Tour data already has `transition_count` — add named waypoints to tour data.
- **Complexity:** Medium

---

### Category E: Visual Design Issues

#### E1. Inconsistent spacing system
- **Across all components:**
  - Padding varies: `px-3 py-2`, `px-4 py-3`, `p-3`, `px-2.5 py-2` with no pattern
  - Rounded corners: `rounded-lg`, `rounded-xl`, `rounded`, `rounded-full` mixed
  - Elevation: `ring-1 ring-gray-100`, `border border-gray-200`, `shadow-sm` — three different depth approaches
- **Fix:** Define a spacing/radius/elevation design system. Standardize on 2-3 padding scales, 2 border-radius sizes, 1 elevation approach.
- **Complexity:** Medium (many files, but mechanical changes)

#### E2. Typography hierarchy is flat
- **Across all components:**
  - `text-xs` used for both headers (`font-semibold`) and body text
  - `text-sm` used for tour titles and detail text equally
  - No clear visual differentiation between heading levels
  - Line height defaults used for small text (hard to read)
- **Fix:** Define type scale: section headers (`text-sm font-semibold`), subsection headers (`text-xs font-semibold uppercase tracking-wide`), body (`text-sm leading-relaxed`), detail (`text-xs text-gray-600`).
- **Complexity:** Medium

#### E3. Inconsistent button/link styling
- **Across components:**
  - SAC forecast links (`<a>`) styled like buttons with `px-4 py-2 rounded-lg bg-blue-600`
  - "View Full Dashboard" sometimes a `<button>`, sometimes an `<a>`
  - Back navigation: `← All tours` as text link vs. arrow icon button
- **Fix:** Define button component with variants (primary, secondary, ghost, link). Apply consistently.
- **Complexity:** Medium

#### E4. Map legend collision
- **Files:** `SlopeOverlay.tsx`, `PrecipOverlay.tsx`, `SunExposureOverlay.tsx`, `TreeCoverOverlay.tsx`
- **Issue:** Multiple overlay legends position at `bottom-left` or `bottom-right`. When multiple overlays are active, legends stack and overlap each other and the Mapbox scale control.
- **Fix:** Implement a legend manager that stacks active legends vertically with spacing, or consolidates them into a single expandable legend panel.
- **Complexity:** Medium

#### E5. 3D terrain transition is abrupt
- **File:** `src/components/map/TourMap.tsx`, `src/stores/map.ts`
- **Issue:** Toggling 3D snaps to 60° pitch instantly. Users lose their spatial orientation.
- **Fix:** Use `map.easeTo({ pitch: 60, duration: 1000 })` for smooth transition. Add a brief "3D View" toast.
- **Complexity:** Small

---

### Category F: Code-Level Bugs

#### F1. Unit mismatch in snow type detection
- **File:** `src/lib/analysis/snow-type.ts:86`
- **Bug:** `freezingLevelFt > tour.max_elevation_m` compares feet to meters. Freezing level is in feet, tour elevation is in meters. Rain-on-snow detection is wrong.
- **Fix:** Convert `freezingLevelFt` to meters (`* 0.3048`) or `max_elevation_m` to feet before comparison.
- **Complexity:** Trivial

#### F2. Phantom temperature crossing in melt-freeze detection
- **File:** `src/lib/analysis/snow-type.ts:92-94`
- **Bug:** `prevAboveFreezing` initialized as `null`. First hour always passes the crossing check because `null !== true && null !== false`, counting a phantom crossing.
- **Fix:** Initialize `prevAboveFreezing` to the state of the first hour's temperature, or skip counting on the first iteration.
- **Complexity:** Trivial

#### F3. Hardcoded PST timezone (no DST handling)
- **File:** `src/components/map/SunExposureOverlay.tsx:57`
- **Bug:** Uses hardcoded Pacific Standard Time offset "-08:00". During PDT (March–November), this is wrong by 1 hour, causing sun exposure calculations to be off.
- **Fix:** Use `Intl.DateTimeFormat` with `timeZone: 'America/Los_Angeles'` or compute offset dynamically.
- **Complexity:** Small

#### F4. Scoring likelihood penalties conflate "likely" and "very likely"
- **File:** `src/lib/analysis/scoring.ts:175-177`
- **Bug:** `{ unlikely: 3, possible: 8, likely: 15, 'very likely': 15, certain: 15 }` — "likely", "very likely", and "certain" all have the same penalty (15). This makes the distinction between these levels meaningless in scoring.
- **Fix:** Differentiate: `{ unlikely: 3, possible: 8, likely: 13, 'very likely': 18, certain: 25 }`.
- **Complexity:** Trivial

#### F5. Avy problem size parsing can produce NaN
- **File:** `src/lib/analysis/scoring.ts:137`
- **Bug:** `parseFloat(problem.size[1])` — if `size[1]` is a string like "D3", `parseFloat("D3")` returns `NaN`. This propagates through the scoring math.
- **Fix:** Parse the numeric part: `parseFloat(problem.size[1].replace(/\D/g, ''))` or use a lookup map for D-scale values.
- **Complexity:** Small

#### F6. Latitude/longitude of 0 disables weather queries
- **File:** `src/hooks/useWeather.ts:21`
- **Bug:** `enabled: !!(lat && lng)` — if either coordinate is 0, the query is disabled. Latitude 0 = equator, longitude 0 = prime meridian. Both are valid coordinates.
- **Fix:** `enabled: lat != null && lng != null` (explicit null/undefined check instead of truthiness).
- **Complexity:** Trivial (not currently impactful for Tahoe but will matter for expansion)

#### F7. Potential XSS in hazard popup
- **File:** `src/components/map/HazardOverlay.tsx:220`
- **Issue:** Popup HTML is built from feature properties without escaping. If tour data contains malicious strings, they render as HTML.
- **Fix:** Use `DOMPurify.sanitize()` (already a dependency) on popup content, or use Mapbox's `Popup.setText()` instead of `setHTML()`.
- **Complexity:** Small

---

### Category G: Performance Optimizations

#### G1. MapControls calls useMapStore 23 times
- **File:** `src/components/map/MapControls.tsx:6-27`
- **Issue:** 23 individual `useMapStore(s => s.xxx)` calls, each creating a separate subscription. Causes unnecessary re-renders when any unrelated store value changes.
- **Fix:** Use a single selector: `const state = useMapStore(s => ({ showSlopeAngle: s.showSlopeAngle, ... }))` with shallow equality check.
- **Complexity:** Small

#### G2. PrecipOverlay creates up to 14,400 GeoJSON features
- **File:** `src/components/map/PrecipOverlay.tsx:114`
- **Issue:** `SUB = 4` creates 4×4 = 16 sub-cells per grid point. With 900 grid points, that's potentially 14,400 polygon features.
- **Fix:** Reduce SUB to 2 (4 sub-cells, 3,600 features) or use a canvas-based approach for the fill layer instead of GeoJSON polygons.
- **Complexity:** Medium

#### G3. No code splitting for map overlays
- **File:** All overlay components loaded eagerly
- **Issue:** 9 overlay components loaded even though most users only use 1-2 at a time. Each overlay imports substantial logic (solar calculations, bilinear interpolation, etc.).
- **Fix:** Use `React.lazy()` and `Suspense` for overlay components. Load them on-demand when toggled.
- **Complexity:** Medium

#### G4. TourCard not memoized
- **File:** `src/components/tour/TourCard.tsx`
- **Issue:** No `React.memo()` wrapper. Parent TourPanel re-renders all cards when any state changes (e.g., one tour's weather query resolves).
- **Fix:** Wrap TourCard in `React.memo()`.
- **Complexity:** Trivial

#### G5. Duplicate gear recommendations calculation
- **Files:** `GearRecommendation.tsx:35-44` and `GearListCompact.tsx:24-33`
- **Issue:** Both components independently call `getGearRecommendations()` with the same parameters. If both are rendered in the same view, calculation happens twice.
- **Fix:** Lift the calculation to a shared hook or pass pre-computed recommendations as a prop.
- **Complexity:** Small

---

### Category H: Missing Features (High Impact)

#### H1. Quick Go/Caution/No-Go indicator
- **What:** Large colored badge at top of tour card or sidebar: green checkmark "Good to Go", yellow "Exercise Caution", red "Not Recommended"
- **Why:** Answers "Should I go?" in 1 second. The most important question for every user.
- **How:** Map score bands to indicator: 60+ = Go, 30-59 = Caution, 0-29 = Don't Go. Add a `DecisionBadge` component.
- **Complexity:** Small

#### H2. Tour comparison mode
- **What:** Select 2 tours, see side-by-side scores, weather, avy exposure, and terrain factors
- **Why:** "Castle Peak or Tallac?" is the most common decision. Currently requires back-and-forth clicking and memorization.
- **How:** Multi-select on tour cards. Split panel or overlay table comparing key metrics.
- **Complexity:** Large

#### H3. Offline mode
- **What:** Cache weather, avy data, map tiles, and tour data for trailhead use
- **Why:** Users plan at home but need data at the trailhead where signal is poor/none. Currently 100% non-functional offline.
- **How:** Service worker with precached tour data + last-fetched weather/avy data. Mapbox offline tile packs for Tahoe region.
- **Complexity:** Large

#### H4. Share conditions link
- **What:** Generate a URL that encodes tour + forecast hour + conditions snapshot
- **Why:** Backcountry skiing is social. "Hey, conditions look great for Castle Peak tomorrow" should be a shareable link.
- **How:** Encode state in URL params (`?tour=castle-peak&hour=34`). For conditions snapshot, generate an OG image or text summary.
- **Complexity:** Medium

#### H5. URL state persistence
- **What:** Encode selected tour and forecast hour in URL params
- **Why:** Page refresh loses all state. Deep links to specific tour+time combos impossible.
- **How:** Sync Zustand store with URL search params. `?tour=castle-peak&hour=34&variant=1`.
- **Complexity:** Medium

#### H6. Favorites/bookmarks
- **What:** Star tours to pin them to the top of the list
- **Why:** Users have 1-3 "home" tours they check regularly. Finding them in a ranked list is unnecessary friction.
- **How:** localStorage or account-based favorites. Star icon on TourCard.
- **Complexity:** Small-Medium

#### H7. Search and filter tours
- **What:** Search by name, filter by difficulty, distance, elevation
- **Why:** As tour count grows beyond 7, browsing a list becomes unwieldy
- **How:** Search input at top of TourPanel. Chip filters for difficulty level.
- **Complexity:** Small-Medium

#### H8. Trailhead directions link
- **What:** "Get Directions" button that opens Google Maps/Apple Maps to trailhead coordinates
- **Why:** Users need to navigate to the trailhead. Coordinates are available but not actionable.
- **How:** Link to `https://maps.google.com/?daddr={lat},{lng}` or use `geo:` URI for native maps.
- **Complexity:** Trivial

---

### Category I: Future Enhancement Ideas

#### Lower effort, meaningful value:
1. **Dark mode** — Respect `prefers-color-scheme`. Important for dawn/dusk planning.
2. **Keyboard shortcuts** — 1-9 for layers, Esc to deselect, arrow keys to cycle tours.
3. **Print view** — Clean tour summary with conditions, route, and key info for printing at home.
4. **Unit toggle** — Metric/imperial switch for international users (°C/°F, m/ft, km/mi).
5. **Recent snowfall highlight** — "12 inches in last 48h!" callout when significant snowfall detected.
6. **Condition alerts in tour card** — Rain-on-snow risk and extreme wind shown directly on card, not buried.
7. **Elevation-interpolated weather** — Show temp at summit vs trailhead (data available, just needs interpolation).

#### Higher effort, high potential:
8. **Field condition reports** — Users submit current conditions from the field.
9. **Trip logging** — Track completed tours with date, conditions, personal notes.
10. **Push notifications** — "Conditions improved for your favorite tours" alerts.
11. **Group planning** — Share a tour plan with friends, coordinate timing.
12. **Route photos** — Curated photos at waypoints along each tour.
13. **Historical conditions** — "This tour 1 week ago" or "Season snowfall trend".
14. **SNOTEL data visualization** — Chart snow depth, SWE, temperature over time.
15. **Guided onboarding** — First-time walkthrough explaining key features and how to read the data.

---

## Part 3: Prioritized Implementation Plan

### Sprint 1 — Critical Fixes (1-2 days)

| # | Task | Category | Effort |
|---|------|----------|--------|
| 1 | Remove `selectedForecastHour: null` from `selectTour()` | A1 | Trivial |
| 2 | Fix unit mismatch in snow-type.ts (feet vs meters) | F1 | Trivial |
| 3 | Fix phantom temperature crossing in snow-type.ts | F2 | Trivial |
| 4 | Remove `maximumScale: 1` and `userScalable: false` from layout.tsx | A5 | Trivial |
| 5 | Fix hardcoded PST timezone in SunExposureOverlay | F3 | Small |
| 6 | Fix likelihood penalty conflation in scoring.ts | F4 | Trivial |
| 7 | Fix NaN risk in avy problem size parsing | F5 | Small |
| 8 | Sanitize HazardOverlay popup HTML | F7 | Small |
| 9 | Add `aria-label` to all buttons (MapControls, Timeline, etc.) | C1 | Small |
| 10 | Add global `:focus-visible` outline style | C4 | Small |

### Sprint 2 — Core UX Improvements (3-5 days)

| # | Task | Category | Effort |
|---|------|----------|--------|
| 11 | Add conditions context banner to TourPanel | D1 | Small |
| 12 | Add score explanation tooltip | D2 | Small |
| 13 | Add rank numbers (#1, #2, #3) to tour cards | D3 | Small |
| 14 | Add Go/Caution/No-Go indicator | H1 | Small |
| 15 | Display sunrise/sunset times in WeatherSummary | D6 | Small |
| 16 | Show data freshness timestamp | D8 | Small |
| 17 | Wire up AvyDangerBanner on detail page (replace Sprint 2 placeholder) | D5 | Small-Med |
| 18 | Add ATES rating tooltip | D4 | Small |
| 19 | Add "best time to go" summary text | D7 | Small-Med |
| 20 | Restore compact gear list to sidebar | D9 | Small |

### Sprint 3 — Mobile & Accessibility (3-5 days)

| # | Task | Category | Effort |
|---|------|----------|--------|
| 21 | Implement bottom sheet swipe gestures | B1 | Medium |
| 22 | Redesign timeline for mobile (day segments or slider) | B2 | Medium |
| 23 | Add focus trap to safety modal | A4 | Small |
| 24 | Add SVG accessibility (title, desc, aria-label) | C2 | Medium |
| 25 | Fix color contrast issues (gray-400 → gray-600 minimum) | C5 | Small |
| 26 | Add semantic landmarks (main, nav, aside) | C6 | Small |
| 27 | Fix touch target sizes to 44px minimum | B5 | Small |
| 28 | Add mobile-friendly layer labels | B3 | Small |
| 29 | Add landscape orientation layout | B4 | Medium |
| 30 | Add timeline click confirmation feedback | A3 | Small-Med |

### Sprint 4 — Engagement & Sharing (5-7 days)

| # | Task | Category | Effort |
|---|------|----------|--------|
| 31 | URL state persistence (tour + hour in params) | H5 | Medium |
| 32 | Share conditions link | H4 | Medium |
| 33 | Tour favorites (localStorage) | H6 | Small-Med |
| 34 | Trailhead directions link | H8 | Trivial |
| 35 | Tour search/filter | H7 | Small-Med |

### Sprint 5 — Performance & Polish (3-5 days)

| # | Task | Category | Effort |
|---|------|----------|--------|
| 36 | Memo TourCard with React.memo | G4 | Trivial |
| 37 | Batch MapControls store selectors | G1 | Small |
| 38 | Code-split overlay components with React.lazy | G3 | Medium |
| 39 | Deduplicate gear recommendation calculation | G5 | Small |
| 40 | Standardize spacing/typography system | E1, E2 | Medium |
| 41 | Fix map legend collision | E4 | Medium |
| 42 | Smooth 3D terrain transition | E5 | Small |

### Future Sprints

| # | Task | Category | Effort |
|---|------|----------|--------|
| 43 | Tour comparison mode | H2 | Large |
| 44 | Offline mode (service worker + caching) | H3 | Large |
| 45 | Dark mode | I1 | Medium |
| 46 | Keyboard shortcuts | I2 | Small |
| 47 | Print view | I3 | Medium |
| 48 | Unit toggle (metric/imperial) | I4 | Medium |
| 49 | Field condition reports | I8 | Large |
| 50 | Trip logging | I9 | Large |

---

## Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Core Functionality** | 7/10 | Strong scoring engine and data integration. Broken hour-selection flow. |
| **Mobile Experience** | 4/10 | Responsive layout works but interactions are desktop-first. |
| **Accessibility** | 2/10 | Minimal ARIA, no focus indicators, color-only info, zoom disabled. |
| **Information Architecture** | 6/10 | Good data, but comprehension requires too much work. No quick answers. |
| **Visual Design** | 6/10 | Clean and functional but inconsistent spacing, flat hierarchy, no delight. |
| **Performance** | 7/10 | Reasonable for complexity. Some optimization opportunities. |
| **Error Handling** | 5/10 | Graceful avy fallback. No retry buttons. Missing loading skeletons. |
| **Engagement & Retention** | 2/10 | No favorites, sharing, history, offline, or notifications. |
| **Safety Communication** | 8/10 | Strong disclaimer, AIARE links, SAC links. Could surface avy data better. |
| **Overall** | 5.2/10 | Solid foundation with significant UX gaps preventing it from delivering its full value. |
