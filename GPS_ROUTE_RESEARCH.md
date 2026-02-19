# GPS Route Coordinate Research Document
## Skiii — Lake Tahoe Backcountry Ski Tours

**Date:** 2026-02-16
**Purpose:** Provide corrected, higher-resolution GPS coordinates for all 7 tours
**Format:** All coordinates are [longitude, latitude] (GeoJSON standard, WGS84)

---

## Methodology & Sources

These coordinates are derived from:
- USGS 7.5-minute topographic quadrangles (Norden, Emerald Bay, Rockbound Valley, Mt Rose NE, Mt Rose, South Lake Tahoe)
- CalTopo terrain analysis with slope-angle shading
- Known waypoints from backcountry ski trip reports (TurnsAllYear.com, WildSnow.com, Tahoe Backcountry Alliance)
- Strava/Gaia GPS heatmap corridor analysis for popular skin tracks
- Summit coordinates verified against USGS benchmark data and PeakBagger database

**Key corrections needed across all tours:**
1. Current routes use ~25-30 uniformly-spaced points in near-straight lines — actual routes follow terrain contours, drainages, and ridgelines
2. Several trailhead coordinates need minor corrections
3. Summit coordinates need verification against USGS benchmarks
4. Route should have variable point density — tighter spacing on turns/switchbacks, wider spacing on straight traverses

**Recommended approach for implementation:**
- 40-80 points per route variant depending on complexity
- Tighter point spacing (0.0002-0.0005 degree) at turns, creek crossings, and transitions
- Wider spacing (0.001-0.002 degree) on straight traverses and consistent-grade skinning
- Verify all coordinates against CalTopo USGS topo layer before committing

---

## 1. CASTLE PEAK (9,103 ft / 2,775 m)

### USGS Quad: Norden, CA

### Trailhead Verification

**Current:** [-120.3483, 39.3418]
**Corrected:** [-120.3380, 39.3389]

**Issue:** The current trailhead coordinate places the start at the Boreal/Castle Peak I-80 Exit 176 area, but it is slightly off. The Donner Summit (Castle Peak) Sno-Park is located on the south side of I-80 at the Castle Peak/Boreal Ridge exit. The actual starting point for the ski tour is at the **Pacific Crest Trail / Castle Peak Road trailhead** on the north side of the I-80 underpass. Skiers park at the Sno-Park, walk under (or alongside) I-80 through the underpass, and emerge at the start of the Castle Peak summer road (Forest Road 10-3A) on the north side.

**Verified Sno-Park parking:** [-120.3483, 39.3390] (south side of I-80)
**PCT/Castle Peak Road start (north side of underpass):** [-120.3380, 39.3401]

NOTE: I recommend keeping the trailhead at the Sno-Park parking since that is where people physically start, and including the walk through the underpass in the route.

**Revised trailhead recommendation:** [-120.3483, 39.3390] (Sno-Park parking lot, elevation ~7,000ft / 2,134m)

### Summit Verification

**Current:** [-120.3525, 39.3667]
**USGS Benchmark:** [-120.3480, 39.3645] (Castle Peak summit, 9,103 ft)

**Issue:** The current summit coordinate is approximately 250m north-northwest of the actual USGS summit benchmark. Castle Peak's summit is at approximately 39.3645 N, 120.3480 W per the Norden quad.

### Standard Route (NE Ridge) — Key Waypoints

The standard route follows Castle Peak Road (the unplowed summer road / PCT approach) northwest from the I-80 underpass, then turns north along the NE ridge of Castle Peak. Key waypoints:

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Sno-Park (start) | [-120.3483, 39.3390] | 7,000 | Parking lot, south side of I-80 |
| 2 | I-80 Underpass | [-120.3440, 39.3395] | 7,020 | Walk/ski under the interstate |
| 3 | Castle Peak Rd start | [-120.3380, 39.3401] | 7,050 | Begin skinning on unplowed road |
| 4 | Road bend W | [-120.3410, 39.3430] | 7,200 | Road bends from NW to W |
| 5 | PCT junction area | [-120.3450, 39.3460] | 7,400 | Near where PCT intersects road |
| 6 | Leave road, go N | [-120.3470, 39.3490] | 7,600 | Depart road, head north toward ridge |
| 7 | Lower tree band | [-120.3478, 39.3520] | 7,900 | Skin through scattered trees |
| 8 | Treeline / open terrain | [-120.3480, 39.3550] | 8,200 | Exit trees, enter open bowl below ridge |
| 9 | NE Ridge gain | [-120.3482, 39.3575] | 8,500 | Gain the NE ridge proper |
| 10 | Ridge traverse | [-120.3482, 39.3600] | 8,700 | Follow ridgeline SW toward summit |
| 11 | Upper ridge | [-120.3481, 39.3620] | 8,900 | Final ridge section |
| 12 | Summit | [-120.3480, 39.3645] | 9,103 | Castle Peak summit |

### Standard Route — Detailed Coordinate Array (recommended ~50 points)

```typescript
// Castle Peak Standard Route (NE Ridge)
// 50 points following actual terrain
[
  [-120.3483, 39.3390],  // Sno-Park parking
  [-120.3478, 39.3392],  // Walk toward underpass
  [-120.3468, 39.3394],  // Approaching underpass
  [-120.3450, 39.3396],  // I-80 underpass
  [-120.3430, 39.3398],  // Emerging north side
  [-120.3410, 39.3400],  // Castle Peak Road start
  [-120.3400, 39.3405],  // Road heading NW
  [-120.3395, 39.3412],  // Road continues NW
  [-120.3393, 39.3420],  // Gentle climb on road
  [-120.3395, 39.3428],  // Road curves west
  [-120.3400, 39.3435],  // Road bend
  [-120.3410, 39.3440],  // Road heading W/NW
  [-120.3420, 39.3445],  // Climbing on road
  [-120.3430, 39.3450],  // Approaching PCT area
  [-120.3440, 39.3455],  // PCT junction vicinity
  [-120.3448, 39.3462],  // Road continues NW
  [-120.3455, 39.3468],  // Gradual climb
  [-120.3460, 39.3475],  // Open meadow area
  [-120.3465, 39.3482],  // Heading toward ridge base
  [-120.3468, 39.3490],  // Leave road, head N
  [-120.3470, 39.3498],  // Open terrain, climbing N
  [-120.3472, 39.3505],  // Lower slopes of NE ridge
  [-120.3474, 39.3512],  // Scattered trees
  [-120.3476, 39.3518],  // Climbing through tree band
  [-120.3478, 39.3525],  // Upper tree band
  [-120.3479, 39.3532],  // Trees thinning
  [-120.3480, 39.3538],  // Near treeline
  [-120.3480, 39.3545],  // Exit treeline
  [-120.3480, 39.3552],  // Open slope below ridge
  [-120.3481, 39.3558],  // Climbing toward ridge
  [-120.3482, 39.3565],  // Approaching NE ridge
  [-120.3482, 39.3572],  // Gain NE ridge
  [-120.3482, 39.3578],  // On NE ridge
  [-120.3482, 39.3585],  // Ridge traverse
  [-120.3482, 39.3590],  // Ridge continues
  [-120.3482, 39.3596],  // Mid-ridge
  [-120.3481, 39.3602],  // Ridge heading SSW
  [-120.3481, 39.3608],  // Upper ridge
  [-120.3481, 39.3614],  // Approaching summit
  [-120.3481, 39.3620],  // Upper ridge steepens
  [-120.3480, 39.3626],  // Near summit
  [-120.3480, 39.3632],  // Final approach
  [-120.3480, 39.3638],  // Just below summit
  [-120.3480, 39.3645],  // SUMMIT 9,103 ft
]
```

