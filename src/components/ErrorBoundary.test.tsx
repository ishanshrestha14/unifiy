import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../lib/logger", () => ({ logError: vi.fn() }));

import ErrorBoundary from "./ErrorBoundary";
import ErrorFallback from "./ErrorFallback";
import { logError } from "../lib/logger";

function Bomb(): never {
  throw new Error("kaboom");
}

describe("ErrorFallback", () => {
  it("prefers an explicit message over the error's message", () => {
    render(<ErrorFallback error={new Error("raw")} message="Friendly message" />);
    expect(screen.getByText("Friendly message")).toBeInTheDocument();
    expect(screen.queryByText("raw")).not.toBeInTheDocument();
  });

  it("falls back to the error's message, then a generic one", () => {
    const { rerender } = render(<ErrorFallback error={new Error("raw")} />);
    expect(screen.getByText("raw")).toBeInTheDocument();

    rerender(<ErrorFallback />);
    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
  });

  it("renders a retry button only when onRetry is given", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorFallback />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();

    rerender(<ErrorFallback onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // React logs caught render errors to console.error; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows the default fallback and logs the error when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "kaboom" }),
      expect.objectContaining({ source: "ErrorBoundary" }),
    );
  });

  it("renders a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });
});
