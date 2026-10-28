import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests only need the "@" alias; the full app config (TanStack Start, Nitro) is not needed.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
