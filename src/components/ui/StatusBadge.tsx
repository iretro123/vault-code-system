 import { cn } from "@/lib/utils";
 
 interface StatusBadgeProps {
   status: "active" | "inactive" | "warning";
   children: React.ReactNode;
   className?: string;
 }
 
 export function StatusBadge({ status, children, className }: StatusBadgeProps) {
   return (
     <span
       className={cn(
         "status-badge",
         status === "active" && "status-active",
         status === "inactive" && "status-inactive",
         status === "warning" && "bg-status-warning/15 text-status-warning",
         className
       )}
     >
       <span
         className={cn(
           "w-1.5 h-1.5 rounded-full",
           status === "active" && "bg-status-active animate-pulse-subtle",
           status === "inactive" && "bg-status-inactive",
           status === "warning" && "bg-status-warning"
         )}
       />
       {children}
     </span>
   );
 }