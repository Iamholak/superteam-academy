'use client';

import Link from 'next/link';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body className="bg-background text-foreground">
        <div className="container flex min-h-screen flex-col items-center justify-center gap-6 py-24 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
          <p className="max-w-xl text-muted-foreground">
            An unexpected error occurred while rendering this page.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
            <Link
              href="/en"
              className="inline-flex h-10 items-center rounded-xl border border-border px-5 font-semibold hover:bg-muted/40"
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
