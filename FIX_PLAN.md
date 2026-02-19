# Skiii — Full Fix Plan

**Source:** UX Audit (100 simulated tests + deep code analysis)
**Scope:** All identified issues except Offline Mode and Favorites
**Organization:** Grouped by sprint, each fix includes exact file(s), what to change, and why

---

## Sprint 1 — Critical Bugs & Safety (10 fixes)

These are code-level bugs that produce wrong results, block core workflows, or violate accessibility law.

---

### Fix 1.1: Stop resetting forecast hour when selecting a tour

**Files:** `src/stores/map.ts`
**Line:** 111
**Problem:** `selectTour()` sets `selectedForecastHour: null, topTourSlugs: []`. When a user picks "Tomorrow 10 AM" on the timeline, sees tour rankings, then clicks the #1 tour — the hour resets. The sidebar shows current conditions instead of the conditions for the hour they chose. This breaks the primary workflow.
**Change:**
```ts
// BEFORE (line 111):
selectTour: (slug) =>
  set({ selectedTourSlug: slug, selectedVariantIndex: 0, isEditingRoute: false,
        editingCoordinates: null, selectedForecastHour: null, topTourSlugs: [] }),

// AFTER:
selectTour: (slug) =>
  set({ selectedTourSlug: slug, selectedVariantIndex: 0, isEditingRoute: false,
        editingCoordinates: null }),
```
Remove `selectedForecastHour: null` and `topTourSlugs: []` from the set call. The conditions assessment in `SidebarConditions.tsx:62` already reads `selectedHour` from the store and passes it to `assessConditions()`, so the sidebar will naturally show conditions for the chosen hour. The top tour slugs should persist so map pins keep their rank badges while the user explores a specific tour.

---

### Fix 1.2: Fix feet-vs-meters unit mismatch in snow type detection

**File:** `src/lib/analysis/snow-type.ts`
**Line:** 86
**Problem:** `freezingM > tour.max_elevation_m` — the variable is named `freezingM` and holds `h.freezing_level_height` which is in meters from the API. The comparison is correct by name, but the original UX audit flagged a variable named `freezingLevelFt` comparing to meters. Looking at the actual code: `const freezingM = h.freezing_level_height;` (line 85) and `if (h.precipitation > 0 && freezingM > tour.max_elevation_m)` (line 86). This is actually correct — `freezing_level_height` from Open-Meteo is in meters, and `max_elevation_m` is in meters.

However, in `scoring.ts:234`, the weather scoring has `if (freezingLevelFt > tourMinFt && hour.precipitation > 0)` which correctly converts both to feet via `metersToFeet()` on lines 217 and 253. So this specific bug was a false positive in the audit — the code is correct. **Skip this fix.**

Wait — re-reading snow-type.ts more carefully: line 85 says `const freezingM = h.freezing_level_height;` and Open-Meteo returns this in meters. Line 86 compares `freezingM > tour.max_elevation_m`. Both are meters. This is fine. The audit was wrong on this specific line. **No change needed.**

---

### Fix 1.3: Fix phantom temperature crossing in melt-freeze cycle detection

**File:** `src/lib/analysis/snow-type.ts`
**Lines:** 75, 91-95
**Problem:** `prevAboveFreezing` is initialized to `null`. On the first hour in the loop, line 92 checks `prevAboveFreezing !== null` — this is actually correct! The `!== null` guard means the first iteration sets `prevAboveFreezing` to the current state without incrementing `tempCrossings`. The audit flagged this as a bug but the guard is working correctly. **No change needed.**

---

### Fix 1.4: Remove user zoom restriction (WCAG 1.4.4 violation)

**File:** `src/app/layout.tsx`
**Lines:** 13-15
**Problem:** `maximumScale: 1` and `userScalable: false` prevent pinch-to-zoom on the entire page. This is a WCAG 1.4.4 failure — users with low vision cannot zoom text. The Mapbox map has its own gesture handling that isn't affected by viewport meta.
**Change:**
```ts
// BEFORE:
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e40af',
};

// AFTER:
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
};
```
Remove `maximumScale` and `userScalable`. If the map container gets double-zoom issues, add `touch-action: none` to the map div in `TourMap.tsx` instead.

---

### Fix 1.5: Fix hardcoded PST timezone (fails during daylight saving)

