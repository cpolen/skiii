'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { TourMap } from '@/components/map/TourMap';
import { MapControls } from '@/components/map/MapControls';
import { MapLoadingIndicator } from '@/components/map/MapLoadingIndicator';
import { TimelineOverlay } from '@/components/map/TimelineOverlay';
import { TourPanel } from '@/components/tour/TourPanel';
import { SafetyOverlay } from '@/components/ui/SafetyOverlay';
import { GuidedTour } from '@/components/ui/GuidedTour';
import { HelpButton } from '@/components/ui/HelpButton';
import { useMapStore } from '@/stores/map';

function HomeContent() {
  const searchParams = useSearchParams();
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const selectTour = useMapStore((s) => s.selectTour);
  const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);

  // Hydrate from URL on mount
  useEffect(() => {
    if (!searchParams) return;
    const tour = searchParams.get('tour');
    const hour = searchParams.get('hour');
    if (tour) selectTour(tour);
    if (hour) setSelectedForecastHour(parseInt(hour, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state → URL using history.replaceState to avoid triggering Next.js
  // router internals which can throw during concurrent rendering
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTourSlug) params.set('tour', selectedTourSlug);
    if (selectedForecastHour != null) params.set('hour', String(selectedForecastHour));
    const str = params.toString();
    const newUrl = str ? `?${str}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedTourSlug, selectedForecastHour]);

  return (
    <div className="relative flex h-dvh w-full flex-col md:flex-row">
      {/* Map - full screen on mobile, left 60% on desktop */}
      <main className="relative h-full flex-1 md:h-full" aria-label="Map">
        <TourMap />
        <MapControls />
        <MapLoadingIndicator />
        <TimelineOverlay />
        <HelpButton />
      </main>

      {/* Tour panel - bottom sheet on mobile, side panel on desktop */}
      <TourPanel />

      {/* First-time safety acknowledgment */}
      <SafetyOverlay />

      {/* Step-by-step guided tour */}
      <GuidedTour />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
