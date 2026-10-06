import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner, PageSpinner } from "./Spinner";
import Skeleton from "./Skeleton";
import CanvasSkeleton from "./CanvasSkeleton";
import DashboardSkeleton from "./DashboardSkeleton";

describe("Spinner", () => {
  it("renders an optional label", () => {
    const { rerender } = render(<Spinner />);
    expect(screen.queryByText(/./)).not.toBeInTheDocument();

    rerender(<Spinner label="Saving..." />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("applies size classes", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector(".animate-spin")).toHaveClass("w-8", "h-8");
  });

  it("PageSpinner shows the brand and a default label", () => {
    render(<PageSpinner />);
    expect(screen.getByRole("heading", { name: "U&I" })).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("merges custom classes with the pulse base", () => {
    const { container } = render(<Skeleton className="w-9" />);
    expect(container.firstChild).toHaveClass("animate-pulse", "w-9");
  });

  it("exposes Text and Circle variants", () => {
    const { container } = render(
      <>
        <Skeleton.Text />
        <Skeleton.Circle />
      </>,
    );
    const [text, circle] = container.children;
    expect(text).toHaveClass("h-4");
    expect(circle).toHaveClass("rounded-full");
  });

  it("CanvasSkeleton renders a mock toolbar and loading label", () => {
    const { container } = render(<CanvasSkeleton />);
    expect(screen.getByText(/loading your scene/i)).toBeInTheDocument();
    expect(container.querySelectorAll(".w-9.h-9")).toHaveLength(8);
  });

  it("DashboardSkeleton renders six placeholder scene cards", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelectorAll(".grid > div")).toHaveLength(6);
  });
});
