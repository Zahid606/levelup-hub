import { useEffect, lazy, Suspense } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";

import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const Sonner = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Misk-ul-Kalam" },
      { name: "description", content: "Misk-ul-Kalam - Aromatic Talks | پیغام قرآن وسنت" },
      { name: "author", content: "Misk-ul-Kalam" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/logo.png" },
      { property: "og:title", content: "Misk-ul-Kalam" },
      { property: "og:description", content: "Misk-ul-Kalam - Aromatic Talks | پیغام قرآن وسنت" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@MiskulKalam" },
      { name: "twitter:image", content: "/logo.png" },
      { name: "twitter:title", content: "Misk-ul-Kalam" },
      { name: "twitter:description", content: "Misk-ul-Kalam - Aromatic Talks | پیغام قرآن وسنت" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <Sonner />
      </Suspense>
      <Outlet />
    </QueryClientProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/80">
          Return to Home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-border bg-background text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