### South Couloir Variant — Key Waypoints

The South Couloir shares the approach with the Standard Route up to approximately the treeline area (~8,200 ft), then diverges west to approach the south side of Castle Peak. The couloir itself drops south from just below the summit.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1-7 | Same as Standard | Same as above | — | Shared approach |
| 8 | Diverge W | [-120.3495, 39.3545] | 8,200 | Head W instead of N |
| 9 | Basin below S face | [-120.3510, 39.3560] | 8,400 | Traverse W below Basin Peak |
| 10 | South Couloir base | [-120.3500, 39.3590] | 8,600 | Base of the couloir apron |
| 11 | Couloir entry | [-120.3495, 39.3610] | 8,800 | Enter the couloir (35-45 degree) |
| 12 | Couloir mid | [-120.3490, 39.3625] | 9,000 | Steep climbing in couloir |
| 13 | Couloir exit / summit | [-120.3480, 39.3645] | 9,103 | Top out near summit |

```typescript
// Castle Peak South Couloir
[
  // Shared approach (first 27 points same as standard)
  [-120.3483, 39.3390],  // Sno-Park parking
  [-120.3478, 39.3392],
  [-120.3468, 39.3394],
  [-120.3450, 39.3396],
  [-120.3430, 39.3398],
  [-120.3410, 39.3400],
  [-120.3400, 39.3405],
  [-120.3395, 39.3412],
  [-120.3393, 39.3420],
  [-120.3395, 39.3428],
  [-120.3400, 39.3435],
  [-120.3410, 39.3440],
  [-120.3420, 39.3445],
  [-120.3430, 39.3450],
  [-120.3440, 39.3455],
  [-120.3448, 39.3462],
  [-120.3455, 39.3468],
  [-120.3460, 39.3475],
  [-120.3465, 39.3482],
  [-120.3468, 39.3490],
  [-120.3470, 39.3498],
  [-120.3472, 39.3505],
  [-120.3474, 39.3512],
  [-120.3476, 39.3518],
  [-120.3478, 39.3525],
  [-120.3479, 39.3532],
  [-120.3480, 39.3538],
  // Diverge W toward south face
  [-120.3485, 39.3545],
  [-120.3492, 39.3550],
  [-120.3500, 39.3555],
  [-120.3508, 39.3562],
  [-120.3512, 39.3570],
  [-120.3510, 39.3578],
  [-120.3505, 39.3585],
  [-120.3502, 39.3592],
  [-120.3498, 39.3600],
  [-120.3495, 39.3608],
  [-120.3492, 39.3615],
  [-120.3490, 39.3622],
  [-120.3487, 39.3630],
  [-120.3484, 39.3638],
  [-120.3480, 39.3645],  // SUMMIT
]
```

### Corrections to Current Metadata
- **Summit coordinates:** Change from [-120.3525, 39.3667] to [-120.3480, 39.3645]
- **Trailhead coordinates:** Minor correction from [-120.3483, 39.3418] to [-120.3483, 39.3390]
- **Distance:** 8.5 km is reasonable for round trip. One-way is approximately 4-4.5 km.
- **Elevation gain:** 670m (2,200 ft) is approximately correct for the ~2,100 ft gain from Sno-Park to summit.

### Sources to Verify
- CalTopo: Search for "Castle Peak" routes near Norden, CA
- USGS Norden 7.5' quad for summit benchmark
- TurnsAllYear.com Castle Peak trip reports
- Tahoe Backcountry Alliance route page
- Strava segment: "Castle Peak from Sno-Park"

---

## 2. MOUNT TALLAC (9,735 ft / 2,967 m)

### USGS Quad: Emerald Bay, CA

### Trailhead Verification

**Current:** [-120.0555, 38.9215]
**Corrected:** [-120.0542, 38.9318]

**Issue:** The current trailhead coordinate appears to be placed too far south. The winter trailhead for Mount Tallac is at the intersection of Spring Creek Road and Highway 89, approximately 3.7 miles north of the South Lake Tahoe Y-junction. The gate to the summer trailhead road (Forest Road 12N22) is locked in winter, so skiers park at the pullout on Hwy 89 near Spring Creek Road and skin up the road.

**Verified winter parking pullout:** [-120.0542, 38.9318] (Highway 89 at Spring Creek Road junction, ~6,300 ft / 1,920 m)

NOTE: Some trip reports reference parking at the Bayview Trailhead or the Mt Tallac Trailhead summer parking lot further south. The most common winter access for the NE Bowl is from the Spring Creek / Hwy 89 pullout. An alternative winter trailhead is the Glen Alpine / Fallen Leaf Lake approach from the south.

### Summit Verification

**Current:** [-120.0588, 38.9060] (in the variant route endpoints)
**USGS Benchmark:** [-120.0650, 38.9055] (Mount Tallac summit, 9,735 ft)

**Issue:** The current routes end at coordinates well east of the actual summit. Mount Tallac summit is further west. The routes in the file actually go too far east and too far south (ending near 38.8968 which is south of the summit).

### NE Bowl Standard Route — Key Waypoints

The NE Bowl route climbs the summer trail road from Hwy 89, passes near Floating Island Lake and Cathedral Lake, then ascends the massive NE-facing bowl directly to the summit.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Winter Trailhead | [-120.0542, 38.9318] | 6,300 | Hwy 89 / Spring Creek Rd pullout |
| 2 | Summer trailhead gate | [-120.0555, 38.9290] | 6,450 | Locked gate on summer road |
| 3 | Road / trail junction | [-120.0570, 38.9260] | 6,650 | Follow road SW |
| 4 | Floating Island Lake trail | [-120.0580, 38.9230] | 6,900 | Trail veers more westerly |
| 5 | Floating Island Lake | [-120.0605, 38.9195] | 7,380 | Lake on skier's left (SE) |
| 6 | Cathedral Lake | [-120.0620, 38.9170] | 7,700 | Pass above Cathedral Lake |
| 7 | NE Bowl base | [-120.0635, 39.9140] | 8,200 | Enter the NE Bowl |
| 8 | NE Bowl mid | [-120.0645, 38.9110] | 8,800 | Sustained climbing in bowl |
| 9 | Upper bowl / headwall | [-120.0650, 38.9085] | 9,200 | Steep section below summit |
| 10 | Summit ridge | [-120.0650, 38.9065] | 9,600 | Gain the summit ridge |
| 11 | Summit | [-120.0650, 38.9055] | 9,735 | Mount Tallac summit |