**File:** `src/components/map/SunExposureOverlay.tsx`
**Line:** 57
**Problem:** `new Date(\`${y}-${m}-${d}T00:00:00-08:00\`)` hardcodes Pacific Standard Time (-08:00). During PDT (March–November), the actual offset is -07:00. This makes sun exposure calculations wrong by 1 hour for ~8 months of the year.
**Change:**
```ts
// BEFORE (line 57):
const midnight = new Date(`${y}-${m}-${d}T00:00:00-08:00`);

// AFTER:
// Compute the offset dynamically for the target date
const targetDate = new Date(`${y}-${m}-${d}T12:00:00Z`); // noon UTC to avoid DST edge
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  timeZoneName: 'shortOffset',
});
const parts = formatter.formatToParts(targetDate);
const tzPart = parts.find(p => p.type === 'timeZoneName');
// tzPart.value is "GMT-8" or "GMT-7"
const offsetHours = parseInt(tzPart?.value?.replace('GMT', '') ?? '-8', 10);
const offsetStr = `${offsetHours < 0 ? '-' : '+'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
const midnight = new Date(`${y}-${m}-${d}T00:00:00${offsetStr}`);
```
Alternative simpler approach: use `toLocaleDateString` with the timezone and construct midnight from that.

---

### Fix 1.6: Differentiate avalanche likelihood penalties in scoring

**File:** `src/lib/analysis/scoring.ts`
**Lines:** 175-177
**Problem:** `likely`, `very likely`, and `certain` all have the same penalty of 15. This makes these three distinct likelihood levels indistinguishable in scoring.
**Change:**
```ts
// BEFORE:
const likelihoodPenalty: Record<string, number> = {
  unlikely: 3, possible: 8, likely: 15, 'very likely': 15, certain: 15,
};

// AFTER:
const likelihoodPenalty: Record<string, number> = {
  unlikely: 3, possible: 8, likely: 13, 'very likely': 18, certain: 25,
};
```

---

### Fix 1.7: Guard against NaN in avalanche problem size parsing

**File:** `src/lib/analysis/scoring.ts`
**Line:** 181
**Problem:** `parseFloat(problem.size[1])` — if `size[1]` is `"D3"`, `parseFloat("D3")` returns `NaN`. `NaN >= 3` is `false`, so the amplification doesn't apply, but `NaN` propagates if the format changes.
**Change:**
```ts
// BEFORE:
const maxSize = parseFloat(problem.size[1]) || 1;

// AFTER:
const sizeStr = String(problem.size[1] ?? '1');
const maxSize = parseFloat(sizeStr.replace(/[^0-9.]/g, '')) || 1;
```

---

### Fix 1.8: Sanitize HazardOverlay popup HTML

**File:** `src/components/map/HazardOverlay.tsx`
**Lines:** 220-228
**Problem:** Popup content is built from `props.name` and `props.description` via template string and injected with `setHTML()`. Tour data is developer-controlled currently, but this is an XSS vector if data sources expand.
**Change:**
```ts
// Add import at top:
import DOMPurify from 'dompurify';

// BEFORE (line 222):
.setHTML(
  `<div style="font-family:system-ui,sans-serif">` +
    `<div style="...">${category}</div>` +
    `<div style="...">${props.name}</div>` +
    `<div style="...">${props.description}</div>` +
  `</div>`,
)

// AFTER:
.setHTML(
  DOMPurify.sanitize(
    `<div style="font-family:system-ui,sans-serif">` +
      `<div style="...">${category}</div>` +
      `<div style="...">${props.name}</div>` +
      `<div style="...">${props.description}</div>` +
    `</div>`
  ),
)
```

---

### Fix 1.9: Add aria-labels to all interactive elements

**Files:** Multiple (listed below)
**Problem:** Buttons throughout the app use only `title` for identification. Screen readers don't reliably announce `title`. Toggle buttons don't communicate their state.

**MapControls.tsx — LayerButton (line 96):**
```tsx
// BEFORE:
<button
  onClick={onClick}
  className={...}
  title={`Toggle ${label}`}
>

// AFTER:
<button
  onClick={onClick}
  className={...}
  aria-label={`Toggle ${label}`}
  aria-pressed={active}
  title={`Toggle ${label}`}
>
```

**OverviewTimeline.tsx — timeline bar buttons (line 115):**
```tsx
// BEFORE:
<button
  key={h.index}
  onClick={() => onSelectHour(h.index)}
  className="..."
  title={`${getDayLabel(h.time)} ${formatHourLabel(h.time)}`}
>

// AFTER:
<button
  key={h.index}
  onClick={() => onSelectHour(h.index)}
  className="..."
  aria-label={`Select ${getDayLabel(h.time)} ${formatHourLabel(h.time)}`}
  title={`${getDayLabel(h.time)} ${formatHourLabel(h.time)}`}
>
```

**ConditionsGauge.tsx — score bar (line 18):**
```tsx
// BEFORE:
<div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">

// AFTER:
<div
  className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
  role="progressbar"
  aria-valuenow={composite}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Conditions score: ${composite} out of 100, ${bandLabel}`}
>
```

**SafetyOverlay.tsx — modal container (line 25-26):**
```tsx
// BEFORE:
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
  <div className="max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

// AFTER:
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="safety-title">
  <div className="max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
```
And on line 29: `<h2 id="safety-title" className="mt-2 text-xl font-bold text-gray-900">Before You Go</h2>`

---

### Fix 1.10: Add global focus-visible outline

**File:** `src/app/globals.css`
**Change:** Add after the `body` rule:
```css
/* Keyboard focus indicator — only shows on keyboard navigation, not mouse clicks */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Prevent focus outline on map container (Mapbox handles its own focus) */
.mapboxgl-canvas:focus-visible {
  outline: none;
}
```

---

## Sprint 2 — Core UX Improvements (10 fixes)

These make the app comprehensible and useful on first visit.

---

### Fix 2.1: Add conditions context banner to main screen

**File:** `src/components/tour/TourPanel.tsx`
**New component inline or separate:** `ConditionsBanner`
**Problem:** Users see numeric scores with no environmental context. No "Current: Moderate avy danger, 22°F, 15 mph winds" banner to orient them.
**Change:** Add a banner component above the timeline in both desktop (line 102-103) and mobile (line 201) tour list views.

```tsx
function ConditionsBanner({ forecast, avyData }: { forecast: WeatherForecast | null; avyData: any }) {
  if (!forecast) return null;

  const hour = getCurrentHour(forecast);
  const tempF = Math.round(celsiusToFahrenheit(hour.temperature_2m));
  const ridgeWindMph = kmhToMph(hour.wind_speed_80m);
  const zone = avyData?.zones?.[0];
  const dangerLevel = zone?.danger_level;
  const dangerLabels: Record<number, string> = { 1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Extreme' };
  const dangerColors: Record<number, string> = { 1: '#50B848', 2: '#FFF200', 3: '#F7941E', 4: '#ED1C24', 5: '#231F20' };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
      {dangerLevel && (
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dangerColors[dangerLevel] }} />
          <span className="font-medium">{dangerLabels[dangerLevel]} avy danger</span>
        </span>
      )}
      <span>{tempF}°F</span>
      <span>Ridge {ridgeWindMph} mph</span>
      {hour.snowfall > 0 && <span>Snowing</span>}
    </div>
  );
}
```
Insert `<ConditionsBanner forecast={repForecast} avyData={avyData} />` at line 102 (desktop) and line 201 (mobile), right before the `<OverviewTimeline>`.

Import `getCurrentHour` from `@/hooks/useWeather` and `celsiusToFahrenheit`, `kmhToMph` from `@/lib/types/conditions`.

---

### Fix 2.2: Add score explanation tooltip

**File:** `src/components/tour/ConditionsGauge.tsx`
**Problem:** "42 — Elevated concern" with no explanation of what the number means or what feeds into it.
**Change:** Add an (i) button next to the "Conditions Assessment" header that toggles an explanation panel.

```tsx
// Add state:
const [showHelp, setShowHelp] = useState(false);

// Replace line 12-13 header:
<div className="flex items-center justify-between">
  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
    Conditions Assessment
  </p>
  <button
    onClick={() => setShowHelp(!showHelp)}
    className="rounded-full px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600"
    aria-label="Explain conditions score"
    aria-expanded={showHelp}
  >
    ⓘ
  </button>
</div>

{showHelp && (
  <div className="mt-1.5 rounded-md bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-800">
    <p className="font-medium">How this score works</p>
    <p className="mt-1">Combines avalanche danger (50%), weather (35%), and terrain factors (15%) into a 0-100 score. Higher is more favorable.</p>
    <p className="mt-1"><strong>80+</strong> More favorable · <strong>60-79</strong> Moderate concern · <strong>40-59</strong> Elevated concern · <strong>20-39</strong> Significant concern · <strong>0-19</strong> Serious concern</p>
  </div>
)}
```
Add `'use client'` and `import { useState } from 'react'` at the top.

---

### Fix 2.3: Add rank numbers to tour cards

**Files:** `src/components/tour/TourPanel.tsx`, `src/components/tour/TourCard.tsx`
**Problem:** Cards are sorted by score but no "#1", "#2" indicator. Users can't correlate sidebar rankings with map pin badges.
**Change in TourPanel.tsx:** Pass rank to TourCard. In the `sortedTourIndices.map()` at lines 116-131 (desktop) and 215-230 (mobile):
```tsx
// BEFORE:
{sortedTourIndices.map((i) => {
  const tour = tours[i];
  return (
    <button key={tour.slug} ...>
      <TourCard tour={tour} conditions={...} snowType={...} isLoading={...} />
    </button>
  );
})}

// AFTER:
{sortedTourIndices.map((i, rankIndex) => {
  const tour = tours[i];
  return (
    <button key={tour.slug} ...>
      <TourCard tour={tour} conditions={...} snowType={...} isLoading={...} rank={rankIndex + 1} />
    </button>
  );
})}
```

**Change in TourCard.tsx:** Add `rank` prop and display badge:
```tsx
// Add to props interface (line 30-41):
rank?: number;

// Add after the tour name h3 (line 55), inside the flex container:
{rank != null && rank <= 3 && (
  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
    rank === 1 ? 'bg-amber-100 text-amber-800' :
    rank === 2 ? 'bg-gray-100 text-gray-600' :
    'bg-orange-50 text-orange-700'
  }`}>
    #{rank}
  </span>
)}
```

---

### Fix 2.4: Add Go/Caution/No-Go quick indicator

**File:** `src/components/tour/SidebarConditions.tsx`
**Problem:** The most important question — "Should I go?" — takes 30+ seconds to answer. Users must decode a numeric score.
**Change:** Add a decision badge above the ConditionsGauge. Insert after the ATES badge section (~line 100, before the `<details>` accordion):

```tsx
{/* Quick decision indicator */}
{conditionsAssessment && (
  <div className={`mt-3 mx-4 flex items-center gap-2 rounded-lg px-3 py-2 ${
    conditionsAssessment.composite >= 60
      ? 'bg-green-50 text-green-800'
      : conditionsAssessment.composite >= 30
        ? 'bg-amber-50 text-amber-800'
        : 'bg-red-50 text-red-800'
  }`}>
    <span className="text-lg">
      {conditionsAssessment.composite >= 60 ? '✓' : conditionsAssessment.composite >= 30 ? '⚠' : '✕'}
    </span>
    <div>
      <p className="text-xs font-semibold">
        {conditionsAssessment.composite >= 60
          ? 'Conditions look favorable'
          : conditionsAssessment.composite >= 30
            ? 'Exercise extra caution'
            : 'Conditions not recommended'}
      </p>
      <p className="text-[10px] opacity-80">
        {conditionsAssessment.reasons[0] || 'Based on current conditions assessment'}
      </p>
    </div>
  </div>
)}
```

---

### Fix 2.5: Display sunrise/sunset times

**File:** `src/components/tour/WeatherSummary.tsx`
**Problem:** `forecast.sunrise` and `forecast.sunset` are fetched but never displayed. Critical info for tour planning.
**Change:** Add after the detail grid (after line 142, before the alerts section):

```tsx
{/* Sunrise/Sunset */}
{forecast.sunrise?.[0] && forecast.sunset?.[0] && (
  <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
    <span>
      ☀ {new Date(forecast.sunrise[0]).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
      })}
    </span>
    <span>
      🌙 {new Date(forecast.sunset[0]).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
      })}
    </span>
    <span className="text-gray-400">
      {(() => {
        const rise = new Date(forecast.sunrise[0]);
        const set = new Date(forecast.sunset[0]);
        const hrs = Math.round((set.getTime() - rise.getTime()) / 3600000 * 10) / 10;
        return `${hrs}h daylight`;
      })()}
    </span>
  </div>
)}
```
Note: `forecast` is already in scope. The sunrise/sunset arrays are per-day, so `[0]` is today's.

---

### Fix 2.6: Show data freshness timestamp

**File:** `src/components/tour/WeatherSummary.tsx`
**Problem:** No "Updated 3 min ago" indicator. Users can't tell if data is fresh. `DataFreshness` component exists but isn't used.
**Change:** The `useWeather` hook returns `dataUpdatedAt` from React Query. Access it and pass to `DataFreshness`.

Replace the freshness text at the bottom (lines 158-163):
```tsx
// BEFORE:
{!compact && (
  <p className="mt-3 text-[10px] text-gray-400">
    Data from Open-Meteo · Nearest hour to{' '}
    {new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
  </p>
)}

// AFTER:
{!compact && (
  <div className="mt-3 flex items-center justify-between">
    <p className="text-[10px] text-gray-400">
      Data from Open-Meteo · {new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </p>
    <DataFreshness label="Updated" updatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null} />
  </div>
)}
```
Also need to destructure `dataUpdatedAt` from `useWeather`:
```tsx
const { data: forecast, isLoading, error, dataUpdatedAt } = useWeather(tour);
```
And import `DataFreshness`:
```tsx
import { DataFreshness } from '@/components/ui/DataFreshness';
```

---

### Fix 2.7: Wire up AvyDangerBanner on detail page (remove "Sprint 2" placeholder)

**File:** `src/components/tour/TourDetail.tsx`
**Lines:** 152-170
**Problem:** Shows "Live avalanche data coming in Sprint 2" despite data being available via `useAvyForecast()`.
**Change:** Replace the placeholder section with the actual AvyDangerBanner:

```tsx
// Add imports at top:
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { AvyDangerBanner } from './AvyDangerBanner';

// Add hook call inside TourDetailView:
const { data: avyData } = useAvyForecast();

// Replace lines 152-170:
{/* Avalanche conditions */}
<section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
    Avalanche Conditions
  </h2>
  {avyData ? (
    <AvyDangerBanner zones={avyData.zones} detailed={avyData.detailed} />
  ) : (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      <p className="mt-2 text-xs text-gray-400">Loading avalanche forecast...</p>
    </div>
  )}
  <a
    href="https://www.sierraavalanchecenter.org/advisory"
    target="_blank"
    rel="noopener noreferrer"
    className="mt-3 block rounded-lg bg-blue-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-blue-700"
  >
    View Full SAC Forecast
  </a>
</section>
```
Note: Check the AvyDangerBanner props interface to ensure it accepts `zones` and `detailed` in this format. It may need adaptation.

---

### Fix 2.8: Add ATES rating tooltip

**Files:** `src/components/tour/TourCard.tsx`, `src/components/tour/SidebarConditions.tsx`, `src/components/tour/TourDetail.tsx`
**Problem:** "ATES: Challenging" badge shown with no explanation of what ATES means.
**Change:** Wrap ATES badge with a tooltip explanation. In each file where the ATES badge renders, add a `title` attribute AND an `aria-label`:

```tsx
// In TourCard.tsx (lines 114-120):
<span
  className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ates.color}`}
  title="Avalanche Terrain Exposure Scale — Simple: minimal avy terrain. Challenging: well-defined avy paths. Complex: multiple overlapping avy paths."
  aria-label={`${ates.label} — Avalanche Terrain Exposure Scale`}
>
  {ates.label}
</span>
```
Same pattern in SidebarConditions.tsx and TourDetail.tsx.

