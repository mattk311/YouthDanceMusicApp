import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginCard from "../LoginCard";

describe("LoginCard sign-in surface", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("exposes the Google sign-in button and privacy link with their preserved testids", () => {
    render(<LoginCard />);

    const googleBtn = screen.getByTestId("button-google-login");
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).toHaveTextContent(/continue with google/i);

    const privacy = screen.getByTestId("link-privacy");
    expect(privacy).toBeInTheDocument();
    expect(privacy.getAttribute("href")).toBe("/privacy");

    expect(screen.getByText("Youth Dance Music")).toBeInTheDocument();
  });
});
