import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import svgr from "vite-plugin-svgr";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Parent of `web/` — same layout as Next (repo root `.env.local`). */
const repoRoot = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  Object.assign(process.env, env);

  const iframeParent = env.IFRAME_PARENT_ORIGIN?.trim();
  const frameAncestorsCsp = iframeParent
    ? `frame-ancestors 'self' ${iframeParent}`
    : "frame-ancestors 'self'";

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
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        outputStructure: "message-modules",
        cookieName: "PARAGLIDE_LOCALE",
        strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
        isServer: "import.meta.env.SSR",
        routeStrategies: [
          { match: "/api/:path(.*)?", exclude: true },
        ],
        urlPatterns: [
          {
            pattern: "/",
            localized: [
              ["de", "/de"],
              ["ru", "/ru"],
              ["ar", "/ar"],
              ["he", "/he"],
              ["en", "/en"],
            ],
          },
          {
            pattern: "/:path(.*)?",
            // All locales use a prefix (including `en` → `/en/...`). No unprefixed English
            // catch-all, so patterns like `/he/history` are not mistaken for `/:path`.
            localized: [
              ["de", "/de/:path(.*)?"],
              ["ru", "/ru/:path(.*)?"],
              ["ar", "/ar/:path(.*)?"],
              ["he", "/he/:path(.*)?"],
              ["en", "/en/:path(.*)?"],
            ],
          },
        ],
      }),
      tanstackStart({
        srcDirectory: "src",
        server: {
          entry: "./server.ts",
        },
        router: {
          routesDirectory: "app",
          generatedRouteTree: "./src/routeTree.gen.ts",
        },
      }),
      viteReact(),
      nitro({
        routeRules: {
          "/**": {
            headers: {
              "content-security-policy": frameAncestorsCsp,
            },
          },
        },
      }),
      svgr(),
    ],
  };
});
