# Customization Guide

## Theme Tokens
- Global styles: `app/globals.css`
- Use CSS variables for brand colors and surfaces.
- Primary layout primitives live in `components/ui/*`.

## Adding a New Locale
1. Add locale in `i18n/routing.ts`.
2. Add message file in `messages/<locale>.json`.
3. Ensure locale-aware routes resolve under `app/[locale]/*`.

## Course Card Variants
- Home featured cards and catalog cards are separate components.
- Keep shared fields aligned: title, difficulty, duration, XP, progress.
- Lesson list scroll behavior is controlled in course card body wrappers.

## Gamification Tuning
- XP/streak logic: `lib/services/user.service.ts`
- Course and lesson progression: `lib/services/course.service.ts`
- Leaderboard query source: `user_progress` + `profiles`.

## Analytics Integrations
- Configure env values:
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST` (optional)
- Tracking implementation:
- Provider scripts: `components/providers/analytics-provider.tsx`
- Event API: `lib/services/analytics.service.ts`

## Wallet UX
- Wallet modal and connect flow:
- `components/wallet/wallet-connect-modal.tsx`
- Navbar integration:
- `components/layout/navbar.tsx`
- Wallet link API:
- `app/api/wallet/link/route.ts`
