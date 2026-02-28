import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
      <p className="max-w-xl text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/en"
        className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Back to Home
      </Link>
    </div>
  );
}
