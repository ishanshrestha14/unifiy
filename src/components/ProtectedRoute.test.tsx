import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAuthStore } from "../stores/authStore";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>Secret dashboard</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: false });
  });

  it("shows a spinner while auth is loading", () => {
    useAuthStore.setState({ loading: true });
    renderAt("/dashboard");

    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });

  it("redirects anonymous users to /login", () => {
    renderAt("/dashboard");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders children for signed-in users", () => {
    useAuthStore.setState({ user: { id: "user-1" } as never });
    renderAt("/dashboard");
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });
});
