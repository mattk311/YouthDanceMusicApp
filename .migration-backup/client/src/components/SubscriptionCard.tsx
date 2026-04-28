import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionCardProps {
  isSubscribed: boolean;
  onClose?: () => void;
}

const PRO_BENEFITS = [
  "Unlimited song searches",
  "AI-powered appropriateness evaluations",
  "Detailed reasoning and concerns",
  "Popular Songs leaderboard access",
  "Live dance request management",
  "Cancel anytime",
];

export default function SubscriptionCard({
  isSubscribed,
  onClose,
}: SubscriptionCardProps) {
  const { toast } = useToast();

  const { data: priceData, isLoading: priceLoading } = useQuery<{
    unit_amount: number;
    currency: string;
    product_name: string;
  }>({
    queryKey: ["/api/subscription/price"],
    retry: false,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/subscription/checkout",
        {},
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/portal", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to open subscription management",
        variant: "destructive",
      });
    },
  });

  const price = priceData?.unit_amount
    ? (priceData.unit_amount / 100).toFixed(2)
    : "9.99";

  if (isSubscribed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto">
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Pro Subscriber
            </Badge>
          </div>
          <CardTitle>You're a Pro!</CardTitle>
          <CardDescription>
            Thanks for supporting Youth Dance Music.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {PRO_BENEFITS.slice(0, 4).map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            data-testid="button-manage-subscription"
          >
            {portalMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Manage Subscription
          </Button>
          {onClose && (
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Close
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl sm:text-2xl">Upgrade to Pro</CardTitle>
        <CardDescription>
          Everything you need to run safe youth dances.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-center">
          <div className="inline-flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">${price}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </div>
        <ul className="space-y-2">
          {PRO_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full"
          onClick={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending || priceLoading}
          data-testid="button-subscribe"
        >
          {checkoutMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Subscribe Now
        </Button>
        {onClose && (
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Maybe Later
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
