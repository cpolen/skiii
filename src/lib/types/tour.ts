import type { Feature, LineString, Point } from 'geojson';

export type AspectDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type ATESRating = 'simple' | 'challenging' | 'complex';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface TourVariant {
  name: string;
  slope_angle_max: number;
  slope_angle_avg: number;
  primary_aspects: AspectDirection[];
  /** The primary route geometry (uphill/skin track when ski_route is present). */
  route: Feature<LineString>;
  /** Optional separate downhill/ski geometry. When present, `route` is the skin-up line. */
  ski_route?: Feature<LineString>;
}

export interface TerrainTrap {
  type: 'gully' | 'cliff' | 'creek' | 'dense_trees' | 'lake' | 'flat';
  location: [number, number];
  description: string;
}

export interface OverheadHazard {
  type: 'cornice' | 'avalanche_path' | 'serac' | 'rockfall';
  location: [number, number];
  description: string;
}

export interface SNOTELStation {
  id: string;
  name: string;
  elevation_m: number;
}

export interface ParkingInfo {
  capacity: string;
  fills_by: string;
  permit: string;
  notes: string;
}

export interface Tour {
  slug: string;
  name: string;
  variants: TourVariant[];
  description: string;
  difficulty: Difficulty;
  ates_rating: ATESRating;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  max_elevation_m: number;
  min_elevation_m: number;
  estimated_hours_range: [number, number];
  transition_count: number;
  terrain_traps: TerrainTrap[];
  overhead_hazards: OverheadHazard[];
  escape_routes: string[];
  avy_center_id: string;
  trailhead: Feature<Point>;
  nearest_snotel: SNOTELStation[];
  parking: ParkingInfo;
  seasonal_notes: string;
  cell_coverage: string;
  sar_jurisdiction: string;
}
