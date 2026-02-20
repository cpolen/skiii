'use client';

import type { Tour } from '@/lib/types/tour';
import { useWeather, getCurrentHour } from '@/hooks/useWeather';
import {
  celsiusToFahrenheit,
  kmhToMph,
  metersToFeet,
  windDegreesToCompass,
} from '@/lib/types/conditions';
import { useMapStore } from '@/stores/map';
import { DataFreshness } from '@/components/ui/DataFreshness';

/** WMO weather code → short description + icon */
function weatherCodeToLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear', icon: '\u2600\uFE0F' };
  if (code <= 3) return { label: 'Partly cloudy', icon: '\u26C5' };
  if (code <= 49) return { label: 'Fog', icon: '\uD83C\uDF2B\uFE0F' };
  if (code <= 59) return { label: 'Drizzle', icon: '\uD83C\uDF27\uFE0F' };
  if (code <= 69) return { label: 'Rain', icon: '\uD83C\uDF27\uFE0F' };
  if (code <= 79) return { label: 'Snow', icon: '\u2744\uFE0F' };
  if (code <= 84) return { label: 'Rain showers', icon: '\uD83C\uDF26\uFE0F' };
  if (code <= 86) return { label: 'Snow showers', icon: '\uD83C\uDF28\uFE0F' };
  if (code <= 99) return { label: 'Thunderstorm', icon: '\u26C8\uFE0F' };
  return { label: 'Unknown', icon: '\u2601\uFE0F' };
}

export function WeatherSummary({ tour, compact }: { tour: Tour; compact?: boolean }) {
  const { data: forecast, isLoading, error, dataUpdatedAt } = useWeather(tour);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Current Weather
        </h2>
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="ml-2 text-xs text-gray-500">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Current Weather
        </h2>
        <p className="text-xs text-red-500">Unable to load weather data</p>
      </div>
    );
  }

  const hour =
    selectedForecastHour != null && forecast.hourly[selectedForecastHour]
      ? forecast.hourly[selectedForecastHour]
      : getCurrentHour(forecast);

  // Build header label
  const isViewingFuture = selectedForecastHour != null && forecast.hourly[selectedForecastHour];
  let headerLabel = 'Current Weather';
  if (isViewingFuture) {
    const d = new Date(hour.time);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    let dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    if (d.toDateString() === now.toDateString()) dayLabel = 'Today';
    else if (d.toDateString() === tomorrow.toDateString()) dayLabel = 'Tomorrow';
    const h = d.getHours();
    const hourLabel = h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
    headerLabel = `Weather at ${dayLabel} ${hourLabel}`;
  }

  const tempF = Math.round(celsiusToFahrenheit(hour.temperature_2m));
  const feelsLikeF = Math.round(celsiusToFahrenheit(hour.apparent_temperature));
  const windMph = kmhToMph(hour.wind_speed_10m);
  const ridgeWindMph = kmhToMph(hour.wind_speed_80m);
  const windDir = windDegreesToCompass(hour.wind_direction_10m);
  const freezingFt = metersToFeet(hour.freezing_level_height);
  const tourMaxFt = metersToFeet(tour.max_elevation_m);
  const tourMinFt = metersToFeet(tour.min_elevation_m);
  const { label: wxLabel, icon: wxIcon } = weatherCodeToLabel(hour.weather_code);

  const rainOnSnowRisk = hour.freezing_level_height > tour.min_elevation_m && hour.precipitation > 0;

  const wrapperClass = compact
    ? 'p-3'
    : 'rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100';

  return (
    <div className={wrapperClass}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {headerLabel}
      </h2>

      {/* Primary conditions row */}
      <div className="flex items-center gap-3">
        <span className={compact ? 'text-xl' : 'text-3xl'}>{wxIcon}</span>
        <div>
          <p className={`font-semibold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>
            {tempF}&deg;F
          </p>
          <p className="text-xs text-gray-500">
            Feels like {feelsLikeF}&deg;F &middot; {wxLabel}
          </p>
          <p className="text-[10px] text-gray-400">
            Trailhead ~{tempF}&deg;F &middot; Summit ~{Math.round(tempF - ((tourMaxFt - tourMinFt) * 3.5 / 1000))}&deg;F
          </p>
        </div>
      </div>

      {/* Detail grid */}
      <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1.5">
        <WeatherStat
          label="Wind"
          value={`${windDir} ${windMph} mph`}
          alert={windMph >= 20}
        />
        <WeatherStat
          label="Ridge Wind"
          value={`${ridgeWindMph} mph`}
          alert={ridgeWindMph >= 25}
        />
        <WeatherStat
          label="Freezing Level"
          value={`${freezingFt.toLocaleString()}'`}
          alert={rainOnSnowRisk}
        />
        <WeatherStat
          label="Visibility"
          value={hour.visibility >= 10000 ? 'Good' : `${(hour.visibility / 1609).toFixed(1)} mi`}
          alert={hour.visibility < 1000}
        />
        <WeatherStat
          label="Cloud Cover"
          value={`${hour.cloud_cover}%`}
        />
        <WeatherStat
          label="Precipitation"
          value={hour.precipitation > 0 ? `${(hour.precipitation / 25.4).toFixed(2)}″/hr` : 'None'}
          alert={hour.precipitation > 1}
        />
      </div>

      {/* Sunrise / Sunset */}
      {forecast.sunrise?.[0] && forecast.sunset?.[0] && (
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
          <span>
            {'\u2600\uFE0F'}{' '}
            {new Date(forecast.sunrise[0]).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
            })}
          </span>
          <span>
            {'\uD83C\uDF19'}{' '}
            {new Date(forecast.sunset[0]).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
            })}
          </span>
          <span className="text-gray-500">
            {(() => {
              const rise = new Date(forecast.sunrise[0]);
              const setTime = new Date(forecast.sunset[0]);
              const hrs = Math.round((setTime.getTime() - rise.getTime()) / 3600000 * 10) / 10;
              return `${hrs}h daylight`;
            })()}
          </span>
        </div>
      )}

      {/* Alerts */}
      {rainOnSnowRisk && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Rain-on-snow risk — freezing level ({freezingFt.toLocaleString()}&apos;)
          is above tour terrain ({tourMinFt.toLocaleString()}&apos;–{tourMaxFt.toLocaleString()}&apos;)
        </div>
      )}
      {ridgeWindMph >= 30 && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Extreme ridgeline winds — {ridgeWindMph} mph estimated at ridge elevation
        </div>
      )}

      {/* Freshness — hide in compact mode */}
      {!compact && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-gray-500">
            Data from Open-Meteo &middot; {new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
          <DataFreshness label="Updated" updatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null} />
        </div>
      )}
    </div>
  );
}

function WeatherStat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-sm font-medium ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
