import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';

// ---------------------------------------------------------------------------
// Context shapes for each trigger
// ---------------------------------------------------------------------------

export interface AppLoadContext {
  topTourName: string;
  conditions: ConditionsAssessment;
  snow: SnowClassification;
  avyDangerLevel: number | null;
  avyProblems: string[];
  tempF: number;
  ridgeWindMph: number;
  freezingLevelFt: number;
  snowfall48hIn: number;
}

export interface TourSelectContext {
  tourName: string;
  conditions: ConditionsAssessment;
  snow: SnowClassification;
  rank: number; // 1-based
  totalTours: number;
  tempF: number;
  ridgeWindMph: number;
  avyDangerLevel: number | null;
  avyProblems: string[];
  atesRating: string;
  terrainTraps: string[];
  aspects: string[];
}

export interface TimelineScrubContext {
  tourName: string | null;
  hourLabel: string; // e.g. "3 PM"
  conditions: ConditionsAssessment;
  snow: SnowClassification;
  previousComposite: number | null;
  tempF: number;
  ridgeWindMph: number;
  precipMm: number;
  freezingLevelFt: number;
}

// ---------------------------------------------------------------------------
// Template generators
// ---------------------------------------------------------------------------

/** First reason, lowercased for embedding mid-sentence */
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Pick the most relevant reason (skip generic ones like "Dry") */
function topReason(reasons: string[]): string {
  const skip = new Set(['Dry', 'Light winds']);
  return reasons.find((r) => !skip.has(r)) ?? reasons[0] ?? '';
}

/** Format avy problems into a compact string */
function avyProblemsStr(problems: string[]): string {
  if (problems.length === 0) return '';
  if (problems.length === 1) return problems[0];
  return problems.slice(0, 2).join(' and ');
}

/** Format wind compactly */
function windStr(mph: number): string {
  if (mph < 10) return 'calm winds';
  if (mph < 20) return `${mph} mph winds`;
  if (mph < 30) return `${mph} mph gusts`;
  return `${mph} mph sustained winds`;
}

export function generateAppLoadMessage(ctx: AppLoadContext): string {
  const {
    topTourName, conditions, snow, avyDangerLevel, avyProblems,
    tempF, ridgeWindMph, freezingLevelFt, snowfall48hIn,
  } = ctx;
  const temp = Math.round(tempF);
  const wind = Math.round(ridgeWindMph);

  // High avalanche danger — lead with that
  if (avyDangerLevel != null && avyDangerLevel >= 4) {
    const level = avyDangerLevel === 5 ? 'Extreme' : 'High';
    const problems = avyProblemsStr(avyProblems);
    return `${level} avalanche danger${problems ? ` — ${problems}` : ''}. ${topTourName} rates best at ${conditions.composite} but stick to low-angle terrain.`;
  }

  // Favorable conditions
  if (conditions.band === 'more') {
    const snowDetail = snow.type === 'powder'
      ? `${snow.label.toLowerCase()} (${snow.detail})`
      : snow.type === 'corn'
        ? `${snow.label.toLowerCase()} — ${snow.detail}`
        : `${snow.label.toLowerCase()}`;
    return `Good day out there — ${temp}F with ${windStr(wind)}. ${topTourName} looking best with ${snowDetail}.`;
  }

  // Moderate
  if (conditions.band === 'moderate') {
    const parts: string[] = [];
    if (avyDangerLevel != null && avyDangerLevel >= 2) {
      parts.push(`moderate avy danger`);
    }
    if (wind >= 20) parts.push(`${wind} mph ridge wind`);
    if (snowfall48hIn > 0) parts.push(`${snowfall48hIn}" new snow`);
    const detail = parts.length > 0 ? parts.join(', ') : lowerFirst(topReason(conditions.reasons));
    return `Mixed conditions today — ${detail}. ${topTourName} scores highest at ${conditions.composite} with ${snow.label.toLowerCase()}.`;
  }

  // Elevated/significant
  if (conditions.band === 'elevated' || conditions.band === 'significant') {
    const problems = avyProblemsStr(avyProblems);
    const avyNote = avyDangerLevel != null && avyDangerLevel >= 3
      ? `considerable avy danger${problems ? ` (${problems})` : ''}`
      : lowerFirst(topReason(conditions.reasons));
    const weatherNote = wind >= 20 ? ` ${wind} mph winds, ${temp}F.` : ` ${temp}F.`;
    return `Challenging today — ${avyNote}.${weatherNote} ${topTourName} rates best at ${conditions.composite}.`;
  }

  // Serious
  const problems = avyProblemsStr(avyProblems);
  const avyNote = problems || lowerFirst(topReason(conditions.reasons));
  return `Serious concerns — ${avyNote}. ${topTourName} scores ${conditions.composite}, conditions are poor across the board. ${temp}F with ${windStr(wind)}.`;
}

