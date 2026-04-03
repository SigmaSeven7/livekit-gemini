import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "./globals.css?url";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/lib/react-query";

import "@livekit/components-styles";

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                three:
                  "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/":
                  "https://unpkg.com/three@0.160.0/examples/jsm/",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ReactQueryProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <TooltipProvider>
              <Outlet />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </ReactQueryProvider>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "AI Interviewer | Gemini Live",
      },
      {
        name: "description",
        content:
          "Advanced AI Interviewer built on Gemini Live API and LiveKit.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootDocument,
});
