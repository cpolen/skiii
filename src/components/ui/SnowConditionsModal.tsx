'use client';

import { useEffect, useRef } from 'react';
import type { SnowType } from '@/lib/analysis/snow-type';

const SNOW_CONDITIONS: { type: SnowType | string; emoji: string; label: string; description: string }[] = [
  { type: 'powder', emoji: '❄️', label: 'Deep Powder', description: '16"+ fresh snow in 48h, cold temps, low wind. Best skiing conditions.' },
  { type: 'powder', emoji: '❄️', label: 'Powder', description: '6–16" fresh snow, below freezing, moderate quality.' },
  { type: 'powder', emoji: '❄️', label: 'Light Powder', description: '4–6" fresh snow, skiable but thin coverage.' },
  { type: 'corn', emoji: '🌽', label: 'Prime Corn', description: 'Excellent melt-freeze cycle: clear overnight refreeze, strong solar warming. Smooth, carveable surface.' },
  { type: 'corn', emoji: '🌽', label: 'Good Corn', description: 'Solid melt-freeze cycle with a defined softening window on sun-exposed aspects.' },
  { type: 'corn', emoji: '🌽', label: 'Fair Corn', description: 'Early or inconsistent melt-freeze cycle. Surface may be uneven.' },
  { type: 'wind-affected', emoji: '💨', label: 'Wind-affected', description: 'Recent snow redistributed by 25+ mph ridge winds. Expect wind slab and variable depths.' },
  { type: 'crust', emoji: '🧊', label: 'Crust', description: 'Rain-on-snow or repeated melt-freeze has formed a hard, icy surface layer.' },
  { type: 'packed-powder', emoji: '🎿', label: 'Packed Powder', description: 'Light recent snowfall (2–4") that\'s settled. Firm but carveable.' },
  { type: 'variable', emoji: '🔀', label: 'Variable', description: 'Mixed freeze-thaw conditions. Surface quality changes with aspect and elevation.' },
  { type: 'wind-scoured', emoji: '🏔️', label: 'Wind-scoured', description: 'Strong winds (20+ mph) have stripped soft snow, exposing firm or icy surfaces.' },
  { type: 'softening', emoji: '🌤️', label: 'Softening', description: 'Temps near freezing (28–32°F). Surface losing its firmness but not yet corn.' },
  { type: 'spring-snow', emoji: '☀️', label: 'Spring Snow', description: 'Above freezing in daytime. Soft, wet snow surface. Best early before it gets heavy.' },
  { type: 'firm', emoji: '🏔️', label: 'Firm', description: 'Cold, dry, no recent snow. Hard-packed surface.' },
  { type: 'firm-incoming', emoji: '🏔️', label: 'Firm \u2192 Powder', description: 'Currently firm but 6"+ of snow incoming in 24h.' },
];

export function SnowConditionsModal({
  open,
  activeType,
  onClose,
}: {
  open: boolean;
  activeType: SnowType | null;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Scroll to active condition after opening
  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="snow-conditions-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
          <h2 id="snow-conditions-title" className="text-base font-bold text-gray-900">
            Snow Conditions Guide
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {SNOW_CONDITIONS.map((condition, i) => {
            const isActive = condition.type === activeType;
            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                className={`rounded-lg px-3 py-2.5 ${
                  isActive
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{condition.emoji}</span>
                  <span className={`text-[13px] font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                    {condition.label}
                  </span>
                </div>
                <p className={`mt-0.5 text-[12px] leading-relaxed ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                  {condition.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