---

### Fix 2.9: Add "best time to go" summary text

**File:** `src/components/tour/OverviewTimeline.tsx`
**Problem:** Users must visually scan 72 tiny colored bars to find the optimal window. No text summary.
**Change:** After the selection label (line 156-160), add a best-window summary derived from the existing `assessHour` data:

```tsx
// Add to the component, computed from the hours data:
const bestWindow = useMemo(() => {
  // Find the longest consecutive stretch of "more" favorability during daylight
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < hours.length; i++) {
    if (hours[i].isDay && hours[i].favorability === 'more') {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curStart = -1; curLen = 0;
    }
  }
  if (bestStart === -1 || bestLen < 2) return null;
  const startLabel = `${getDayLabel(hours[bestStart].time)} ${formatHourLabel(hours[bestStart].time)}`;
  const endLabel = formatHourLabel(hours[bestStart + bestLen - 1].time);
  return `${startLabel} – ${endLabel} (${bestLen}h)`;
}, [hours]);

// Render below the selection label:
{!selectedLabel && bestWindow && (
  <p className="mt-1.5 text-[11px] text-green-700">
    Best window: {bestWindow}
  </p>
)}
```

---

### Fix 2.10: Restore compact gear list to sidebar

**File:** `src/components/tour/SidebarConditions.tsx`
**Problem:** Gear recommendations removed from sidebar — only available on detail page. Users can't see gear advice without navigating away.
**Change:** Import and render `GearListCompact` in the sidebar. Add it after the WeatherSummary section. Looking at the existing SidebarConditions structure, insert it after the weather summary and before the variant selector:

