import { describe, it, expect, beforeEach } from "vitest";
import { useLocalSceneStore } from "./localSceneStore";
import {
  CODEPAD_DEFAULT_CODE,
  CODEPAD_DEFAULT_HEIGHT,
  CODEPAD_DEFAULT_LANGUAGE,
  CODEPAD_DEFAULT_WIDTH,
  DEFAULT_LOCAL_SCENE_NAME,
  LOCAL_CODEPAD_ID_LENGTH,
  LOCAL_SCENE_ID_LENGTH,
  LOCAL_SCENE_STORAGE_KEY,
} from "../constants";

const store = () => useLocalSceneStore.getState();

describe("localSceneStore", () => {
  beforeEach(() => {
    useLocalSceneStore.setState({ scene: null });
  });

  describe("createScene", () => {
    it("creates an empty scene with the default name", () => {
      const id = store().createScene();
      const { scene } = store();

      expect(id).toHaveLength(LOCAL_SCENE_ID_LENGTH);
      expect(scene).toMatchObject({
        id,
        name: DEFAULT_LOCAL_SCENE_NAME,
        excalidrawData: null,
        codePads: [],
      });
    });

    it("uses a provided name", () => {
      store().createScene("My sketch");
      expect(store().scene?.name).toBe("My sketch");
    });

    it("persists the scene to localStorage", () => {
      const id = store().createScene();
      const persisted = JSON.parse(localStorage.getItem(LOCAL_SCENE_STORAGE_KEY)!);
      expect(persisted.state.scene.id).toBe(id);
    });
  });

  describe("without a scene", () => {
    it("ignores updates instead of creating one", () => {
      store().updateScene({ name: "nope" });
      store().saveExcalidrawData({ elements: [] });
      store().addCodePad(0, 0);
      expect(store().scene).toBeNull();
    });

    it("returns null from getSceneForMigration", () => {
      expect(store().getSceneForMigration()).toBeNull();
    });
  });

  describe("with a scene", () => {
    beforeEach(() => {
      store().createScene();
      useLocalSceneStore.setState((s) => ({ scene: { ...s.scene!, updatedAt: 0 } }));
    });

    it("updateScene merges fields and bumps updatedAt", () => {
      store().updateScene({ name: "Renamed" });
      expect(store().scene?.name).toBe("Renamed");
      expect(store().scene?.updatedAt).toBeGreaterThan(0);
    });

    it("saveExcalidrawData stores canvas data", () => {
      const data = { elements: [{ id: "rect" }] };
      store().saveExcalidrawData(data);
      expect(store().scene?.excalidrawData).toEqual(data);
    });

    it("addCodePad appends a CodePad with defaults at the given position", () => {
      const id = store().addCodePad(120, 80);

      expect(id).toHaveLength(LOCAL_CODEPAD_ID_LENGTH);
      expect(store().scene?.codePads).toEqual([
        {
          id,
          x: 120,
          y: 80,
          width: CODEPAD_DEFAULT_WIDTH,
          height: CODEPAD_DEFAULT_HEIGHT,
          code: CODEPAD_DEFAULT_CODE,
          language: CODEPAD_DEFAULT_LANGUAGE,
          isMinimized: false,
        },
      ]);
    });

    it("updateCodePad only touches the targeted CodePad", () => {
      const a = store().addCodePad(0, 0);
      const b = store().addCodePad(10, 10);

      store().updateCodePad(a, { code: "print('hi')", language: "python" });

      const [padA, padB] = store().scene!.codePads;
      expect(padA).toMatchObject({ id: a, code: "print('hi')", language: "python" });
      expect(padB).toMatchObject({ id: b, code: CODEPAD_DEFAULT_CODE, language: "javascript" });
    });

    it("removeCodePad removes only the targeted CodePad", () => {
      const a = store().addCodePad(0, 0);
      const b = store().addCodePad(10, 10);

      store().removeCodePad(a);

      expect(store().scene?.codePads.map((cp) => cp.id)).toEqual([b]);
    });

    it("getSceneForMigration returns canvas data and CodePads", () => {
      store().saveExcalidrawData({ elements: [] });
      const padId = store().addCodePad(0, 0);

      const migration = store().getSceneForMigration();

      expect(migration?.excalidrawData).toEqual({ elements: [] });
      expect(migration?.codePads.map((cp) => cp.id)).toEqual([padId]);
    });

    it("clearScene removes the scene", () => {
      store().clearScene();
      expect(store().scene).toBeNull();
    });
  });
});
