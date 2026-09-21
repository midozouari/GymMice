import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "guard",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
          testTimeout: 20_000,
          hookTimeout: 20_000,
          fileParallelism: false,
        },
      },
    ],
  },
});