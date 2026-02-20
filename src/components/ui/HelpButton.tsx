'use client';

import { useTourStore } from '@/stores/tour';

export function HelpButton() {
  const isActive = useTourStore((s) => s.isActive);
  const startTour = useTourStore((s) => s.startTour);

  if (isActive) return null;

  return (
    <button
      onClick={startTour}
      className="absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
      aria-label="Start guided tour"
      title="How to use Skiii"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4.5 w-4.5"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3.75 3.75 0 0 1 5.303 5.303l-1.06 1.06a1.5 1.5 0 0 0-.44 1.061v.25a.75.75 0 0 1-1.5 0v-.25a3 3 0 0 1 .879-2.122l1.06-1.06a2.25 2.25 0 0 0-3.182-3.182ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
