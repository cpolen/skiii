import { notFound } from 'next/navigation';
import { tours } from '@/data/tours';
import { TourDetailView } from '@/components/tour/TourDetail';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return tours.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) return { title: 'Tour Not Found' };

  return {
    title: `${tour.name} - Skiii`,
    description: `${tour.name} backcountry ski tour conditions, avalanche forecast, weather, and equipment recommendations. ${tour.description}`,
  };
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) notFound();

  return <TourDetailView tour={tour} />;
}
