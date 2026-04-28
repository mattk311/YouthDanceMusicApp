import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  Music,
  Search,
  TrendingUp,
  Disc,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import UsageBadge from "@/components/UsageBadge";

interface AppShellUser {
  name: string;
  email: string;
  avatar?: string;
}

interface AppShellUsage {
  remaining: number;
  isSubscribed: boolean;
}

interface AppShellProps {
  user?: AppShellUser;
  usage?: AppShellUsage;
  onShowSubscription?: () => void;
  onLogout?: () => void;
  onSignIn?: () => void;
  children: ReactNode;
}

interface NavLink {
  href: string;
  label: string;
  icon: typeof Search;
  testid: string;
  proOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Search", icon: Search, testid: "link-search" },
  {
    href: "/popular",
    label: "Popular Songs",
    icon: TrendingUp,
    testid: "link-popular-songs",
    proOnly: true,
  },
  {
    href: "/dances",
    label: "Dances",
    icon: Disc,
    testid: "link-dance-management",
    proOnly: true,
  },
];

function BrandMark({ size = "default" }: { size?: "default" | "sm" }) {
  const isSm = size === "sm";
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md p-1 -ml-1 hover-elevate"
      data-testid="link-brand"
    >
      <div
        className={`flex items-center justify-center rounded-md bg-primary text-primary-foreground ${
          isSm ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <Music className={isSm ? "h-4 w-4" : "h-5 w-5"} />
      </div>
      <span
        className={`font-semibold tracking-tight ${isSm ? "text-sm" : "text-base"}`}
        data-testid="text-app-name"
      >
        Youth Dance Music
      </span>
    </Link>
  );
}

export default function AppShell({
  user,
  usage,
  onShowSubscription,
  onLogout,
  onSignIn,
  children,
}: AppShellProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPro = !!usage?.isSubscribed;
  const visibleLinks = NAV_LINKS.filter((l) => !l.proOnly || isPro);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-14 items-center gap-2 px-3 sm:px-4">
          <BrandMark />

          {/* Desktop nav */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-testid={link.testid}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${active ? "toggle-elevate toggle-elevated" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex-1" />

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            {usage && (
              <UsageBadge
                remaining={usage.remaining}
                isSubscribed={usage.isSubscribed}
                onClick={onShowSubscription}
              />
            )}
            {user && isPro && <NotificationBell />}
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!isPro && onShowSubscription && (
                    <DropdownMenuItem
                      onClick={onShowSubscription}
                      data-testid="menu-upgrade"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </DropdownMenuItem>
                  )}
                  {onLogout && (
                    <DropdownMenuItem
                      onClick={onLogout}
                      data-testid="button-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : onSignIn ? (
              <Button
                variant="default"
                size="sm"
                onClick={onSignIn}
                data-testid="button-sign-in"
              >
                Sign in
              </Button>
            ) : null}
          </div>

          {/* Mobile right side */}
          <div className="flex items-center gap-1 md:hidden">
            {user && isPro && <NotificationBell />}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-mobile-menu"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[85vw] max-w-sm flex flex-col gap-0 p-0"
              >
                <SheetHeader className="p-4 border-b text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <BrandMark size="sm" />
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigation menu and account options
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {user &&
                    visibleLinks.map((link) => {
                      const Icon = link.icon;
                      const active = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          data-testid={`${link.testid}-mobile`}
                          className="block"
                        >
                          <Button
                            variant="ghost"
                            className={`w-full justify-start gap-3 ${active ? "toggle-elevate toggle-elevated" : ""}`}
                          >
                            <Icon className="h-4 w-4" />
                            {link.label}
                          </Button>
                        </Link>
                      );
                    })}

                  {!user && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Sign in to access song verification, dance management, and
                      Spotify features.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>

                  {usage && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        onShowSubscription?.();
                      }}
                      className="w-full flex items-center justify-between gap-2 rounded-md p-2 hover-elevate active-elevate-2 text-left"
                      data-testid="button-usage-mobile"
                    >
                      <span className="text-sm text-muted-foreground">
                        {usage.isSubscribed ? "Plan" : "Free plan"}
                      </span>
                      <UsageBadge
                        remaining={usage.remaining}
                        isSubscribed={usage.isSubscribed}
                      />
                    </button>
                  )}
                </div>

                {user && (
                  <>
                    <Separator />
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-3 px-1">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {!isPro && onShowSubscription && (
                        <Button
                          variant="default"
                          className="w-full gap-2"
                          onClick={() => {
                            setMobileOpen(false);
                            onShowSubscription();
                          }}
                          data-testid="button-upgrade-mobile"
                        >
                          <Sparkles className="h-4 w-4" />
                          Upgrade to Pro
                        </Button>
                      )}
                      {onLogout && (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => {
                            setMobileOpen(false);
                            onLogout();
                          }}
                          data-testid="button-logout-mobile"
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {!user && onSignIn && (
                  <>
                    <Separator />
                    <div className="p-3">
                      <Button
                        className="w-full"
                        onClick={() => {
                          setMobileOpen(false);
                          onSignIn();
                        }}
                        data-testid="button-sign-in-mobile"
                      >
                        Sign in
                      </Button>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:underline"
            data-testid="link-footer-privacy"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