```tsx
// Add import:
import { GearListCompact } from './GearListCompact';

// Add after the WeatherSummary render (find where WeatherSummary is rendered in the sidebar):
<GearListCompact tour={tour} />
```

---

## Sprint 3 — Mobile & Accessibility (10 fixes)

---

### Fix 3.1: Implement bottom sheet swipe gestures

**File:** `src/components/tour/TourPanel.tsx`
**Lines:** 183-234 (MobileBottomSheet function)
**Problem:** Drag handle at line 187 is purely visual. No touch gesture support.
**Change:** Add touch event handlers to the drag handle div. Track `touchstart` → `touchmove` → `touchend` to adjust sheet height. Three snap points: collapsed (64px, handle only), half (45dvh), full (85dvh).

```tsx
// Add state to MobileBottomSheet:
const [sheetHeight, setSheetHeight] = useState<'collapsed' | 'half' | 'full'>('half');
const startY = useRef(0);
const startHeight = useRef('half');

const heightClass = {
  collapsed: 'max-h-16',
  half: 'max-h-[45dvh]',
  full: 'max-h-[85dvh]',
};

// Replace the drag handle div (line 186-188):
<div
  className="sticky top-0 z-10 flex justify-center bg-white pb-1 pt-2 cursor-grab active:cursor-grabbing"
  onTouchStart={(e) => {
    startY.current = e.touches[0].clientY;
    startHeight.current = sheetHeight;
  }}
  onTouchEnd={(e) => {
    const dy = startY.current - e.changedTouches[0].clientY;
    if (dy > 50) {
      // Swiped up
      setSheetHeight(startHeight.current === 'collapsed' ? 'half' : 'full');
    } else if (dy < -50) {
      // Swiped down
      setSheetHeight(startHeight.current === 'full' ? 'half' : 'collapsed');
    }
  }}
  role="slider"
  aria-label="Resize panel"
  aria-valuetext={sheetHeight}
>
  <div className="h-1 w-8 rounded-full bg-gray-300" />
</div>

// Update the container div (line 184) to use dynamic height:
<div className={`mx-2 mb-2 ${heightClass[sheetHeight]} overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200 transition-[max-height] duration-200`}>
```

---

### Fix 3.2: Redesign timeline for mobile (day segments)

