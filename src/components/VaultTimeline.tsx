 import { useVaultTimeline, VaultEvent } from "@/hooks/useVaultTimeline";
 import { Card } from "@/components/ui/card";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Skeleton } from "@/components/ui/skeleton";
 import { cn } from "@/lib/utils";
 import { 
   Activity, 
   ShieldCheck, 
   ShieldX, 
   Lock, 
   Unlock, 
   TrendingUp, 
   AlertTriangle,
   Clock
 } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 
 // Event type configuration
 const EVENT_CONFIG: Record<string, {
   icon: React.ElementType;
   title: string;
   color: string;
   bgColor: string;
 }> = {
   trade_executed: {
     icon: ShieldCheck,
     title: "Trade Executed",
     color: "text-status-active",
     bgColor: "bg-status-active/10",
   },
   trade_blocked: {
     icon: ShieldX,
     title: "Trade Blocked",
     color: "text-status-inactive",
     bgColor: "bg-status-inactive/10",
   },
   discipline_locked: {
     icon: Lock,
     title: "Discipline Locked",
     color: "text-status-inactive",
     bgColor: "bg-status-inactive/10",
   },
   discipline_recovered: {
     icon: Unlock,
     title: "Discipline Recovered",
     color: "text-status-active",
     bgColor: "bg-status-active/10",
   },
   risk_level_changed: {
     icon: TrendingUp,
     title: "Risk Level Changed",
     color: "text-status-warning",
     bgColor: "bg-status-warning/10",
   },
   pre_trade_check: {
     icon: Activity,
     title: "Pre-Trade Check",
     color: "text-primary",
     bgColor: "bg-primary/10",
   },
 };
 
 const DEFAULT_CONFIG = {
   icon: AlertTriangle,
   title: "Event",
   color: "text-muted-foreground",
   bgColor: "bg-muted",
 };
 
 function getEventConfig(eventType: string) {
   return EVENT_CONFIG[eventType] || DEFAULT_CONFIG;
 }
 
 function formatEventContext(event: VaultEvent): string {
   const ctx = event.event_context;
   if (!ctx) return "";
  if (typeof ctx !== "object" || Array.isArray(ctx)) return "";
  
  const context = ctx as Record<string, unknown>;
 
   switch (event.event_type) {
     case "trade_executed":
      return `Risk: ${context.risk_used}% | Rules followed: ${context.followed_rules ? "Yes" : "No"}`;
     case "trade_blocked":
      return (context.reason as string) || "Trading not permitted";
     case "discipline_locked":
      return `Score dropped to ${context.discipline_score} | Violations: ${context.violations_today}`;
     case "discipline_recovered":
      return `Score recovered to ${context.discipline_score}`;
     case "risk_level_changed":
      return `${context.previous_level || "N/A"} → ${context.risk_level} (${((context.adjustment_factor as number) * 100).toFixed(0)}% capacity)`;
     case "pre_trade_check":
      return context.is_cleared ? "Cleared for trading" : `Blocked: ${context.violation_reason || "Not cleared"}`;
     default:
      return JSON.stringify(context).slice(0, 100);
   }
 }
 
 function TimelineEvent({ event }: { event: VaultEvent }) {
   const config = getEventConfig(event.event_type);
   const Icon = config.icon;
   const contextText = formatEventContext(event);
   const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true });
 
   return (
     <div className="flex gap-3 py-3 border-b border-border/50 last:border-0 animate-slide-up">
       {/* Icon */}
       <div className={cn("p-2 rounded-lg shrink-0 h-fit", config.bgColor)}>
         <Icon className={cn("w-4 h-4", config.color)} />
       </div>
 
       {/* Content */}
       <div className="flex-1 min-w-0">
         <div className="flex items-center justify-between gap-2">
           <p className={cn("font-medium text-sm", config.color)}>
             {config.title}
           </p>
           <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
             <Clock className="w-3 h-3" />
             {timeAgo}
           </div>
         </div>
         {contextText && (
           <p className="text-xs text-muted-foreground mt-0.5 truncate">
             {contextText}
           </p>
         )}
       </div>
     </div>
   );
 }
 
 function TimelineSkeleton() {
   return (
     <div className="space-y-3">
       {[1, 2, 3].map((i) => (
         <div key={i} className="flex gap-3 py-3">
           <Skeleton className="w-8 h-8 rounded-lg" />
           <div className="flex-1 space-y-2">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-3 w-48" />
           </div>
         </div>
       ))}
     </div>
   );
 }
 
 export function VaultTimeline() {
   const { events, loading, error } = useVaultTimeline(20);
 
   return (
     <Card className="p-4">
       <div className="flex items-center gap-2 mb-4">
         <Activity className="w-4 h-4 text-primary" />
         <h3 className="text-sm font-semibold uppercase tracking-wider">
           Vault Timeline
         </h3>
         <div className="ml-auto flex items-center gap-1.5">
           <span className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
           </span>
           <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
         </div>
       </div>
 
       {error && (
         <p className="text-sm text-status-inactive text-center py-4">{error}</p>
       )}
 
       {loading ? (
         <TimelineSkeleton />
       ) : events.length === 0 ? (
         <div className="text-center py-8">
           <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
           <p className="text-sm text-muted-foreground">No events yet</p>
           <p className="text-xs text-muted-foreground mt-1">
             Your trading activity will appear here
           </p>
         </div>
       ) : (
         <ScrollArea className="h-[300px] -mx-1 px-1">
           <div className="space-y-0">
             {events.map((event) => (
               <TimelineEvent key={event.event_id} event={event} />
             ))}
           </div>
         </ScrollArea>
       )}
     </Card>
   );
 }