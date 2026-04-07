import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import appCss from "./globals.css?url";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/lib/react-query";
import { IframeEmbedProvider } from "@/lib/iframe/embed-context";
import { IframeBridgeProvider } from "@/providers/iframe-bridge-provider";
import {
  getLocale,
  getTextDirection,
  localizeHref,
  shouldRedirect,
} from "@/paraglide/runtime.js";
import { meta_description, meta_title } from "@/paraglide/messages";

import "@livekit/components-styles";

function RootDocument() {
  return (
    <html
      lang={getLocale()}
      dir={getTextDirection()}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                three:
                  "https://unpkg.com/three@0.172.0/build/three.module.js",
                "three/addons/":
                  "https://unpkg.com/three@0.172.0/examples/jsm/",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ReactQueryProvider>
          <IframeEmbedProvider>
            <IframeBridgeProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                <TooltipProvider>
                  <Outlet />
                  <Toaster />
                </TooltipProvider>
              </ThemeProvider>
            </IframeBridgeProvider>
          </IframeEmbedProvider>
        </ReactQueryProvider>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const decision = await shouldRedirect({ url: window.location.href });
    if (decision.redirectUrl) {
      throw redirect({ href: decision.redirectUrl.href });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: String(meta_title()),
      },
      {
        name: "description",
        content: String(meta_description()),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "alternate",
        hrefLang: "en",
        href: localizeHref("/", { locale: "en" }),
      },
      {
        rel: "alternate",
        hrefLang: "de",
        href: localizeHref("/", { locale: "de" }),
      },
      {
        rel: "alternate",
        hrefLang: "ru",
        href: localizeHref("/", { locale: "ru" }),
      },
      {
        rel: "alternate",
        hrefLang: "ar",
        href: localizeHref("/", { locale: "ar" }),
      },
      {
        rel: "alternate",
        hrefLang: "he",
        href: localizeHref("/", { locale: "he" }),
      },
      {
        rel: "alternate",
        hrefLang: "x-default",
        href: localizeHref("/", { locale: "en" }),
      },
    ],
  }),
  component: RootDocument,
});