**File:** `src/components/tour/OverviewTimeline.tsx`
**Problem:** 72 bars at ~4px wide are untappable on mobile.
**Change:** Add a day-segmented view for mobile. Show 3 tabs (Today / Tomorrow / Day 3), each showing 24 wider bars (~12px each). Desktop keeps the full 72-bar view.

```tsx
// Add state for mobile day selection:
const [activeDay, setActiveDay] = useState(0);

// In the render, wrap the bars section:
{/* Day tabs for mobile */}
<div className="flex gap-1 mb-2 md:hidden">
  {dayLabels.map((dl, idx) => (
    <button
      key={dl.index}
      onClick={() => setActiveDay(idx)}
      className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${
        activeDay === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
      }`}
      aria-label={`Show ${dl.label} forecast`}
    >
      {dl.label}
    </button>
  ))}
</div>

{/* Full 72-bar view for desktop */}
<div className="hidden md:flex gap-px">
  {hours.map((h) => /* existing bar code */)}
</div>

{/* Day-segmented view for mobile */}
<div className="flex gap-px md:hidden">
  {hours
    .filter((_, i) => {
      const dayStart = dayLabels[activeDay]?.index ?? 0;
      const dayEnd = dayLabels[activeDay + 1]?.index ?? hours.length;
      return i >= dayStart && i < dayEnd;
    })
    .map((h) => /* same bar code but wider */)}
</div>
```

---

### Fix 3.3: Add focus trap to safety modal

**File:** `src/components/ui/SafetyOverlay.tsx`
**Problem:** Modal has no focus trap. Tab key navigates behind the modal.
**Change:** Add `useEffect` to trap focus within the modal and auto-focus the first interactive element.

```tsx
import { useState, useEffect, useRef } from 'react';

// Inside SafetyOverlay:
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!show || !modalRef.current) return;

  const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );
  const firstEl = focusableElements[0];
  const lastEl = focusableElements[focusableElements.length - 1];

  firstEl?.focus();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstEl) { e.preventDefault(); lastEl?.focus(); }
    } else {
      if (document.activeElement === lastEl) { e.preventDefault(); firstEl?.focus(); }
    }
    if (e.key === 'Escape') { /* optionally allow dismiss */ }
  }

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [show]);

// Add ref to the modal content div (line 26):
<div ref={modalRef} className="max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
```

---

### Fix 3.4: Add SVG accessibility to charts

**Files:** `src/components/tour/ElevationProfile.tsx`, `src/components/tour/ConditionsGauge.tsx`
**Problem:** SVG charts have no screen reader content.
**Change in ElevationProfile.tsx:** Add `role="img"` and `aria-label` to the root SVG:
```tsx
<svg
  viewBox={...}
  className={...}
  role="img"
  aria-label={`Elevation profile for ${tour.name}: ${metersToFeet(tour.min_elevation_m).toLocaleString()} to ${metersToFeet(tour.max_elevation_m).toLocaleString()} feet over ${kmToMiles(tour.distance_km)} miles`}
>
```

---

### Fix 3.5: Fix color contrast issues

**Files:** Global search-and-replace across components
**Problem:** `text-gray-400` on white has ~3.0:1 contrast (needs 4.5:1 for WCAG AA).
**Change:** Replace `text-gray-400` with `text-gray-500` (4.6:1 — passes AA for normal text) throughout, specifically for:
- Section headers (e.g., "Current Weather", "Conditions Assessment")
- Stat labels in TourCard, TourDetail, WeatherSummary
- Data freshness text
- Footnote disclaimers

For `text-[10px]` labels that are supplementary: `text-gray-500` is the minimum.
For body text at `text-xs` and above: use `text-gray-600` minimum.

Also remove `opacity-80` from danger labels in `AvyDangerBanner.tsx` where it reduces contrast.

---

### Fix 3.6: Add semantic landmarks

**File:** `src/app/page.tsx`
**Change:**
```tsx
// BEFORE:
<div className="relative flex h-dvh w-full flex-col md:flex-row">
  <div className="relative h-full flex-1 md:h-full">

// AFTER:
<div className="relative flex h-dvh w-full flex-col md:flex-row">
  <main className="relative h-full flex-1 md:h-full" aria-label="Map">
```

**File:** `src/components/tour/TourPanel.tsx`
The `<aside>` tag is already used (line 84). Add `aria-label`:
```tsx
<aside className="hidden md:flex ..." aria-label="Tour conditions panel">
```

---

### Fix 3.7: Fix touch target sizes

**Files:** `src/components/map/MapControls.tsx`, `src/components/tour/OverviewTimeline.tsx`, `src/components/tour/VariantSelector.tsx`
**Problem:** Multiple interactive elements below 44px minimum.

**MapControls.tsx (line 98):** Change `py-2` to `py-2.5` and add `min-h-[44px]`:
```tsx
className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium shadow-md transition-colors min-h-[44px] ${...}`}
```

**OverviewTimeline.tsx (line 119):** Increase bar height from 24px to 32px on mobile:
```tsx
style={{ height: 32 }} // was 24
```
This still won't reach 44px for width, but the mobile day-segment redesign (Fix 3.2) addresses that with wider bars.

**VariantSelector.tsx:** Increase padding from `py-1.5` to `py-2.5`:
```tsx
className={`rounded-lg px-3 py-2.5 text-xs font-medium min-h-[44px] ${...}`}
```

---

### Fix 3.8: Add mobile-friendly layer labels

**File:** `src/components/map/MapControls.tsx`
**Problem:** `title` tooltip doesn't work on touch. Emoji icons aren't self-explanatory.
**Change:** The buttons already show text labels (`label` prop renders as text in the button). The issue is that on very small screens the stack of buttons takes too much space. On mobile, show only the icon and use `aria-label` for accessibility (already added in Fix 1.9). Add a mobile-compact mode:

```tsx
// The label is already visible text next to the icon.
// On mobile, conditionally hide the label text to save space:
<span className="hidden sm:inline">{label}</span>
```
This shows icon-only on small screens, icon+text on larger screens. The `aria-label` from Fix 1.9 ensures screen reader access.

---

### Fix 3.9: Add landscape orientation support

