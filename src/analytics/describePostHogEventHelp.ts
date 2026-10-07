const PAGEVIEW =
  'Pageview: Fires on each page load or route change, recording URL, referrer, browser and device. Its partner $pageleave adds time on page and scroll depth for web analytics and funnels.';

const HELP: ReadonlyMap<string, string> = new Map([
  ['$pageview', PAGEVIEW],
  ['$pageleave', PAGEVIEW],
  [
    '$$heatmap',
    'Heatmap: Batches clicks, rage clicks, mouse movement and scroll depth into $$heatmap events. PostHog overlays them on your site to show where users interact and how far they scroll.',
  ],
  [
    '$web_vitals',
    'Web Vitals: Measures real-user performance (LCP, INP, CLS, FCP) and sends it as $web_vitals events. This shows which pages are slow, unresponsive or visually unstable.',
  ],
]);

/** Short explanation of a PostHog event for the console's ? tooltip. Never throws. */
export function describePostHogEventHelp(eventName: unknown): string | undefined {
  return typeof eventName === 'string' ? HELP.get(eventName) : undefined;
}
