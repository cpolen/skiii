'use client';

import { useEffect, useRef } from 'react';
import { TourMap } from '@/components/map/TourMap';
import { MapControls } from '@/components/map/MapControls';
import { MapLoadingIndicator } from '@/components/map/MapLoadingIndicator';
import { FloatingTimeline } from '@/components/map/FloatingTimeline';
import { TourCarousel } from '@/components/tour/TourCarousel';
import { TourPanel } from '@/components/tour/TourPanel';
import { SafetyOverlay } from '@/components/ui/SafetyOverlay';
import { GuidedTour } from '@/components/ui/GuidedTour';
import { HelpButton } from '@/components/ui/HelpButton';
import { GuideBubble } from '@/components/ui/GuideBubble';
import { useMapStore } from '@/stores/map';
import { useGuideStore } from '@/stores/guide';

// Grab native replaceState before Next.js patches it.
// Next.js intercepts history.replaceState() and feeds the change back through
// the router, which re-evaluates useSearchParams() and cascades re-renders
// (or even re-suspends the Suspense boundary) through the entire tree.
// Using the native method bypasses all of that.
const nativeReplaceState =
  typeof window !== 'undefined'
    ? History.prototype.replaceState.bind(window.history)
    : undefined;

export default function Home() {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const viewMode = useMapStore((s) => s.viewMode);
  const selectTour = useMapStore((s) => s.selectTour);
  const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);
  const setIsSharedView = useGuideStore((s) => s.setIsSharedView);
  const isSharedView = useGuideStore((s) => s.isSharedView);
  const dismissGuide = useGuideStore((s) => s.dismissGuide);

  // Track the initial shared tour/hour for navigation detection
  const initialSharedState = useRef<{ tour: string; hour: number | null } | null>(null);

  // Hydrate from URL on mount — reads directly from window.location
  // instead of useSearchParams() to avoid Suspense/re-render overhead.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tour = params.get('tour');
    const hour = params.get('hour');
    const shared = params.get('shared');
    if (tour) selectTour(tour);
    if (hour) setSelectedForecastHour(parseInt(hour, 10));
    if (shared === '1' && tour) {
      setIsSharedView(true);
      initialSharedState.current = { tour, hour: hour ? parseInt(hour, 10) : null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state → URL using the NATIVE replaceState (not Next.js's patched version).
  // This keeps deep-linking / share URLs working without triggering the
  // Next.js router → useSearchParams() → re-render cascade.
  useEffect(() => {
    if (!nativeReplaceState) return;
    const params = new URLSearchParams();
    if (selectedTourSlug) params.set('tour', selectedTourSlug);
    if (selectedForecastHour != null) params.set('hour', String(selectedForecastHour));
    const str = params.toString();
    const newUrl = str ? `?${str}` : window.location.pathname;
    const currentUrl = window.location.pathname + window.location.search;
    if (newUrl !== currentUrl) {
      nativeReplaceState(null, '', newUrl);
    }
  }, [selectedTourSlug, selectedForecastHour]);

  // Auto-dismiss guide when user navigates away from the shared tour/hour
  useEffect(() => {
    if (!isSharedView || !initialSharedState.current) return;
    const { tour, hour } = initialSharedState.current;
    if (selectedTourSlug !== tour || selectedForecastHour !== hour) {
      dismissGuide();
    }
  }, [isSharedView, selectedTourSlug, selectedForecastHour, dismissGuide]);

  return (
    <div className="relative h-dvh w-full">
      {/* Map fills entire screen */}
      <TourMap />
      <MapControls />

      {/* Center "location" dot — offset upward to account for the bottom overlay
          (carousel + timeline ~220px). pb shifts the centering area so the dot
          sits at the visual center of the unobscured map, not the full viewport. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-[220px]">
        <div className="h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
      </div>
      <MapLoadingIndicator />
      <HelpButton />
      {isSharedView && <GuideBubble />}

      {/* Bottom stack: carousel + floating timeline (hidden when detail drawer is open) */}
      {viewMode === 'map' && (
        <div className="absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2 md:inset-x-auto md:bottom-4 md:left-1/2 md:w-[60%] md:min-w-[420px] md:-translate-x-1/2">
          <TourCarousel />
          <FloatingTimeline />
        </div>
      )}

      {/* Detail mode: scrollable drawer on mobile, side panel on desktop */}
      {viewMode === 'detail' && <TourPanel />}

      {/* First-time safety acknowledgment */}
      <SafetyOverlay />

      {/* Step-by-step guided tour */}
      <GuidedTour />
    </div>
  );
}
