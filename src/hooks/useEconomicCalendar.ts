import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketEvent {
  id: string;
  date: string;
  time_et: string | null;
  country: string;
  event_name: string;
  impact: "high" | "medium" | "low";
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
  fetched_at: string;
}

export interface MarketEarning {
  id: string;
  date: string;
  symbol: string;
  hour: string;
  eps_estimate: number | null;
  eps_actual: number | null;
  revenue_estimate: number | null;
  revenue_actual: number | null;
  quarter: number | null;
  year: number | null;
  fetched_at: string;
}

const KEY_EVENT_KEYWORDS = [
  "FOMC",
  "Federal Funds Rate",
  "Fed Interest Rate",
  "CPI",
  "Consumer Price Index",
  "PPI",
  "Producer Price Index",
  "Nonfarm Payrolls",
  "Non-Farm",
  "NFP",
  "GDP",
  "Gross Domestic Product",
  "Unemployment Rate",
  "Initial Jobless Claims",
  "Fed Chair",
  "Federal Reserve",
];

function isKeyEvent(name: string): boolean {
  const upper = name.toUpperCase();
  return KEY_EVENT_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()));
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function fetchEvents(): Promise<MarketEvent[]> {
  const today = todayStr();
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const toStr = twoWeeks.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("market_events")
    .select("*")
    .gte("date", today)
    .lte("date", toStr)
    .eq("country", "US")
    .order("date", { ascending: true });

  if (error) throw error;
  return (data || []) as MarketEvent[];
}

async function fetchEarnings(): Promise<MarketEarning[]> {
  const today = todayStr();
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const toStr = twoWeeks.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("market_earnings")
    .select("*")
    .gte("date", today)
    .lte("date", toStr)
    .order("date", { ascending: true })
    .limit(100);

  if (error) throw error;
  return (data || []) as MarketEarning[];
}

export function useEconomicCalendar() {
  const eventsQuery = useQuery({
    queryKey: ["market-events"],
    queryFn: fetchEvents,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const earningsQuery = useQuery({
    queryKey: ["market-earnings"],
    queryFn: fetchEarnings,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const allEvents = eventsQuery.data || [];
  const allEarnings = earningsQuery.data || [];
  const today = todayStr();

  const todayEvents = allEvents.filter((e) => e.date === today);
  const thisWeekHighImpact = allEvents.filter(
    (e) => e.impact === "high" && e.date > today
  );

  // Next major event (FOMC, CPI, etc.)
  const nextMajorEvent =
    allEvents.find((e) => isKeyEvent(e.event_name) && e.date >= today) || null;

  // Group earnings by date
  const earningsByDate: Record<string, MarketEarning[]> = {};
  allEarnings.forEach((e) => {
    if (!earningsByDate[e.date]) earningsByDate[e.date] = [];
    earningsByDate[e.date].push(e);
  });

  const highImpactCount = allEvents.filter((e) => e.impact === "high").length;

  return {
    isLoading: eventsQuery.isLoading || earningsQuery.isLoading,
    isError: eventsQuery.isError || earningsQuery.isError,
    allEvents,
    allEarnings,
    todayEvents,
    thisWeekHighImpact,
    nextMajorEvent,
    earningsByDate,
    highImpactCount,
    earningsCount: allEarnings.length,
    lastUpdated: eventsQuery.dataUpdatedAt || earningsQuery.dataUpdatedAt,
  };
}