**File:** `src/components/tour/TourPanel.tsx`
**Problem:** In landscape on phone, bottom sheet at 45dvh takes 45% of ~375px height = 170px. Map gets ~205px. Unusable.
**Change:** Use a CSS media query to detect landscape and reduce sheet height:

```tsx
// In the mobile bottom sheet container (line 184):
// BEFORE:
<div className="mx-2 mb-2 max-h-[45dvh] overflow-y-auto ...">

// AFTER (using Tailwind arbitrary variants):
<div className="mx-2 mb-2 max-h-[45dvh] landscape:max-h-[30dvh] overflow-y-auto ...">
```
Note: Tailwind v4 supports `landscape:` variant natively. This gives the sheet 30% of the short axis in landscape, preserving more map.

---

### Fix 3.10: Add timeline click confirmation feedback

**File:** `src/components/tour/OverviewTimeline.tsx`
**Lines:** 115-138
**Problem:** Clicking a timeline bar gives only a subtle outline. No animation or confirmation.
**Change:** Add a brief scale animation on the selected bar and make the selection label more prominent:

```tsx
// On the selected bar's inner div (line 122-130), add a scale animation:
<div
  className={`h-full w-full rounded-[1px] transition-all duration-150 ${
    isSelected ? 'scale-y-125 ring-2 ring-blue-500' : ''
  }`}
  style={{
    backgroundColor: color,
    opacity: isSelected ? 1 : 0.6,
  }}
/>

// Make the selection label more visible (lines 156-160):
{selectedLabel && (
  <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1.5">
    <span className="text-[11px] font-semibold text-blue-700">
      Showing conditions for {selectedLabel}
    </span>
    <button
      onClick={() => onSelectHour(null)}
      className="text-[10px] font-medium text-blue-500 hover:text-blue-700"
      aria-label="Reset to current time"
    >
      Reset
    </button>
  </div>
)}
```
Also remove the separate Reset button from the header area (lines 97-104) since it's now in the selection label.

---

## Sprint 4 — Engagement & Sharing (5 fixes)

---

### Fix 4.1: URL state persistence

**File:** `src/app/page.tsx`, `src/stores/map.ts`
**Problem:** Page refresh loses all state. No deep links possible.
**Change:** Sync `selectedTourSlug` and `selectedForecastHour` to URL search params.

In `page.tsx`, read URL params on mount and write them on change:
```tsx
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMapStore } from '@/stores/map';

// Inside Home():
const searchParams = useSearchParams();
const router = useRouter();
const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
const selectTour = useMapStore((s) => s.selectTour);
const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);

// Hydrate from URL on mount
useEffect(() => {
  const tour = searchParams.get('tour');
  const hour = searchParams.get('hour');
  if (tour) selectTour(tour);
  if (hour) setSelectedForecastHour(parseInt(hour, 10));
}, []); // intentionally run once

// Sync state → URL
useEffect(() => {
  const params = new URLSearchParams();
  if (selectedTourSlug) params.set('tour', selectedTourSlug);
  if (selectedForecastHour != null) params.set('hour', String(selectedForecastHour));
  const str = params.toString();
  const newUrl = str ? `?${str}` : '/';
  router.replace(newUrl, { scroll: false });
}, [selectedTourSlug, selectedForecastHour, router]);
```

---

### Fix 4.2: Share conditions link

**Files:** `src/components/tour/SidebarConditions.tsx`, `src/components/tour/TourDetail.tsx`
**Problem:** No way to share a conditions view with a partner.
**Change:** Add a "Share" button that copies the current URL (which now includes tour + hour params from Fix 4.1).

```tsx
// Add a share button near the "View Full Conditions Dashboard" link:
<button
  onClick={async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Skiii: ${tour.name}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      // Show brief "Copied!" feedback (use local state)
    }
  }}
  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
  aria-label="Share conditions link"
>
  Share
</button>
```

---

### Fix 4.3: Trailhead directions link

**File:** `src/components/tour/TourDetail.tsx`
**Lines:** 261-277 (Trailhead & Parking section)
**Problem:** Trailhead coordinates available but not actionable.
**Change:** Add a "Get Directions" link below the parking info:

```tsx
// After the SAR jurisdiction line (line 275):
<a
  href={`https://maps.google.com/?daddr=${(tour.trailhead.geometry.coordinates as [number, number])[1]},${(tour.trailhead.geometry.coordinates as [number, number])[0]}`}
  target="_blank"
  rel="noopener noreferrer"
  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
>
  Get Directions
</a>
```
Also add the same link in the expanded TourCard parking section.

---

### Fix 4.4: Tour search/filter

**File:** `src/components/tour/TourPanel.tsx`
**Problem:** As tours grow, browsing a full list becomes unwieldy. No search or filter.
**Change:** Add a search input and difficulty filter chips above the tour list.

```tsx
// Add state:
const [searchQuery, setSearchQuery] = useState('');
const [diffFilter, setDiffFilter] = useState<string | null>(null);

// Filter before sorting:
const filteredIndices = sortedTourIndices.filter((i) => {
  const tour = tours[i];
  if (searchQuery && !tour.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
  if (diffFilter && tour.difficulty !== diffFilter) return false;
  return true;
});

// Render search + filter above the tour cards:
<div className="mb-2 space-y-2">
  <input
    type="search"
    placeholder="Search tours..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
    aria-label="Search tours by name"
  />
  <div className="flex gap-1.5">
    {['beginner', 'intermediate', 'advanced', 'expert'].map((d) => (
      <button
        key={d}
        onClick={() => setDiffFilter(diffFilter === d ? null : d)}
        className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
          diffFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}
        aria-label={`Filter by ${d}`}
        aria-pressed={diffFilter === d}
      >
        {d.charAt(0).toUpperCase() + d.slice(1)}
      </button>
    ))}
  </div>
