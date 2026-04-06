import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export interface EconomicEvent {
  id: string;
  type: "economic";
  date: string;
  time: string | null;
  country: string;
  event: string;
  impact: "high" | "medium" | "low";
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
}

export interface EarningsEvent {
  id: string;
  type: "earnings";
  date: string;
  symbol: string;
  hour: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  quarter: number | null;
  year: number | null;
}

interface CalendarResponse {
  events: EconomicEvent[];
  earnings: EarningsEvent[];
}

function getDateStr(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function fetchCalendar(): Promise<CalendarResponse> {
  const from = getDateStr(0);
  const to = getDateStr(14);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/economic-calendar?from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch calendar data");
  return res.json();
}

export function useEconomicCalendar() {
  const query = useQuery({
    queryKey: ["economic-calendar"],
    queryFn: fetchCalendar,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const today = todayStr();

  const todayEvents = (query.data?.events || []).filter(
    (e) => e.date === today && e.country === "US"
  );

  const thisWeekEvents = (query.data?.events || []).filter(
    (e) => e.date > today && e.country === "US"
  );

  const allUsEvents = (query.data?.events || []).filter(
    (e) => e.country === "US"
  );

  const upcomingEarnings = (query.data?.earnings || []).slice(0, 40);

  // Group earnings by date
  const earningsByDate: Record<string, EarningsEvent[]> = {};
  upcomingEarnings.forEach((e) => {
    if (!earningsByDate[e.date]) earningsByDate[e.date] = [];
    earningsByDate[e.date].push(e);
  });

  // Stats
  const highImpactCount = allUsEvents.filter((e) => e.impact === "high").length;
  const earningsCount = upcomingEarnings.length;

  return {
    ...query,
    todayEvents,
    thisWeekEvents,
    upcomingEarnings,
    earningsByDate,
    highImpactCount,
    earningsCount,
    allEvents: query.data?.events || [],
    allEarnings: query.data?.earnings || [],
    lastUpdated: query.dataUpdatedAt,
  };
}
