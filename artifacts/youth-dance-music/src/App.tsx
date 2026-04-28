import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import LoginCard from "@/components/LoginCard";
import HomePage from "@/pages/HomePage";
import PrivacyPage from "@/pages/PrivacyPage";
import PopularSongsPage from "@/pages/PopularSongsPage";
import DanceManagementPage from "@/pages/DanceManagementPage";
import DanceRequestPage from "@/pages/DanceRequestPage";
import NotFound from "@/pages/not-found";

function AppLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto h-14 px-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  );
}

function Router() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  if (isLoading) return <AppLoading />;

  if (!user) {
    return (
      <Switch>
        <Route path="/request" component={DanceRequestPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route component={LoginCard} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/popular" component={PopularSongsPage} />
      <Route path="/dances" component={DanceManagementPage} />
      <Route path="/request" component={DanceRequestPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Toaster />
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
