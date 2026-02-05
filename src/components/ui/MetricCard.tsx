 import { cn } from "@/lib/utils";
 
 interface MetricCardProps {
   label: string;
   value: string | number;
   subtext?: string;
   className?: string;
   variant?: "default" | "highlight";
 }
 
 export function MetricCard({ label, value, subtext, className, variant = "default" }: MetricCardProps) {
   return (
     <div
       className={cn(
         "metric-card animate-slide-up",
         variant === "highlight" && "border-primary/30 bg-primary/5",
         className
       )}
     >
       <p className="section-title mb-2">{label}</p>
       <p className={cn(
         "text-3xl font-semibold tracking-tight",
         variant === "highlight" ? "text-primary" : "text-foreground"
       )}>
         {value}
       </p>
       {subtext && (
         <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
       )}
     </div>
   );
 }