export function generateTourSelectMessage(ctx: TourSelectContext): string {
  const {
    tourName, conditions, snow, rank, totalTours,
    tempF, ridgeWindMph, avyDangerLevel, avyProblems,
    atesRating, terrainTraps, aspects,
  } = ctx;
  const opener = rank === 1 ? 'Top pick right now.' : `Ranked #${rank} of ${totalTours}.`;

  if (conditions.band === 'more') {
    const snowNote = snow.type === 'corn' && snow.cornWindowStart
      ? `${snow.label.toLowerCase()} — ${snow.detail}`
      : `${snow.label.toLowerCase()}`;
    return `${opener} ${tourName} has ${snowNote}. ${Math.round(tempF)}F, ${windStr(Math.round(ridgeWindMph))} on ${aspects.join('/')}-facing terrain.`;
  }

  // Build concern list for moderate or worse
  const concerns: string[] = [];
  if (avyDangerLevel != null && avyDangerLevel >= 3) {
    const problems = avyProblemsStr(avyProblems);
    concerns.push(problems || `avy danger level ${avyDangerLevel}`);
  }
  if (ridgeWindMph >= 20) concerns.push(`${Math.round(ridgeWindMph)} mph ridge wind`);
  if (atesRating === 'complex') concerns.push('complex terrain');
  if (terrainTraps.length > 0) concerns.push(`${terrainTraps.length} terrain trap${terrainTraps.length > 1 ? 's' : ''}`);

  if (conditions.band === 'moderate') {
    const detail = concerns.length > 0 ? concerns.slice(0, 2).join(', ') : lowerFirst(topReason(conditions.reasons));
    return `${opener} Watch for ${detail}. Score ${conditions.composite} with ${snow.label.toLowerCase()} at ${Math.round(tempF)}F.`;
  }

  // Elevated or worse
  const detail = concerns.length > 0 ? concerns.slice(0, 2).join(', ') : lowerFirst(topReason(conditions.reasons));
  return `${opener} Key concerns: ${detail}. Score ${conditions.composite}, ${snow.label.toLowerCase()} at ${Math.round(tempF)}F.`;
}

export function generateTimelineScrubMessage(ctx: TimelineScrubContext): string {
  const {
    tourName, hourLabel, conditions, snow, previousComposite,
    tempF, ridgeWindMph, precipMm, freezingLevelFt,
  } = ctx;
  const prefix = tourName ?? 'Overall';
  const temp = Math.round(tempF);
  const wind = Math.round(ridgeWindMph);

  // Build a compact weather snapshot
  const weatherParts: string[] = [`${temp}F`];
  if (wind >= 15) weatherParts.push(`${wind} mph wind`);
  if (precipMm > 0) {
    const precipNote = freezingLevelFt < 7000 ? 'snow' : 'precip';
    weatherParts.push(`${precipNote}`);
  }
  const weatherSnap = weatherParts.join(', ');

  // Detect direction of change
  if (previousComposite != null) {
    const diff = conditions.composite - previousComposite;
    if (diff > 15) {
      return `${hourLabel}: ${prefix} improves to ${conditions.bandLabel.toLowerCase()} (${conditions.composite}). ${weatherSnap}, ${snow.label.toLowerCase()}.`;
    }
    if (diff < -15) {
      const reason = topReason(conditions.reasons);
      return `${hourLabel}: ${prefix} drops to ${conditions.bandLabel.toLowerCase()} (${conditions.composite}) — ${lowerFirst(reason)}. ${weatherSnap}.`;
    }
  }

  // No significant change
  return `${hourLabel}: ${conditions.bandLabel} for ${prefix} (${conditions.composite}). ${weatherSnap}, ${snow.label.toLowerCase()}.`;
}