</div>
```
Replace `sortedTourIndices` with `filteredIndices` in the `.map()` calls.

---

### Fix 4.5: Map pin ranking reliability

**File:** `src/components/map/TourMap.tsx`
**Lines:** 282-289
**Problem:** `applyMarkerStyles` depends on refs but fires on `styledata` event which can fire from any style change.
**Change:** Call `applyMarkerStyles` directly in a `useEffect` watching `topTourSlugs` and `selectedTourSlug`, rather than relying on the `styledata` event:

```tsx
// Add a dedicated effect for marker styling (after the existing styledata listener):
useEffect(() => {
  if (!mapReady || !mapRef.current) return;
  applyMarkerStyles();
}, [mapReady, topTourSlugs, selectedTourSlug]);
```
This ensures markers update when rankings change, regardless of styledata events.

---

## Sprint 5 — Performance & Polish (7 fixes)

---

### Fix 5.1: Memoize TourCard

**File:** `src/components/tour/TourCard.tsx`
**Change:** Wrap the component export with `React.memo`:
```tsx
import { memo } from 'react';

export const TourCard = memo(function TourCard({ tour, expanded, conditions, snowType, isLoading, rank }: Props) {
  // ... existing implementation
});
```

---

### Fix 5.2: Batch MapControls store selectors

**File:** `src/components/map/MapControls.tsx`
**Lines:** 6-27
**Problem:** 23 individual `useMapStore` calls, each creating a separate subscription.
**Change:** Use a single selector with `useShallow`:
```tsx
import { useShallow } from 'zustand/react/shallow';

export function MapControls() {
  const {
    show3DTerrain, showSlopeAngle, showAvyZones, showWind, showPrecip,
    showAspect, showSunExposure, showTreeCover, showHazards,
    toggle3DTerrain, toggleSlopeAngle, toggleAvyZones, toggleWind, togglePrecip,
    toggleAspect, toggleSunExposure, toggleTreeCover, toggleHazards,
    selectedTourSlug, isEditingRoute, toggleRouteEditor, layerLoading,
  } = useMapStore(useShallow((s) => ({
    show3DTerrain: s.show3DTerrain,
    showSlopeAngle: s.showSlopeAngle,
    showAvyZones: s.showAvyZones,
    showWind: s.showWind,
    showPrecip: s.showPrecip,
    showAspect: s.showAspect,
    showSunExposure: s.showSunExposure,
    showTreeCover: s.showTreeCover,
    showHazards: s.showHazards,
    toggle3DTerrain: s.toggle3DTerrain,
    toggleSlopeAngle: s.toggleSlopeAngle,
    toggleAvyZones: s.toggleAvyZones,
    toggleWind: s.toggleWind,
    togglePrecip: s.togglePrecip,
    toggleAspect: s.toggleAspect,
    toggleSunExposure: s.toggleSunExposure,
    toggleTreeCover: s.toggleTreeCover,
    toggleHazards: s.toggleHazards,
    selectedTourSlug: s.selectedTourSlug,
    isEditingRoute: s.isEditingRoute,
    toggleRouteEditor: s.toggleRouteEditor,
    layerLoading: s.layerLoading,
  })));
  // ... rest unchanged
}
```

---

### Fix 5.3: Code-split overlay components

**File:** `src/components/map/TourMap.tsx`
**Problem:** 9 overlay components loaded eagerly even though most users use 1-2.
**Change:** Use `React.lazy` for overlays that aren't visible by default:
```tsx
import { lazy, Suspense } from 'react';

const SlopeOverlay = lazy(() => import('./SlopeOverlay').then(m => ({ default: m.SlopeOverlay })));
const AspectOverlay = lazy(() => import('./AspectOverlay').then(m => ({ default: m.AspectOverlay })));
const SunExposureOverlay = lazy(() => import('./SunExposureOverlay').then(m => ({ default: m.SunExposureOverlay })));
const TreeCoverOverlay = lazy(() => import('./TreeCoverOverlay').then(m => ({ default: m.TreeCoverOverlay })));

// In render, wrap lazy components:
{showSlopeAngle && mapReady && (
  <Suspense fallback={null}>
    <SlopeOverlay map={mapRef.current} />
  </Suspense>
)}
```
Keep `PrecipOverlay`, `TourRoute`, `HazardOverlay`, and `RouteWeatherDots` eagerly loaded since they're commonly used.

---

### Fix 5.4: Deduplicate gear recommendation calculation

**Files:** `src/components/tour/GearRecommendation.tsx`, `src/components/tour/GearListCompact.tsx`
**Problem:** Both independently call `getGearRecommendations()` with same params.
**Change:** Create a shared hook:
```tsx
// New file: src/hooks/useGearRecommendations.ts
import { useMemo } from 'react';
import { getGearRecommendations } from '@/lib/analysis/gear';
import { useWeather } from './useWeather';
import { useAvyForecast } from './useAvyForecast';
import { useMapStore } from '@/stores/map';
import type { Tour } from '@/lib/types/tour';

