/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: false,
      },
      proxy: {
        "^/(auth|users|tests|questions|organisations|test-sessions|candidates|admin|test-schedules|test-results|topics|subtopics|subjects|submissions|test-cases|test-questions|candidate-invitations|api|actuator)": {
          target: env.BACKEND_URL || (mode === "production" ? "https://api.gryphon360.com" : "http://localhost:8081"),
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});
