import { Badge } from "@/components/ui/badge";
import { Sparkles, Infinity } from "lucide-react";

interface UsageBadgeProps {
  remaining: number;
  isSubscribed: boolean;
  onClick?: () => void;
}

export default function UsageBadge({ remaining, isSubscribed, onClick }: UsageBadgeProps) {
  if (isSubscribed) {
    return (
      <Badge 
        variant="default" 
        className="gap-1 cursor-pointer"
        onClick={onClick}
        data-testid="badge-subscription-status"
      >
        <Sparkles className="h-3 w-3" />
        Pro
      </Badge>
    );
  }

  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  return (
    <Badge 
      variant={isEmpty ? "destructive" : isLow ? "secondary" : "outline"}
      className="gap-1 cursor-pointer"
      onClick={onClick}
      data-testid="badge-usage-remaining"
    >
      {isEmpty ? (
        "0 searches left"
      ) : (
        `${remaining} search${remaining === 1 ? '' : 'es'} left`
      )}
    </Badge>
  );
}
