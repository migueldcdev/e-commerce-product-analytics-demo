import { describePostHogEventHelp } from './describePostHogEventHelp';

const PAGEVIEW =
  'Pageview: Fires on each page load or route change, recording URL, referrer, browser and device. Its partner $pageleave adds time on page and scroll depth for web analytics and funnels.';
const HEATMAP =
  'Heatmap: Batches clicks, rage clicks, mouse movement and scroll depth into $$heatmap events. PostHog overlays them on your site to show where users interact and how far they scroll.';
const WEB_VITALS =
  'Web Vitals: Measures real-user performance (LCP, INP, CLS, FCP) and sends it as $web_vitals events. This shows which pages are slow, unresponsive or visually unstable.';

describe('describePostHogEventHelp', () => {
  it.each([
    ['$pageview', PAGEVIEW],
    ['$pageleave', PAGEVIEW],
    ['$$heatmap', HEATMAP],
    ['$web_vitals', WEB_VITALS],
  ])('explains %s', (event, help) => {
    expect(describePostHogEventHelp(event)).toBe(help);
  });

  it.each(['$autocapture', '$rageclick', 'custom_event', '', 'pageview', '$PAGEVIEW'])(
    'has no help for %j',
    (event) => {
      expect(describePostHogEventHelp(event)).toBeUndefined();
    },
  );

  it.each([undefined, null, 42, {}, ['$pageview']])('returns undefined for %j', (input) => {
    expect(() => describePostHogEventHelp(input)).not.toThrow();
    expect(describePostHogEventHelp(input)).toBeUndefined();
  });

  it('does not match inherited object keys', () => {
    expect(describePostHogEventHelp('toString')).toBeUndefined();
    expect(describePostHogEventHelp('__proto__')).toBeUndefined();
  });
});
