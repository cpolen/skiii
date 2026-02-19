import { NextResponse } from 'next/server';

/**
 * Proxy for the avalanche.org public API.
 * Returns current avalanche danger for SAC (Sierra Avalanche Center).
 *
 * Two endpoints are fetched:
 * 1. Map-layer: zone metadata, overall danger level, travel advice
 * 2. Forecast product: danger by elevation band, avalanche problems, bottom line
 *
 * Source: https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs
 */

const SAC_MAP_URL = 'https://api.avalanche.org/v2/public/products/map-layer/SAC';
const SAC_FORECAST_URL =
  'https://api.avalanche.org/v2/public/product?type=forecast&center_id=SAC&zone_id=2458';

const HEADERS = {
  'User-Agent': 'Skiii-Backcountry-App/1.0 (backcountry ski touring conditions)',
};

export interface AvyForecastZone {
  name: string;
  center: string;
  danger: string; // "low" | "moderate" | "considerable" | "high" | "extreme"
  danger_level: number; // 1-5
  color: string; // hex color from NAPADS
  travel_advice: string;
  link: string; // URL to full forecast
  start_date: string;
  end_date: string;
  off_season: boolean;
}

/** Danger level per elevation band for a single day */
export interface AvyDangerByDay {
  valid_day: string; // "current" | "tomorrow"
  lower: number; // 0-5
  middle: number; // 0-5
  upper: number; // 0-5
}

/** An avalanche problem from the SAC forecast */
export interface AvyProblem {
  name: string; // e.g. "Storm Slab"
  likelihood: string; // e.g. "likely"
  size: [string, string]; // e.g. ["1.5", "2.5"]
  location: string[]; // e.g. ["northwest upper", "north middle", ...]
  discussion: string; // HTML
  icon: string; // URL to icon image
}

export interface AvyDetailedForecast {
  bottom_line: string; // HTML
  hazard_discussion: string; // HTML
  danger: AvyDangerByDay[];
  problems: AvyProblem[];
  published_time: string;
  expires_time: string;
  author: string;
}

export async function GET() {
  try {
    // Fetch both endpoints in parallel
    const [mapRes, forecastRes] = await Promise.all([
      fetch(SAC_MAP_URL, { next: { revalidate: 900 }, headers: HEADERS }),
      fetch(SAC_FORECAST_URL, { next: { revalidate: 900 }, headers: HEADERS }),
    ]);

    if (!mapRes.ok) {
      return NextResponse.json(
        { error: `Avalanche.org map-layer returned ${mapRes.status}` },
        { status: 502 },
      );
    }

    const raw = await mapRes.json();
    const features = raw.features ?? [];

    const zones: AvyForecastZone[] = features.map(
      (f: { properties: Record<string, unknown> }) => ({
        name: f.properties.name as string,
        center: f.properties.center as string,
        danger: f.properties.danger as string,
        danger_level: f.properties.danger_level as number,
        color: f.properties.color as string,
        travel_advice: f.properties.travel_advice as string,
        link: f.properties.link as string,
        start_date: f.properties.start_date as string,
        end_date: f.properties.end_date as string,
        off_season: f.properties.off_season as boolean,
      }),
    );

    // Parse detailed forecast (optional — don't fail if unavailable)
    let detailed: AvyDetailedForecast | null = null;
    if (forecastRes.ok) {
      const fc = await forecastRes.json();
      detailed = {
        bottom_line: (fc.bottom_line as string) ?? '',
        hazard_discussion: (fc.hazard_discussion as string) ?? '',
        danger: ((fc.danger as Record<string, unknown>[]) ?? []).map((d) => ({
          valid_day: d.valid_day as string,
          lower: d.lower as number,
          middle: d.middle as number,
          upper: d.upper as number,
        })),
        problems: ((fc.forecast_avalanche_problems as Record<string, unknown>[]) ?? []).map(
          (p) => ({
            name: p.name as string,
            likelihood: p.likelihood as string,
            size: p.size as [string, string],
            location: (p.location as string[]) ?? [],
            discussion: (p.discussion as string) ?? '',
            icon: (p.icon as string) ?? '',
          }),
        ),
        published_time: (fc.published_time as string) ?? '',
        expires_time: (fc.expires_time as string) ?? '',
        author: (fc.author as string) ?? '',
      };
    }

    return NextResponse.json({ zones, detailed, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch avalanche forecast' },
      { status: 502 },
    );
  }
}
