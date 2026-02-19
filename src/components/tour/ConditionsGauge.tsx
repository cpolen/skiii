'use client';

import { useState } from 'react';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';

/**
 * Horizontal bar gauge showing the composite conditions assessment score,
 * band label, top driving reasons, and per-dimension breakdown pills.
 */
export function ConditionsGauge({ assessment }: { assessment: ConditionsAssessment }) {
  const { composite, bandLabel, bandColor, avalanche, weather, terrain, reasons } = assessment;
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="mx-4 my-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Conditions Assessment
        </p>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="rounded-full px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Explain conditions score"
          aria-expanded={showHelp}
        >
          {'\u24D8'}
        </button>
      </div>

      {showHelp && (
        <div className="mt-1.5 rounded-md bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-800">
          <p className="font-medium">How this score works</p>
          <p className="mt-1">Combines avalanche danger (50%), weather (35%), and terrain factors (15%) into a 0-100 score. Higher is more favorable.</p>
          <p className="mt-1"><strong>80+</strong> More favorable · <strong>60-79</strong> Moderate concern · <strong>40-59</strong> Elevated concern · <strong>20-39</strong> Significant concern · <strong>0-19</strong> Serious concern</p>
        </div>
      )}

      {/* Score bar */}
      <div className="mt-1.5 flex items-center gap-2">
        <div
          className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={composite}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Conditions score: ${composite} out of 100, ${bandLabel}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${composite}%`, backgroundColor: bandColor }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: bandColor }}>
          {composite}
        </span>
      </div>

      {/* Band label */}
      <p className="mt-1 text-xs font-semibold" style={{ color: bandColor }}>
        {bandLabel}
      </p>

      {/* Top reasons */}
      {reasons.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {reasons.map((r, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
              <span className="mt-px text-gray-300">{'\u2022'}</span>
              {r}
            </p>
          ))}
        </div>
      )}

      {/* Dimension breakdown pills */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {avalanche != null && (
          <DimensionPill label="Avalanche" score={avalanche} />
        )}
        <DimensionPill label="Weather" score={weather} />
        <DimensionPill label="Terrain" score={terrain} />
      </div>

      {/* Note when avy data unavailable */}
      {avalanche == null && (
        <p className="mt-1.5 text-[10px] italic text-gray-500">
          Avalanche data unavailable — based on weather &amp; terrain only
        </p>
      )}
    </div>
  );
}

function DimensionPill({ label, score }: { label: string; score: number }) {
  // Color the score number based on the value
  let scoreColor = '#16A34A'; // green
  if (score < 40) scoreColor = '#EF4444'; // red
  else if (score < 60) scoreColor = '#F7941E'; // orange
  else if (score < 80) scoreColor = '#EAB308'; // yellow

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
      {label}
      <span className="font-bold tabular-nums" style={{ color: scoreColor }}>
        {score}
      </span>
    </span>
  );
}