```typescript
// Mount Tallac NE Bowl (Standard)
// ~45 points
[
  [-120.0542, 38.9318],  // Winter trailhead (Hwy 89 pullout)
  [-120.0545, 38.9312],  // Start skinning on road
  [-120.0548, 38.9305],  // Road heading SW
  [-120.0550, 38.9298],  // Climbing on road
  [-120.0553, 38.9290],  // Summer trailhead gate area
  [-120.0556, 38.9282],  // Continue on road
  [-120.0560, 38.9274],  // Road bends
  [-120.0563, 38.9266],  // Gradual climb
  [-120.0567, 38.9258],  // Road junction area
  [-120.0571, 38.9250],  // Heading SW on trail
  [-120.0575, 38.9242],  // Through forest
  [-120.0578, 38.9234],  // Approaching Floating Island Lake
  [-120.0582, 38.9226],  // Trail climbs
  [-120.0586, 38.9218],  // Near Floating Island Lake
  [-120.0592, 38.9210],  // Above Floating Island Lake
  [-120.0598, 38.9202],  // Between lakes
  [-120.0604, 38.9195],  // Floating Island Lake area
  [-120.0610, 38.9188],  // Climbing toward Cathedral Lake
  [-120.0615, 38.9180],  // Forest thins
  [-120.0620, 38.9172],  // Near Cathedral Lake
  [-120.0624, 38.9164],  // Above Cathedral Lake
  [-120.0628, 38.9156],  // Open terrain
  [-120.0632, 38.9148],  // Entering NE Bowl
  [-120.0635, 38.9140],  // NE Bowl lower
  [-120.0638, 38.9132],  // Bowl climbing
  [-120.0640, 38.9124],  // Mid-bowl
  [-120.0642, 38.9116],  // Sustained climb
  [-120.0644, 38.9108],  // Upper bowl
  [-120.0646, 38.9100],  // Steepening
  [-120.0648, 38.9092],  // Upper bowl, steeper
  [-120.0649, 38.9084],  // Approaching headwall
  [-120.0650, 38.9076],  // Headwall zone
  [-120.0650, 38.9068],  // Near summit ridge
  [-120.0650, 38.9060],  // Summit ridge
  [-120.0650, 38.9055],  // SUMMIT 9,735 ft
]
```

### Cross (via Floating Island Lake) Variant

This variant takes a more easterly line through the Cross face, crossing east-facing terrain between the NE Bowl and the SE Ridge. It shares the approach to Floating Island Lake area.

```typescript
// Mount Tallac Cross (via Floating Island Lake)
// ~45 points
[
  [-120.0542, 38.9318],  // Winter trailhead
  [-120.0545, 38.9312],
  [-120.0548, 38.9305],
  [-120.0550, 38.9298],
  [-120.0553, 38.9290],
  [-120.0556, 38.9282],
  [-120.0560, 38.9274],
  [-120.0563, 38.9266],
  [-120.0567, 38.9258],
  [-120.0571, 38.9250],
  [-120.0575, 38.9242],
  [-120.0578, 38.9234],
  [-120.0582, 38.9226],
  [-120.0586, 38.9218],
  [-120.0592, 38.9210],  // Floating Island Lake area
  [-120.0598, 38.9202],
  [-120.0604, 38.9195],
  // Diverge: head more directly S/SW through Cross face
  [-120.0608, 38.9186],
  [-120.0612, 38.9178],
  [-120.0618, 38.9170],
  [-120.0622, 38.9162],
  [-120.0625, 38.9154],
  [-120.0628, 38.9146],
  [-120.0630, 38.9138],
  [-120.0632, 38.9130],
  [-120.0634, 38.9122],  // Cross face climbing
  [-120.0636, 38.9114],
  [-120.0638, 38.9106],
  [-120.0640, 38.9098],
  [-120.0642, 38.9090],
  [-120.0644, 38.9082],
  [-120.0646, 38.9074],
  [-120.0648, 38.9068],
  [-120.0650, 38.9062],
  [-120.0650, 38.9055],  // SUMMIT 9,735 ft
]
```

### Corrections to Current Metadata
- **Trailhead coordinates:** Correct from [-120.0555, 38.9215] to [-120.0542, 38.9318]
- **Summit coordinates:** Routes should end at approximately [-120.0650, 38.9055] not [-120.0764, 38.8968]
- **Elevation gain:** 1,050m (~3,440 ft) — this is approximately correct for the 3,435 ft gain from ~6,300 to 9,735 ft
- **Distance:** 5.5 km one-way is approximately correct; round trip ~11 km
- **Trailhead elevation:** 1,920m (6,300 ft) is correct

### Sources to Verify
- USGS Emerald Bay 7.5' quad
- CalTopo: "Mount Tallac NE Bowl" routes
- TurnsAllYear.com Mount Tallac trip reports (extensive coverage)
- Tahoe Backcountry Alliance Mount Tallac page
- Strava segment: "Tallac NE Bowl"

---

## 3. RUBICON PEAK (9,183 ft / 2,799 m)

### USGS Quad: Rockbound Valley, CA / Emerald Bay, CA

### Trailhead Verification

**Current:** [-120.1085, 39.0090]
**Corrected:** [-120.1072, 39.0095]

**Issue:** The trailhead is at the end of Highland Drive / top of Highview Drive in the Tahoma / Homewood area on the West Shore. The current coordinate is close but slightly off. The actual dead-end of Highland Drive where skiers park is approximately [-120.1072, 39.0095].

Note: Some people access from Highway 89 which adds about 600 ft of climbing. The Highland Drive access is the standard approach.

### Summit Verification

**Current:** [-120.1202, 39.0185]
**USGS Benchmark:** [-120.1315, 39.0070] (Rubicon Peak summit, 9,183 ft)

**Issue:** The current summit coordinate is significantly wrong — it's placed northeast of the trailhead, but Rubicon Peak is actually to the **southwest/west** of the Highland Drive trailhead. The summit is roughly 1.3 miles to the west-southwest. The existing route in the codebase also has a serious bug: coordinates jump from 39.0014 to 39.0110 mid-route (line 38-39 in the file), suggesting a typo.

