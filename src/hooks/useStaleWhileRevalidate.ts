import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared utility for stale-while-revalidate data fetching.
 * - `loading` = true only on initial load when there's no cached data
 * - `refreshing` = true during background refetches (keeps existing data visible)
 * - Debounced visibility refetch to prevent rapid bursts
 * - inFlight guard prevents concurrent requests
 */
export interface SWRState<T> {
  data: T | null;
  loading: boolean;      // True only on initial load with no data
  refreshing: boolean;   // True during background refetch
  error: string | null;
}

interface UseSWROptions {
  debounceMs?: number;
}

export function useSWRFetch<T>(
  fetcher: () => Promise<T | null>,
  deps: unknown[],
  options: UseSWROptions = {}
) {
  const { debounceMs = 300 } = options;

  const [state, setState] = useState<SWRState<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasData = useRef(false);

  const fetchData = useCallback(async (isInitial = false) => {
    if (inFlight.current) return;
    inFlight.current = true;

    // Only show loading spinner on initial fetch with no cached data
    if (isInitial && !hasData.current) {
      setState((s) => ({ ...s, loading: true, error: null }));
    } else {
      // Background refresh - keep data visible
      setState((s) => ({ ...s, refreshing: true, error: null }));
    }

    try {
      const result = await fetcher();
      
      if (!mounted.current) return;

      if (result !== null) {
        hasData.current = true;
        setState({
          data: result,
          loading: false,
          refreshing: false,
          error: null,
        });
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          refreshing: false,
          error: hasData.current ? null : "No data returned",
        }));
      }
    } catch (err) {
      if (!mounted.current) return;
      const message = err instanceof Error ? err.message : "Fetch failed";
      // Keep existing data on error during refresh
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: hasData.current ? null : message,
      }));
    } finally {
      inFlight.current = false;
    }
  }, [fetcher]);

  // Debounced refetch for visibility changes
  const debouncedRefetch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchData(false);
    }, debounceMs);
  }, [fetchData, debounceMs]);

  // Cleanup
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    state,
    fetchData,
    debouncedRefetch,
    setState,
    hasData,
  };
}
