import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "muted" | "destructive" | "warning" | "success";
  testId?: string;
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<EmptyStateProps["variant"]>, string> = {
  default: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "muted",
  testId,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className} data-testid={testId}>
      <CardContent className="py-10 text-center space-y-4">
        <div className="flex justify-center">
          <div
            className={`h-14 w-14 rounded-full flex items-center justify-center ${VARIANT_STYLES[variant]}`}
          >
            <Icon className="h-7 w-7" />
          </div>
        </div>
        <div className="space-y-1">
          <p
            className="text-base font-semibold"
            data-testid={testId ? `${testId}-title` : undefined}
          >
            {title}
          </p>
          {description && (
            <p
              className="text-sm text-muted-foreground max-w-sm mx-auto"
              data-testid={testId ? `${testId}-description` : undefined}
            >
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex justify-center pt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