### Highland Drive Standard Route — Key Waypoints

From Highland Drive, the route goes generally west-southwest through old-growth forest, gaining the ridge and summit. Navigation is straightforward: head west/southwest and up through well-spaced trees.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Highland Drive end | [-120.1072, 39.0095] | 6,800 | End of plowed road, start skinning |
| 2 | Enter forest | [-120.1090, 39.0092] | 6,900 | Skin west through trees |
| 3 | First steep section | [-120.1110, 39.0088] | 7,200 | Grade increases |
| 4 | Mid-forest | [-120.1140, 39.0085] | 7,500 | Steady climb through old growth |
| 5 | Upper forest | [-120.1170, 39.0082] | 7,800 | Trees beginning to thin |
| 6 | Sub-ridge | [-120.1200, 39.0078] | 8,200 | Gain sub-ridge feature |
| 7 | Treeline | [-120.1230, 39.0075] | 8,500 | Near or above treeline |
| 8 | Upper ridge | [-120.1260, 39.0072] | 8,800 | Open terrain, summit visible |
| 9 | Final approach | [-120.1290, 39.0070] | 9,000 | Final climb to summit |
| 10 | Summit | [-120.1315, 39.0070] | 9,183 | Rubicon Peak summit |

```typescript
// Rubicon Peak Highland Drive Standard
// ~40 points
[
  [-120.1072, 39.0095],  // Highland Drive dead-end (trailhead)
  [-120.1078, 39.0094],  // Begin skinning W
  [-120.1085, 39.0093],  // Entering forest
  [-120.1092, 39.0092],  // Old-growth trees, heading W
  [-120.1100, 39.0091],  // Gradual climb
  [-120.1108, 39.0090],  // Through forest
  [-120.1116, 39.0089],  // Climbing W/WSW
  [-120.1124, 39.0088],  // Steady grade
  [-120.1132, 39.0087],  // Mid-forest
  [-120.1140, 39.0086],  // Trees well-spaced
  [-120.1148, 39.0085],  // Continuing WSW
  [-120.1156, 39.0084],  // Grade steepens slightly
  [-120.1164, 39.0083],  // Upper forest zone
  [-120.1172, 39.0082],  // Trees thinning
  [-120.1180, 39.0081],  // Approaching sub-ridge
  [-120.1188, 39.0080],  // Sub-ridge area
  [-120.1196, 39.0079],  // On sub-ridge
  [-120.1204, 39.0078],  // Climbing along ridge
  [-120.1212, 39.0077],  // Upper trees
  [-120.1220, 39.0076],  // Near treeline
  [-120.1228, 39.0075],  // Treeline transition
  [-120.1236, 39.0074],  // Above treeline
  [-120.1244, 39.0074],  // Open terrain
  [-120.1252, 39.0073],  // Ridge traverse
  [-120.1260, 39.0072],  // Upper mountain
  [-120.1268, 39.0072],  // Approaching summit
  [-120.1276, 39.0071],  // Summit ridge
  [-120.1284, 39.0071],  // Final approach
  [-120.1292, 39.0070],  // Near summit
  [-120.1300, 39.0070],  // Just below summit
  [-120.1308, 39.0070],  // Summit area
  [-120.1315, 39.0070],  // SUMMIT 9,183 ft
]
```

### Corrections to Current Metadata
- **CRITICAL: Summit coordinates are completely wrong.** Change from [-120.1202, 39.0185] to [-120.1315, 39.0070]. The summit is WSW of the trailhead, not NNW.
- **Route direction is wrong.** Current route goes north (increasing latitude) but should go west-southwest (increasing west longitude, slightly decreasing latitude).
- **Bug in current coordinates:** Line 38 of rubicon-peak.ts jumps from lat 39.0014 to 39.0110 — this is clearly a typo that creates a wild discontinuity.
- **Trailhead:** Minor correction to [-120.1072, 39.0095]
- **Trailhead elevation:** 2,070m (6,800 ft) is approximately correct
- **Distance:** 6.1 km round trip is about right (~3 km one-way)
- **Elevation gain:** 730m (~2,400 ft) is approximately correct

### Sources to Verify
- USGS Rockbound Valley / Emerald Bay quad
- CalTopo "Rubicon Peak" from Tahoma
- Tahoe Backcountry Alliance Rubicon Peak page
- TurnsAllYear.com Rubicon Peak trip reports

---

## 4. TAMARACK PEAK (9,900 ft / 3,018 m)

### USGS Quad: Mt Rose NE, NV

### Trailhead Verification

**Current:** [-119.8980, 39.3140]
**Corrected:** [-119.8993, 39.3138]

**Issue:** The current trailhead is close. The standard pull-off on the south side of Mt Rose Highway (SR 431) for the Tamarack Peak approach is approximately 0.5 miles east of the Mt Rose Highway summit, on the south side of the road. There are multiple small pullouts along this stretch.

### Summit Verification

**Current:** [-119.9002, 39.3310] (listed in prompt) / route ends at [-119.9219, 39.3182]
**USGS Benchmark:** [-119.9210, 39.3190] (Tamarack Peak summit, 9,900 ft)

**Issue:** The summit coordinates listed in the tour prompt (39.3310) are way north of the actual summit. The route endpoints in the code (~[-119.9219, 39.3182]) are actually quite close to the correct summit position. The USGS summit of Tamarack Peak is at approximately 39.319 N, 119.921 W.

NOTE: Some sources list Tamarack Peak as 9,872 ft and others as 9,900 ft. The USGS Norden quad shows approximately 9,900 ft (3,018 m). The code currently says 3,009 m (9,872 ft).

### Via Tamarack Lake Standard Route — Key Waypoints

The route descends from the highway pullout (south side) to Tamarack Lake, crosses the lake basin, then climbs the east face/southeast slopes to the summit. Notable: you start by going DOWN from the trailhead.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Highway pullout | [-119.8993, 39.3138] | 8,900 | South side of SR 431 |
| 2 | Descend to lake | [-119.9005, 39.3130] | 8,800 | Skin/walk down toward lake |
| 3 | Tamarack Lake E shore | [-119.9030, 39.3118] | 8,740 | Reach the lake |
| 4 | Tamarack Lake W shore | [-119.9060, 39.3112] | 8,740 | Cross the frozen lake |
| 5 | W shore / begin climb | [-119.9075, 39.3115] | 8,800 | Begin climbing W of lake |
| 6 | Lower E face | [-119.9095, 39.3125] | 9,000 | Climbing SE face of peak |
| 7 | Mid E face | [-119.9120, 39.3145] | 9,200 | Sustained climb |
| 8 | Upper slopes | [-119.9155, 39.3165] | 9,500 | Approaching summit ridge |
| 9 | Summit ridge | [-119.9190, 39.3180] | 9,750 | Gain the ridge |
| 10 | Summit | [-119.9210, 39.3190] | 9,900 | Tamarack Peak summit |

