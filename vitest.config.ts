import path from "node:path";

import { defineConfig } from "vitest/config";

const rootDir = path.resolve(__dirname, "apps/middleware/src");
const alias = {
  "@application": path.resolve(rootDir, "application"),
  "@domain": path.resolve(rootDir, "domain"),
  "@infrastructure": path.resolve(rootDir, "infrastructure"),
  "@interfaces": path.resolve(rootDir, "interfaces"),
  "@shared": path.resolve(rootDir, "shared"),
};

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["apps/middleware/tests/unit/**/*.test.ts"],
    reporters: ["default"],
    coverage: {
      reporter: ["text", "lcov"],
      enabled: false,
    },
  },
});