export function useGearRecommendations(tour: Tour) {
  const { data: forecast, isLoading, error } = useWeather(tour);
  const { data: avyData } = useAvyForecast();
  const selectedHour = useMapStore((s) => s.selectedForecastHour);
  const variantIndex = useMapStore((s) => s.selectedVariantIndex);
  const variant = tour.variants[variantIndex] ?? tour.variants[0];

  const recommendations = useMemo(() => {
    if (!forecast || !variant) return null;
    return getGearRecommendations(forecast, tour, variant, avyData ?? null, selectedHour);
  }, [forecast, tour, variant, avyData, selectedHour]);

  return { recommendations, isLoading, error };
}
```
Update both components to use this shared hook instead of computing independently.

---

### Fix 5.5: Standardize spacing and typography

**Files:** All component files
**Problem:** Inconsistent padding, border-radius, and text sizing creates visual noise.
**Change:** Define a design system and apply it:

**Spacing tokens:**
- Card padding: `p-3` (compact), `p-4` (standard)
- Section gap: `space-y-4` between sections
- Inner element gap: `gap-2` or `gap-3`

**Border radius:**
- Cards/sections: `rounded-xl`
- Buttons/badges: `rounded-lg`
- Tiny elements (pills): `rounded-full`

**Elevation:**
- Cards: `shadow-sm ring-1 ring-gray-100` (standardize on this everywhere)
- Remove mixed `border border-gray-200` vs `ring-1 ring-gray-100` — pick one

**Typography:**
- Section headers: `text-xs font-semibold uppercase tracking-wide text-gray-500`
- Card titles: `text-sm font-semibold text-gray-900`
- Body text: `text-sm leading-relaxed text-gray-700`
- Detail/meta text: `text-xs text-gray-500`
- Tiny labels: `text-[11px] text-gray-500` (minimum — never use text-gray-400)

This is a systematic find-and-replace across all files. Do it file-by-file, verifying each change.

---

### Fix 5.6: Fix map legend collision

**Files:** All overlay components with legends (`SlopeOverlay.tsx`, `PrecipOverlay.tsx`, `SunExposureOverlay.tsx`, `TreeCoverOverlay.tsx`)
**Problem:** Multiple overlay legends can overlap each other and the Mapbox scale control.
**Change:** Create a `MapLegendContainer` component that stacks active legends vertically:

```tsx
// New component: src/components/map/MapLegendContainer.tsx
export function MapLegendContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-8 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
      {children}
    </div>
  );
}
```
Move all legend JSX from individual overlay components into child elements rendered through a portal or prop system into this container. Each overlay exports its legend as a separate component.

---

### Fix 5.7: Smooth 3D terrain transition

**File:** `src/stores/map.ts`
**Lines:** 103-107
**Problem:** 3D toggle snaps pitch to 60° instantly.
**Change:** Instead of setting pitch directly in the store, dispatch a command that the map handles with animation.

In `TourMap.tsx`, listen for pitch changes and animate:
```tsx
useEffect(() => {
  if (!mapReady || !mapRef.current) return;
  mapRef.current.easeTo({ pitch, duration: 800 });
}, [pitch, mapReady]);
```
The store still sets `pitch: 60` or `pitch: 0`, but the map uses `easeTo` instead of snapping.

---

## Sprint 6 — Enhancement Features (8 fixes)

---

### Fix 6.1: Tour comparison mode

**New file:** `src/components/tour/TourComparison.tsx`
**Problem:** Users can't compare two tours side-by-side.
**Change:** Add a "Compare" button to TourCards. When two tours are selected for comparison, show a modal/overlay with side-by-side metrics:

- Score bars (composite, avy, weather, terrain)
- Distance, elevation, time
- Snow type
- Key conditions reasons
- Difficulty / ATES rating

**Implementation:** Add `compareTourSlugs: string[]` to the Zustand store. TourCard gets a checkbox overlay. When 2 are selected, render comparison modal.

---

### Fix 6.2: Dark mode

**Files:** `src/app/globals.css`, `src/app/layout.tsx`
**Change:** Add dark mode support using Tailwind's `dark:` variant and `prefers-color-scheme`:

```css
/* In globals.css: */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```
Add `dark:` variants to key components. Start with the TourPanel sidebar and safety overlay. The map already has a dark-ish appearance.

---

### Fix 6.3: Keyboard shortcuts

**File:** `src/app/page.tsx` (or new `useKeyboardShortcuts` hook)
**Change:** Add keyboard handler for power users:
- `Esc` — deselect tour
- `1-9` — toggle layers
- `←/→` — cycle through tours
- `Shift+←/→` — move forecast hour

---

### Fix 6.4: Print view for tour detail

**File:** `src/app/globals.css`
**Change:** Add print stylesheet:
```css
@media print {
  .mapboxgl-map, .mapboxgl-ctrl, nav, aside, button { display: none !important; }
  .print-show { display: block !important; }
  body { background: white; color: black; }
}
```

---

### Fix 6.5: Unit toggle (metric/imperial)

**Files:** New store or localStorage setting, all display components
**Change:** Add a `useUnits` store/context. All display functions (`metersToFeet`, `kmToMiles`, etc.) check the current preference. Default to imperial (US audience), toggle to metric.

---

### Fix 6.6: Snow type actionable guidance

**File:** `src/lib/analysis/snow-type.ts`, display in `TourCard.tsx`
**Change:** Add an `advice` field to `SnowClassification`:
```ts
// Add to the return objects:
powder: { advice: 'Wide skis recommended. Watch for wind loading on lee slopes.' },
corn: { advice: 'Time your ascent for firm conditions, ski during the softening window.' },
'wind-affected': { advice: 'Expect variable surface. Avoid wind-loaded features.' },
crust: { advice: 'Ski crampons may help. Expect breakable crust on steeper terrain.' },
firm: { advice: 'Edge hold is key. Consider wider edges or crampons.' },
```

---

### Fix 6.7: Conditions alerts prominently on tour cards

**File:** `src/components/tour/TourCard.tsx`
**Problem:** Rain-on-snow risk and extreme wind buried in WeatherSummary, not visible on card.
**Change:** Check for critical conditions in the TourCard and show an alert strip:

```tsx
{/* Critical alerts on card */}
{conditions && conditions.composite < 20 && (
  <div className="mt-1.5 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
    {conditions.reasons[0]}
  </div>
)}
```

---

### Fix 6.8: Elevation-interpolated weather display

**File:** `src/components/tour/WeatherSummary.tsx`
**Problem:** Weather shown at trailhead elevation only. Summit temp can be 10-20°F colder.
**Change:** Calculate approximate summit temperature using standard lapse rate (3.5°F per 1000ft):

```tsx
// After tempF calculation:
const summitTempF = Math.round(tempF - ((metersToFeet(tour.max_elevation_m) - metersToFeet(tour.min_elevation_m)) * 3.5 / 1000));

// Display:
<p className="text-xs text-gray-500">
  Trailhead {tempF}°F · Summit ~{summitTempF}°F (estimated)
</p>
```

---

## Summary

| Sprint | Fixes | Focus |
|--------|-------|-------|
| 1 | 10 | Critical bugs, a11y basics, code correctness |
| 2 | 10 | Make data comprehensible, answer "should I go?" |
| 3 | 10 | Mobile usability, full accessibility |
| 4 | 5 | URL state, sharing, search, map reliability |
| 5 | 7 | Performance, design consistency, polish |
| 6 | 8 | Comparison, dark mode, shortcuts, advanced features |
| **Total** | **50 fixes** | |

Excluded per request: Offline Mode, Favorites/Bookmarks.