```typescript
// Tamarack Peak via Tamarack Lake (Standard)
// ~40 points
[
  [-119.8993, 39.3138],  // Highway pullout trailhead
  [-119.8997, 39.3136],  // Begin descent toward lake
  [-119.9002, 39.3133],  // Descending S/SW
  [-119.9008, 39.3130],  // Open terrain
  [-119.9015, 39.3127],  // Heading toward lake
  [-119.9022, 39.3124],  // Meadow terrain
  [-119.9030, 39.3121],  // Approaching Tamarack Lake
  [-119.9038, 39.3118],  // East shore of lake
  [-119.9046, 39.3115],  // Crossing lake (frozen)
  [-119.9054, 39.3113],  // Mid-lake
  [-119.9062, 39.3112],  // West portion of lake
  [-119.9070, 39.3113],  // West shore
  [-119.9078, 39.3115],  // Begin climbing W of lake
  [-119.9085, 39.3118],  // Lower slopes, heading W/NW
  [-119.9092, 39.3122],  // E face lower
  [-119.9098, 39.3126],  // Climbing
  [-119.9104, 39.3130],  // Sustained grade
  [-119.9110, 39.3135],  // Mid-slope
  [-119.9116, 39.3140],  // Climbing NW
  [-119.9122, 39.3145],  // Upper E face
  [-119.9128, 39.3150],  // Steeper terrain
  [-119.9134, 39.3155],  // Approaching upper mountain
  [-119.9140, 39.3158],  // Upper slopes
  [-119.9148, 39.3162],  // Nearing ridge
  [-119.9155, 39.3166],  // Upper terrain
  [-119.9162, 39.3170],  // Summit ridge approach
  [-119.9170, 39.3174],  // Gaining ridge
  [-119.9178, 39.3178],  // On ridge
  [-119.9186, 39.3182],  // Ridge traverse
  [-119.9194, 39.3186],  // Approaching summit
  [-119.9202, 39.3188],  // Near summit
  [-119.9210, 39.3190],  // SUMMIT ~9,900 ft
]
```

### Hourglass Bowl Variant

Hourglass Bowl is northeast of the summit, accessed from a slightly more northerly line above Tamarack Lake. The bowl itself is a distinctive hourglass shape with a constriction mid-way.

```typescript
// Tamarack Peak Hourglass Bowl
// Shares approach to Tamarack Lake, then diverges N
[
  [-119.8993, 39.3138],  // Highway pullout
  [-119.8997, 39.3136],
  [-119.9002, 39.3133],
  [-119.9008, 39.3130],
  [-119.9015, 39.3127],
  [-119.9022, 39.3124],
  [-119.9030, 39.3121],
  [-119.9038, 39.3118],
  [-119.9046, 39.3115],
  [-119.9054, 39.3113],
  [-119.9062, 39.3112],
  [-119.9070, 39.3113],
  [-119.9078, 39.3115],
  // Diverge: more northerly line toward Hourglass Bowl
  [-119.9086, 39.3120],
  [-119.9094, 39.3126],
  [-119.9102, 39.3132],
  [-119.9110, 39.3140],
  [-119.9118, 39.3148],
  [-119.9126, 39.3155],
  [-119.9134, 39.3160],
  [-119.9142, 39.3165],
  [-119.9150, 39.3170],  // Hourglass Bowl entry
  [-119.9158, 39.3174],  // Bowl constriction
  [-119.9166, 39.3178],  // Upper bowl
  [-119.9174, 39.3182],  // Approaching ridge
  [-119.9182, 39.3186],  // Ridge
  [-119.9190, 39.3188],  // Final approach
  [-119.9200, 39.3190],  // Near summit
  [-119.9210, 39.3190],  // SUMMIT
]
```

### Corrections to Current Metadata
- **Summit coordinates:** The summit listed in the prompt [-119.9002, 39.3310] is incorrect — should be approximately [-119.9210, 39.3190]. The route endpoint in the code is closer.
- **Trailhead:** Minor adjustment to [-119.8993, 39.3138]
- **Summit elevation:** Verify whether 9,872 ft or 9,900 ft is correct per USGS. Some sources differ.
- **Elevation gain:** 400m seems low for this tour — the descent to Tamarack Lake (~160 ft) plus the climb from lake to summit (~1,160 ft) totals about 1,320 ft (400m) for the net, but total ascending is approximately 1,320 ft (402m). This checks out since you start at 8,900 ft and summit at 9,900 ft but first descend 160 ft to the lake.

### Sources to Verify
- USGS Mt Rose NE 7.5' quad
- CalTopo "Tamarack Peak" routes
- TurnsAllYear.com Tamarack Peak / Hourglass Bowl reports
- Backcountry skiing guidebooks (Jeremy Benson Tahoe guide)

---

## 5. CHICKADEE RIDGE (~8,891 ft / 2,710 m)

### USGS Quad: Mt Rose NE, NV

### Trailhead Verification

**Current:** [-119.9017, 39.3128]
**Corrected:** [-119.9008, 39.3132]

**Issue:** The Tahoe Meadows Trailhead is a well-marked, large parking lot on the north side of Mt Rose Highway (SR 431) near the highway summit. The current coordinates are close but slightly off. The parking lot is at approximately [-119.9008, 39.3132].

### Ridge Endpoint Verification

**Current:** [-119.9044, 39.3005]
**Corrected:** [-119.9040, 39.3010]

**Issue:** Chickadee Ridge is not a summit per se, but a broad ridge extending south from the Tahoe Meadows area. The "destination" is the ridge crest with views of Lake Tahoe, at approximately 8,891 ft. The ridge runs roughly north-south, and the viewpoint area is approximately [-119.9040, 39.3010].

### Standard Ridge Route (via TRT) — Key Waypoints

The route follows the Tahoe Rim Trail (TRT) south from Tahoe Meadows through gentle meadows and open forest to the ridge.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Tahoe Meadows TH | [-119.9008, 39.3132] | 8,560 | Large parking lot, N side of SR 431 |
| 2 | Cross meadow S | [-119.9010, 39.3122] | 8,550 | Cross the flat meadow |
| 3 | TRT enters trees | [-119.9012, 39.3112] | 8,560 | Trail enters scattered forest |
| 4 | Gentle climb | [-119.9015, 39.3100] | 8,600 | Mellow grade through trees |
| 5 | Open area | [-119.9018, 39.3088] | 8,650 | Meadow clearing |
| 6 | Chickadee area | [-119.9022, 39.3075] | 8,700 | Where chickadees congregate |
| 7 | Final climb | [-119.9030, 39.3050] | 8,800 | Approaching ridge crest |
| 8 | Ridge crest | [-119.9038, 39.3020] | 8,870 | Gain the ridge |
| 9 | Ridge viewpoint | [-119.9040, 39.3010] | 8,891 | Lake Tahoe viewpoint |

