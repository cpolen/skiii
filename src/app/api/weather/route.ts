import { NextRequest, NextResponse } from 'next/server';
import type { WeatherForecast, HourlyWeather } from '@/lib/types/conditions';

/** When OPEN_METEO_API_KEY is set, use the paid customer endpoint. */
const OPEN_METEO_BASE = process.env.OPEN_METEO_API_KEY
  ? 'https://customer-api.open-meteo.com/v1/forecast'
  : 'https://api.open-meteo.com/v1/forecast';

const HOURLY_PARAMS = [
  'temperature_2m',
  'apparent_temperature',
  'wind_speed_10m',
  'wind_speed_80m',
  'wind_speed_120m',
  'wind_direction_10m',
  'wind_direction_80m',
  'precipitation',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'visibility',
  'freezing_level_height',
  'is_day',
].join(',');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng query params required' }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return NextResponse.json({ error: 'lat and lng must be valid numbers' }, { status: 400 });
  }

  const url = new URL(OPEN_METEO_BASE);
  url.searchParams.set('latitude', String(latNum));
  url.searchParams.set('longitude', String(lngNum));
  url.searchParams.set('hourly', HOURLY_PARAMS);
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', 'America/Los_Angeles');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');

  if (process.env.OPEN_METEO_API_KEY) {
    url.searchParams.set('apikey', process.env.OPEN_METEO_API_KEY);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 900 } }); // 15-min cache

    if (!res.ok) {
      return NextResponse.json(
        { error: `Open-Meteo returned ${res.status}` },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const forecast = transformResponse(raw, latNum, lngNum);
    return NextResponse.json(forecast);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 502 },
    );
  }
}

/** Transform Open-Meteo flat arrays into our typed WeatherForecast shape */
function transformResponse(
  raw: Record<string, unknown>,
  lat: number,
  lng: number,
): WeatherForecast {
  const h = raw.hourly as Record<string, unknown[]>;
  const d = raw.daily as Record<string, string[]>;
  const times = h.time as string[];

  const hourly: HourlyWeather[] = times.map((time, i) => ({
    time,
    temperature_2m: (h.temperature_2m as number[])[i],
    apparent_temperature: (h.apparent_temperature as number[])[i],
    wind_speed_10m: (h.wind_speed_10m as number[])[i],
    wind_speed_80m: (h.wind_speed_80m as number[])[i],
    wind_speed_120m: (h.wind_speed_120m as number[])[i],
    wind_direction_10m: (h.wind_direction_10m as number[])[i],
    wind_direction_80m: (h.wind_direction_80m as number[])[i],
    precipitation: (h.precipitation as number[])[i],
    snowfall: (h.snowfall as number[])[i],
    weather_code: (h.weather_code as number[])[i],
    cloud_cover: (h.cloud_cover as number[])[i],
    visibility: (h.visibility as number[])[i],
    freezing_level_height: (h.freezing_level_height as number[])[i],
    is_day: (h.is_day as number[])[i] === 1,
  }));

  return {
    latitude: lat,
    longitude: lng,
    elevation: (raw as Record<string, number>).elevation ?? 0,
    hourly,
    sunrise: d.sunrise ?? [],
    sunset: d.sunset ?? [],
  };
}
