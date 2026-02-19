/**
 * Simplified solar position calculator.
 *
 * Computes sun azimuth (compass bearing) and elevation (degrees above horizon)
 * from date/time and geographic coordinates. Uses the standard simplified
 * solar equations — accurate to ~1° for backcountry planning purposes.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function getSunPosition(
  date: Date,
  lat: number,
  lng: number,
): { azimuth: number; elevation: number } {
  // Day of year (1-365)
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear =
    Math.floor((date.getTime() - start.getTime()) / 86400000);

  // Solar declination (simplified equation)
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * DEG);

  // Hours from midnight UTC, then convert to solar time
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  // Equation of time correction (minutes) — Spencer formula simplified
  const B = ((360 / 365) * (dayOfYear - 81)) * DEG;
  const eot =
    9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Solar time in hours
  const solarTime = utcHours + lng / 15 + eot / 60;

  // Hour angle (degrees, 0 at solar noon, negative before noon)
  const hourAngle = (solarTime - 12) * 15;

  const latRad = lat * DEG;
  const decRad = declination * DEG;
  const haRad = hourAngle * DEG;

  // Solar elevation
  const sinElev =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const elevation = Math.asin(sinElev) * RAD;

  // Solar azimuth (measured from north, clockwise)
  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinElev) /
    (Math.cos(latRad) * Math.cos(elevation * DEG));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD;

  // Correct azimuth for afternoon (hour angle > 0 → west side)
  if (hourAngle > 0) azimuth = 360 - azimuth;

  return { azimuth, elevation };
}