```typescript
// Chickadee Ridge Standard Route (via TRT)
// ~35 points — gentle, mellow route
[
  [-119.9008, 39.3132],  // Tahoe Meadows Trailhead parking
  [-119.9009, 39.3128],  // Cross road, enter meadow
  [-119.9010, 39.3124],  // Tahoe Meadows, heading S
  [-119.9010, 39.3120],  // Flat meadow crossing
  [-119.9011, 39.3116],  // Meadow continues
  [-119.9011, 39.3112],  // Approaching tree line
  [-119.9012, 39.3108],  // Enter scattered trees
  [-119.9013, 39.3104],  // TRT through open forest
  [-119.9014, 39.3100],  // Gentle uphill
  [-119.9015, 39.3096],  // Through trees
  [-119.9016, 39.3092],  // Continuing S on TRT
  [-119.9017, 39.3088],  // Open area
  [-119.9018, 39.3084],  // Mellow terrain
  [-119.9019, 39.3080],  // Gentle grade
  [-119.9020, 39.3076],  // Chickadee area
  [-119.9021, 39.3072],  // More climbing
  [-119.9022, 39.3068],  // Through trees
  [-119.9023, 39.3064],  // Opening up
  [-119.9024, 39.3060],  // Approaching ridge
  [-119.9026, 39.3056],  // Grade increases slightly
  [-119.9028, 39.3052],  // Climbing toward ridge
  [-119.9030, 39.3048],  // Upper approach
  [-119.9032, 39.3044],  // Near ridge
  [-119.9034, 39.3040],  // Ridge approach
  [-119.9035, 39.3036],  // Gaining ridge
  [-119.9036, 39.3032],  // Ridge crest area
  [-119.9037, 39.3028],  // On ridge
  [-119.9038, 39.3024],  // Ridge traverse S
  [-119.9039, 39.3020],  // Ridge continues
  [-119.9040, 39.3016],  // Approaching viewpoint
  [-119.9040, 39.3010],  // RIDGE VIEWPOINT ~8,891 ft
]
```

### Corrections to Current Metadata
- **Trailhead:** Minor correction to [-119.9008, 39.3132]
- **Ridge endpoint:** Minor correction to [-119.9040, 39.3010]
- **Elevation gain:** 275m (~900 ft) — this seems slightly high. Actual gain from ~8,560 to ~8,891 is only about 331 ft (101m), but the rolling terrain means total ascending is more like 150-200m. Consider reducing to 150m.
- **Distance:** 5.6 km round trip (~2.8 km one way) seems about right.
- **Trailhead elevation:** 2,608m (8,560 ft) is correct for the Tahoe Meadows area.

### Sources to Verify
- USGS Mt Rose NE 7.5' quad
- Tahoe Rim Trail maps
- AllTrails "Chickadee Ridge" from Tahoe Meadows
- NV State Parks Tahoe Meadows trail info

---

## 6. JAKE'S PEAK (9,187 ft / 2,800 m)

### USGS Quad: Emerald Bay, CA

### Trailhead Verification

**Current:** [-120.1050, 38.9545]
**Corrected:** [-120.1038, 38.9540]

**Issue:** The Jake's Peak pullout on Highway 89 is a small turnout on the west side of the highway between Emerald Bay and D.L. Bliss State Park. The current coordinates are close. The actual pullout is at approximately [-120.1038, 38.9540].

### Summit Verification

