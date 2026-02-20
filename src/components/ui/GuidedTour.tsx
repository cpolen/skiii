'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTourStore } from '@/stores/tour';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';

/** Tour step definition. */
interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Alternate selector for mobile (< 768px) */
  mobileTarget?: string;
  /** Tooltip content */
  content: string;
  /** Preferred side for tooltip relative to target */
  position: 'left' | 'right' | 'top' | 'bottom';
  /** Runs before this step renders (e.g., ensure a tour is selected) */
  beforeAction?: () => void;
  /** Runs when user clicks "Next" on this step */
  onNext?: () => void;
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour-step="tour-list"]',
    mobileTarget: '[data-tour-step="tour-list-mobile"]',
    content:
      'Tours are ranked by current conditions. The #1 tour has the best score right now. Tap any tour to see its details.',
    position: 'left',
  },
  {
    target: '[data-tour-step="tour-list"]',
    mobileTarget: '[data-tour-step="tour-list-mobile"]',
    content: "Let's select this tour to see how conditions look.",
    position: 'left',
    onNext: () => {
      const { selectTour } = useMapStore.getState();
      const slug = tours[0]?.slug;
      if (slug) selectTour(slug);
    },
  },
  {
    target: '[data-tour-step="conditions-score"]',
    content:
      'This score combines avalanche danger, weather, and terrain into a single number. Green = favorable, red = unfavorable.',
    position: 'left',
    beforeAction: () => {
      const state = useMapStore.getState();
      if (!state.selectedTourSlug) {
        state.selectTour(tours[0]?.slug ?? null);
      }
    },
  },
  {
    target: '[data-tour-step="avy-danger"]',
    content:
      'Avalanche danger from the Sierra Avalanche Center. Tap to expand the elevation breakdown and active avalanche problems.',
    position: 'left',
  },
  {
    target: '[data-tour-step="timeline"]',
    mobileTarget: '[data-tour-step="timeline-mobile"]',
    content:
      "Drag or click the 72-hour timeline to preview conditions at any hour. Green bars are favorable, gray is less ideal. That's the basics — explore and stay safe!",
    position: 'top',
  },
];

const TOOLTIP_W = 288; // w-72
const TOOLTIP_W_MOBILE = 256; // w-64
const GAP = 12;
const SPOTLIGHT_PAD = 8;

function getTooltipStyle(
  rect: DOMRect,
  position: TourStep['position'],
  isMobile: boolean,
): React.CSSProperties {
  const tw = isMobile ? TOOLTIP_W_MOBILE : TOOLTIP_W;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // On mobile, only use top/bottom positioning
  const side = isMobile ? (position === 'left' || position === 'top' ? 'top' : 'bottom') : position;

  if (side === 'left' && rect.left > tw + GAP) {
    return {
      top: Math.max(8, Math.min(rect.top, vh - 200)),
      left: rect.left - tw - GAP,
    };
  }
  if (side === 'right' && vw - rect.right > tw + GAP) {
    return {
      top: Math.max(8, Math.min(rect.top, vh - 200)),
      left: rect.right + GAP,
    };
  }
  if (side === 'top' && rect.top > 200) {
    return {
      top: rect.top - GAP - 160,
      left: Math.max(8, Math.min(rect.left, vw - tw - 8)),
    };
  }
  // Default: bottom
  return {
    top: rect.bottom + GAP,
    left: Math.max(8, Math.min(rect.left, vw - tw - 8)),
  };
}

export function GuidedTour() {
  const { isActive, currentStep, nextStep, prevStep, endTour } = useTourStore();
  const startTour = useTourStore((s) => s.startTour);
  const hasCompleted = useTourStore((s) => s.hasCompleted);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Auto-start on first visit (after safety overlay is dismissed)
  useEffect(() => {
    const safetyOk = !!localStorage.getItem('skiii-safety-acknowledged');
    const tourDone = !!localStorage.getItem('skiii-tour-completed');
    if (safetyOk && !tourDone) {
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Position the spotlight on the current step's target element
  useEffect(() => {
    if (!isActive) {
      setRect(null);
      return;
    }

    const step = STEPS[currentStep];
    if (!step) return;

    // Run beforeAction if defined
    step.beforeAction?.();

    // Wait a tick for DOM to settle after beforeAction
    const findTarget = () => {
      const selector = isMobile && step.mobileTarget ? step.mobileTarget : step.target;
      const el = document.querySelector(selector);
      if (!el) return null;
      return el as HTMLElement;
    };

    // Retry a few times in case the element hasn't rendered yet
    let attempts = 0;
    const maxAttempts = 10;
    const tryFind = () => {
      const el = findTarget();
      if (el) {
        // Scroll into view
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        const updateRect = () => setRect(el.getBoundingClientRect());

        // Small delay after scroll to get correct position
        setTimeout(updateRect, 100);

        // Observe size changes
        observerRef.current?.disconnect();
        const obs = new ResizeObserver(updateRect);
        obs.observe(el);
        observerRef.current = obs;

        // Recompute on scroll
        const handleScroll = () => updateRect();
        window.addEventListener('scroll', handleScroll, true);

        return () => {
          obs.disconnect();
          window.removeEventListener('scroll', handleScroll, true);
        };
      } else if (attempts < maxAttempts) {
        attempts++;
        const retryTimer = setTimeout(tryFind, 200);
        return () => clearTimeout(retryTimer);
      }
      return undefined;
    };

    // Delay initial find to let beforeAction effects settle
    const startTimer = setTimeout(() => {
      const cleanup = tryFind();
      // Store cleanup if we need it
      if (cleanup) {
        cleanupRef.current = cleanup;
      }
    }, 150);

    const cleanupRef = { current: undefined as (() => void) | undefined };

    return () => {
      clearTimeout(startTimer);
      cleanupRef.current?.();
      observerRef.current?.disconnect();
    };
  }, [isActive, currentStep, isMobile]);

  // Keyboard: Escape to dismiss, arrow keys to navigate
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        prevStep();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isActive, currentStep, endTour, prevStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step) return;

    // Run the step's onNext action
    step.onNext?.();

    if (currentStep >= STEPS.length - 1) {
      endTour();
    } else {
      nextStep();
    }
  }, [currentStep, endTour, nextStep]);

  if (!isActive || !rect) return null;

  const step = STEPS[currentStep];
  if (!step) return null;

  const isLastStep = currentStep >= STEPS.length - 1;
  const tw = isMobile ? TOOLTIP_W_MOBILE : TOOLTIP_W;
  const tooltipStyle = getTooltipStyle(rect, step.position, isMobile);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* Click outside to dismiss */}
      <div className="fixed inset-0" onClick={endTour} />

      {/* Spotlight — box-shadow creates the darkened overlay */}
      <div
        className="absolute rounded-xl pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - SPOTLIGHT_PAD,
          left: rect.left - SPOTLIGHT_PAD,
          width: rect.width + SPOTLIGHT_PAD * 2,
          height: rect.height + SPOTLIGHT_PAD * 2,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-xl bg-white p-4 shadow-2xl"
        style={{ ...tooltipStyle, width: tw }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-800">{step.content}</p>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={endTour}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {isLastStep ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
