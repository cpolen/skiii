import { create } from 'zustand';

const STORAGE_KEY = 'skiii-tour-completed';

interface TourState {
  isActive: boolean;
  currentStep: number;
  hasCompleted: boolean;

  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  isActive: false,
  currentStep: 0,
  hasCompleted:
    typeof window !== 'undefined'
      ? !!localStorage.getItem(STORAGE_KEY)
      : false,

  startTour: () => set({ isActive: true, currentStep: 0 }),

  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),

  prevStep: () =>
    set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

  endTour: () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    set({ isActive: false, currentStep: 0, hasCompleted: true });
  },
}));
