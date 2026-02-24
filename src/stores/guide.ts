import { create } from 'zustand';

export type GuideTrigger = 'app-load' | 'tour-select' | 'timeline-scrub';

interface GuideState {
  /** Whether the bubble is expanded (true) or collapsed to icon (false) */
  isExpanded: boolean;
  /** Current displayed message */
  currentMessage: string;
  /** Whether an AI call is in-flight */
  isAILoading: boolean;
  /** Serialized context key to detect actual changes and skip duplicate calls */
  lastContextKey: string;
  /** Whether the app loaded from a shared URL (shared=1 param was present) */
  isSharedView: boolean;

  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setMessage: (message: string) => void;
  setAILoading: (loading: boolean) => void;
  setLastContextKey: (key: string) => void;
  setIsSharedView: (shared: boolean) => void;
  /** Dismiss guide permanently for this session */
  dismissGuide: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  isExpanded: true,
  currentMessage: '',
  isAILoading: false,
  lastContextKey: '',
  isSharedView: false,

  setExpanded: (expanded) => set({ isExpanded: expanded }),
  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  setMessage: (message) => set({ currentMessage: message }),
  setAILoading: (loading) => set({ isAILoading: loading }),
  setLastContextKey: (key) => set({ lastContextKey: key }),
  setIsSharedView: (shared) => set({ isSharedView: shared }),
  dismissGuide: () => set({ isSharedView: false, currentMessage: '', isExpanded: false }),
}));
