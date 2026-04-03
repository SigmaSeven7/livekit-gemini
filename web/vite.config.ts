import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import svgr from "vite-plugin-svgr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Parent of `web/` — same layout as Next (repo root `.env.local`). */
const repoRoot = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, repoRoot, ""));

  return {
    envDir: repoRoot,
    server: {
      port: 3000,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
        router: {
          routesDirectory: "app",
          generatedRouteTree: "./src/routeTree.gen.ts",
        },
      }),
      viteReact(),
      nitro(),
      svgr(),
    ],
  };
});
