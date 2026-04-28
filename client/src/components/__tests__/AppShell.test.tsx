import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppShell from "../AppShell";

function renderShell({
  user,
  usage,
  onSignIn,
  onLogout,
  onShowSubscription,
}: {
  user?: { name: string; email: string; avatar?: string };
  usage?: { remaining: number; isSubscribed: boolean };
  onSignIn?: () => void;
  onLogout?: () => void;
  onShowSubscription?: () => void;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell
        user={user}
        usage={usage}
        onSignIn={onSignIn}
        onLogout={onLogout}
        onShowSubscription={onShowSubscription}
      >
        <div data-testid="app-children">page content</div>
      </AppShell>
    </QueryClientProvider>,
  );
}

describe("AppShell mobile sheet menu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  it("renders the mobile menu trigger and brand mark", () => {
    renderShell({ onSignIn: vi.fn() });

    expect(screen.getByTestId("button-mobile-menu")).toBeInTheDocument();
    expect(screen.getByTestId("link-brand")).toBeInTheDocument();
    expect(screen.getByTestId("text-app-name")).toHaveTextContent(
      "Youth Dance Music",
    );
  });

  it("opens the sheet when the hamburger is clicked and shows the unauthenticated sign-in CTA", async () => {
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    renderShell({ onSignIn });

    expect(
      screen.queryByTestId("button-sign-in-mobile"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("button-mobile-menu"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByTestId("button-sign-in-mobile"),
    ).toBeInTheDocument();
  });

  it("invokes onSignIn and closes the sheet when the mobile sign-in button is clicked", async () => {
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    renderShell({ onSignIn });

    await user.click(screen.getByTestId("button-mobile-menu"));
    const signInBtn = await screen.findByTestId("button-sign-in-mobile");
    await user.click(signInBtn);

    expect(onSignIn).toHaveBeenCalledTimes(1);
    // After click the sheet closes, so the mobile sign-in button should be gone
    expect(
      screen.queryByTestId("button-sign-in-mobile"),
    ).not.toBeInTheDocument();
  });

  it("closes the sheet when the user presses Escape", async () => {
    const user = userEvent.setup();
    renderShell({ onSignIn: vi.fn() });

    await user.click(screen.getByTestId("button-mobile-menu"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    // The dialog should be removed from the DOM
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-mobile-menu")).toBeInTheDocument();
  });

  it("shows pro nav links in the mobile sheet for subscribed users and logs them out via the mobile button", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    renderShell({
      user: { name: "Ada Lovelace", email: "ada@example.com" },
      usage: { remaining: 999, isSubscribed: true },
      onLogout,
    });

    await user.click(screen.getByTestId("button-mobile-menu"));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByTestId("link-search-mobile"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByTestId("link-popular-songs-mobile"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByTestId("link-dance-management-mobile"),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByTestId("button-logout-mobile"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("hides pro-only nav links from the mobile sheet for free users and shows the upgrade CTA", async () => {
    const onShowSubscription = vi.fn();
    const user = userEvent.setup();
    renderShell({
      user: { name: "Free User", email: "free@example.com" },
      usage: { remaining: 5, isSubscribed: false },
      onShowSubscription,
      onLogout: vi.fn(),
    });

    await user.click(screen.getByTestId("button-mobile-menu"));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByTestId("link-search-mobile"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByTestId("link-popular-songs-mobile"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByTestId("link-dance-management-mobile"),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByTestId("button-upgrade-mobile"));
    expect(onShowSubscription).toHaveBeenCalledTimes(1);
  });
});
