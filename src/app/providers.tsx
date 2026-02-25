'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, type ReactNode } from 'react';

/** Persist the React Query cache to sessionStorage so that data survives
 *  page reloads (e.g. HMR full-refresh in dev mode) without re-fetching
 *  all weather/avy data. Uses sessionStorage (not localStorage) so stale
 *  data doesn't persist across browser sessions. */
const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({ storage: window.sessionStorage })
    : undefined;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes default
            gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // 1s, 2s, 4s… capped at 10s
            refetchOnWindowFocus: false,
            throwOnError: false, // never throw query errors to React error boundary
          },
        },
      }),
  );

  // When a persister is available, wrap in PersistQueryClientProvider
  // to restore the cache from sessionStorage on mount.
  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 30 * 60 * 1000 }}
      >
        {children}
      </PersistQueryClientProvider>
    );
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
