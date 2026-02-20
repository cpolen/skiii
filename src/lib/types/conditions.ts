/**
 * Weather conditions from Open-Meteo API
 */
export interface HourlyWeather {
  time: string; // ISO 8601
  temperature_2m: number; // Celsius
  apparent_temperature: number; // Celsius (wind chill / heat index)
  wind_speed_10m: number; // km/h
  wind_speed_80m: number; // km/h (better for ridgeline estimates)
  wind_speed_120m: number; // km/h (ridgeline)
  wind_direction_10m: number; // degrees (0=N, 90=E, 180=S, 270=W)
  wind_direction_80m: number; // degrees
  precipitation: number; // mm
  snowfall: number; // cm
  weather_code: number; // WMO weather interpretation code
  cloud_cover: number; // %
  visibility: number; // meters
  freezing_level_height: number; // meters above sea level
  is_day: boolean;
  dewpoint_2m: number; // Celsius
  shortwave_radiation: number; // W/m² (global horizontal irradiance)
  direct_normal_irradiance: number; // W/m² (beam radiation on aspect)
  snow_depth: number; // meters (total snowpack on ground)
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  elevation: number; // meters
  hourly: HourlyWeather[];
  sunrise: string[]; // ISO dates for each day
  sunset: string[]; // ISO dates for each day
}

/**
 * SNOTEL data from NRCS AWDB
 */
export interface SNOTELReading {
  station_id: string;
  station_name: string;
  station_elevation_m: number;
  timestamp: string; // ISO 8601
  snow_depth_cm: number;
  swe_mm: number; // Snow Water Equivalent in mm
  air_temperature_c: number;
}

export interface SNOTELData {
  station: {
    id: string;
    name: string;
    elevation_m: number;
    latitude: number;
    longitude: number;
  };
  current: SNOTELReading;
  history_7d: SNOTELReading[];
  swe_change_24h_mm: number;
  swe_change_48h_mm: number;
  swe_change_72h_mm: number;
}

/**
 * Single grid point for precipitation map overlay
 */
export interface GridPrecipPoint {
  lat: number;
  lng: number;
  /** Originally-requested grid coordinate (before Open-Meteo snaps to its internal grid). */
  reqLat: number;
  reqLng: number;
  precipitation: number; // mm/hr (current hour)
  snowfall: number; // cm/hr (current hour)
  freezing_level_height: number; // meters
  wind_speed_10m: number; // km/h
  wind_speed_80m: number; // km/h (ridge wind)
  wind_direction_10m: number; // degrees
  snow_depth: number; // cm (total snowpack on ground)
  snowfall_48h: number; // cm (accumulated snowfall over the 48 hours ending at this hour)
  elevation: number; // meters above sea level (from Open-Meteo grid cell)
}

/**
 * Response from /api/weather/grid — current-hour precip across the map area
 */
export interface GridPrecipData {
  points: GridPrecipPoint[];
  generatedAt: string;
}

/**
 * Wind direction as compass bearing mapped to aspect it loads
 * Wind FROM the SW loads NE-facing slopes
 */
export function getLoadedAspect(windDirectionDeg: number): string {
  // Wind loads the opposite aspect
  const loadedDeg = (windDirectionDeg + 180) % 360;
  const aspects = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(loadedDeg / 45) % 8;
  return aspects[index];
}

/**
 * Convert Celsius to Fahrenheit for display
 */
export function celsiusToFahrenheit(celsius: number): number {
  return celsius * 1.8 + 32;
}

/**
 * Convert meters to feet for display
 */
export function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084);
}

/**
 * Convert km/h to mph for display
 */
export function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/**
 * Wind direction degrees to compass label
 */
export function windDegreesToCompass(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
