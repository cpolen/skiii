'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TourMap } from '@/components/map/TourMap';
import { MapControls } from '@/components/map/MapControls';
import { TimelineOverlay } from '@/components/map/TimelineOverlay';
import { TourPanel } from '@/components/tour/TourPanel';
import { SafetyOverlay } from '@/components/ui/SafetyOverlay';
import { useMapStore } from '@/stores/map';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const selectTour = useMapStore((s) => s.selectTour);
  const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);

  // Hydrate from URL on mount
  useEffect(() => {
    const tour = searchParams.get('tour');
    const hour = searchParams.get('hour');
    if (tour) selectTour(tour);
    if (hour) setSelectedForecastHour(parseInt(hour, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTourSlug) params.set('tour', selectedTourSlug);
    if (selectedForecastHour != null) params.set('hour', String(selectedForecastHour));
    const str = params.toString();
    const newUrl = str ? `?${str}` : '/';
    router.replace(newUrl, { scroll: false });
  }, [selectedTourSlug, selectedForecastHour, router]);

  return (
    <div className="relative flex h-dvh w-full flex-col md:flex-row">
      {/* Map - full screen on mobile, left 60% on desktop */}
      <main className="relative h-full flex-1 md:h-full" aria-label="Map">
        <TourMap />
        <MapControls />
        <TimelineOverlay />
      </main>

      {/* Tour panel - bottom sheet on mobile, side panel on desktop */}
      <TourPanel />

      {/* First-time safety acknowledgment */}
      <SafetyOverlay />
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
