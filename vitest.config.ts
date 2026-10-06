import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Node 22+ has a built-in `localStorage` global that shadows jsdom's (and is a
// broken stub without `--localstorage-file`). Disable it in test workers.
const nodeMajor = Number(process.versions.node.split(".")[0]);
const execArgv = nodeMajor >= 22 ? ["--no-experimental-webstorage"] : [];

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      poolOptions: { forks: { execArgv } },
      // Dummy values so lib/supabase.ts can initialise; no test hits the network.
      env: {
        VITE_SUPABASE_URL: "http://localhost:54321",
        VITE_SUPABASE_ANON_KEY: "test-anon-key",
      },
      coverage: {
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/test/**", "src/**/*.test.{ts,tsx}", "src/main.tsx"],
      },
    },
  }),
);
