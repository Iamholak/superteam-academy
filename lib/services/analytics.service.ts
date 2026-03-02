type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    posthog?: {
      capture?: (event: string, properties?: AnalyticsPayload) => void;
      identify?: (userId: string, traits?: AnalyticsPayload) => void;
    };
    clarity?: (command: string, ...args: unknown[]) => void;
    Sentry?: {
      captureException?: (error: Error, context?: { extra?: AnalyticsPayload }) => void;
    };
  }
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private isBrowser = typeof window !== 'undefined';
  private gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  trackEvent(event: string, properties: AnalyticsPayload = {}) {
    if (!this.isBrowser) return;
    window.posthog?.capture?.(event, properties);
    window.gtag?.('event', event, properties);
    window.clarity?.('event', event);
  }

  identify(userId: string, traits: AnalyticsPayload = {}) {
    if (!this.isBrowser) return;
    window.posthog?.identify?.(userId, traits);
    window.gtag?.('set', 'user_properties', traits);
    window.clarity?.('identify', userId);
  }

  trackPageView(url: string) {
    if (!this.isBrowser) return;

    window.posthog?.capture?.('$pageview', { path: url });
    if (this.gaId) {
      window.gtag?.('config', this.gaId, {
        page_path: url
      });
    }
  }

  logError(error: Error, context: AnalyticsPayload = {}) {
    if (!this.isBrowser) return;
    window.Sentry?.captureException?.(error, { extra: context });
    window.posthog?.capture?.('client_error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
    console.error('[Analytics] Error:', error.message, context);
  }
}

export const analytics = AnalyticsService.getInstance();
