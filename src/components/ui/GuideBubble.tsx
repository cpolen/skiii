'use client';

import { useGuideStore } from '@/stores/guide';
import { useMapStore } from '@/stores/map';

/**
 * Floating contextual guide bubble — acts as a knowledgeable ski partner
 * providing brief, actionable insights as users interact with the map.
 *
 * Desktop: absolute bottom-left of map (inside <main>), above TimelineOverlay.
 * Mobile: fixed above the MobileBottomSheet (z-[25] to sit above z-20 sheet).
 */

/** Shared SVG icon for the guide persona */
function GuideIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 3Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m17.5 3.5.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5.5-2Z"
      />
    </svg>
  );
}

export function GuideBubble() {
  const currentMessage = useGuideStore((s) => s.currentMessage);
  const isAILoading = useGuideStore((s) => s.isAILoading);
  const dismissGuide = useGuideStore((s) => s.dismissGuide);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);

  if (!currentMessage) return null;

  // Mobile: fixed positioning above the bottom sheet (z-[25] > sheet z-20)
  // Desktop: absolute inside <main> (z-10, alongside other map overlays)
  const positionBase = selectedTourSlug
    ? 'fixed bottom-[52dvh] left-3 z-[25] md:absolute md:bottom-[4.5rem] md:left-4 md:z-10'
    : 'fixed bottom-[52dvh] left-3 z-[25] md:absolute md:bottom-6 md:left-4 md:z-10';

  return (
    <div className={`${positionBase} max-w-[320px] transition-all duration-300 ease-out`}>
      <div className="rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-gray-200 backdrop-blur-sm">
        <div className="flex items-start gap-2.5">
          {/* Guide avatar */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100">
            <GuideIcon className="h-3.5 w-3.5 text-blue-600" />
          </div>

          {/* Message content */}
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase">
              Guide
            </p>
            <p className="text-[13px] leading-relaxed text-gray-700">
              {currentMessage}
              {isAILoading && (
                <span className="ml-1.5 inline-flex gap-0.5 align-middle">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-blue-400" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
                </span>
              )}
            </p>
          </div>

          {/* Dismiss button — permanently hides the guide */}
          <button
            onClick={dismissGuide}
            className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Dismiss guide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
