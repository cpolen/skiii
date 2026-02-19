import type { AspectDirection } from './tour';

/**
 * North American Public Avalanche Danger Scale (NAPADS)
 * Official colors and terminology from avalanche.org
 */
export type DangerLevel = 1 | 2 | 3 | 4 | 5;

export type DangerRating = 'low' | 'moderate' | 'considerable' | 'high' | 'extreme';

export const DANGER_LEVEL_MAP: Record<DangerLevel, DangerRating> = {
  1: 'low',
  2: 'moderate',
  3: 'considerable',
  4: 'high',
  5: 'extreme',
};

/**
 * Official NAPADS hex colors
 */
export const DANGER_COLORS: Record<DangerLevel, string> = {
  1: '#50B848', // Green - Low
  2: '#FFF200', // Yellow - Moderate
  3: '#F7941E', // Orange - Considerable
  4: '#ED1C24', // Red - High
  5: '#231F20', // Black - Extreme
};

export const DANGER_LABELS: Record<DangerLevel, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Considerable',
  4: 'High',
  5: 'Extreme',
};

export type ElevationBand = 'alpine' | 'treeline' | 'below_treeline';

export const ELEVATION_BAND_LABELS: Record<ElevationBand, string> = {
  alpine: 'Above Treeline',
  treeline: 'Near Treeline',
  below_treeline: 'Below Treeline',
};

export interface DangerByElevation {
  alpine: DangerLevel;
  treeline: DangerLevel;
  below_treeline: DangerLevel;
}

/**
 * The 9 standardized avalanche problem types
 */
export type AvalancheProblemType =
  | 'storm_slab'
  | 'wind_slab'
  | 'persistent_slab'
  | 'deep_persistent_slab'
  | 'wet_slab'
  | 'loose_wet'
  | 'loose_dry'
  | 'cornice_fall'
  | 'glide';

export const AVALANCHE_PROBLEM_LABELS: Record<AvalancheProblemType, string> = {
  storm_slab: 'Storm Slab',
  wind_slab: 'Wind Slab',
  persistent_slab: 'Persistent Slab',
  deep_persistent_slab: 'Deep Persistent Slab',
  wet_slab: 'Wet Slab',
  loose_wet: 'Loose Wet',
  loose_dry: 'Loose Dry',
  cornice_fall: 'Cornice Fall',
  glide: 'Glide',
};

/**
 * Likelihood scale: 5-step from "Unlikely" to "Certain"
 * Matches the standardized format used by all US avalanche centers
 */
export type Likelihood = 'unlikely' | 'possible' | 'likely' | 'very_likely' | 'certain';

export const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  very_likely: 'Very Likely',
  certain: 'Almost Certain',
};

/**
 * Size scale: D1-D5 (Destructive Size)
 */
export type DestructiveSize = 'D1' | 'D1.5' | 'D2' | 'D2.5' | 'D3' | 'D3.5' | 'D4' | 'D4.5' | 'D5';

/**
 * Distribution rose: which aspects and elevation bands are affected
 * 8 aspects x 3 elevation bands = 24 sectors
 * true = problem exists in this sector, false = not expected
 */
export interface DistributionRose {
  alpine: Record<AspectDirection, boolean>;
  treeline: Record<AspectDirection, boolean>;
  below_treeline: Record<AspectDirection, boolean>;
}

export interface AvalancheProblem {
  type: AvalancheProblemType;
  distribution: DistributionRose;
  likelihood: Likelihood;
  size_min: DestructiveSize;
  size_max: DestructiveSize;
  discussion: string;
}

export interface AvalancheForecast {
  center_id: string;
  zone_name: string;
  danger: DangerByElevation;
  problems: AvalancheProblem[];
  bottom_line: string;
  travel_advice: string;
  published_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  forecast_url: string; // Full URL to SAC forecast page
}
