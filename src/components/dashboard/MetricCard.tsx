import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "default" | "financial" | "success" | "warning";
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = "default", 
  subtitle,
  trend 
}: MetricCardProps) {
  return (
    <div className={cn(
      "metric-card",
      variant === "financial" && "metric-card-financial",
      variant === "success" && "metric-card-success"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2">
            <p className={cn(
              "text-3xl font-bold",
              variant === "financial" && "text-financial",
              variant === "success" && "text-success"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">vs yesterday</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-lg",
          variant === "financial" && "bg-financial/10 text-financial",
          variant === "success" && "bg-success/10 text-success",
          variant === "default" && "bg-primary/10 text-primary"
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}