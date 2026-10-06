import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodePad from "./CodePad";
import type { CodePad as CodePadType } from "../../types";

const pad: CodePadType = {
  id: "pad-1",
  x: 100,
  y: 50,
  width: 400,
  height: 300,
  code: "const answer = 42;",
  language: "javascript",
  isMinimized: false,
};

function setup(props: Partial<React.ComponentProps<typeof CodePad>> = {}) {
  const onUpdate = vi.fn();
  const onRemove = vi.fn();
  const utils = render(
    <CodePad
      codePad={pad}
      scrollX={0}
      scrollY={0}
      zoom={1}
      onUpdate={onUpdate}
      onRemove={onRemove}
      {...props}
    />,
  );
  return { ...utils, onUpdate, onRemove, user: userEvent.setup() };
}

const root = (container: HTMLElement) => container.querySelector(".codepad") as HTMLElement;

describe("CodePad", () => {
  it("renders the code in a CodeMirror editor", () => {
    const { container } = setup();
    expect(container.querySelector(".cm-content")).toHaveTextContent("const answer = 42;");
  });

  it("positions itself by converting canvas coords to screen coords", () => {
    const { container } = setup({ scrollX: 20, scrollY: -10, zoom: 2 });
    expect(root(container)).toHaveStyle({ left: "240px", top: "80px", width: "400px", height: "300px" });
  });

  it("shows the current language in the picker", () => {
    setup({ codePad: { ...pad, language: "python" } });
    expect(screen.getByRole("button", { name: "Python" })).toBeInTheDocument();
  });

  it("falls back to JavaScript for unknown languages", () => {
    setup({ codePad: { ...pad, language: "cobol" } });
    expect(screen.getByRole("button", { name: "JavaScript" })).toBeInTheDocument();
  });

  it("changes language from the dropdown", async () => {
    const { user, onUpdate } = setup();

    await user.click(screen.getByRole("button", { name: "JavaScript" }));
    await user.click(await screen.findByRole("menuitem", { name: "Python" }));

    expect(onUpdate).toHaveBeenCalledWith({ language: "python" });
  });

  it("calls onRemove when closed", async () => {
    const { user, onRemove } = setup();
    await user.click(screen.getByTitle("Close"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("copies code to the clipboard", async () => {
    const { user } = setup();
    await user.click(screen.getByTitle("Copy code"));
    expect(await navigator.clipboard.readText()).toBe("const answer = 42;");
  });

  it("reports the new canvas position while dragging the header", () => {
    const { container, onUpdate } = setup();
    const header = container.querySelector(".codepad-header")!;

    fireEvent.mouseDown(header, { clientX: 110, clientY: 60 });
    fireEvent.mouseMove(window, { clientX: 160, clientY: 90 });
    fireEvent.mouseUp(window);

    expect(onUpdate).toHaveBeenCalledWith({ x: 150, y: 80 });
  });

  it("enforces a minimum size when resizing", () => {
    const { container, onUpdate } = setup();
    const handle = container.querySelector(".cursor-se-resize")!;

    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(window, { clientX: 110, clientY: 60 });
    fireEvent.mouseUp(window);

    expect(onUpdate).toHaveBeenCalledWith({ width: 250, height: 150 });
  });

  describe("read-only mode", () => {
    it("shows a badge and hides editing controls", () => {
      const { container } = setup({ isReadOnly: true });

      expect(screen.getByText("Read-only")).toBeInTheDocument();
      expect(screen.getByText("JS")).toBeInTheDocument();
      expect(screen.queryByTitle("Close")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "JavaScript" })).not.toBeInTheDocument();
      expect(container.querySelector(".cursor-se-resize")).not.toBeInTheDocument();
      expect(screen.getByTitle("Copy code")).toBeInTheDocument();
    });

    it("cannot be dragged", () => {
      const { container, onUpdate } = setup({ isReadOnly: true });

      fireEvent.mouseDown(container.querySelector(".codepad-header")!, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(window, { clientX: 50, clientY: 50 });

      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});