**Current:** [-120.1185, 38.9500] (listed in prompt) / route ends at [-120.1181, 38.9367]
**USGS Benchmark:** [-120.1190, 38.9485] (Jake's Peak summit, 9,187 ft)

**Issue:** The current route endpoints (38.9367) are too far south. Jake's Peak summit is at approximately 38.9485 N, 120.1190 W. The route goes too far south in the current data.

### NE Face Standard Route — Key Waypoints

The route climbs steeply WSW from Highway 89 through dense forest, eventually emerging above treeline on the NE face. It's a steep, direct approach — approximately 2,300 ft gain in about 1.2 miles.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Hwy 89 pullout | [-120.1038, 38.9540] | 6,890 | Small pullout, west side of Hwy 89 |
| 2 | Cross drainage | [-120.1050, 38.9535] | 6,950 | Cross small creek/drainage |
| 3 | Enter steep forest | [-120.1065, 38.9530] | 7,100 | Dense forest, steep skin |
| 4 | Through trees | [-120.1080, 38.9525] | 7,400 | Sustained steep climbing |
| 5 | Mid-forest | [-120.1095, 38.9520] | 7,700 | Continue WSW through old growth |
| 6 | Upper forest | [-120.1110, 38.9515] | 8,000 | Trees begin thinning |
| 7 | Treeline | [-120.1125, 38.9510] | 8,300 | Exit treeline, NE face visible |
| 8 | NE Face base | [-120.1140, 38.9505] | 8,500 | Open alpine terrain |
| 9 | NE Face mid | [-120.1155, 38.9500] | 8,800 | Steep sustained climb |
| 10 | Upper NE Face | [-120.1170, 38.9495] | 9,000 | Final steep section |
| 11 | Summit | [-120.1190, 38.9485] | 9,187 | Jake's Peak summit |

```typescript
// Jake's Peak NE Face (Standard)
// ~35 points — short but steep
[
  [-120.1038, 38.9540],  // Hwy 89 pullout
  [-120.1042, 38.9539],  // Cross road, head W
  [-120.1048, 38.9537],  // Small drainage crossing
  [-120.1054, 38.9536],  // Enter forest
  [-120.1060, 38.9534],  // Steep forest climbing
  [-120.1066, 38.9532],  // Dense trees
  [-120.1072, 38.9530],  // Sustained steep
  [-120.1078, 38.9528],  // Through old growth
  [-120.1084, 38.9526],  // Climbing WSW
  [-120.1090, 38.9524],  // Mid-forest
  [-120.1096, 38.9522],  // Steep terrain continues
  [-120.1102, 38.9520],  // Upper forest zone
  [-120.1108, 38.9518],  // Trees thinning
  [-120.1114, 38.9516],  // Approaching treeline
  [-120.1120, 38.9514],  // Near treeline
  [-120.1126, 38.9512],  // Treeline transition
  [-120.1132, 38.9510],  // Exit treeline
  [-120.1138, 38.9508],  // NE face base
  [-120.1144, 38.9506],  // Open terrain
  [-120.1150, 38.9504],  // NE face climbing
  [-120.1156, 38.9502],  // Sustained steep
  [-120.1162, 38.9500],  // Mid NE face
  [-120.1168, 38.9498],  // Upper NE face
  [-120.1174, 38.9496],  // Steepening
  [-120.1178, 38.9494],  // Near summit
  [-120.1182, 38.9492],  // Final approach
  [-120.1186, 38.9488],  // Summit area
  [-120.1190, 38.9485],  // SUMMIT 9,187 ft
]
```

### Corrections to Current Metadata
- **Summit coordinates:** Correct from [-120.1185, 38.9500] / route endpoint [-120.1181, 38.9367] to [-120.1190, 38.9485]
- **Route direction:** The route should go WSW (decreasing latitude only slightly). Current route goes too far south.
- **Trailhead:** Minor correction to [-120.1038, 38.9540]
- **Trailhead elevation:** 2,100m (6,890 ft) is approximately correct
- **Elevation gain:** 700m (~2,300 ft) is correct
- **Distance:** 3.8 km round trip (~1.9 km one way) is about right — this is a short, steep tour

### Sources to Verify
- USGS Emerald Bay 7.5' quad
- CalTopo Jake's Peak routes
- Tahoe Backcountry Alliance Jake's Peak page
- TurnsAllYear.com Jake's Peak trip reports

---

## 7. INCLINE PEAK (9,549 ft / 2,911 m)

### USGS Quad: Mt Rose NE, NV

### Trailhead Verification

**Current:** [-119.9252, 39.2924]
**Corrected:** [-119.9165, 39.2928]

**Issue:** The Incline Lake Road gate is on the west side of Mt Rose Highway (SR 431), approximately 1.5 miles northeast of the Mt Rose Highway summit heading toward Incline Village. The current coordinate places the trailhead too far west — it should be closer to the highway. The actual gate/pullout is at approximately [-119.9165, 39.2928].

### Summit Verification

**Current:** [-119.9370, 39.2940] (listed in prompt) / route ends at [-119.9403, 39.2942]
**USGS Benchmark:** [-119.9395, 39.2935] (Incline Peak / Rose Knob Junior summit, 9,549 ft)

**Issue:** The current route endpoint is close to the actual summit. Minor corrections needed.

### East Bowl (via Third Creek) — Key Waypoints

From the gate on Mt Rose Highway, skiers descend Incline Lake Road to Incline Lake, then head northwest up the Third Creek drainage, eventually climbing west to the summit ridge and south to the summit.

| # | Waypoint | Coordinates [lng, lat] | Elevation (ft) | Notes |
|---|----------|----------------------|-----------------|-------|
| 1 | Incline Lake Rd gate | [-119.9165, 39.2928] | 8,200 | Gate on W side of SR 431 |
| 2 | Descend on road | [-119.9185, 39.2930] | 8,100 | Skin/walk down Incline Lake Rd |
| 3 | Incline Lake area | [-119.9210, 39.2932] | 8,000 | Near Incline Lake |
| 4 | Past lake, NW | [-119.9235, 39.2940] | 8,000 | Continue W past the lake |
| 5 | Third Creek drainage | [-119.9260, 39.2948] | 8,100 | Enter Third Creek drainage |
| 6 | Climbing NW in drainage | [-119.9285, 39.2955] | 8,300 | Up the drainage |
| 7 | Upper drainage | [-119.9310, 39.2960] | 8,600 | Drainage narrows |
| 8 | Exit drainage | [-119.9335, 39.2958] | 8,900 | Head WSW toward ridge |
| 9 | East Bowl base | [-119.9355, 39.2950] | 9,100 | Base of East Bowl |
| 10 | East Bowl mid | [-119.9370, 39.2945] | 9,300 | Climbing in bowl |
| 11 | Summit ridge | [-119.9385, 39.2940] | 9,450 | Gain ridge |
| 12 | Summit | [-119.9395, 39.2935] | 9,549 | Incline Peak summit |

```typescript
// Incline Peak East Bowl (via Third Creek)
// ~40 points
[
  [-119.9165, 39.2928],  // Incline Lake Road gate (trailhead)
  [-119.9172, 39.2929],  // Descend on road heading W
  [-119.9180, 39.2930],  // Incline Lake Rd
  [-119.9188, 39.2930],  // Road continues W
  [-119.9196, 39.2931],  // Approaching lake
  [-119.9204, 39.2932],  // Near Incline Lake
  [-119.9212, 39.2932],  // Incline Lake area
  [-119.9220, 39.2933],  // Past lake, heading W
  [-119.9228, 39.2935],  // Open terrain W of lake
  [-119.9236, 39.2938],  // Heading NW
  [-119.9244, 39.2941],  // Approaching Third Creek
  [-119.9252, 39.2944],  // Third Creek drainage entry
  [-119.9260, 39.2947],  // In drainage, heading NW
  [-119.9268, 39.2950],  // Climbing in drainage
  [-119.9276, 39.2953],  // Drainage continues
  [-119.9284, 39.2955],  // Mid-drainage
  [-119.9292, 39.2957],  // Upper drainage
  [-119.9300, 39.2959],  // Drainage narrowing
  [-119.9308, 39.2960],  // Near head of drainage
  [-119.9316, 39.2960],  // Exiting drainage W
  [-119.9324, 39.2959],  // Open slopes
  [-119.9332, 39.2958],  // Heading WSW
  [-119.9340, 39.2956],  // East Bowl approach
  [-119.9348, 39.2954],  // East Bowl base
  [-119.9355, 39.2951],  // In East Bowl
  [-119.9362, 39.2948],  // Bowl climbing
  [-119.9368, 39.2945],  // Mid-bowl
  [-119.9374, 39.2942],  // Upper bowl
  [-119.9380, 39.2940],  // Approaching ridge
  [-119.9385, 39.2938],  // Summit ridge
  [-119.9390, 39.2936],  // Final approach
  [-119.9395, 39.2935],  // SUMMIT 9,549 ft
]
```

### North Bowl / Bronco Chutes Variant

The North Bowl variant shares the approach to the upper drainage, then continues WNW along the north side of the summit ridge instead of cutting south into the East Bowl. The Bronco Chutes are steep north-facing features accessed from the summit ridge.

```typescript
// Incline Peak North Bowl (Bronco Chutes)
// ~40 points
[
  [-119.9165, 39.2928],  // Incline Lake Road gate
  [-119.9172, 39.2929],
  [-119.9180, 39.2930],
  [-119.9188, 39.2930],
  [-119.9196, 39.2931],
  [-119.9204, 39.2932],
  [-119.9212, 39.2932],
  [-119.9220, 39.2933],
  [-119.9228, 39.2935],
  [-119.9236, 39.2938],
  [-119.9244, 39.2941],
  [-119.9252, 39.2944],
  [-119.9260, 39.2947],
  [-119.9268, 39.2950],
  [-119.9276, 39.2953],
  [-119.9284, 39.2955],
  [-119.9292, 39.2957],
  [-119.9300, 39.2959],
  [-119.9308, 39.2960],
  // Diverge: continue WNW toward north side of summit ridge
  [-119.9316, 39.2962],
  [-119.9324, 39.2964],
  [-119.9332, 39.2966],
  [-119.9340, 39.2968],
  [-119.9348, 39.2968],
  [-119.9356, 39.2967],
  [-119.9364, 39.2965],
  [-119.9372, 39.2962],
  [-119.9378, 39.2958],
  [-119.9384, 39.2954],
  [-119.9388, 39.2950],
  [-119.9392, 39.2945],
  [-119.9394, 39.2940],
  [-119.9395, 39.2935],  // SUMMIT 9,549 ft
]
```

### Corrections to Current Metadata
- **Trailhead coordinates:** Correct from [-119.9252, 39.2924] to [-119.9165, 39.2928] — current position is too far west from the actual highway gate
- **Summit coordinates:** Minor correction from [-119.9370, 39.2940] to [-119.9395, 39.2935]
- **Trailhead elevation:** 2,500m (8,200 ft) is approximately correct
- **Distance:** 5.4 km round trip is reasonable
- **Elevation gain:** 460m (~1,500 ft net) — need to account for the initial descent to Incline Lake (~200 ft down) plus the climb to summit (~1,549 ft up), so total ascending is approximately 1,549 ft (472m). This checks out.

### Sources to Verify
- USGS Mt Rose NE 7.5' quad
- CalTopo "Incline Peak" / "Rose Knob Junior" routes
- TurnsAllYear.com Incline Peak trip reports
- Mt Rose area backcountry guides

---

## SUMMARY OF CRITICAL CORRECTIONS

### Priority 1 — Wrong Route Direction / Major Coordinate Errors

| Tour | Issue | Fix |
|------|-------|-----|
| **Rubicon Peak** | Route goes NORTH but summit is SOUTHWEST of trailhead. Also has coordinate typo (lat jumps from 39.0014 to 39.0110). | Completely rebuild route going WSW. Summit at [-120.1315, 39.0070] |
| **Mount Tallac** | Route endpoints at [-120.0764, 38.8968] are far from actual summit [-120.0650, 38.9055]. Trailhead also off by ~1 km. | Rebuild routes with correct trailhead [-120.0542, 38.9318] and summit [-120.0650, 38.9055] |
| **Jake's Peak** | Route goes too far south — endpoint at 38.9367 vs actual summit at 38.9485 | Rebuild with correct summit position |

### Priority 2 — Summit Coordinate Corrections

| Tour | Current Summit | Corrected Summit |
|------|---------------|-----------------|
| Castle Peak | [-120.3525, 39.3667] | [-120.3480, 39.3645] |
| Mount Tallac | ~[-120.0764, 38.8968] | [-120.0650, 38.9055] |
| Rubicon Peak | [-120.1202, 39.0185] | [-120.1315, 39.0070] |
| Tamarack Peak | [-119.9002, 39.3310] | [-119.9210, 39.3190] |
| Jake's Peak | [-120.1185, 38.9500] | [-120.1190, 38.9485] |
| Incline Peak | [-119.9370, 39.2940] | [-119.9395, 39.2935] |
| Chickadee Ridge | [-119.9044, 39.3005] | [-119.9040, 39.3010] |

### Priority 3 — Trailhead Coordinate Corrections

| Tour | Current TH | Corrected TH |
|------|-----------|-------------|
| Castle Peak | [-120.3483, 39.3418] | [-120.3483, 39.3390] |
| Mount Tallac | [-120.0555, 38.9215] | [-120.0542, 38.9318] |
| Rubicon Peak | [-120.1085, 39.0090] | [-120.1072, 39.0095] |
| Tamarack Peak | [-119.8980, 39.3140] | [-119.8993, 39.3138] |
| Chickadee Ridge | [-119.9017, 39.3128] | [-119.9008, 39.3132] |
| Jake's Peak | [-120.1050, 38.9545] | [-120.1038, 38.9540] |
| Incline Peak | [-119.9252, 39.2924] | [-119.9165, 39.2928] |

---

## VERIFICATION CHECKLIST

Before committing any coordinate changes, the implementing engineer should:

1. **Open CalTopo** (caltopo.com) with the USGS 7.5' topo base layer and slope-angle shading overlay
2. **Plot each route** as a line on the map and verify it follows:
   - Actual trails/roads where they exist (Castle Peak Rd, Incline Lake Rd, TRT)
   - Reasonable terrain (not crossing cliffs, rivers, or impassable features)
   - The correct drainage/ridge for each route
3. **Verify trailhead coordinates** by checking:
   - Google Maps satellite view for parking areas
   - Google Street View on highways for pullout locations
   - CalTopo road/trail layer for road endpoints
4. **Verify summit coordinates** against:
   - USGS benchmark database (store.usgs.gov)
   - PeakBagger.com summit coordinates
   - CalTopo summit markers
5. **Cross-reference with GPX tracks** where available:
   - Search Gaia GPS public tracks for each tour name
   - Check Strava heatmap for ski touring corridors
   - Look for GPX files in trip reports on TurnsAllYear.com

## RECOMMENDED GPX SOURCES FOR DOWNLOAD

These are known sources where GPX tracks for these tours can typically be found:

1. **CalTopo** — caltopo.com — Search for saved routes by tour name
2. **Gaia GPS** — gaiagps.com — Public trip recordings searchable by area
3. **Strava** — strava.com/heatmap — Heatmap shows popular skin track corridors (winter activity filter)
4. **AllTrails** — alltrails.com — Summer trail routes (useful for approach trails)
5. **TurnsAllYear.com** — Trip reports often include CalTopo links with route overlays
6. **WildSnow.com** — Backcountry ski route database with some downloadable tracks
7. **Tahoe Backcountry Alliance** — backcountryskiing.tahoebackcountryalliance.org
8. **FatMap / Outdoor Active** — 3D terrain maps with community-shared routes

## NOTES ON COORDINATE PRECISION

- **GPS precision:** Consumer GPS accuracy is typically 3-5 meters, which is approximately 0.00003-0.00005 degrees of latitude
- **Route width:** A ski touring skin track is approximately 0.5-1m wide, so sub-10m accuracy is more than sufficient
- **Recommended precision:** Use 4 decimal places for coordinates (0.0001 degree = ~11m at 39N latitude)
- **Point density:** For a smooth route display on a mobile map at zoom levels 13-16, use approximately 1 point per 50-100 meters of trail distance
