import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../lib/logger", () => ({ logError: vi.fn() }));

import CreateWorkspaceModal from "./CreateWorkspaceModal";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const workspace = {
  id: "ws-1",
  ownerId: "user-1",
  name: "Client Projects",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const createWorkspace = vi.fn();

function setup(isOpen = true) {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(<CreateWorkspaceModal isOpen={isOpen} onClose={onClose} onCreated={onCreated} />);
  return { onClose, onCreated, user: userEvent.setup() };
}

describe("CreateWorkspaceModal", () => {
  beforeEach(() => {
    createWorkspace.mockReset();
    useWorkspaceStore.setState({ createWorkspace });
  });

  it("renders nothing when closed", () => {
    setup(false);
    expect(screen.queryByText("New Workspace")).not.toBeInTheDocument();
  });

  it("disables submit until a non-blank name is entered", async () => {
    const { user } = setup();
    const submit = screen.getByRole("button", { name: "Create Workspace" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Workspace Name"), "   ");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Workspace Name"), "Client");
    expect(submit).toBeEnabled();
  });

  it("creates the workspace with a trimmed name", async () => {
    createWorkspace.mockResolvedValue(workspace);
    const { user, onCreated } = setup();

    await user.type(screen.getByLabelText("Workspace Name"), "  Client Projects  ");
    await user.click(screen.getByRole("button", { name: "Create Workspace" }));

    expect(createWorkspace).toHaveBeenCalledWith("Client Projects");
    expect(onCreated).toHaveBeenCalledWith(workspace);
    expect(screen.getByLabelText("Workspace Name")).toHaveValue("");
  });

  it("shows an error when the store returns no workspace", async () => {
    createWorkspace.mockResolvedValue(null);
    const { user, onCreated } = setup();

    await user.type(screen.getByLabelText("Workspace Name"), "Client");
    await user.click(screen.getByRole("button", { name: "Create Workspace" }));

    expect(await screen.findByText("Failed to create workspace")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows a loading state and blocks closing while creating", async () => {
    let resolve!: (w: typeof workspace) => void;
    createWorkspace.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user, onClose } = setup();

    await user.type(screen.getByLabelText("Workspace Name"), "Client");
    await user.click(screen.getByRole("button", { name: "Create Workspace" }));

    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    resolve(workspace);
    expect(await screen.findByRole("button", { name: "Create Workspace" })).toBeInTheDocument();
  });

  it("Cancel resets the form and calls onClose", async () => {
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText("Workspace Name"), "Draft");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Workspace Name")).toHaveValue("");
  });
});
