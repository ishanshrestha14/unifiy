import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../lib/logger", () => ({ logError: vi.fn() }));

import ShareModal from "./ShareModal";
import { useSceneStore } from "../../stores/sceneStore";
import type { Scene } from "../../types";

const generateShareLink = vi.fn();
const revokeShareLink = vi.fn();

const scene: Scene = {
  id: "scene-1",
  workspaceId: "ws-1",
  name: "Architecture",
  excalidrawData: null,
  codePads: [],
  shareToken: null,
  sharePermission: "none",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function setup(currentScene: Scene = scene) {
  useSceneStore.setState({ currentScene, generateShareLink, revokeShareLink });
  const onClose = vi.fn();
  render(<ShareModal sceneId="scene-1" sceneName="Architecture" isOpen onClose={onClose} />);
  return { onClose, user: userEvent.setup() };
}

describe("ShareModal", () => {
  beforeEach(() => {
    generateShareLink.mockReset();
    revokeShareLink.mockReset();
  });

  it("offers to create a link when the scene isn't shared", () => {
    setup();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create share link/i })).toBeInTheDocument();
  });

  it("shows the existing link for an already-shared scene", () => {
    setup({ ...scene, shareToken: "tok123", sharePermission: "view" });
    expect(screen.getByRole("textbox")).toHaveValue(
      `${window.location.origin}/scene/scene-1/shared/tok123`,
    );
  });

  it("generates a view-only link", async () => {
    generateShareLink.mockResolvedValue("https://unifiy.app/scene/scene-1/shared/new");
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /create share link/i }));

    expect(generateShareLink).toHaveBeenCalledWith("scene-1", "view");
    expect(await screen.findByRole("textbox")).toHaveValue(
      "https://unifiy.app/scene/scene-1/shared/new",
    );
  });

  it("shows an error when link generation fails", async () => {
    generateShareLink.mockResolvedValue(null);
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /create share link/i }));

    expect(await screen.findByText("Failed to generate link")).toBeInTheDocument();
  });

  it("copies the link to the clipboard and confirms", async () => {
    const { user } = setup({ ...scene, shareToken: "tok123", sharePermission: "view" });
    // user-event installs a clipboard stub on setup; read back from it.
    await user.click(screen.getByRole("button", { name: /copy/i }));

    expect(await screen.findByRole("button", { name: /copied!/i })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/scene/scene-1/shared/tok123`,
    );
  });

  it("revokes the link and returns to the empty state", async () => {
    revokeShareLink.mockResolvedValue(undefined);
    const { user } = setup({ ...scene, shareToken: "tok123", sharePermission: "view" });

    await user.click(screen.getByRole("button", { name: /revoke share link/i }));

    expect(revokeShareLink).toHaveBeenCalledWith("scene-1");
    expect(await screen.findByRole("button", { name: /create share link/i })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    useSceneStore.setState({ currentScene: scene });
    render(<ShareModal sceneId="scene-1" sceneName="Architecture" isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Share Scene")).not.toBeInTheDocument();
  });
});
